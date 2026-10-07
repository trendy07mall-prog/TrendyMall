"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { detectFormatFromBuffer, isAccepted, rejectionMessageForFormat } from "@/lib/images/sniff";
import { IMAGE_TARGETS, formatBytes, type ImageKind } from "@/lib/images/targets";

const ALLOWED_PREFIXES = [
  "categories",
  "brands",
  "products",
  "variants",
  "editor",
  "campaigns",
  "settings",
  "hero",
] as const;
type UploadPrefix = (typeof ALLOWED_PREFIXES)[number];

// Same constants as lib/uploadPaymentSlip.ts -- checked here too, on top of
// the product-images bucket's own file_size_limit/allowed_mime_types
// (sql/065), for the same defense-in-depth reasoning: a client's
// accept="image/*" is only a UI hint, not a real constraint.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Inline description images are the one upload whose stored resolution is
// never bounded by anything downstream: they end up as plain <img> tags in
// admin-authored HTML, not next/image, so whatever pixel dimensions land
// here are what a phone decodes. File SIZE is a poor proxy for that cost --
// a 223KB JPEG already in this bucket is 2385x2560, which is 23.3MB of
// decoded bitmap -- so the 5MB limit above does not constrain it at all. A
// 5MB upload could reasonably be 4000x4000, or 64MB decoded, for one
// picture in one description.
//
// 1600 is well above the ~772px this content column ever displays at, even
// at DPR 2, so nothing visible is lost; it just removes the tail. Only the
// editor prefix is capped: hero/campaign art is deliberately authored at
// 1600-1920 for full-bleed desktop use, and shrinking that would be a
// visible quality regression, while those all render through next/image
// and are already bounded on the way out.
const MAX_DIMENSION_BY_PREFIX: Partial<Record<UploadPrefix, number>> = {
  editor: 1600,
};

