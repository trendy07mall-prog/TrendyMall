import { Skeleton } from "@/components/ui/Skeleton";

// Mirrors ProductCard.tsx's structure exactly (edge-to-edge image, p-4
// content area, the same Slot A / Slot B / title / price / rating-row
// heights) so a loading grid doesn't visibly jump/reflow once real cards
// replace these placeholders.
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)]">
      <div className="relative">
        <Skeleton className="aspect-square w-full" />
        <div className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/10" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-[18px] sm:h-4 w-1/2" />
          <Skeleton className="h-[14px] w-1/3" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-[18px] w-full" />
        <div className="mt-auto pt-1">
          <Skeleton className="h-[42px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
