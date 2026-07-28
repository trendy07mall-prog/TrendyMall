"use server";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export interface UploadSlipResult {
  path?: string;
  error?: string;
}

// Mirrors lib/admin/uploads.ts's uploadAdminImage — uploads immediately on
// selection, returns a path (not a public URL — the bucket is private) for
// the checkout form to carry forward and pass into create_order_atomic.
// File type/size are validated here too, on top of the bucket's own
// file_size_limit/allowed_mime_types (sql/022) — defense in depth.
export async function uploadPaymentSlip(formData: FormData): Promise<UploadSlipResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: "Upload a JPG, PNG, or WEBP image." };
  if (file.size > MAX_SIZE_BYTES) return { error: "File must be under 5MB." };

  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage
    .from("payment-slips")
    .upload(path, file, { upsert: false });

  if (error) return { error: error.message };
  return { path };
}
