import { createClient } from "@/lib/supabase/server";
import type { SiteBanner } from "@/types";

export async function getActiveBanner(): Promise<SiteBanner | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_banner")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
