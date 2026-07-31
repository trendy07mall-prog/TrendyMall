"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markDeliveryFailed } from "@/lib/admin/orderActions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const FAILURE_REASONS = [
  "Customer unavailable",
  "Wrong or incomplete address",
  "Customer refused delivery",
  "Customer unreachable by phone",
  "Payment not ready (COD)",
  "Other",
];

// Shown only when orderStatus === "out_for_delivery" — mark_delivery_failed
// (sql/040) enforces that server-side too, this is just the matching UI
// gate. Same form conventions as AddTrackingForm.tsx (inputClass, form
// shell, submit button, useTransition + useToast + router.refresh()).
export function MarkFailedDeliveryForm({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState(FAILURE_REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalReason = reason === "Other" ? otherReason.trim() : reason;
    if (!finalReason) {
      showToast("Enter a reason.", "error");
      return;
    }
    startTransition(async () => {
      const result = await markDeliveryFailed(orderId, finalReason);
      if ("error" in result) showToast(result.error, "error");
      else {
        showToast("Marked as failed delivery");
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-error)] p-4"
    >
      <p className="text-sm font-medium text-[var(--color-error)]">Mark Delivery Failed</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
          {FAILURE_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {reason === "Other" && (
          <input
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            placeholder="Describe the reason"
            className={inputClass}
          />
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="transition-brand self-start rounded-full border border-[var(--color-error)] px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/5 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Mark Failed"}
      </button>
    </form>
  );
}
