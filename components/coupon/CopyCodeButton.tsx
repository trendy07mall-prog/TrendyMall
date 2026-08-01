"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast("Coupon code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Couldn't copy — select and copy the code manually", { variant: "error" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="transition-brand flex min-h-11 items-center gap-2 rounded-full border-2 border-dashed border-[var(--foreground)] px-4 text-sm font-semibold tracking-wide hover:bg-black/5"
    >
      {code}
      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
    </button>
  );
}
