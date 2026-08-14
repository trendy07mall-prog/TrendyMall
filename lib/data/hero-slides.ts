import { createClient } from "@/lib/supabase/server";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  desktopImageUrl: string;
  mobileImageUrl: string;
  sortOrder: number;
}

// Gating (status/start_at/end_at) is enforced HERE, in application code,
// not left to RLS -- same convention as lib/data/campaigns.ts. status is
// pushed to SQL; start_at/end_at are both nullable here (unlike
// campaigns.start_at), so the date window is checked in JS after fetch
// rather than needing a Postgrest `.or()` filter for nullable columns --
// the hero slide list is always small (a handful of rows), so fetching
// every published row and filtering in JS is simpler with no real cost.
export async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .select(
      "id, title, subtitle, button_text, button_link, desktop_image_url, mobile_image_url, sort_order, start_at, end_at",
    )
    .eq("status", "published")
    .order("sort_order");

  if (error || !data) return [];

  const now = Date.now();
  return data
    .filter((row) => {
      if (row.start_at && new Date(row.start_at).getTime() > now) return false;
      if (row.end_at && new Date(row.end_at).getTime() < now) return false;
      return true;
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      buttonText: row.button_text,
      buttonLink: row.button_link,
      desktopImageUrl: row.desktop_image_url,
      mobileImageUrl: row.mobile_image_url,
      sortOrder: row.sort_order,
    }));
}
