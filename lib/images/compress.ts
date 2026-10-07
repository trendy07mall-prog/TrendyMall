/**
 * Shrink an upload to its target, in the browser, before it is sent.
 *
 * WHY IN THE BROWSER. The upload is a server action, and an action request
 * is capped (6mb, next.config.ts). Compressing first means a 5 MB phone
 * photo crosses the wire as ~140 KB, which is faster for whoever is
 * standing in a shop on mobile data, costs less Supabase storage, and --
 * the real prize -- cuts how much work Vercel's image optimizer does per
 * distinct source, which is what is actually billed.
 *
 * WHAT THIS DOES NOT DO: it does not make the SITE faster for visitors.
 * Every stored image is re-encoded through /_next/image on the way out
 * (rich-text ones too -- lib/rich-text.ts rewrites those <img> tags), so
 * what a visitor downloads is decided there, not here.
 *
 * HOW IT IS TESTABLE. Everything that needs a canvas is behind the
 * ImageEncoder interface below. The decision-making -- which target, what
 * size, which quality, when to give up, what to say -- is plain functions
 * over plain numbers, so the test suite drives the whole ladder, including
 * the Safari-can't-encode-WebP path, without a browser.
 */

import {
  DIMENSION_STEP,
  IMAGE_TARGETS,
  MAX_INPUT_BYTES,
  QUALITY_STEPS,
  compressionNote,
  formatBytes,
  type ImageKind,
  type ImageTarget,
} from "./targets";
import { detectFormat, isAccepted, rejectionMessageForFormat } from "./sniff";

export interface Dimensions {
  width: number;
  height: number;
}

export interface DecodedImage extends Dimensions {
  /** True when any pixel is not fully opaque. Decides JPEG-fallback safety. */
  hasAlpha: boolean;
}

export interface EncodedImage {
  blob: Blob;
  /** What the browser ACTUALLY produced, which is not always what we asked. */
  type: string;
  size: number;
}

/**
 * The canvas-shaped half, injected so tests can drive it. The browser
 * implementation lives in encoder.ts; tests pass a fake.
 */
export interface ImageEncoder {
  decode(file: Blob): Promise<DecodedImage>;
  encode(options: {
    width: number;
    height: number;
    quality: number;
    type: "image/webp" | "image/jpeg";
  }): Promise<EncodedImage>;
  /** Frees the decoded bitmap. Called once, always, even on failure. */
  dispose?(): void;
}

export type CompressSuccess = {
  ok: true;
  file: File;
  note: string;
  width: number;
  height: number;
  format: "webp" | "jpeg";
  fromBytes: number;
  toBytes: number;
};

export type CompressFailure = {
  ok: false;
  /** Always names the file, what was found, what is allowed, what to do. */
  message: string;
  /** For tests and logs; never shown on its own. */
  code:
    | "too-large"
    | "bad-format"
    | "too-small"
    | "decode-failed"
    | "encode-failed"
    | "no-webp-with-alpha"
    | "cannot-reach-target";
};

export type CompressResult = CompressSuccess | CompressFailure;

