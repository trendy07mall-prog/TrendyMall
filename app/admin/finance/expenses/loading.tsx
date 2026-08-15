import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminFinanceExpensesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-black/[0.02] p-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b border-[var(--border)] p-3 last:border-0">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
