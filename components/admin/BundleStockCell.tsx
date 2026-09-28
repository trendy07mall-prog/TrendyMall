import Link from "next/link";

// What the Products table shows in the stock column for a bundle.
//
// A bundle has no stock of its own and never will: how many can be sold
// is decided by the lowest-stocked item inside it, worked out live every
// time (lib/bundles.ts). The products.stock column on a bundle row is
// left at 0 and read by nothing. Showing that 0 in an editable box would
// invite someone to "correct" a number that changes nothing, so this says
// plainly that the question is answered elsewhere, and links there.
export function BundleStockCell({ bundleId }: { bundleId: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-[var(--muted)]">n/a</span>
      <Link href={`/admin/bundles/${bundleId}`} className="text-xs text-[var(--muted)] underline">
        from items inside
      </Link>
    </div>
  );
}
