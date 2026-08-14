import type { Metadata } from "next";
import { PolicyBody } from "@/components/content/PolicyBody";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getGeneralSettings, getPoliciesSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Returns & Refunds Policy",
  description:
    "TrendyMall returns and refunds policy — eligibility, conditions, and how replacements or refunds are handled.",
  alternates: { canonical: "/returns" },
};

export default async function ReturnsPage() {
  const [policies, general] = await Promise.all([getPoliciesSettings(), getGeneralSettings()]);

  return (
    <PolicyBody title="Returns & Refunds Policy" html={policies.returnsBody}>
      <PolicyContactBlock general={general} />
    </PolicyBody>
  );
}
