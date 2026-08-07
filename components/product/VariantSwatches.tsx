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
    <div className="mt-4">
      <p className={`text-sm font-medium ${hasError ? "text-[var(--color-discount)]" : ""}`}>
        Color{selected ? `: ${selected.name}` : hasError ? " — please select" : ""}
      </p>
      <div
        className={`mt-2 flex flex-wrap gap-2 rounded-[var(--radius-md)] ${
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
            className={`relative h-10 w-10 rounded-full border-[3px] transition-transform duration-150 ease-in-out ${
              option.key === selectedKey
                ? "border-[var(--foreground)] scale-110"
                : "border-[var(--border)] hover:scale-105 hover:border-[var(--border-hover)]"
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
