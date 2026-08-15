import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminFinanceCommissionSettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full rounded-[var(--radius-card)]" />
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <Skeleton className="h-3 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mt-3 h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
