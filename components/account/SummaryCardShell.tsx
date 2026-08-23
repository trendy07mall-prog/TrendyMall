import Link from "next/link";

// Shared visual shell for Overview's 4 summary cards — extracted so both
// the server-rendered cards (Orders/Addresses/Reviews, in app/account/
// page.tsx) and the client-only Wishlist card (WishlistSummaryCard.tsx,
// since wishlist state is localStorage, not a DB table) render identically.
export function SummaryCardShell({
  icon,
  label,
  count,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="transition-brand flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 hover:border-[var(--border-hover)]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5">{icon}</div>
      <p className="text-2xl font-bold tracking-tight">{count}</p>
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </Link>
  );
}
