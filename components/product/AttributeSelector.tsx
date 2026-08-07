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
  hasError = false,
  flash = false,
}: {
  attribute: Attribute;
  values: AttributeValue[];
  selectedId: string | null;
  onSelect: (value: AttributeValue) => void;
  // Values with no matching variant given the rest of the current
  // selection -- an impossible combination, greyed out and unclickable.
  disabledIds?: Set<string>;
  // True whenever this group is genuinely unselected right now -- driven
  // live off selection state, not gated behind a failed Add to Cart click,
  // so the customer sees which group needs attention before they hit the
  // error message. Should never actually trigger post page-load now that
  // initialization populates every group, but stays as a visible safety
  // net for any future edge case rather than a silent block.
  hasError?: boolean;
  // True for ~300ms right after THIS group's available options changed as
  // a side effect of a different selector (e.g. Mah's options after a
  // Color change) -- lets the customer perceive the connection between two
  // now-adjacent selectors instead of only noticing on close inspection.
  flash?: boolean;
}) {
  if (values.length === 0) return null;

  const selected = values.find((v) => v.id === selectedId);

  return (
    <div className="mt-4">
      <p
        className={`text-sm font-medium ${hasError ? "text-[var(--color-discount)]" : ""}`}
      >
        {attribute.name}
        {selected ? `: ${selected.value}` : hasError ? " — please select" : ""}
      </p>
      <div
        className={`mt-2 flex flex-wrap gap-2 rounded-[var(--radius-md)] transition-shadow duration-300 ease-in-out motion-reduce:transition-none ${
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
