import { CheckBadgeIcon } from "@/components/ui/Icon";
import type { DisplaySpec } from "@/lib/data/spec-templates";

const MAX_HIGHLIGHTS = 10;

// A full-width icon strip below the main gallery/purchase grid -- 5 columns
// on desktop, narrowing down to 2 on mobile (a plain CSS grid reflow, not a
// horizontal scroller, to keep every spec reachable without a swipe
// gesture). DisplaySpec is a flat label/value row with no icon or "this
// one's a headline feature" semantic, so every card gets the same generic
// marker instead of guessing an icon per attribute. This is a teaser of
// real spec values; the full table stays in the Specifications tab.
export function ProductHighlights({ specs }: { specs: DisplaySpec[] }) {
  if (specs.length === 0) return null;
  const highlights = specs.slice(0, MAX_HIGHLIGHTS);

  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {highlights.map((spec) => (
        <div
          key={spec.label}
          className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-center"
        >
          <CheckBadgeIcon className="h-5 w-5 shrink-0 text-[#0F2D52]" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--muted)]">{spec.label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {spec.value}
              {spec.unit ? ` ${spec.unit}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
