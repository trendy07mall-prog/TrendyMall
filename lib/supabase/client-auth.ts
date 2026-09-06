"use client";

import type { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Signing out (or in) must happen through THIS browser tab's own Supabase
// client, not a Server Action -- a Server Action's sign-out/sign-in runs
// against a separate server-side client and only updates the cookie, so a
// Next.js soft (client-side) redirect back never tells this tab's own
// long-lived Supabase client anything changed. That client is exactly what
// CartContext's onAuthStateChange listens to, so a Server-Action-only
// sign-out/sign-in leaves this tab believing the old auth state forever
// (until an unrelated hard reload happens to re-sync it) -- guest cart
// items silently never merge on login, and a "logged out" tab can still
// silently write to the previous account's server cart. Routing the actual
// signOut()/signInWithPassword() call through this tab's client instead
// fires onAuthStateChange immediately, the same way it would for any other
// client-triggered auth change.
export async function clientSignOut(router: ReturnType<typeof useRouter>) {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push("/");
  router.refresh();
}
