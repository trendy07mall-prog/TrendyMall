"use client";

import { useLayoutEffect, useRef, useState } from "react";

// line-clamp-2 alone gives the correct truncated-with-ellipsis resting
// state for free (no JS needed) -- this only adds a measurement to decide
// whether "See More" should show at all, and an animated max-height for
// the expand/collapse transition once the user actually taps it.
export function ProductTitleClamp({ title, className }: { title: string; className: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [measured, setMeasured] = useState<{ collapsed: number; full: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || el.clientHeight / 2;
    setMeasured({ collapsed: lineHeight * 2, full: el.scrollHeight });
  }, [title]);

  const isClamped = measured != null && measured.full > measured.collapsed + 1;

  return (
    <div>
      <h1
        ref={ref}
        className={`${className} ${expanded ? "" : "line-clamp-2"}`}
        style={
          measured
            ? {
                maxHeight: `${expanded ? measured.full : measured.collapsed}px`,
                overflow: "hidden",
                transition: "max-height 300ms ease-in-out",
              }
            : undefined
        }
      >
        {title}
      </h1>
      {isClamped && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-sm font-medium text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
        >
          {expanded ? "See Less" : "See More"}
        </button>
      )}
    </div>
  );
}
