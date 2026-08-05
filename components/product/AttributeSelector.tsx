import type { Attribute, AttributeValue } from "@/types";

// Generic required-choice picker for non-color attributes (e.g. "Mah",
// Size, Storage) -- mirrors VariantSwatches' look/interaction but with no
// color_hex assumption, since only Color-type attribute values reliably
// carry one. When this attribute is variant-defining for the product,
// selecting a value participates in the same combination lookup as Color
// (price/stock/SKU/gallery all follow); when it isn't, the selection stays
// reference-only, exactly as before.
export function AttributeSelector({
  attribute,
  values,
  selectedId,
  onSelect,
  disabledIds,
}: {
  attribute: Attribute;
  values: AttributeValue[];
  selectedId: string | null;
  onSelect: (value: AttributeValue) => void;
  // Values with no matching variant given the rest of the current
  // selection -- an impossible combination, greyed out and unclickable.
  disabledIds?: Set<string>;
}) {
  if (values.length === 0) return null;

  const selected = values.find((v) => v.id === selectedId);

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">
        {attribute.name}
        {selected ? `: ${selected.value}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => {
          const isDisabled = disabledIds?.has(value.id) ?? false;
          return (
            <button
              key={value.id}
              type="button"
              aria-pressed={value.id === selectedId}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              title={isDisabled ? `${value.value} (unavailable)` : undefined}
              onClick={() => !isDisabled && onSelect(value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                value.id === selectedId
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                  : isDisabled
                    ? "cursor-not-allowed border-[var(--border)] text-[var(--muted)] line-through opacity-40"
                    : "border-[var(--border)] hover:border-[var(--foreground)]"
              }`}
            >
              {value.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
