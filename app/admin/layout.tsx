import type { Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { VERIFIED_USER_HEADER } from "@/lib/auth-headers";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ToastProvider } from "@/components/admin/ToastProvider";
import { getSidebarBadges } from "@/lib/admin/sidebar-badges";
import { getBrandingSettings } from "@/lib/data/settings";

// Overrides the root's theme-color (app/manifest.ts sets #111111, matching
// the storefront's black AnnouncementBar so mobile browser chrome blends
// in seamlessly there) -- admin has no black header for that tint to
// blend into, so on admin routes it read as a stray bar above the plain
// white header. This segment's viewport takes precedence over the root's
// for everything under /admin.
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // proxy.ts already ran supabase.auth.getUser() for this same request and
  // forwarded the verified id (see VERIFIED_USER_HEADER there). Reading it
  // here removes a second, identical auth round trip from the critical path
  // of every admin page and every client-side admin navigation.
  //
  // This is not a weaker check, and not the security boundary: the header
  // cannot be spoofed (the proxy strips any inbound copy before it can be
  // set), the is_admin gate below still runs under RLS on every request,
  // and every admin mutation independently re-verifies through
  // requireAdminClient(). Falling back to getAuthUser() keeps the layout
  // correct on its own if the header is ever absent -- a request that
  // somehow bypassed the proxy is treated as unverified, not as trusted.
  // `|| null`, not `??`: the proxy blanks this header to "" when it
  // verified nobody, and "" is not nullish -- with ?? it would sail through
  // as a user id of empty string instead of falling back.
  const verifiedUserId = (await headers()).get(VERIFIED_USER_HEADER) || null;
  const userId = verifiedUserId ?? (await getAuthUser()).data.user?.id;

  if (!userId) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  // Both run only after the auth/is_admin gate above, but they don't depend
  // on each other, so they go together rather than one after the other --
  // that removed a whole round trip from every admin page load.
  const [badges, branding] = await Promise.all([
    getSidebarBadges(),
    getBrandingSettings(),
  ]);

  return (
    <ToastProvider>
      <div className="flex min-h-full flex-1 flex-col lg:flex-row">
        <AdminSidebar badges={badges} adminLogoUrl={branding.adminLogoUrl} />
        <div className="mx-auto w-full min-w-0 max-w-[var(--container-width)] flex-1 px-6 py-8">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
