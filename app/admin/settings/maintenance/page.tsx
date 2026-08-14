import { getMaintenanceSettings } from "@/lib/data/settings";
import { MaintenanceSettingsForm } from "@/components/admin/settings/MaintenanceSettingsForm";

export default async function SettingsMaintenancePage() {
  const maintenance = await getMaintenanceSettings();

  return (
    <div>
      <h2 className="text-lg font-semibold">Maintenance Mode</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Take the storefront offline temporarily without ever locking yourself out of the admin panel.
      </p>
      <div className="mt-6">
        <MaintenanceSettingsForm initial={maintenance} />
      </div>
    </div>
  );
}
