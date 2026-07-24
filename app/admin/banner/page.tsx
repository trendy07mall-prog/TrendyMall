import { createClient } from "@/lib/supabase/server";
import { BannerForm } from "@/components/admin/BannerForm";

export default async function AdminBannerPage() {
  const supabase = await createClient();
  const { data: banner } = await supabase
    .from("site_banner")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Promo Banner
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Shown at the top of every page when active. Visitors who dismiss it
        won&apos;t see it again on this device unless you change the message.
      </p>
      <BannerForm banner={banner} />
    </div>
  );
}
