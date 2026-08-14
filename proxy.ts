import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|sitemap.xml|robots.txt|icon|apple-icon|opengraph-image|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
