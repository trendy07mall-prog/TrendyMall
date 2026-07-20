import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 grid gap-10 sm:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-8 h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
