import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { PageHero } from "@/components/content/PageHero";
import { WarrantyAvailabilitySection } from "@/components/content/warranty/WarrantyAvailabilitySection";
import { WarrantyClaimSection } from "@/components/content/warranty/WarrantyClaimSection";
import { PolicyDetailsCard } from "@/components/content/PolicyDetailsCard";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getPoliciesSettings, getGeneralSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Warranty",
  description: "TrendyMall warranty — availability and duration depend on the product, and how to make a claim.",
  alternates: { canonical: "/warranty" },
};

export default async function WarrantyPage() {
  const [policies, general] = await Promise.all([getPoliciesSettings(), getGeneralSettings()]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 pt-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Warranty" }]} />
      </div>

      <PageHero
        eyebrow="Warranty"
        title="Warranty"
        subtitle="Coverage depends on the product — here's how to check and how to make a claim."
      />

      <WarrantyAvailabilitySection />
      <WarrantyClaimSection whatsappNumber={general.whatsappNumber} />

      <PolicyDetailsCard title="Full Warranty Policy" html={policies.warrantyBody}>
        <PolicyContactBlock general={general} />
      </PolicyDetailsCard>
    </div>
  );
}
