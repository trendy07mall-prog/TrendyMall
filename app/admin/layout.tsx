import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  // Fetched only after the auth/is_admin guard above -- three cheap
  // head-count queries, real data only (see lib/admin/sidebar-badges.ts).
  const badges = await getSidebarBadges();
  const branding = await getBrandingSettings();

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
