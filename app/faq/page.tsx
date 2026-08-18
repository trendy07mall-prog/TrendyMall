import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { PageHero } from "@/components/content/PageHero";
import { FaqSearch, type FaqCategory } from "@/components/content/faq/FaqSearch";
import { WhatsAppIcon, MailIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";
import { getGeneralSettings } from "@/lib/data/settings";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { getWhatsAppUrl } from "@/lib/site";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about TrendyMall delivery, payment, returns, and support.",
  alternates: { canonical: "/faq" },
};

// Only real, existing questions -- no invented filler. Categorized per the
// requested grouping (Orders, Delivery, Payment, Returns & Warranty,
// Account), but "Orders" and "Account" have no real content today and are
// simply omitted rather than padded out. The old standalone "How do I
// contact support?" question is folded into the page's own "Still need
// help?" CTA below instead of duplicating it as a 6th category.
export default async function FaqPage() {
  const [general, zones] = await Promise.all([getGeneralSettings(), getActiveDeliveryZones()]);
  const inZoneRate = zones.find((zone) => zone.districtMatch === "Colombo")?.rate ?? RATE_IN_ZONE;
  const outsideZoneRate = zones.find((zone) => zone.isDefault)?.rate ?? RATE_OUTSIDE_ZONE;
  const whatsappUrl = getWhatsAppUrl("Hi, I have a question that's not answered in the FAQ:", general.whatsappNumber);

  const categories: FaqCategory[] = [
    {
      name: "Delivery",
      items: [
        {
          question: "How long does delivery take?",
          answer:
            "Colombo 01–15 delivers in 1–2 working days; other areas in 2–4 working days. These timeframes are estimated, not guaranteed. Orders are processed within 24 hours after confirmation (excluding Sundays and public holidays).",
        },
        {
          question: "How much does delivery cost?",
          answer: `${formatPrice(inZoneRate)} for Colombo 01–15 (including Colombo Fort), and ${formatPrice(outsideZoneRate)} for areas outside Colombo.`,
        },
        {
          question: "Can I track my order?",
          answer:
            "Yes. Once your order is dispatched, you'll receive tracking updates via WhatsApp, SMS, and email. You can also look it up anytime on our Track Order page.",
        },
      ],
    },
    {
      name: "Payment",
      items: [
        {
          question: "Do you offer Cash on Delivery?",
          answer: "Yes, Cash on Delivery (COD) is available for eligible orders across Sri Lanka.",
        },
      ],
    },
    {
      name: "Returns & Warranty",
      items: [
        {
          question: "What is your return policy?",
          answer:
            "Returns are accepted only for products that arrive damaged, defective, or incorrectly shipped, and must be requested within 48 hours of delivery. See our Returns & Refunds Policy for full details.",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 pt-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
      </div>

      <PageHero eyebrow="Support" title="Frequently Asked Questions" subtitle="Quick answers about delivery, payment, and returns." />

      <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
        <div className="mx-auto w-full max-w-3xl">
          <FaqSearch categories={categories} />
        </div>
      </section>

      <section className="px-6 py-16 text-center">
        <FadeIn>
          <h2 className="font-heading text-xl font-bold">Still need help?</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">We&apos;re happy to answer anything not covered here.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-brand flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-[#16A34A] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#15803d]"
            >
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp Us
            </a>
            <a
              href={`mailto:${general.email}`}
              className="transition-brand flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--foreground)] px-8 py-3.5 text-sm font-semibold hover:bg-black/5"
            >
              <MailIcon className="h-4 w-4" />
              Email Us
            </a>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
