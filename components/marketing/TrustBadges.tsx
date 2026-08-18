import { FadeIn } from "@/components/motion/FadeIn";

const FEATURES = [
  {
    icon: "🚚",
    title: "Fast Islandwide Delivery",
    description: "Colombo in 1–2 days, other areas in 2–4 working days.",
  },
  {
    icon: "✅",
    title: "Quality Checked Products",
    description:
      "Every product is carefully inspected before dispatch to ensure reliable performance.",
  },
  {
    icon: "💰",
    title: "Cash on Delivery",
    description: "Convenient Cash on Delivery available across Sri Lanka.",
  },
  {
    icon: "🔒",
    title: "Secure Shopping",
    description: "Shop with confidence through a secure and protected checkout experience.",
  },
  {
    icon: "⭐",
    title: "Trusted Customer Support",
    description: "Our team is ready to assist you before and after every purchase.",
  },
  {
    icon: "🏆",
    title: "Premium Mobile Accessories",
    description:
      "Carefully selected accessories designed for durability, performance, and everyday use.",
  },
];

export function TrustBadges({
  compact = false,
  codAvailable,
  warrantyAvailable,
  businessHoursSummary = "Fast Support Daily 10am–4pm",
}: {
  compact?: boolean;
  codAvailable?: boolean;
  warrantyAvailable?: boolean;
  // Settings-backed (general.business_hours), defaulting to today's live
  // text. Not yet threaded through the PDP's ProductPurchaseSection ->
  // ProductPage prop chain in Phase 1 (deliberately deferred, low-risk to
  // add later) -- this component is ready to receive the real value
  // whenever that's wired.
  businessHoursSummary?: string;
}) {
  if (compact) {
    // A PDP-specific badge list -- distinct from FEATURES above (which
    // stays untouched for the homepage) since Cash on Delivery and
    // Warranty are real per-product flags here, not always-on claims.
    const compactBadges = [
      { icon: "✅", title: "100% Genuine" },
      { icon: "🚚", title: "Islandwide Delivery" },
      { icon: "🔒", title: "Secure Checkout — Your data is encrypted" },
      ...(codAvailable ? [{ icon: "💰", title: "Cash on Delivery" }] : []),
      ...(warrantyAvailable ? [{ icon: "🛡️", title: "Warranty Included" }] : []),
      { icon: "💬", title: businessHoursSummary },
    ];
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {compactBadges.map((badge) => (
          <div
            key={badge.title}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--color-card)] px-3 py-2.5 text-xs font-medium"
          >
            <span aria-hidden="true" className="shrink-0">
              {badge.icon}
            </span>
            <span className="min-w-0 text-[var(--muted)]">{badge.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <FadeIn>
        <h2 className="font-heading text-center text-[32px] font-extrabold tracking-tight">
          Why Shop With TrendyMall
        </h2>
      </FadeIn>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <FadeIn key={feature.title} delay={index * 0.05}>
            <div className="h-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-6 transition-[border-color,box-shadow] duration-200 ease-in-out hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]">
              <span className="text-2xl" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                {feature.description}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
