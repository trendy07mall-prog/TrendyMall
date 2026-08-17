import { CloseIcon, CheckIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

const OLD_MODEL = [
  "Third-party platform fees built into every sale",
  "Higher prices to cover platform costs",
  "Payment settlement delays",
  "Less control over pricing and customer experience",
];

const OUR_DIRECTION = [
  "Fairer pricing, without a platform's cut",
  "Direct relationships with our customers",
  "Better control over service and delivery",
  "Built for long-term, steady growth",
];

export function AboutComparison() {
  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
            Why We Built This
          </p>
          <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Moving away from the third-party platform model
          </h2>
        </FadeIn>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FadeIn>
            <div className="h-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                The old model
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {OLD_MODEL.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--muted)]">
                    <CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="h-full rounded-[var(--radius-card)] border border-[#16A34A]/30 bg-[#16A34A]/5 p-[var(--card-padding)]">
              <h3 className="text-sm font-semibold text-[#16A34A] uppercase tracking-wide">Our direction</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {OUR_DIRECTION.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-[var(--foreground)]">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
