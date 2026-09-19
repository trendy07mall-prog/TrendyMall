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

// --- "Shop by Brand" (homepage section, /brands, /brand/[slug]) ---------

// Homepage grid members, in the admin's curated order. is_featured is the
// only thing gating inclusion; the /brands directory below ignores it and
// lists everything. Ties on sort_order fall back to name so the order is
// deterministic rather than whatever Postgres returns.
export async function getFeaturedBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

// Every active brand, A-Z, for the /brands directory. Case-insensitive so
// a lowercase name can't sort after every capitalised one.
export async function getBrandsAlphabetical(): Promise<Brand[]> {
  const brands = await getBrands({ activeOnly: true });
  return [...brands].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
}

// Live product count per brand id, for the tile captions and the
// thin-content guard. One grouped read for every brand at once rather than
// a count query per brand, and the same "genuinely live" predicate used
// everywhere else products are counted. A brand with no products simply
// has no entry -- callers read it as 0.
export async function getBrandProductCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("brand_id")
    .eq("status", "published")
    .eq("is_deleted", false)
    .not("brand_id", "is", null);

  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.brand_id) counts[row.brand_id] = (counts[row.brand_id] ?? 0) + 1;
  }
  return counts;
}
