import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Next.js 16 renamed Middleware to Proxy (same functionality, file must be
// named proxy.ts at the project root). This refreshes the Supabase session
// cookie on every request THAT HAS ONE (see hasSupabaseSessionCookie below
// -- a guest with no session cookie can't have anything to refresh) and
// does a cheap "is there a logged-in user" check for protected routes. It
// intentionally does NOT check is_admin here (that would mean a DB round
// trip on every request) — the real admin gate lives in
// app/admin/layout.tsx, backed by RLS as the actual security boundary.
// /checkout is deliberately not protected — guest checkout (v12 Phase 4)
// needs it reachable without a session; auth-awareness lives inside the
// checkout UI/logic itself instead (CheckoutForm/CheckoutAddress branch on
// whether a session exists, they don't require one).
const PROTECTED_PREFIXES = ["/admin", "/account"];

// Maintenance mode (Phase 5) never blocks these, regardless of the flag --
// an admin must always be able to reach /login and /admin (or a locked-out
// storefront becomes a locked-out owner too), /api must keep serving real
// external callers (the PayHere webhook, the campaign-ending cron), and
// /maintenance is the page itself (excluding it stops an infinite rewrite
// loop).
const MAINTENANCE_BYPASS_PREFIXES = ["/admin", "/login", "/api", "/maintenance"];

// supabase-js/ssr's default cookie storage key is `sb-<project-ref>-auth-
// token`, optionally chunked as `.0`/`.1`/... suffixes for large JWTs (see
// @supabase/ssr's clearAuthCookiesAtScopes.js) -- this project never
// overrides cookieOptions.name, so that pattern always holds. A request
// with none of these cookies is *guaranteed* to be a guest (there is
// nothing for Supabase to authenticate), so `auth.getUser()` -- a real
// network round trip -- only needs to run when a session actually might
// exist, never as a blind check on every single request regardless of
// login state.
function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

// Module-level, not per-request -- deliberately survives across requests
// handled by the same warm server instance, which is the entire point of a
// TTL cache here. A cold start or a second concurrent instance just means
// an extra query the first time each sees it, still a large reduction from
// "every single request" to "at most once per TTL window per instance."
// Maintenance mode must keep working for anonymous visitors (that's its
// primary use case), so unlike the auth check above this is NOT gated on
// session-cookie presence -- only cached, never skipped, on every public
// (non-bypass) page.
const MAINTENANCE_CACHE_TTL_MS = 45_000;
let maintenanceCache: { enabled: boolean; expiresAt: number } | null = null;

async function isMaintenanceEnabled(
  supabase: ReturnType<typeof createServerClient>,
): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return maintenanceCache.enabled;
  }
  // Fails open (query error/no row -> not in maintenance) so a Supabase
  // hiccup can never accidentally take the storefront down -- same
  // semantics as before caching, just also cached for the same TTL so a
  // sustained outage doesn't retry this on every request either.
  const { data: maintenanceRow } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "maintenance.enabled")
    .maybeSingle();
  const enabled = maintenanceRow?.value === true;
  maintenanceCache = { enabled, expiresAt: now + MAINTENANCE_CACHE_TTL_MS };
  return enabled;
}

// Anonymous, cookie-based -- no PII, stays the same across login/logout,
// distinct from Supabase's own sb-* auth cookies. lib/analytics/log-event.ts
// reads this same cookie to attribute every conversion event to a session.
const SESSION_COOKIE = "tm_session_id";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months

// utm_source wins when present; otherwise a simple two-bucket fallback --
// "organic" for any external referrer, "direct" for none. Real per-domain
// attribution (facebook.com vs google.com) is left to utm_source, which any
// real ad campaign should already be appending.
function resolveSource(request: NextRequest): string {
  const utmSource = request.nextUrl.searchParams.get("utm_source");
  if (utmSource) return utmSource.slice(0, 100);
  return request.headers.get("referer") ? "organic" : "direct";
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  let response = NextResponse.next({ request });

  // Decided now, applied to `response` at the very end (not here) --
  // Supabase's own setAll callback below reassigns `response` to a whole
  // new NextResponse whenever it refreshes the auth cookie, which would
  // silently drop a cookie set on the ORIGINAL object. Setting this last,
  // on whatever `response` finally is, is what makes it survive that.
  const existingSessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const isNewSession = !existingSessionId;
  const sessionId = existingSessionId ?? crypto.randomUUID();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // A request with no Supabase session cookie at all is guaranteed to be a
  // guest -- `user` stays null without ever hitting the network for it, and
  // both usages below (the protected-route check and maintenance's isAdmin
  // check) treat "no cookie" and "verified no user" identically anyway.
  // When a cookie IS present, this still runs on every request regardless
  // of route (public or protected) -- that's what refreshes the session
  // before expiry, so a logged-in user browsing only public pages for an
  // extended visit doesn't get silently signed out.
  const user = hasSupabaseSessionCookie(request) ? (await supabase.auth.getUser()).data.user : null;

  const path = request.nextUrl.pathname;

  const isMaintenanceBypass = MAINTENANCE_BYPASS_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (!isMaintenanceBypass) {
    const maintenanceEnabled = await isMaintenanceEnabled(supabase);

    if (maintenanceEnabled) {
      let isAdmin = false;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();
        isAdmin = Boolean(profile?.is_admin);
      }
      if (!isAdmin) {
        return NextResponse.rewrite(new URL("/maintenance", request.url));
      }
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  // First request of a brand-new session (no cookie yet) -- mint one and
  // attribute its source exactly once (the session_sources row's mere
  // existence is what marks a session "already attributed," so a later
  // visit in the same session never overwrites it). The insert runs via
  // waitUntil so it never adds latency to the response, and -- per the
  // lesson already learned on incrementProductViewCount -- is real
  // background work Vercel keeps the function alive for, not an unawaited
  // promise that risks never running.
  if (isNewSession) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
    const source = resolveSource(request);
    event.waitUntil(
      Promise.resolve(
        createAdminClient().from("session_sources").insert({ session_id: sessionId, source }),
      ).then(
        () => {},
        () => {},
      ),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|sitemap.xml|robots.txt|icon|apple-icon|opengraph-image|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
