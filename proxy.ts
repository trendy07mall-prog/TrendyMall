import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Next.js 16 renamed Middleware to Proxy (same functionality, file must be
// named proxy.ts at the project root). This refreshes the Supabase session
// cookie on every request and does a cheap "is there a logged-in user"
// check for protected routes. It intentionally does NOT check is_admin here
// (that would mean a DB round trip on every request) — the real admin gate
// lives in app/admin/layout.tsx, backed by RLS as the actual security
// boundary.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isMaintenanceBypass = MAINTENANCE_BYPASS_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (!isMaintenanceBypass) {
    // One extra indexed primary-key read on every non-bypass request --
    // the same lightweight client already built above, no second
    // connection. Fails open (query error/no row -> not in maintenance)
    // so a Supabase hiccup can never accidentally take the storefront
    // down. The more expensive is_admin lookup only runs in the rare
    // branch where maintenance is actually on.
    const { data: maintenanceRow } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "maintenance.enabled")
      .maybeSingle();
    const maintenanceEnabled = maintenanceRow?.value === true;

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
