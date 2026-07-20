import { Skeleton } from "@/components/ui/Skeleton";
import { ProductGridSkeleton } from "@/components/product/ProductGridSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-8">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
