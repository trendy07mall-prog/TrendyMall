import type { Attribute, AttributeValue } from "@/types";

// Generic required-choice picker for non-color attributes (e.g. Capacity,
// Connector, Size) -- renders as one row inside the shared AttributeCard
// (components/product/AttributeCard.tsx): name left, selected value right,
// pills below. Mirrors VariantSwatches' interaction but with no color_hex
// assumption, since only Color-type attribute values reliably carry one.
// When this attribute is variant-defining for the product, selecting a
// value participates in the same combination lookup as Color (price/stock/
// SKU/gallery all follow); when it isn't, the selection stays
// reference-only, exactly as before. Each row is picked on its own:
// ProductPurchaseSection never greys out a value just because of another
// row's pick (lib/variant-options.ts).
export function AttributeSelector({
  attribute,
  values,
  selectedId,
  onSelect,
  disabledIds,
  hasError = false,
  flash = false,
}: {
  attribute: Attribute;
  values: AttributeValue[];
  selectedId: string | null;
  onSelect: (value: AttributeValue) => void;
  // Values nothing can be bought with (no variant has them, or every one
  // that does is sold out) -- greyed out and unclickable.
  disabledIds?: Set<string>;
  // True whenever this group is genuinely unselected right now -- driven
  // live off selection state, not gated behind a failed Add to Cart click,
  // so the customer sees which group needs attention before they hit the
  // error message. Should never actually trigger post page-load now that
  // initialization populates every group, but stays as a visible safety
  // net for any future edge case rather than a silent block.
  hasError?: boolean;
  // Briefly true right after a tap in ANOTHER row had to change this
  // row's value (e.g. tapping 10000mAh switched Connectors to Type-C), so
  // the customer sees which row moved, next to the note that says why.
  flash?: boolean;
}) {
  if (values.length === 0) return null;

  const selected = values.find((v) => v.id === selectedId);

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm font-semibold ${hasError ? "text-[var(--color-discount)]" : ""}`}>
          {attribute.name}
        </span>
        <span className={`text-sm ${hasError ? "font-medium text-[var(--color-discount)]" : "text-[var(--muted)]"}`}>
          {selected ? selected.value : hasError ? "Please select" : ""}
        </span>
      </div>
      <div
        className={`mt-3 flex flex-wrap gap-2 rounded-[var(--radius-md)] transition-shadow duration-300 ease-in-out motion-reduce:transition-none ${
          hasError
            ? "ring-1 ring-[var(--color-discount)]"
            : flash
              ? "ring-2 ring-[var(--color-warning)]"
              : ""
        }`}
      >
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
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-in-out ${
                value.id === selectedId
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                  : isDisabled
                    ? // Filled, borderless, muted -- deliberately distinct from
                      // the plain-bordered "available" pill below (which used
                      // to share the same border color, making a disabled
                      // option too easy to misread as simply unselected).
                      "cursor-not-allowed border-transparent bg-black/[0.06] text-[var(--muted)] line-through"
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
