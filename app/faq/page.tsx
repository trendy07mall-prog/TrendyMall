import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";
import { Accordion } from "@/components/content/Accordion";
import { getGeneralSettings } from "@/lib/data/settings";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";
import { formatBusinessHoursSummary } from "@/lib/campaign-datetime";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about TrendyMall delivery, payment, returns, and support.",
  alternates: { canonical: "/faq" },
};

// The 48-hour return window stays hardcoded here until Phase 4 (Policies)
// -- delivery rate wording is now Settings-driven (Phase 3).
export default async function FaqPage() {
  const [general, zones] = await Promise.all([getGeneralSettings(), getActiveDeliveryZones()]);
  const inZoneRate = zones.find((zone) => zone.districtMatch === "Colombo")?.rate ?? RATE_IN_ZONE;
  const outsideZoneRate = zones.find((zone) => zone.isDefault)?.rate ?? RATE_OUTSIDE_ZONE;
  const phoneDisplay = general.phone.replace(/^\+94/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  const whatsappDisplay = general.whatsappNumber
    .replace(/^94/, "0")
    .replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  const hours = formatBusinessHoursSummary(general.businessHours).replace("Daily,", "daily");

  const faqItems = [
    {
      question: "How long does delivery take?",
      answer:
        "Standard islandwide delivery takes 3–5 business days. Orders are processed within 24 hours after confirmation (excluding Sundays and public holidays).",
    },
    {
      question: "How much does delivery cost?",
      answer: `${formatPrice(inZoneRate)} for Colombo 01–15 (including Colombo Fort), and ${formatPrice(outsideZoneRate)} for areas outside Colombo.`,
    },
    {
      question: "Do you offer Cash on Delivery?",
      answer: "Yes, Cash on Delivery (COD) is available for eligible orders across Sri Lanka.",
    },
    {
      question: "Can I track my order?",
      answer:
        "Yes. Once your order is dispatched, you'll receive tracking updates via WhatsApp, SMS, and email.",
    },
    {
      question: "What is your return policy?",
      answer:
        "Returns are accepted only for products that arrive damaged, defective, or incorrectly shipped, and must be requested within 48 hours of delivery. See our Returns & Refunds Policy for full details.",
    },
    {
      question: "How do I contact customer support?",
      answer: `WhatsApp us at ${whatsappDisplay}, call ${phoneDisplay}, or email ${general.email}. We're available ${hours}.`,
    },
  ];

  return (
    <PageShell title="Frequently Asked Questions">
      <Accordion items={faqItems} />
    </PageShell>
  );
}
