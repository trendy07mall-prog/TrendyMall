"use client";

import { useState } from "react";
import Link from "next/link";
import { ComboCard, type ComboCardData, type ComboSize } from "@/components/marketing/ComboCard";

// The homepage "Combo Deals" strip.
//
// Desktop is a five-across carousel with the centre card largest and the
// edges smallest; mobile is a swipe strip that snaps, with the next card
// peeking so it is obvious there is more. Both drive off one `active`
// index, so the arrows, the dots and the swipe can never disagree about
// which bundle is featured.
//
// PRESENTATION ONLY. The caller has already decided which bundles reach
// here -- published, and available -- and every figure on a card was
// worked out before it arrived.

const ORANGE = "#F97316";
const NAVY = "#0F2D52";
const GREY = "#6B7280";
const DOT_INACTIVE = "#E5C9B3";

// How the five desktop slots relate to the centre: two out on each side.
const OFFSETS = [-2, -1, 0, 1, 2] as const;
const SIZE_BY_DISTANCE: Record<number, ComboSize> = { 0: "centre", 1: "medium", 2: "small" };

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
        stroke={NAVY}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ComboDealsSection({ deals }: { deals: ComboCardData[] }) {
  const [active, setActive] = useState(0);

  // The caller hides the section entirely when there is nothing to show;
  // this is the belt-and-braces half of that promise.
  if (deals.length === 0) return null;

  const count = deals.length;
  const wrap = (i: number) => ((i % count) + count) % count;
  const go = (delta: number) => setActive((current) => wrap(current + delta));

  // With five or more there is a full row and it can rotate. With fewer,
  // the design says show what exists, centred, first one featured -- so
  // the row is just the bundles themselves, no wrapping and no repeats,
  // which would otherwise show the same card twice.
  const desktopSlots: { data: ComboCardData; size: ComboSize; featured: boolean; key: string }[] =
    count >= 5
      ? OFFSETS.map((offset) => {
          const index = wrap(active + offset);
          const distance = Math.abs(offset);
          return {
            data: deals[index],
            size: SIZE_BY_DISTANCE[distance],
            featured: distance === 0,
            key: `${deals[index].product.id}-${offset}`,
          };
        })
      : deals.map((data, index) => ({
          data,
          size: index === active ? "centre" : ("medium" as ComboSize),
          featured: index === active,
          key: data.product.id,
        }));

  return (
    <section
      className="w-full py-[var(--home-section-padding-y)] font-[family-name:var(--font-jakarta)]"
      style={{ backgroundColor: "#FAFAFA" }}
      aria-labelledby="combo-deals-heading"
    >
      <div className="mx-auto w-full max-w-[var(--home-container-width)] px-6">
        {/* ── header: centred on desktop, left-aligned on a phone ──── */}
        <div className="md:text-center">
          {/* The label gets its own full-width row on a phone: beside the
              "View all" link it ran out of room and wrapped onto two
              lines, which pushed the title down and looked untidy. */}
          <p
            className="text-[11px] font-bold md:text-[13px]"
            style={{ color: ORANGE, letterSpacing: "3px" }}
          >
            BUY TOGETHER · SAVE MORE
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-4 md:block">
            <h2
              id="combo-deals-heading"
              className="min-w-0 text-[28px] leading-tight font-extrabold md:text-[44px]"
              style={{ color: NAVY }}
            >
              Combo Deals
            </h2>
            {/* On a phone the "view all" sits beside the title instead of
                under the carousel, where it would be a long scroll away. */}
            <Link
              href="/combo-deals"
              className="shrink-0 text-[14px] font-bold whitespace-nowrap hover:text-[#F97316] md:hidden"
              style={{ color: NAVY }}
            >
              View all →
            </Link>
          </div>
          <p className="mt-2 hidden text-[16px] md:block" style={{ color: GREY }}>
            Handpicked bundles at a lower price than buying separately
          </p>
        </div>

        {/* ── desktop carousel ──────────────────────────────────────── */}
        <div className="mt-10 hidden lg:block">
          <div className="flex items-center justify-center gap-4">
            {count >= 5 && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous combo deal"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:outline-none"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <Chevron direction="left" />
              </button>
            )}

            {/* items-center is what makes the smaller cards sit centred
                against the tall middle one rather than hanging from the
                top. */}
            <div className="flex items-center justify-center gap-5">
              {desktopSlots.map((slot) => (
                <ComboCard key={slot.key} data={slot.data} size={slot.size} featured={slot.featured} />
              ))}
            </div>

            {count >= 5 && (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next combo deal"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:outline-none"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <Chevron direction="right" />
              </button>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center gap-5">
            <Dots count={count} active={active} onSelect={setActive} />
            <Link
              href="/combo-deals"
              className="text-[15px] font-bold transition-colors hover:text-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:outline-none"
              style={{ color: NAVY }}
            >
              View all Combo Deals →
            </Link>
          </div>
        </div>

        {/* ── phone / tablet: a swipe strip that snaps ──────────────── */}
        <div className="mt-6 lg:hidden">
          <div
            className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              // Keeps the dots honest while the finger is moving.
              const el = event.currentTarget;
              const card = el.firstElementChild as HTMLElement | null;
              if (!card) return;
              const step = card.offsetWidth + 16;
              const index = Math.round(el.scrollLeft / step);
              setActive((current) => (current === index ? current : Math.min(count - 1, Math.max(0, index))));
            }}
          >
            {deals.map((data, index) => (
              <div key={data.product.id} className="w-[318px] shrink-0 snap-start">
                <ComboCard data={data} size="centre" featured={index === 0} fluid />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <Dots count={count} active={active} onSelect={setActive} />
            {count > 1 && (
              <p className="text-[13px]" style={{ color: GREY }}>
                Swipe to see more combos →
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Dots({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (index: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === active;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Show combo deal ${index + 1} of ${count}`}
            aria-current={isActive ? "true" : undefined}
            className="rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{
              width: isActive ? 24 : 8,
              height: 8,
              backgroundColor: isActive ? ORANGE : DOT_INACTIVE,
            }}
          />
        );
      })}
    </div>
  );
}
