import { Skeleton } from "@/components/ui/Skeleton";

export default function WishlistLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32" />
      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    </div>
  );
}