// Returns null when the image is already within the cap (or cannot be read),
// meaning "upload the original untouched".
async function capDimensions(
  file: File,
  input: Buffer,
  maxDimension: number,
): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    // Imported lazily so the native binary is only pulled in on the one
    // upload path that needs it.
    const sharp = (await import("sharp")).default;

    const { width, height } = await sharp(input).metadata();
    if (!width || !height) return null;
    if (Math.max(width, height) <= maxDimension) return null;

    // .rotate() first so an EXIF-rotated phone photo is measured and
    // resized on the axes it will actually display on. fit "inside" with
    // both bounds set means either orientation lands under the cap.
    const pipeline = sharp(input)
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true });

    if (file.type === "image/png") {
      return { data: await pipeline.png({ compressionLevel: 9 }).toBuffer(), contentType: "image/png" };
    }
    if (file.type === "image/webp") {
      return { data: await pipeline.webp({ quality: 82 }).toBuffer(), contentType: "image/webp" };
    }
    return { data: await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer(), contentType: "image/jpeg" };
  } catch (error) {
    // Deliberately non-fatal. A resize failure must not turn into "your
    // image would not upload" for an admin mid-edit, and it is not the only
    // guard: lib/rich-text.ts re-serves these through the image optimizer
    // at a capped width on every render regardless of what is stored.
    console.warn("[uploads] could not downscale image, storing the original", {
      name: file.name,
      type: file.type,
      size: file.size,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Server-side enforcement of what the browser compressor is supposed to
 * have already done.
 *
 * The browser compresses before uploading (lib/images/compress.ts), which
 * is where the friendly messages and the quality ladder live. None of that
 * is a constraint -- a request can be replayed, a client can be patched,
 * and `file.type` is whatever the sender says it is. So the same rules are
 * re-checked here against the actual bytes.
 *
 * `kind` arrives in the FormData rather than as a parameter so the six
 * existing call sites keep their signature. When it is absent or unknown
 * the type and size checks still run; only the per-target dimension and
 * byte checks are skipped, which is what keeps any caller that has not been
 * updated working exactly as before.
 */
async function validateUpload(
  file: File,
  kind: ImageKind | null,
): Promise<{ error: string } | { bytes: Buffer; contentType: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());

  // What it actually is, not what the request claims.
  const format = detectFormatFromBuffer(bytes);
  if (!isAccepted(format)) {
    return { error: rejectionMessageForFormat(file.name || "The file", format) };
  }
  // Derived from the signature rather than from file.type, so a request
  // claiming the wrong type cannot get an object stored under it.
  const contentType = `image/${format}`;

  if (bytes.byteLength > MAX_SIZE_BYTES) {
    return { error: `File must be under ${formatBytes(MAX_SIZE_BYTES)}.` };
  }

  if (!kind) return { bytes, contentType };

  const target = IMAGE_TARGETS[kind];
  if (bytes.byteLength > target.maxBytes) {
    return {
      error:
        `${file.name || "The image"} is ${formatBytes(bytes.byteLength)}, over the ` +
        `${formatBytes(target.maxBytes)} limit for a ${target.label}. ` +
        `It should have been compressed before upload — try choosing the file again.`,
    };
  }

  // Dimensions are read from the bytes with sharp, which is already a
  // dependency and already loaded lazily on this path.
  try {
    const sharp = (await import("sharp")).default;
    const { width, height } = await sharp(bytes).metadata();
    if (!width || !height) {
      return { error: `${file.name || "The image"} has no readable image data.` };
    }
    if (width > target.maxWidth || height > target.maxHeight) {
      return {
        error:
          `${file.name || "The image"} is ${width} × ${height} px, larger than the ` +
          `${target.maxWidth} × ${target.maxHeight} px limit for a ${target.label}. ` +
          `It should have been resized before upload — try choosing the file again.`,
      };
    }
    if (width < target.minWidth || height < target.minHeight) {
      return {
        error:
          `${file.name || "The image"} is ${width} × ${height} px, too small for a ${target.label}. ` +
          `It needs to be at least ${target.minWidth} × ${target.minHeight} px.`,
      };
    }
  } catch (error) {
    // A metadata read that fails on bytes that already passed the signature
    // check means something is wrong with the file, not with the rules.
    console.warn("[uploads] could not read image metadata", {
      name: file.name,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: `${file.name || "The image"} could not be read as an image.` };
  }

  return { bytes, contentType };
}

function parseKind(value: FormDataEntryValue | null): ImageKind | null {
  if (typeof value !== "string") return null;
  return value in IMAGE_TARGETS ? (value as ImageKind) : null;
}

export interface UploadImageResult {
  url?: string;
  error?: string;
}

// Generic single-file upload used by every image picker in the admin product
// form (category image, gallery images, variant images, inline description
// images). Images upload immediately on selection rather than waiting for
// the whole form to submit — see ProductForm.tsx for why.
export async function uploadAdminImage(
  prefix: UploadPrefix,
  formData: FormData,
): Promise<UploadImageResult> {
  if (!ALLOWED_PREFIXES.includes(prefix)) {
    return { error: "Invalid upload destination." };
  }

  const supabase = await requireAdminClient();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided." };
  }

  // Checked against the bytes, not file.type -- see validateUpload.
  const validated = await validateUpload(file, parseKind(formData.get("kind")));
  if ("error" in validated) {
    return { error: validated.error };
  }
  const bytes = validated.bytes;

  const maxDimension = MAX_DIMENSION_BY_PREFIX[prefix];
  const resized = maxDimension ? await capDimensions(file, bytes, maxDimension) : null;

  // The uuid is what makes a replaced image a genuinely new URL, so a
  // browser or CDN can never serve the previous file from cache in its
  // place. The name is only there to keep the object readable in the
  // Supabase dashboard.
  const path = `${prefix}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, resized ? resized.data : bytes, {
      upsert: false,
      // Always set explicitly now that the body is always a Buffer: a
      // Buffer carries no type of its own, and the bucket's
      // allowed_mime_types check (sql/065) runs against whatever is sent.
      contentType: resized ? resized.contentType : validated.contentType,
    });

  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
