import { CheckIcon, CloseIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

// Facts mirror policies.returns_body exactly (see PolicyDetailsCard.tsx's
// comment on this tradeoff): eligible = damaged/defective/incorrectly
// shipped; not eligible = opened/used electronic accessories unless
// faulty. Keep this list in sync if the policy text is ever edited.
const ELIGIBLE = ["Arrived damaged", "Arrived defective", "Incorrectly shipped (wrong item)"];
const NOT_ELIGIBLE = [
  "Opened or used electronic accessories (unless faulty)",
  "Change of mind after use",
  "Requests made after the 48-hour window",
];

export function ReturnsEligibilitySection() {
  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
            Return Eligibility
          </p>
          <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            What&apos;s eligible for return
          </h2>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mx-auto mt-6 w-fit rounded-full bg-[#0F2D52] px-6 py-2.5 text-center text-sm font-semibold text-white">
            Report within 48 hours of receiving your order
          </div>
        </FadeIn>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FadeIn>
            <div className="h-full rounded-[var(--radius-card)] border border-[#16A34A]/30 bg-[#16A34A]/5 p-[var(--card-padding)]">
              <h3 className="text-sm font-semibold text-[#16A34A] uppercase tracking-wide">Eligible</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {ELIGIBLE.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="h-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                Not Eligible
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {NOT_ELIGIBLE.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--muted)]">
                    <CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
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
