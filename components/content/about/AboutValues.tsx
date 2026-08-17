import { PriceTagIcon, LockIcon, AwardIcon, CheckBadgeIcon, TrendUpIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

const VALUES = [
  {
    icon: PriceTagIcon,
    title: "Fair Pricing",
    description: "Pricing our products fairly, without the markups a third-party platform adds.",
  },
  {
    icon: LockIcon,
    title: "Reliability",
    description: "Consistent service you can count on, order after order.",
  },
  {
    icon: AwardIcon,
    title: "Honesty",
    description: "Clear product info and honest communication — no hidden surprises.",
  },
  {
    icon: CheckBadgeIcon,
    title: "Trust",
    description: "Earning your trust with genuine products and dependable follow-through.",
  },
  {
    icon: TrendUpIcon,
    title: "Continuous Improvement",
    description: "Always refining our catalog, service, and delivery as we grow.",
  },
];

export function AboutValues() {
  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
          What We Stand For
        </p>
        <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          The principles behind every order
        </h2>
      </FadeIn>

      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-5">
        {VALUES.map((value, index) => (
          <FadeIn key={value.title} delay={index * 0.05}>
            <div className="flex h-full flex-col items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1">
              <value.icon className="h-9 w-9 shrink-0 text-[#0F2D52]" />
              <h3 className="text-sm font-semibold">{value.title}</h3>
              <p className="text-xs text-[var(--muted)]">{value.description}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
