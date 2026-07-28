"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyBankTransferPayment } from "@/lib/admin/paymentVerification";

export function VerifyPaymentButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await verifyBankTransferPayment(orderId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="transition-brand self-start rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Verifying…" : "Verify Payment"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
