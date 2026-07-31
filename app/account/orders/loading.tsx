import { Skeleton } from "@/components/ui/Skeleton";

export default function OrdersLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-64" />
        <Skeleton className="h-10 w-full sm:w-64" />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
