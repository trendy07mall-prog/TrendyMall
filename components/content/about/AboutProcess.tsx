import { FadeIn } from "@/components/motion/FadeIn";

const STEPS = [
  {
    title: "Customer Demand",
    description: "We start with what customers are actually looking for.",
  },
  {
    title: "Quality",
    description: "Every product is checked for build quality before it's listed.",
  },
  {
    title: "Price",
    description: "We compare pricing to make sure it's genuinely fair value.",
  },
  {
    title: "Reliability",
    description: "We favor products and suppliers we can consistently depend on.",
  },
];

export function AboutProcess() {
  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
          How We Choose Products
        </p>
        <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          What earns a spot in our catalog
        </h2>
      </FadeIn>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <FadeIn key={step.title} delay={index * 0.06}>
            <div className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F2D52] text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="text-xs text-[var(--muted)]">{step.description}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
