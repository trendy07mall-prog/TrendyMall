export interface ColorSwatchOption {
  key: string;
  name: string;
  hex: string;
  // True only when every variant of this color is sold out. Picking a
  // color that merely needs some other attribute to change too is never
  // "disabled" here -- the caller resolves that to a real variant instead
  // of leaving an unreachable, permanently-struck-through swatch.
  disabled: boolean;
}

// Renders as one row inside the shared AttributeCard (components/product/
// AttributeCard.tsx) -- name left, selected value right, swatches below.
// `name` is expected to already be the clean, single color name (any
// "- Capacity - Connector" cleanup happens once, at the call site in
// ProductPurchaseSection, not here).
export function VariantSwatches({
  options,
  selectedKey,
  onSelect,
  hasError = false,
}: {
  options: ColorSwatchOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  // See AttributeSelector's identical prop -- live, pre-click visibility
  // into an unselected group rather than only a post-click error message.
  hasError?: boolean;
}) {
  if (options.length === 0) return null;

  const selected = options.find((o) => o.key === selectedKey);

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm font-semibold ${hasError ? "text-[var(--color-discount)]" : ""}`}>
          Colour
        </span>
        <span className={`text-sm ${hasError ? "font-medium text-[var(--color-discount)]" : "text-[var(--muted)]"}`}>
          {selected ? selected.name : hasError ? "Please select" : ""}
        </span>
      </div>
      <div
        className={`mt-3 flex flex-wrap gap-3 rounded-[var(--radius-md)] ${
          hasError ? "ring-1 ring-[var(--color-discount)]" : ""
        }`}
      >
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            title={option.disabled ? `${option.name} (unavailable)` : option.name}
            aria-label={option.disabled ? `${option.name} (unavailable)` : option.name}
            aria-pressed={option.key === selectedKey}
            aria-disabled={option.disabled}
            disabled={option.disabled}
            onClick={() => !option.disabled && onSelect(option.key)}
            className={`relative h-8 w-8 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-card)] transition-all duration-150 ease-in-out ${
              option.key === selectedKey
                ? "ring-[#0F2D52]"
                : "ring-transparent hover:ring-[var(--border-hover)]"
            } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
            style={{ backgroundColor: option.hex }}
          >
            {/* Hairline inner border so a white/light swatch still reads as
                a distinct circle against the card's own white background. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border border-black/10" />
            {option.disabled && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center"
              >
                <span className="h-px w-full rotate-45 bg-[var(--foreground)]" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
