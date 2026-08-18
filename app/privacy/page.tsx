import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/content/LegalPageLayout";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getGeneralSettings, getPoliciesSettings, getPolicyLastUpdated } from "@/lib/data/settings";
import { extractTocAndAnnotateHtml } from "@/lib/policy-toc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TrendyMall collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const [policies, general, lastUpdated] = await Promise.all([
    getPoliciesSettings(),
    getGeneralSettings(),
    getPolicyLastUpdated("policies.privacy_body"),
  ]);
  const { html, toc } = extractTocAndAnnotateHtml(policies.privacyBody);

  return (
    <LegalPageLayout breadcrumbLabel="Privacy Policy" title="Privacy Policy" lastUpdated={lastUpdated} toc={toc} html={html}>
      <PolicyContactBlock general={general} />
    </LegalPageLayout>
  );
}
