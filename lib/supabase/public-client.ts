import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// A Supabase client that reads NO cookies, for the storefront's public,
// cacheable reads (lib/data/cached.ts).
//
// Two reasons this has to exist separately from lib/supabase/server.ts's
// createClient():
//
// 1. unstable_cache refuses to run anything that touches cookies() inside a
//    cached scope -- and rightly so, since a value keyed on one visitor's
//    session must never be handed to another.
// 2. Correctness, not just mechanics: a cached result is shared by every
//    visitor, so it must be the ANONYMOUS view of the data. Running these
//    queries with no session means RLS evaluates them exactly as it would
//    for a logged-out shopper, which is precisely what gets cached and
//    replayed. Using an authenticated (or worse, service-role) client here
//    could cache one user's -- or an admin's -- view and serve it to
//    everyone.
//
// This is the anon key, so RLS still applies in full; it is not a bypass.
export function createPublicClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Nothing to persist: this client is deliberately session-less.
        },
      },
    },
  );
}
