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
        // h-full so every card in a row matches the tallest one. Grid
        // already stretches its items, but this card is also a flex
        // container and the explicit height keeps that true if the
        // wrapper ever changes.
        <div
          key={spec.label}
          className="flex h-full min-w-0 flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-center"
        >
          <CheckBadgeIcon className="h-5 w-5 shrink-0 text-[#0F2D52]" />
          {/* w-full is the actual fix. This div is a flex item in a
              column with items-center, so without a width it sizes to its
              CONTENT -- and `truncate` (white-space: nowrap) made that
              content one long unbreakable line. The result was a value
              like "Built-in Cables Output: Micro-USB, Type-C, and
              Lightning" rendering centred and wider than its own card,
              spilling out of both edges and over the card beside it.
              Clipping never kicked in because the overflow was the card's,
              not this div's.

              So: full width, and let the text wrap instead of refusing
              to. overflow-wrap:anywhere rather than break-words alone
              because it also lowers the element's min-content width,
              which is what lets the card shrink inside a 2-column grid on
              a phone. */}
          <div className="w-full min-w-0">
            <p className="text-xs font-medium text-[var(--muted)] [overflow-wrap:anywhere]">
              {spec.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold [overflow-wrap:anywhere]">
              {spec.value}
              {spec.unit ? ` ${spec.unit}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
