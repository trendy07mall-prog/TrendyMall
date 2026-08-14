import type { Metadata } from "next";
import { PolicyBody } from "@/components/content/PolicyBody";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { getPoliciesSettings } from "@/lib/data/settings";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "TrendyMall shipping policy — delivery times, charges, Cash on Delivery, and order tracking across Sri Lanka.",
  alternates: { canonical: "/shipping" },
};

export default async function ShippingPage() {
  const [policies, zones] = await Promise.all([getPoliciesSettings(), getActiveDeliveryZones()]);
  const inZoneRate = zones.find((zone) => zone.districtMatch === "Colombo")?.rate ?? RATE_IN_ZONE;
  const outsideZoneRate = zones.find((zone) => zone.isDefault)?.rate ?? RATE_OUTSIDE_ZONE;

  return (
    <PolicyBody title="Shipping Policy" html={policies.shippingBody}>
      <h2 className="font-heading mt-4 text-lg font-bold">Delivery Charges</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Delivery Area</th>
              <th className="py-2">Shipping Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-4">Colombo 01–15 (including Colombo Fort)</td>
              <td className="py-2">{formatPrice(inZoneRate)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Outside Colombo</td>
              <td className="py-2">{formatPrice(outsideZoneRate)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PolicyBody>
  );
}
