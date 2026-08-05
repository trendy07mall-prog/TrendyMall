import type { Attribute, AttributeValue } from "@/types";

// Generic required-choice picker for non-color attributes (e.g. "Mah",
// Size, Storage) -- mirrors VariantSwatches' look/interaction but with no
// color_hex assumption, since only Color-type attribute values reliably
// carry one. Selecting a value never changes price/stock/SKU (those stay
// driven entirely by the selected color variant); it's recorded on the
// cart line/order for reference only.
export function AttributeSelector({
  attribute,
  values,
  selectedId,
  onSelect,
}: {
  attribute: Attribute;
  values: AttributeValue[];
  selectedId: string | null;
  onSelect: (value: AttributeValue) => void;
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
        {values.map((value) => (
          <button
            key={value.id}
            type="button"
            aria-pressed={value.id === selectedId}
            onClick={() => onSelect(value)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              value.id === selectedId
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                : "border-[var(--border)] hover:border-[var(--foreground)]"
            }`}
          >
            {value.value}
          </button>
        ))}
      </div>
    </div>
  );
}
