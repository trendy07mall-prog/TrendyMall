import { CheckIcon, AlertTriangleIcon } from "@/components/ui/Icon";
import { ORDER_STATUS_PROGRESSION, ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { getWhatsAppUrl } from "@/lib/site";
import type { OrderFulfillmentStatus } from "@/types";

type StatusHistoryEntry = { status: OrderFulfillmentStatus; changedAt: string; note: string | null };
type StepState = "done" | "current" | "future" | "failed";

function formatStepDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Same visual language as components/checkout/CheckoutSteps.tsx's
// progress indicator (circle + connector line, black-and-white tokens) —
// reused here rather than inventing new stepper styling, just made
// vertical on mobile per the layout spec.
export function OrderTimeline({
  status,
  failureReason,
  deliveryAttemptCount,
  statusHistory,
  createdAt,
  orderNumber,
}: {
  status: OrderFulfillmentStatus;
  failureReason?: string | null;
  deliveryAttemptCount?: number;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
  orderNumber: string;
}) {
  if (status === "cancelled" || status === "returned") {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-black/5 px-4 py-3 text-sm">
        <p className="font-medium">
          {status === "cancelled" ? "This order was cancelled." : "This order was returned."}
        </p>
      </div>
    );
  }

  const isFailedDelivery = status === "failed_delivery";
  const lastIndex = ORDER_STATUS_PROGRESSION.length - 1;
  // failed_delivery is an exception branch off "out_for_delivery" (the
  // step just before "delivered") — never a linear 7th step appended to
  // the end, which is exactly what made a successful order's stepper
  // show an alarming greyed "Failed Delivery" step.
  const currentIndex = isFailedDelivery
    ? ORDER_STATUS_PROGRESSION.indexOf("out_for_delivery")
    : Math.max(0, ORDER_STATUS_PROGRESSION.indexOf(status));

  function stepTimestamp(step: OrderFulfillmentStatus, index: number): string | null {
    if (index === 0) return createdAt;
    const entry = statusHistory?.find((h) => h.status === step);
    return entry?.changedAt ?? null;
  }

  const failedTimestamp = statusHistory?.find((h) => h.status === "failed_delivery")?.changedAt ?? null;
  const isAddressIssue = failureReason?.toLowerCase().includes("address") ?? false;

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-0">
        {ORDER_STATUS_PROGRESSION.map((step, index) => {
          const isLast = index === lastIndex;
          const state: StepState =
            isFailedDelivery && isLast
              ? "failed"
              : index < currentIndex
                ? "done"
                : index === currentIndex
                  ? isFailedDelivery
                    ? "done"
                    : "current"
                  : "future";

          const label = state === "failed" ? "Delivery Failed" : ORDER_STATUS_LABELS[step];
          const timestamp = state === "failed" ? failedTimestamp : state !== "future" ? stepTimestamp(step, index) : null;

          return (
            <li
              key={step}
              className="flex items-center gap-3 lg:flex-1 lg:flex-col lg:items-center lg:gap-2 lg:text-center"
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="ml-[15px] h-4 w-px bg-[var(--border)] lg:mt-[15px] lg:ml-0 lg:h-px lg:w-full lg:flex-1 lg:self-start"
                />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                  state === "failed"
                    ? "border-2 border-[var(--color-error)] text-[var(--color-error)]"
                    : state === "done"
                      ? "bg-[var(--foreground)] text-white"
                      : state === "current"
                        ? "border-2 border-[var(--foreground)] text-[var(--foreground)]"
                        : "border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {state === "failed" ? (
                  <AlertTriangleIcon className="h-4 w-4" />
                ) : state === "done" ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex flex-col lg:items-center">
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  className={`text-sm ${
                    state === "failed"
                      ? "font-medium text-[var(--color-error)]"
                      : state === "current"
                        ? "font-medium text-[var(--foreground)]"
                        : state === "done"
                          ? "text-[var(--foreground)]"
                          : "text-[var(--muted)]"
                  }`}
                >
                  {label}
                </span>
                {timestamp && (
                  <span className="text-xs text-[var(--muted)]">{formatStepDate(timestamp)}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {isFailedDelivery && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-error)] bg-[var(--color-error)]/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-[var(--color-error)]">
            <AlertTriangleIcon className="h-4 w-4 shrink-0" />
            Delivery attempt failed
            {typeof deliveryAttemptCount === "number" && deliveryAttemptCount > 0 && (
              <span className="font-normal text-[var(--muted)]">— attempt {deliveryAttemptCount + 1}</span>
            )}
          </p>
          <p className="mt-2 text-[var(--muted)]">
            Reason: <span className="text-[var(--foreground)]">{failureReason ?? "Not recorded"}</span>
          </p>
          <p className="mt-1 text-[var(--muted)]">
            This isn&apos;t the end of the road — we&apos;ll re-attempt delivery once this is resolved.
            {isAddressIssue && " Please confirm or correct your delivery address so we can try again."}
          </p>
          <a
            href={getWhatsAppUrl(
              isAddressIssue
                ? `Hi, delivery of my order ${orderNumber} failed because of an address issue — here's my correct address:`
                : `Hi, delivery of my order ${orderNumber} failed — I'd like to sort this out.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center underline"
          >
            Message us on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
