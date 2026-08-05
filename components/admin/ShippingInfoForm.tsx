"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOrderShipped } from "@/lib/admin/orderActions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Ready to Ship's "Mark as Shipped" — gated on courier + tracking number so
// staff can't ship an order without giving the customer something to track
// (markOrderShipped enforces this server-side too, this is just the
// matching UI gate/disabled state). Package weight is cosmetic only — no
// column exists for it, so it's not persisted; flagged rather than
// silently dropped or silently adding a new schema column for it.
export function ShippingInfoForm({
  orderId,
  courier: initialCourier,
  trackingNumber: initialTrackingNumber,
  trackingUrl: initialTrackingUrl,
}: {
  orderId: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}) {
  const [courier, setCourier] = useState(initialCourier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl ?? "");
  const [packageWeight, setPackageWeight] = useState("");
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  const canShip = courier.trim() !== "" && trackingNumber.trim() !== "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await markOrderShipped(orderId, {
        courier,
        trackingNumber,
        trackingUrl: trackingUrl || null,
      });
      if ("error" in result) showToast(result.error, "error");
      else {
        showToast("Marked as shipped");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          placeholder="Courier *"
          className={inputClass}
          required
        />
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Tracking number *"
          className={inputClass}
          required
        />
        <input
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder="Tracking URL (optional)"
          className={inputClass}
        />
        <input
          value={packageWeight}
          onChange={(e) => setPackageWeight(e.target.value)}
          placeholder="Package weight, kg (optional)"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending || !canShip}
        title={canShip ? undefined : "Courier and tracking number are required before shipping"}
        className="transition-brand self-start rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Mark as Shipped"}
      </button>
    </form>
  );
}
