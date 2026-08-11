import { Skeleton } from "@/components/ui/Skeleton";

const SKELETON_ROWS = Array.from({ length: 8 });

export default function AdminProductsLoading() {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex w-[68%] shrink-0 flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:w-auto"
          >
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-11 w-full rounded-[var(--radius-input)]" />
        <Skeleton className="h-11 w-full rounded-[var(--radius-input)]" />
      </div>

      <div className="mt-6">
        <Skeleton className="h-4 w-40" />

        {/* Desktop table skeleton */}
        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="w-8 py-2 pr-2" />
                <th className="py-2 pr-4">Image</th>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Featured</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SKELETON_ROWS.map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  <td className="py-2 pr-2 align-top">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Skeleton className="h-[60px] w-[60px]" />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-1.5 h-3 w-24" />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="py-2 align-top">
                    <Skeleton className="h-6 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card skeleton */}
        <div className="mt-4 flex flex-col gap-3 lg:hidden">
          {SKELETON_ROWS.map((_, i) => (
            <div key={i} className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-3">
              <Skeleton className="mt-1 h-4 w-4 self-start" />
              <Skeleton className="h-[60px] w-[60px] shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
