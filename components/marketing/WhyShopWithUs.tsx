import { TruckIcon, PriceTagIcon, ReturnIcon, HeadsetIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

// Wording matches the site's already-corrected trust-badge language
// (components/marketing/TrustSection.tsx) — no unbacked claims: support
// hours are the real hours (never "24/7"), returns match the real
// 48-hour reporting window (still hardcoded, Phase 4 scope), nothing about
// payment protection (no online payment processing is live yet).
export function WhyShopWithUs({
  businessHoursSummary = "WhatsApp or call us, daily 10am–4pm.",
}: {
  // Settings-backed (general.business_hours), defaulting to today's live
  // text.
  businessHoursSummary?: string;
}) {
  const reasons = [
    {
      icon: TruckIcon,
      title: "Fast Delivery",
      description: "Islandwide delivery in 3–5 business days.",
    },
    {
      icon: PriceTagIcon,
      title: "Best Prices",
      description: "Competitive pricing with regular special offers.",
    },
    {
      icon: ReturnIcon,
      title: "Easy Returns",
      description: "Damaged or wrong item? Reported within 48hrs.",
    },
    {
      icon: HeadsetIcon,
      title: "Customer Support",
      description: businessHoursSummary,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]">
      <FadeIn>
        <h2 className="font-heading text-center text-[32px] font-extrabold tracking-tight">
          Why Shop With Us
        </h2>
      </FadeIn>
      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {reasons.map((reason, index) => (
          <FadeIn key={reason.title} delay={index * 0.05}>
            <div className="flex h-full flex-col items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1">
              <reason.icon className="h-9 w-9 shrink-0 text-[var(--foreground)]" />
              <h3 className="text-sm font-semibold">{reason.title}</h3>
              <p className="text-xs text-[var(--muted)]">{reason.description}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
