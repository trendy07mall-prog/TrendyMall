import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminFinanceOrdersLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-[var(--radius-input)]" />
        ))}
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-black/[0.02] p-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-[var(--border)] p-3 last:border-0">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
