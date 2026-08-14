import type { Metadata } from "next";
import { PolicyBody } from "@/components/content/PolicyBody";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getGeneralSettings, getPoliciesSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TrendyMall collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const [policies, general] = await Promise.all([getPoliciesSettings(), getGeneralSettings()]);

  return (
    <PolicyBody title="Privacy Policy" html={policies.privacyBody}>
      <PolicyContactBlock general={general} />
    </PolicyBody>
  );
}
