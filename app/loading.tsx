import { Skeleton } from "@/components/ui/Skeleton";
import { ProductGridSkeleton } from "@/components/product/ProductGridSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="mt-4 h-5 w-2/3" />
          <Skeleton className="mt-8 h-12 w-40 rounded-full" />
        </div>
        <Skeleton className="aspect-square w-full max-w-md flex-1" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  );
}
