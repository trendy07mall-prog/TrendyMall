"use client";

import { useEffect, useRef } from "react";
import type { PayHereCheckoutParams } from "@/lib/orders";

// The standard PayHere hosted-checkout pattern: a plain HTML form POST to
// their checkout URL, submitted automatically on mount. No JS SDK/script
// dependency — this is a full-page redirect, not an inline popup.
export function PayHereRedirectForm({
  checkoutUrl,
  params,
}: {
  checkoutUrl: string;
  params: PayHereCheckoutParams;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm text-[var(--muted)]">Redirecting you to PayHere to complete payment…</p>
      <form ref={formRef} method="post" action={checkoutUrl} className="hidden">
        {Object.entries(params).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      </form>
    </div>
  );
}
