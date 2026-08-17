import type { Metadata } from "next";
import { getGeneralSettings, getSocialSettings, getPaymentSettings } from "@/lib/data/settings";
import { getCategoriesWithProducts } from "@/lib/data/categories";
import { isPayHereEnabled } from "@/lib/payhere";
import { AboutHero } from "@/components/content/about/AboutHero";
import { AboutTimeline } from "@/components/content/about/AboutTimeline";
import { AboutComparison } from "@/components/content/about/AboutComparison";
import { AboutValues } from "@/components/content/about/AboutValues";
import { AboutCategories } from "@/components/content/about/AboutCategories";
import { AboutProcess } from "@/components/content/about/AboutProcess";
import { AboutExperience } from "@/components/content/about/AboutExperience";
import { AboutDeliveryReturns } from "@/components/content/about/AboutDeliveryReturns";
import { AboutFuture } from "@/components/content/about/AboutFuture";
import { AboutCustomersSellers } from "@/components/content/about/AboutCustomersSellers";
import { AboutTrustBand } from "@/components/content/about/AboutTrustBand";
import { AboutContact } from "@/components/content/about/AboutContact";
import { AboutFinalCta } from "@/components/content/about/AboutFinalCta";

export const metadata: Metadata = {
  title: "About TrendyMall | Fair Pricing & Trusted Online Shopping in Sri Lanka",
  description:
    "TrendyMall is Sri Lanka's online store for electronics, built on fair pricing and honest service. Read our story and shop the current catalog.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [general, social, paymentSettings, categories] = await Promise.all([
    getGeneralSettings(),
    getSocialSettings(),
    getPaymentSettings(),
    getCategoriesWithProducts(),
  ]);

  // Same gate checkout itself uses (app/checkout/page.tsx) -- Card only
  // reads as available here if it would actually be selectable at checkout.
  const cardAvailable = isPayHereEnabled() && paymentSettings.onlinePaymentEnabled;

  return (
    <div className="flex flex-1 flex-col">
      <AboutHero />
      <AboutTimeline />
      <AboutComparison />
      <AboutValues />
      <AboutCategories categories={categories} />
      <AboutProcess />
      <AboutExperience
        codEnabled={paymentSettings.codEnabled}
        bankTransferEnabled={paymentSettings.bankTransferEnabled}
        cardAvailable={cardAvailable}
      />
      <AboutDeliveryReturns />
      <AboutFuture />
      <AboutCustomersSellers />
      <AboutTrustBand />
      <AboutContact general={general} social={social} />
      <AboutFinalCta />
    </div>
  );
}
