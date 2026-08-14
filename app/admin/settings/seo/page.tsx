import { getSeoSettings } from "@/lib/data/settings";
import { SeoSettingsForm } from "@/components/admin/settings/SeoSettingsForm";

export default async function SettingsSeoPage() {
  const seo = await getSeoSettings();

  return (
    <div>
      <h2 className="text-lg font-semibold">SEO</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Default title, description, and social preview image for pages that don&apos;t set their own.
        Product, category, campaign, and order pages already have their own dedicated SEO data and are
        never overridden by these defaults.
      </p>
      <div className="mt-6">
        <SeoSettingsForm initial={seo} />
      </div>
    </div>
  );
}
