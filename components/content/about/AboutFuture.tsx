import { FadeIn } from "@/components/motion/FadeIn";

const STAGES = [
  { label: "Electronics", current: true },
  { label: "More Categories", current: false },
  { label: "More Sellers", current: false },
  { label: "Broader Marketplace", current: false },
];

export function AboutFuture() {
  return (
    <section className="bg-[#0F2D52] px-6 py-[var(--section-padding-y)] text-white max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)] text-center">
        <FadeIn>
          <p className="text-sm font-semibold tracking-wide text-[#4ADE80] uppercase">Our Future</p>
          <h2 className="font-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            We&apos;re starting with electronics. The vision is bigger.
          </h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            {STAGES.map((stage, index) => (
              <div key={stage.label} className="flex items-center gap-4 sm:flex-col sm:gap-0">
                <div className="flex flex-col items-center sm:w-full sm:flex-row">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      stage.current ? "bg-[#16A34A] text-white" : "border border-white/30 text-white/60"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {index < STAGES.length - 1 && (
                    <span className="w-px flex-1 bg-white/20 sm:h-px sm:w-full sm:flex-1" aria-hidden="true" />
                  )}
                </div>
                <p
                  className={`text-left text-sm font-medium sm:mt-3 sm:text-center ${
                    stage.current ? "text-white" : "text-white/60"
                  }`}
                >
                  {stage.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.16}>
          <p className="mx-auto mt-10 max-w-2xl text-sm text-white/70">
            This is the direction we&apos;re working toward — not something available today. Electronics
            is where we are right now.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
