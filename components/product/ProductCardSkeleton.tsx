import { Skeleton } from "@/components/ui/Skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <Skeleton className="mt-3 h-8 w-full rounded-full" />
    </div>
  );
}
