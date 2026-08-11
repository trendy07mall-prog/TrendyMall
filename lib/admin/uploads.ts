"use server";

import { requireAdminClient } from "@/lib/admin/guard";

const ALLOWED_PREFIXES = ["categories", "brands", "products", "variants", "editor", "campaigns"] as const;
type UploadPrefix = (typeof ALLOWED_PREFIXES)[number];

// Same constants as lib/uploadPaymentSlip.ts -- checked here too, on top of
// the product-images bucket's own file_size_limit/allowed_mime_types
// (sql/065), for the same defense-in-depth reasoning: a client's
// accept="image/*" is only a UI hint, not a real constraint.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

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
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Upload a JPG, PNG, or WEBP image." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File must be under 5MB." };
  }

  const path = `${prefix}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: false });

  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
