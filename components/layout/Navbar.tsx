import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getCachedCategories, getCachedBrandingSettings } from "@/lib/data/cached";
import { buildCategoryNav } from "@/lib/category-nav";
import { NavbarClient } from "@/components/layout/NavbarClient";

export async function Navbar() {
  // These three don't depend on each other, so they run together rather
  // than as three sequential round trips -- the header re-renders on every
  // navigation (and on every auth change), so its latency is felt on each
  // one. Only the is_admin lookup below genuinely has to wait, since it
  // needs the resolved user id.
  //
  // Every active category, not just the top level: the header's Categories
  // flyout (desktop) and accordion (mobile) both show a category's own
  // subcategories, which buildCategoryNav pairs up below. Still one cached
  // query -- deeper levels come along for the ride and are ignored there.
  const [supabase, { data: { user } }, branding, categories] = await Promise.all([
    createClient(),
    getAuthUser(),
    getCachedBrandingSettings(),
    getCachedCategories(),
  ]);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <NavbarClient
      user={user}
      isAdmin={isAdmin}
      categories={buildCategoryNav(categories)}
      logoUrl={branding.logoDesktopUrl}
    />
  );
}
