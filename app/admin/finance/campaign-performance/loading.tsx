import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminFinanceCampaignPerformanceLoading() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
      <Skeleton className="h-3 w-40" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
