import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/content/LegalPageLayout";
import { PolicyContactBlock } from "@/components/content/PolicyContactBlock";
import { getGeneralSettings, getPoliciesSettings, getPolicyLastUpdated } from "@/lib/data/settings";
import { extractTocAndAnnotateHtml } from "@/lib/policy-toc";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions for shopping with TrendyMall.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const [policies, general, lastUpdated] = await Promise.all([
    getPoliciesSettings(),
    getGeneralSettings(),
    getPolicyLastUpdated("policies.terms_body"),
  ]);
  const { html, toc } = extractTocAndAnnotateHtml(policies.termsBody);

  return (
    <LegalPageLayout breadcrumbLabel="Terms & Conditions" title="Terms & Conditions" lastUpdated={lastUpdated} toc={toc} html={html}>
      <PolicyContactBlock general={general} />
    </LegalPageLayout>
  );
}
