import type { ProductStatus } from "@/types";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const isPublished = status === "published";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap uppercase tracking-wide ${
        isPublished
          ? "border-[var(--color-success)] text-[var(--color-success)]"
          : "border-[var(--color-text-secondary)] text-[var(--color-text-secondary)]"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
