import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const supabase = await createClient();
  const safe = query.replace(/[%_,]/g, " ").trim();
  if (!safe) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .or(`name.ilike.%${safe}%,description.ilike.%${safe}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  if (error) throw error;
  return data.map((p) => p.slug);
}
