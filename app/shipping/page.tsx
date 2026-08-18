import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { PageHero } from "@/components/content/PageHero";
import { ShippingRatesSection } from "@/components/content/shipping/ShippingRatesSection";
import { ShippingTimeframeSection } from "@/components/content/shipping/ShippingTimeframeSection";
import { StorePickupSection } from "@/components/content/shipping/StorePickupSection";
import { PolicyDetailsCard } from "@/components/content/PolicyDetailsCard";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { getPoliciesSettings, getShippingSettings, getGeneralSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "TrendyMall shipping policy — delivery rates, timeframes, courier partners, and store pickup across Sri Lanka.",
  alternates: { canonical: "/shipping" },
};

export default async function ShippingPage() {
  const [policies, zones, shipping, general] = await Promise.all([
    getPoliciesSettings(),
    getActiveDeliveryZones(),
    getShippingSettings(),
    getGeneralSettings(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 pt-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shipping Policy" }]} />
      </div>

      <PageHero
        eyebrow="Shipping"
        title="Shipping Policy"
        subtitle="Fast, transparent delivery across Sri Lanka — here's exactly what to expect."
      />

      <ShippingRatesSection zones={zones} />
      <ShippingTimeframeSection />
      <StorePickupSection shipping={shipping} />

      <PolicyDetailsCard title="Full Shipping Policy" html={policies.shippingBody}>
        <PolicyContactBlock general={general} />
      </PolicyDetailsCard>
    </div>
  );
}
