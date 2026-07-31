import { CheckIcon } from "@/components/ui/Icon";
import { ORDER_STATUS_PROGRESSION, ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus } from "@/types";

// Same visual language as components/checkout/CheckoutSteps.tsx's
// progress indicator (circle + connector line, black-and-white tokens) —
// reused here rather than inventing new stepper styling, just made
// vertical on mobile per the layout spec.
export function OrderTimeline({ status }: { status: OrderFulfillmentStatus }) {
  if (status === "cancelled" || status === "returned") {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-black/5 px-4 py-3 text-sm">
        <p className="font-medium">
          {status === "cancelled" ? "This order was cancelled." : "This order was returned."}
        </p>
      </div>
    );
  }

  // "pending" is the DB's default before staff action, but a customer
  // who just placed this order experiences it as already confirmed —
  // collapses into step 0 rather than showing nothing reached yet.
  const currentIndex =
    status === "pending" ? 0 : Math.max(0, ORDER_STATUS_PROGRESSION.indexOf(status));

  return (
    <ol className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-0">
      {ORDER_STATUS_PROGRESSION.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-3 lg:flex-1 lg:flex-col lg:items-center lg:gap-2 lg:text-center">
            {index > 0 && (
              <span
                aria-hidden="true"
                className="ml-[15px] h-4 w-px bg-[var(--border)] lg:mt-[15px] lg:ml-0 lg:h-px lg:w-full lg:flex-1 lg:self-start"
              />
            )}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                isDone
                  ? "bg-[var(--foreground)] text-white"
                  : isCurrent
                    ? "border-2 border-[var(--foreground)] text-[var(--foreground)]"
                    : "border border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {isDone ? <CheckIcon className="h-4 w-4" /> : index + 1}
            </span>
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={`text-sm ${
                isCurrent
                  ? "font-medium text-[var(--foreground)]"
                  : isDone
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted)]"
              }`}
            >
              {ORDER_STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
