import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

export function Pagination({
  basePath,
  currentPage,
  totalPages,
  searchParams,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue;
      if (typeof value === "string" && value) params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={hrefFor(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        aria-label="Previous page"
        className={`transition-brand flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] ${
          currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-black/5"
        }`}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Link>
      {pages.map((page) => (
        <Link
          key={page}
          href={hrefFor(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`transition-brand flex h-10 w-10 items-center justify-center rounded-full text-sm ${
            page === currentPage
              ? "bg-[var(--foreground)] text-white"
              : "hover:bg-black/5"
          }`}
        >
          {page}
        </Link>
      ))}
      <Link
        href={hrefFor(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        aria-label="Next page"
        className={`transition-brand flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] ${
          currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-black/5"
        }`}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </nav>
  );
}
