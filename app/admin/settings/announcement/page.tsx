import { getAnnouncementSettings } from "@/lib/data/settings";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { AnnouncementSettingsForm } from "@/components/admin/settings/AnnouncementSettingsForm";

export default async function SettingsAnnouncementPage() {
  const [announcement, zones] = await Promise.all([getAnnouncementSettings(), getActiveDeliveryZones()]);

  return (
    <div>
      <h2 className="text-lg font-semibold">Announcement Bar</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Up to 4 rotating messages shown at the top of every storefront page. Delivery-rate
        messages always show the real current shipping rate — never free-typed text.
      </p>
      <div className="mt-6">
        <AnnouncementSettingsForm initial={announcement} zones={zones} />
      </div>
    </div>
  );
}
