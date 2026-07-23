import type { ProductVariant } from "@/types";

export function VariantSwatches({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variant: ProductVariant) => void;
}) {
  if (variants.length === 0) return null;

  const selected = variants.find((v) => v.id === selectedId);

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">
        Color{selected ? `: ${selected.color_name}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            title={variant.color_name}
            aria-label={variant.color_name}
            aria-pressed={variant.id === selectedId}
            onClick={() => onSelect(variant)}
            className={`h-8 w-8 rounded-full border-2 transition-transform ${
              variant.id === selectedId
                ? "border-[var(--foreground)] scale-110"
                : "border-[var(--border)]"
            }`}
            style={{ backgroundColor: variant.color_hex }}
          />
        ))}
      </div>
    </div>
  );
}
