import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { PageHero } from "@/components/content/PageHero";
import { ReturnsEligibilitySection } from "@/components/content/returns/ReturnsEligibilitySection";
import { ReturnsProcessSection } from "@/components/content/returns/ReturnsProcessSection";
import { PolicyDetailsCard } from "@/components/content/PolicyDetailsCard";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getPoliciesSettings, getGeneralSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Returns & Refunds Policy",
  description:
    "TrendyMall returns policy — 48-hour eligibility window, what qualifies for return, and how the process works.",
  alternates: { canonical: "/returns" },
};

export default async function ReturnsPage() {
  const [policies, general] = await Promise.all([getPoliciesSettings(), getGeneralSettings()]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 pt-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Returns & Refunds" }]} />
      </div>

      <PageHero
        eyebrow="Returns & Refunds"
        title="Returns Made Simple"
        subtitle="Damaged, defective, or incorrectly shipped? Here's exactly how returns work."
      />

      <ReturnsEligibilitySection />
      <ReturnsProcessSection whatsappNumber={general.whatsappNumber} general={general} />

      <PolicyDetailsCard title="Full Returns & Refunds Policy" html={policies.returnsBody}>
        <PolicyContactBlock general={general} />
      </PolicyDetailsCard>
    </div>
  );
}
