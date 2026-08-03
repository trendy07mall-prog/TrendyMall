import { createClient } from "@/lib/supabase/server";
import { MobileBottomNavClient } from "@/components/layout/MobileBottomNavClient";

// Same server/client split as Navbar.tsx/NavbarClient.tsx — fetches auth
// state once so the client component can point "Account" at /account or
// /login without its own client-side auth check.
export async function MobileBottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <MobileBottomNavClient isLoggedIn={Boolean(user)} />;
}
