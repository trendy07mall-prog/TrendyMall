import { CheckIcon } from "@/components/ui/Icon";

// Presentational only — this is a genuine one-page checkout (contact,
// delivery, payment, notes all on one page), not a router between
// separate steps. "Payment" is the payment section further down this
// same page; "Confirmation" is /order-confirmation/[orderNumber].
const STEPS = ["Cart", "Checkout", "Payment", "Confirmation"];
const CURRENT_STEP_INDEX = 1;

export function CheckoutSteps() {
  return (
    <ol className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--muted)] sm:gap-2 sm:text-xs">
      {STEPS.map((step, index) => {
        const isDone = index < CURRENT_STEP_INDEX;
        const isCurrent = index === CURRENT_STEP_INDEX;
        return (
          <li key={step} className="flex items-center gap-1.5 sm:gap-2">
            {index > 0 && <span className="h-px w-3 bg-[var(--border)] sm:w-6" aria-hidden="true" />}
            <span className="flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] sm:h-5 sm:w-5 sm:text-[10px] ${
                  isDone
                    ? "bg-[var(--foreground)] text-white"
                    : isCurrent
                      ? "border-2 border-[var(--foreground)] text-[var(--foreground)]"
                      : "border border-[var(--border)]"
                }`}
              >
                {isDone ? <CheckIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : index + 1}
              </span>
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={isCurrent ? "text-[var(--foreground)]" : "hidden sm:inline"}
              >
                {step}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
