import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { PageHero } from "@/components/content/PageHero";
import { TrackOrderForm } from "@/components/order/TrackOrderForm";
import { WhatsAppIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";
import { getGeneralSettings } from "@/lib/data/settings";
import { getWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Check your TrendyMall order using your order number and the phone or email you used.",
  alternates: { canonical: "/track-order" },
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  // Prefills the order number when linked from /order-confirmation's
  // "Track Order" button — never the contact field, which stays a real
  // second factor the customer must type themselves rather than
  // something a shareable link could leak. Unchanged from before this
  // redesign.
  const { orderNumber } = await searchParams;
  const general = await getGeneralSettings();
  const whatsappUrl = getWhatsAppUrl("Hi, I need help finding my order:", general.whatsappNumber);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 pt-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Track Order" }]} />
      </div>

      <PageHero
        eyebrow="Order Tracking"
        title="Track Your Order"
        subtitle="Enter your order number and the phone or email you used at checkout."
      />

      <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-12">
        <TrackOrderForm defaultOrderNumber={orderNumber} />
      </section>

      <section className="px-6 py-12 text-center">
        <FadeIn>
          <p className="text-sm text-[var(--muted)]">Can&apos;t find your order or need help?</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-brand mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-[#16A34A] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#15803d]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Chat With Us on WhatsApp
          </a>
        </FadeIn>
      </section>
    </div>
  );
}
