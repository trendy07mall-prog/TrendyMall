import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminFinanceOverviewLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
            <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-4 h-[200px] w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          <Skeleton className="h-3 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mt-2 h-4 w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          <Skeleton className="h-3 w-32" />
          <div className="mt-3 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
