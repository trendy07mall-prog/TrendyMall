"use server";

import { requireAdminClient } from "@/lib/admin/guard";

const ALLOWED_PREFIXES = ["categories", "products", "variants", "editor"] as const;
type UploadPrefix = (typeof ALLOWED_PREFIXES)[number];

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
