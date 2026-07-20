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

  const categories = await getCategories();

  return <NavbarClient user={user} isAdmin={isAdmin} categories={categories} />;
}
