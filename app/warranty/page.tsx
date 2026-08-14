import type { Metadata } from "next";
import { PolicyBody } from "@/components/content/PolicyBody";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getGeneralSettings, getPoliciesSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Warranty",
  description: "TrendyMall's warranty coverage for eligible products.",
  alternates: { canonical: "/warranty" },
};

export default async function WarrantyPage() {
  const [policies, general] = await Promise.all([getPoliciesSettings(), getGeneralSettings()]);

  return (
    <PolicyBody title="Warranty" html={policies.warrantyBody}>
      <PolicyContactBlock general={general} />
    </PolicyBody>
  );
}
