import Link from "next/link";
import { TruckIcon, ReturnIcon, CheckIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

const COURIERS = ["Daraz Logistics", "Fardar", "Trans", "PickMe Flash"];

// Return eligibility/window/resolution/condition wording below is a direct
// summary of the live Returns & Refunds Policy (lib/data/settings.ts's
// POLICIES_FALLBACK.returnsBody, rendered at /returns) -- not a second,
// independently-worded version. If that policy's text ever changes, this
// summary needs updating to match, not the other way around.
const RETURN_CONDITIONS = [
  "In their original packaging",
  "Include all accessories and documentation",
  "Show no signs of misuse or physical damage caused after delivery",
];

export function AboutDeliveryReturns() {
  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
          Delivery &amp; Returns
        </p>
        <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          What happens after you order
        </h2>
      </FadeIn>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <div className="h-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
            <div className="flex items-center gap-2.5">
              <TruckIcon className="h-6 w-6 shrink-0 text-[#0F2D52]" />
              <h3 className="text-base font-semibold">Delivery</h3>
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-[var(--foreground)]">
              <li className="flex items-start gap-2.5">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                Colombo: 1–2 working days
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                Other areas: 2–4 working days
              </li>
            </ul>
            <p className="mt-4 text-xs text-[var(--muted)]">
              Delivered via our courier partners: {COURIERS.join(", ")}.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)] italic">
              These timeframes are estimated, not guaranteed — actual delivery can vary by location and
              courier availability.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="h-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
            <div className="flex items-center gap-2.5">
              <ReturnIcon className="h-6 w-6 shrink-0 text-[#0F2D52]" />
              <h3 className="text-base font-semibold">Returns</h3>
            </div>
            <p className="mt-4 text-sm text-[var(--foreground)]">
              Returns are accepted for products that arrive damaged, defective, or incorrectly shipped —
              reported within <span className="font-semibold">48 hours</span> of receiving your order.
            </p>
            <p className="mt-3 text-sm text-[var(--foreground)]">
              After inspection, we provide a replacement (subject to stock availability), or a full
              refund if a replacement isn&apos;t available.
            </p>
            <p className="mt-3 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              Returned items must be:
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-[var(--muted)]">
              {RETURN_CONDITIONS.map((condition) => (
                <li key={condition} className="flex items-start gap-2.5">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                  {condition}
                </li>
              ))}
            </ul>
            <Link
              href="/returns"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2"
            >
              Read Full Return Policy →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
