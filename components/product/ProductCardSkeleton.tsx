import { Skeleton } from "@/components/ui/Skeleton";

export function ProductCardSkeleton({ variant = "default" }: { variant?: "default" | "shop" }) {
  const isShop = variant === "shop";
  return (
    <div className="flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
      <div className="relative">
        <Skeleton className={isShop ? "h-[200px] w-full" : "aspect-square w-full"} />
        <div className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/10" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col">
        <Skeleton className="mt-3 h-2.5 w-1/4" />
        <Skeleton className={isShop ? "mt-2 h-12 w-full" : "mt-2 h-10 w-full"} />
        <Skeleton className="mt-1.5 h-3.5 w-1/3" />
        {isShop ? (
          <div className="mt-2 flex flex-col gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
        )}
        <div className="mt-auto pt-3">
          <Skeleton className={isShop ? "h-12 w-full rounded-[var(--radius-btn)]" : "h-8 w-full rounded-full"} />
        </div>
      </div>
    </div>
  );
}
