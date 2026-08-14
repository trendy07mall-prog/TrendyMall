import { getNotificationSettings } from "@/lib/data/settings";
import { NotificationsSettingsForm } from "@/components/admin/settings/NotificationsSettingsForm";

export default async function SettingsNotificationsPage() {
  const notifications = await getNotificationSettings();

  return (
    <div>
      <h2 className="text-lg font-semibold">Notifications</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Emails sent to you (the store owner) when something happens. These never affect what customers
        receive.
      </p>
      <div className="mt-6">
        <NotificationsSettingsForm initial={notifications} />
      </div>
    </div>
  );
}
