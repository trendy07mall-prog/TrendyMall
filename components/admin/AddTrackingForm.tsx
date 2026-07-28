"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addOrderTracking } from "@/lib/admin/orderActions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function AddTrackingForm({
  orderId,
  courier,
  trackingNumber,
  trackingUrl,
}: {
  orderId: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}) {
  const [courierValue, setCourierValue] = useState(courier ?? "");
  const [numberValue, setNumberValue] = useState(trackingNumber ?? "");
  const [urlValue, setUrlValue] = useState(trackingUrl ?? "");
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addOrderTracking(orderId, {
        courier: courierValue,
        trackingNumber: numberValue,
        trackingUrl: urlValue || null,
      });
      if ("error" in result) showToast(result.error, "error");
      else {
        showToast("Tracking saved");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      <p className="text-sm font-medium">Tracking</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={courierValue}
          onChange={(e) => setCourierValue(e.target.value)}
          placeholder="Courier"
          className={inputClass}
        />
        <input
          value={numberValue}
          onChange={(e) => setNumberValue(e.target.value)}
          placeholder="Tracking number"
          className={inputClass}
        />
        <input
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          placeholder="Tracking URL (optional)"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="transition-brand self-start rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Tracking"}
      </button>
    </form>
  );
}
