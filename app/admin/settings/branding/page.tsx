import { getBrandingSettings } from "@/lib/data/settings";
import { BrandingSettingsForm } from "@/components/admin/settings/BrandingSettingsForm";

export default async function SettingsBrandingPage() {
  const branding = await getBrandingSettings();

  return (
    <div>
      <h2 className="text-lg font-semibold">Branding</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Logos, favicon, and brand colors. Logo/favicon changes apply to the live site; colors are
        reference-only for now.
      </p>
      <div className="mt-6">
        <BrandingSettingsForm initial={branding} />
      </div>
    </div>
  );
}
