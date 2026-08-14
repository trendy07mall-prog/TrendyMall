import { getSocialSettings } from "@/lib/data/settings";
import { SocialSettingsForm } from "@/components/admin/settings/SocialSettingsForm";

export default async function SettingsSocialPage() {
  const social = await getSocialSettings();

  return (
    <div>
      <h2 className="text-lg font-semibold">Social</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Social media links shown in the site footer and included in the site&apos;s structured data.
      </p>
      <div className="mt-6">
        <SocialSettingsForm initial={social} />
      </div>
    </div>
  );
}
