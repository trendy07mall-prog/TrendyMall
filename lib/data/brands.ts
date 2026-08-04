import { createClient } from "@/lib/supabase/server";
import type { Brand } from "@/types";

// activeOnly defaults to true for storefront callers; admin views need to
// see disabled brands too, so they pass false. Mirrors getCategories.
export async function getBrands(options?: { activeOnly?: boolean }): Promise<Brand[]> {
  const supabase = await createClient();
  let query = supabase.from("brands").select("*").order("name", { ascending: true });

  if (options?.activeOnly ?? true) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function getBrandById(id: string): Promise<Brand | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("*").eq("id", id).maybeSingle();
  return data;
}
