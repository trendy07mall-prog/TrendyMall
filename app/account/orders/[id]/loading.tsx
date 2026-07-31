import { Skeleton } from "@/components/ui/Skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <Skeleton className="h-16 w-full rounded-[var(--radius-card)]" />
      <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
      <Skeleton className="h-20 w-full rounded-[var(--radius-card)]" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
            <Skeleton className="h-12 w-12 shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
