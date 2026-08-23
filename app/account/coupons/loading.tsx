import { Skeleton } from "@/components/ui/Skeleton";

export default function CouponsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6 flex gap-1">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-28" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
