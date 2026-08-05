import type { ProductVariantWithImages } from "@/lib/data/products";

export function VariantSwatches({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariantWithImages[];
  selectedId: string | null;
  onSelect: (variant: ProductVariantWithImages) => void;
}) {
  if (variants.length === 0) return null;

  const selected = variants.find((v) => v.id === selectedId);

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">
        Color{selected ? `: ${selected.color_name}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {variants.map((variant) => {
          // stock === 0 is a real out-of-stock variant; null/undefined
          // means "not tracked" (Stage 6's dual-track semantics) and stays
          // always selectable, same as today.
          const outOfStock = variant.stock === 0;
          return (
            <button
              key={variant.id}
              type="button"
              title={outOfStock ? `${variant.color_name} (out of stock)` : variant.color_name}
              aria-label={outOfStock ? `${variant.color_name} (out of stock)` : variant.color_name}
              aria-pressed={variant.id === selectedId}
              aria-disabled={outOfStock}
              disabled={outOfStock}
              onClick={() => !outOfStock && onSelect(variant)}
              className={`relative h-8 w-8 rounded-full border-2 transition-transform ${
                variant.id === selectedId
                  ? "border-[var(--foreground)] scale-110"
                  : "border-[var(--border)]"
              } ${outOfStock ? "cursor-not-allowed opacity-40" : ""}`}
              style={{ backgroundColor: variant.color_hex }}
            >
              {outOfStock && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center"
                >
                  <span className="h-px w-full rotate-45 bg-[var(--foreground)]" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
