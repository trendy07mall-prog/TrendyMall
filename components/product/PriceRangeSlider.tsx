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

const THUMB_CLASS_SHOP =
  "pointer-events-none absolute inset-0 h-2 w-full appearance-none bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white " +
  "[&::-webkit-slider-thumb]:bg-[var(--color-warning)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-card)] " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 " +
  "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 " +
  "[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--color-warning)] " +
  "[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent";

export function PriceRangeSlider({
  min,
  max,
  domainMax,
  onCommit,
  variant = "default",
}: {
  min: number;
  max: number;
  domainMax: number;
  onCommit: (min: number, max: number) => void;
  // "shop" opts into the /shop redesign's cleaner look (pill-badge price
  // labels, thicker track/thumbs) — /category and /search omit this and
  // keep today's appearance untouched.
  variant?: "default" | "shop";
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
  const isShop = variant === "shop";

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between text-xs">
        {isShop ? (
          <>
            <span className="rounded-full bg-[var(--background)] px-2 py-1 font-semibold text-[var(--foreground)]">
              {formatPrice(localMin)}
            </span>
            <span className="rounded-full bg-[var(--background)] px-2 py-1 font-semibold text-[var(--foreground)]">
              {formatPrice(localMax)}
            </span>
          </>
        ) : (
          <>
            <span className="text-[var(--muted)]">{formatPrice(localMin)}</span>
            <span className="text-[var(--muted)]">{formatPrice(localMax)}</span>
          </>
        )}
      </div>
      <div className={`relative ${isShop ? "mt-4 h-5" : "mt-3 h-4"}`}>
        <div
          className={`absolute top-1/2 w-full -translate-y-1/2 rounded-full bg-[var(--border)] ${
            isShop ? "h-2" : "h-1.5"
          }`}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 rounded-full ${
            isShop ? "h-2 bg-[var(--color-warning)]" : "h-1.5 bg-[var(--foreground)]"
          }`}
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
          className={isShop ? THUMB_CLASS_SHOP : THUMB_CLASS}
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
          className={isShop ? THUMB_CLASS_SHOP : THUMB_CLASS}
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}