/**
 * Scales (w, h) to fit inside the box, preserving aspect ratio.
 * NEVER upscales: a 300x300 logo stays 300x300 inside a 600x600 box.
 */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number): Dimensions {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** True when the image is too small to look sharp at this target. */
export function isTooSmall(width: number, height: number, target: ImageTarget): boolean {
  return width < target.minWidth || height < target.minHeight;
}

/**
 * The sizes to try, largest first: the fitted size, then 90% steps, stopping
 * before anything would fall under the target's floor.
 */
export function dimensionLadder(start: Dimensions, target: ImageTarget): Dimensions[] {
  const steps: Dimensions[] = [start];
  let current = start;
  // Bounded hard as well as by the floor -- a pathological aspect ratio
  // must not be able to spin this.
  for (let i = 0; i < 20; i++) {
    const next = {
      width: Math.round(current.width * DIMENSION_STEP),
      height: Math.round(current.height * DIMENSION_STEP),
    };
    if (next.width < target.minWidth || next.height < target.minHeight) break;
    if (next.width === current.width && next.height === current.height) break;
    steps.push(next);
    current = next;
  }
  return steps;
}

/** Replaces the extension, keeping a tidy, storage-safe base name. */
export function outputFileName(originalName: string, format: "webp" | "jpeg"): string {
  const base = originalName.replace(/\.[^./\\]+$/, "") || "image";
  const safe =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  return `${safe}.${format === "webp" ? "webp" : "jpg"}`;
}

function tooSmallMessage(name: string, got: Dimensions, target: ImageTarget): string {
  return (
    `${name} is ${got.width} × ${got.height} px, which is too small for a ${target.label} and would look blurry. ` +
    `It needs to be at least ${target.minWidth} × ${target.minHeight} px — ` +
    `about ${target.maxWidth} × ${target.maxHeight} px is ideal. Upload a larger original if you have one.`
  );
}

/**
 * The whole pipeline for one file.
 *
 * Order matters and follows the spec: real type, then size, then decode
 * (which applies EXIF rotation and, by going through a canvas, drops all
 * EXIF/GPS metadata), then the too-small check on the ORIENTED dimensions,
 * then the quality ladder, then the dimension ladder.
 */
export async function compressImage(
  file: File,
  kind: ImageKind,
  makeEncoder: (file: File) => ImageEncoder,
): Promise<CompressResult> {
  const target = IMAGE_TARGETS[kind];
  const name = file.name || "image";

  // 1. What it actually is, from the bytes -- not the extension, not the
  //    browser-reported type.
  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, 300).arrayBuffer());
  } catch {
    return { ok: false, code: "decode-failed", message: `${name} could not be read. Try choosing the file again.` };
  }
  const format = detectFormat(head);
  if (!isAccepted(format)) {
    return { ok: false, code: "bad-format", message: rejectionMessageForFormat(name, format) };
  }

  // 2. Size ceiling, before anything is decoded into memory.
  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      code: "too-large",
      message:
        `${name} is ${formatBytes(file.size)}, over the ${formatBytes(MAX_INPUT_BYTES)} limit. ` +
        `Allowed: JPG, PNG or WebP up to ${formatBytes(MAX_INPUT_BYTES)}. ` +
        `Export it at a smaller size, or use your phone's "share at a smaller size" option, and upload that.`,
    };
  }

  const encoder = makeEncoder(file);
  try {
    // 3. Decode. EXIF orientation is applied here, so everything measured
    //    below is in the orientation the image will actually display in.
    let decoded: DecodedImage;
    try {
      decoded = await encoder.decode(file);
    } catch {
      // Never fall through to uploading the original: an uncompressed 5 MB
      // file silently taking the place of a 140 KB one is exactly the kind
      // of thing nobody notices until the storage bill.
      return {
        ok: false,
        code: "decode-failed",
        message:
          `${name} could not be opened in this browser — it may be damaged, or the image may be too large ` +
          `for this device's memory. Try a smaller version, or a different device. The file was not uploaded.`,
      };
    }

    if (!decoded.width || !decoded.height) {
      return {
        ok: false,
        code: "decode-failed",
        message: `${name} could not be opened — it has no readable image data. The file was not uploaded.`,
      };
    }

    // 4. Too small to look sharp. Checked on the oriented size.
    if (isTooSmall(decoded.width, decoded.height, target)) {
      return { ok: false, code: "too-small", message: tooSmallMessage(name, decoded, target) };
    }

    // 5/6. Quality ladder at each size, largest size first. Never upscales.
    const start = fitWithin(decoded.width, decoded.height, target.maxWidth, target.maxHeight);
    const sizes = dimensionLadder(start, target);

    // WebP unless the browser proves it cannot -- see the fallback below.
    let type: "image/webp" | "image/jpeg" = "image/webp";
    let smallest: { encoded: EncodedImage; size: Dimensions; format: "webp" | "jpeg" } | null = null;

    for (const size of sizes) {
      for (const quality of QUALITY_STEPS) {
        let encoded: EncodedImage;
        try {
          encoded = await encoder.encode({ ...size, quality, type });
        } catch {
          return {
            ok: false,
            code: "encode-failed",
            message:
              `${name} could not be compressed in this browser — it may have run out of memory. ` +
              `Try a smaller image, or a different device. The file was not uploaded.`,
          };
        }

        // THE SAFARI CHECK. canvas asked for WebP and may hand back PNG
        // without saying so. A PNG here would blow every target on this
        // page, so it is never uploaded.
        if (type === "image/webp" && encoded.type !== "image/webp") {
          if (target.keepTransparency && decoded.hasAlpha) {
            // JPEG has no alpha. Flattening a transparent logo onto a
            // guessed background is a silent visual change, so this stops
            // instead of guessing.
            return {
              ok: false,
              code: "no-webp-with-alpha",
              message:
                `${name} has a transparent background, and this browser can't save transparent images in WebP. ` +
                `Open the admin in Chrome, Edge or Firefox and upload it there, ` +
                `or upload a version with a solid background.`,
            };
          }
          // Opaque: JPEG reaches the same targets at the same qualities.
          type = "image/jpeg";
          try {
            encoded = await encoder.encode({ ...size, quality, type });
          } catch {
            return {
              ok: false,
              code: "encode-failed",
              message:
                `${name} could not be compressed in this browser. Try a different device. The file was not uploaded.`,
            };
          }
          if (encoded.type !== "image/jpeg") {
            return {
              ok: false,
              code: "encode-failed",
              message:
                `${name} could not be converted to a supported format in this browser. ` +
                `Open the admin in Chrome, Edge or Firefox and upload it there. The file was not uploaded.`,
            };
          }
        }

        const outFormat: "webp" | "jpeg" = encoded.type === "image/webp" ? "webp" : "jpeg";
        if (!smallest || encoded.size < smallest.encoded.size) {
          smallest = { encoded, size, format: outFormat };
        }

        if (encoded.size <= target.maxBytes) {
          const outName = outputFileName(name, outFormat);
          return {
            ok: true,
            file: new File([encoded.blob], outName, { type: encoded.type }),
            note: compressionNote({
              name,
              fromBytes: file.size,
              toBytes: encoded.size,
              width: size.width,
              height: size.height,
              format: outFormat,
            }),
            width: size.width,
            height: size.height,
            format: outFormat,
            fromBytes: file.size,
            toBytes: encoded.size,
          };
        }
      }
    }

    // 7. Everything tried, still over. Say so plainly rather than storing
    //    something that misses the budget.
    const best = smallest ? formatBytes(smallest.encoded.size) : "unknown";
    return {
      ok: false,
      code: "cannot-reach-target",
      message:
        `${name} couldn't be compressed under ${formatBytes(target.maxBytes)} for a ${target.label} — ` +
        `the smallest we could reach was ${best} at the lowest quality and smallest allowed size ` +
        `(${target.minWidth} × ${target.minHeight} px). ` +
        `Try a simpler image: photos with lots of fine detail, noise or text compress poorly. ` +
        `The file was not uploaded.`,
    };
  } finally {
    encoder.dispose?.();
  }
}
