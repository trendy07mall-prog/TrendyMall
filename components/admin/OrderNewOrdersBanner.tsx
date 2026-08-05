"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 30_000;

// Keeps the pending count fresh without introducing new realtime/websocket
// infrastructure — the only existing live-update precedent in this
// codebase, PendingPaymentPoller.tsx, uses this exact setInterval +
// router.refresh() shape (a server component re-fetch, not a client poll
// of its own data).
export function OrderNewOrdersBanner({ count }: { count: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  if (count === 0) return null;

  return (
    <Link
      href="/admin/orders?tab=new"
      className="transition-brand flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-warning)]/10 px-4 py-3 text-sm font-medium hover:border-[var(--border-hover)]"
    >
      🔔 You have {count} new order{count === 1 ? "" : "s"} waiting for confirmation
    </Link>
  );
}
