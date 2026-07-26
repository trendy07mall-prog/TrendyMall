"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";

const THUMB_CLASS =
  "pointer-events-none absolute inset-0 h-1.5 w-full appearance-none bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-[var(--foreground)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-card)] " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 " +
  "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 " +
  "[&::-moz-range-thumb]:bg-[var(--foreground)] [&::-webkit-slider-runnable-track]:bg-transparent " +
  "[&::-moz-range-track]:bg-transparent";

export function PriceRangeSlider({
  min,
  max,
  domainMax,
  onCommit,
}: {
  min: number;
  max: number;
  domainMax: number;
  onCommit: (min: number, max: number) => void;
}) {
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);
  // Resetting local drag state when the committed prop changes externally
  // (e.g. "Clear all") — a render-phase state adjustment per React's own
  // "Adjusting state when a prop changes" pattern, not an effect, since an
  // effect here would double-render on every external prop change.
  const [prevMin, setPrevMin] = useState(min);
  const [prevMax, setPrevMax] = useState(max);
  if (min !== prevMin) {
    setPrevMin(min);
    setLocalMin(min);
  }
  if (max !== prevMax) {
    setPrevMax(max);
    setLocalMax(max);
  }

  function commit(nextMin: number, nextMax: number) {
    onCommit(nextMin, nextMax);
  }

  const minPct = (localMin / domainMax) * 100;
  const maxPct = (localMax / domainMax) * 100;

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{formatPrice(localMin)}</span>
        <span>{formatPrice(localMax)}</span>
      </div>
      <div className="relative mt-3 h-4">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-[var(--border)]" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--foreground)]"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={domainMax}
          step={500}
          value={localMin}
          onChange={(e) => setLocalMin(Math.min(Number(e.target.value), localMax))}
          onMouseUp={() => commit(localMin, localMax)}
          onTouchEnd={() => commit(localMin, localMax)}
          onKeyUp={() => commit(localMin, localMax)}
          aria-label="Minimum price"
          className={THUMB_CLASS}
          style={{ zIndex: 3 }}
        />
        <input
          type="range"
          min={0}
          max={domainMax}
          step={500}
          value={localMax}
          onChange={(e) => setLocalMax(Math.max(Number(e.target.value), localMin))}
          onMouseUp={() => commit(localMin, localMax)}
          onTouchEnd={() => commit(localMin, localMax)}
          onKeyUp={() => commit(localMin, localMax)}
          aria-label="Maximum price"
          className={THUMB_CLASS}
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}
