import { Skeleton } from "@/components/ui/Skeleton";

export default function AccountOverviewLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-32" />
    </div>
  );
}
