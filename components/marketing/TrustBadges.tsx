import { FadeIn } from "@/components/motion/FadeIn";

const FEATURES = [
  {
    icon: "🚚",
    title: "Fast Islandwide Delivery",
    description: "Receive your order anywhere in Sri Lanka within 3–5 business days.",
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

export function TrustBadges({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
        {FEATURES.slice(0, 3).map((feature) => (
          <span key={feature.title} className="flex items-center gap-1.5">
            <span aria-hidden="true">{feature.icon}</span>
            {feature.title}
          </span>
        ))}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <FadeIn>
        <h2 className="font-heading text-center text-[32px] font-extrabold tracking-tight">
          Why Shop With TrendyMall
        </h2>
      </FadeIn>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <FadeIn key={feature.title} delay={index * 0.05}>
            <div className="h-full rounded-[var(--radius-lg)] border border-[var(--border)] p-6 transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
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
