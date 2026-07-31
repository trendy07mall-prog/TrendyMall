"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "@/components/ui/Icon";

// Same clipboard pattern as components/product/ShareButtons.tsx — the
// only copy-to-clipboard precedent in this codebase (local `copied`
// state, navigator.clipboard.writeText, 1500ms reset, silent catch).
export function CopyOrderNumber({ orderNumber }: { orderNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard permission failures
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy order number ${orderNumber}`}
      className="transition-brand inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-sm font-medium hover:bg-black/5"
    >
      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      {orderNumber}
    </button>
  );
}
