import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getCachedCategories, getCachedBrandingSettings } from "@/lib/data/cached";
import { NavbarClient } from "@/components/layout/NavbarClient";

export async function Navbar() {
  // These three don't depend on each other, so they run together rather
  // than as three sequential round trips -- the header re-renders on every
  // navigation (and on every auth change), so its latency is felt on each
  // one. Only the is_admin lookup below genuinely has to wait, since it
  // needs the resolved user id.
  //
  // Top-level categories only -- the header's Categories dropdown is a
  // simple flat list, not a nested flyout, so a deeply-nested tree would
  // just clutter it.
  const [supabase, { data: { user } }, branding, categories] = await Promise.all([
    createClient(),
    getAuthUser(),
    getCachedBrandingSettings(),
    getCachedCategories(0),
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
      categories={categories}
      logoUrl={branding.logoDesktopUrl}
    />
  );
}
