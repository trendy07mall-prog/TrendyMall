import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data/categories";
import { NavbarClient } from "@/components/layout/NavbarClient";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

  // Top-level only -- the header's Categories dropdown is a simple flat
  // list, not a nested flyout, so a deeply-nested tree would just clutter it.
  const categories = await getCategories({ depth: 0 });

  return <NavbarClient user={user} isAdmin={isAdmin} categories={categories} />;
}
