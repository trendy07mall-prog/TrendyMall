"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export type ProductFormState = { error: string } | undefined;

type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdminClient>>;

async function uploadImages(
  supabase: AdminSupabaseClient,
  files: File[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;

    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: false });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

function readCommonFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const description = String(formData.get("description") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const stock = Number(formData.get("stock") ?? 0);
  const categoryId = String(formData.get("categoryId") ?? "");
  const isActive = formData.get("isActive") === "on";
  const extraUrls = String(formData.get("imageUrls") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File);

  return { name, slug, description, price, stock, categoryId, isActive, extraUrls, files };
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await requireAdminClient();
  const { name, slug, description, price, stock, categoryId, isActive, extraUrls, files } =
    readCommonFields(formData);

  if (!name || !categoryId) {
    return { error: "Name and category are required." };
  }

  let uploaded: string[] = [];
  try {
    uploaded = await uploadImages(supabase, files);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Image upload failed." };
  }

  const { error } = await supabase.from("products").insert({
    slug,
    name,
    description,
    price,
    stock,
    category_id: categoryId,
    images: [...extraUrls, ...uploaded],
    is_active: isActive,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await requireAdminClient();
  const { name, slug, description, price, stock, categoryId, isActive, extraUrls, files } =
    readCommonFields(formData);
  const keptUrls = formData.getAll("keepImage").map(String);

  if (!name || !categoryId) {
    return { error: "Name and category are required." };
  }

  let uploaded: string[] = [];
  try {
    uploaded = await uploadImages(supabase, files);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Image upload failed." };
  }

  const { error } = await supabase
    .from("products")
    .update({
      slug,
      name,
      description,
      price,
      stock,
      category_id: categoryId,
      images: [...keptUrls, ...extraUrls, ...uploaded],
      is_active: isActive,
    })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProduct(productId: string) {
  const supabase = await requireAdminClient();
  await supabase.from("products").delete().eq("id", productId);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}
