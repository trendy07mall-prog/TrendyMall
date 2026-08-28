import { getAuthUser } from "@/lib/supabase/server";
import { MobileBottomNavClient } from "@/components/layout/MobileBottomNavClient";

// Same server/client split as Navbar.tsx/NavbarClient.tsx — fetches auth
// state once so the client component can point "Account" at /account or
// /login without its own client-side auth check. getAuthUser() is
// cache()-memoized per request, so this doesn't cost a second network round
// trip on top of Navbar's/Footer's own calls for the same page view.
export async function MobileBottomNav() {
  const {
    data: { user },
  } = await getAuthUser();

  return <MobileBottomNavClient isLoggedIn={Boolean(user)} />;
}
