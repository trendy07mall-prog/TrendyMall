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
// Deliberately a full document navigation, not router.push("/") +
// router.refresh(). Sign-out almost always happens from a page that IS
// already "/" (login lands there), which makes push("/") a same-route
// no-op -- nothing refetches, so every server component still renders the
// pre-logout session and the header stays stuck showing the account menu
// permanently, not just briefly. Measured: 5/5 logouts never corrected
// the header within 15s; only a manual reload fixed it. refresh() doesn't
// save it either -- it's fire-and-forget and races the cookie clear that
// signOut() has only just committed.
//
// A real navigation re-requests the document with the cleared cookie, so
// the server renders logged-out unconditionally. Nothing async is left
// in flight to lose here (unlike sign-IN, where an in-flight cart merge
// must be allowed to finish -- see login-form.tsx).
export async function clientSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.assign("/");
}
