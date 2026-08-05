export interface ColorSwatchOption {
  key: string;
  name: string;
  hex: string;
  // True when no variant exists for this color combined with whatever's
  // currently selected for every other attribute (a genuinely impossible
  // combination) OR the one variant that does match is out of stock --
  // both render the same way: visible, struck-through, unclickable.
  disabled: boolean;
}

export function VariantSwatches({
  options,
  selectedKey,
  onSelect,
}: {
  options: ColorSwatchOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  if (options.length === 0) return null;

  const selected = options.find((o) => o.key === selectedKey);

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">
        Color{selected ? `: ${selected.name}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
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
            className={`relative h-8 w-8 rounded-full border-2 transition-transform ${
              option.key === selectedKey
                ? "border-[var(--foreground)] scale-110"
                : "border-[var(--border)]"
            } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
            style={{ backgroundColor: option.hex }}
          >
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
