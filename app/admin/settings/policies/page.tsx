import { getPoliciesSettings } from "@/lib/data/settings";
import { PoliciesSettingsForm } from "@/components/admin/settings/PoliciesSettingsForm";

export default async function SettingsPoliciesPage() {
  const policies = await getPoliciesSettings();

  return (
    <div>
      <h2 className="text-lg font-semibold">Policies</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Content for the Shipping, Returns &amp; Refunds, Privacy, Terms &amp; Conditions, and Warranty
        pages. Live data (delivery rates, your contact details) is never part of this text — it always
        renders separately, straight from the real settings elsewhere.
      </p>
      <div className="mt-6">
        <PoliciesSettingsForm initial={policies} />
      </div>
    </div>
  );
}
