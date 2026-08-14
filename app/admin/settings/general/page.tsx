import { getGeneralSettings } from "@/lib/data/settings";
import { GeneralSettingsForm } from "@/components/admin/settings/GeneralSettingsForm";

export default async function SettingsGeneralPage() {
  const general = await getGeneralSettings();

  return (
    <div>
      <h2 className="text-lg font-semibold">General</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Store identity, contact details, and business hours — the source every hardcoded
        &quot;Daily 10am–4pm&quot; reference across the site now reads from.
      </p>
      <div className="mt-6">
        <GeneralSettingsForm initial={general} />
      </div>
    </div>
  );
}
