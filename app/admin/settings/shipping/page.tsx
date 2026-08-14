import { getShippingSettings } from "@/lib/data/settings";
import { getAdminDeliveryZones } from "@/lib/admin/delivery-zones-query";
import { ShippingSettingsForm } from "@/components/admin/settings/ShippingSettingsForm";
import { DeliveryZoneManager } from "@/components/admin/DeliveryZoneManager";

export default async function SettingsShippingPage() {
  const [shipping, zones] = await Promise.all([getShippingSettings(), getAdminDeliveryZones()]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-lg font-semibold">Delivery Zones</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Controls the real delivery fee charged at checkout — the same function every order, invoice, and
          email already used, now reading from here instead of a hardcoded rate. Colombo 1-15 must stay
          based on postal codes (00100–01500), not a district alone — Dehiwala and Moratuwa are
          administratively within Colombo District but outside this postal zone and must price at the
          catch-all rate.
        </p>
        <div className="mt-6">
          <DeliveryZoneManager zones={zones} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-8">
        <h2 className="text-lg font-semibold">Shipping</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Free shipping threshold and Store Pickup details.
        </p>
        <div className="mt-6">
          <ShippingSettingsForm initial={shipping} />
        </div>
      </div>
    </div>
  );
}
