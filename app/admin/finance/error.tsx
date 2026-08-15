"use client";

import { useEffect } from "react";
import { FinanceErrorState } from "@/components/admin/finance/FinanceErrorState";

// Next.js's error-boundary convention (app/admin/finance/error.tsx) catches
// any render/fetch error thrown by page.tsx/orders/page.tsx/payments/page.tsx
// under this route -- the idiomatic App Router equivalent of wrapping every
// page body in try/catch, without repeating that boilerplate three times.
export default function AdminFinanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Finance page error:", error);
  }, [error]);

  return <FinanceErrorState onRetry={reset} />;
}
