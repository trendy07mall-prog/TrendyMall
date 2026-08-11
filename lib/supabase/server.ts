import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

// Request-scoped, not cross-request -- React's cache() is cleared for every
// new incoming request, so there's no risk of one session's client leaking
// into another's. This just means every data function that calls
// createClient() during the same render gets back the SAME client instance
// instead of a fresh one each time, which is the prerequisite for cache()
// on any function that takes this client as an argument (its own cache key
// includes the client reference -- a new instance per call would never
// match, even with otherwise-identical arguments).
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — safe to ignore since
            // proxy.ts refreshes the session cookie on every request.
          }
        },
      },
    },
  );
});
