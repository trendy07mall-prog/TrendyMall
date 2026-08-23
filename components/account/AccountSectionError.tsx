"use client";

import { useRouter } from "next/navigation";
import { AlertTriangleIcon } from "@/components/ui/Icon";

// No customer-facing "Unable to load, Try Again" component existed anywhere
// storefront-side before this (confirmed by audit — only the admin-only
// FinanceErrorState.tsx has this pattern). Modeled on it directly, but
// compact by default since this wraps individual account-page SECTIONS
// (a summary card, the recent-order card, etc.) rather than a full page —
// one section failing must never blank the rest of the page. Each account
// page fetches its own data in a try/catch and renders this in place of the
// real content on failure, since these are Server Components (no client-side
// error boundary granularity below the whole route segment).
export function AccountSectionError({
  message = "Unable to load this information.",
}: {
  message?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] px-4 py-8 text-center">
      <AlertTriangleIcon className="h-5 w-5 text-[var(--color-error)]" />
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="transition-brand rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium hover:bg-black/5"
      >
        Try Again
      </button>
    </div>
  );
}
