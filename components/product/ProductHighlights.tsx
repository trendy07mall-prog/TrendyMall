import type { DisplaySpec } from "@/lib/data/spec-templates";

const MAX_HIGHLIGHTS = 6;

// DisplaySpec is a flat label/value row with no icon or "this one's a
// headline feature" semantic -- so every card gets the same generic marker
// instead of guessing an icon per attribute (there's no data to justify
// picking one icon over another). This is a teaser of real spec values;
// the full table stays in the existing Specifications tab.
export function ProductHighlights({ specs }: { specs: DisplaySpec[] }) {
  if (specs.length === 0) return null;
  const highlights = specs.slice(0, MAX_HIGHLIGHTS);

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {highlights.map((spec) => (
        <div
          key={spec.label}
          className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-3"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-[11px] text-white"
          >
            ✓
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--muted)]">{spec.label}</p>
            <p className="truncate text-sm font-medium">
              {spec.value}
              {spec.unit ? ` ${spec.unit}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
