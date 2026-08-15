"use client";

import { useRouter } from "next/navigation";
import { AlertTriangleIcon } from "@/components/ui/Icon";

// No "Unable to load, Try Again" component exists anywhere in the admin
// panel yet (checked -- only ComingSoon.tsx's not-built-yet empty state and
// SaveBar.tsx's inline save-error text exist). Modeled on ComingSoon's own
// card shell/tokens so this reads as part of the same system rather than a
// one-off, and is reusable by other admin pages later.
export function FinanceErrorState({
  message = "Unable to load finance data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error)]/10">
        <AlertTriangleIcon className="h-6 w-6 text-[var(--color-error)]" />
      </div>
      <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{message}</p>
      <button
        type="button"
        onClick={onRetry ?? (() => router.refresh())}
        className="transition-brand mt-4 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
      >
        Try Again
      </button>
    </div>
  );
}
