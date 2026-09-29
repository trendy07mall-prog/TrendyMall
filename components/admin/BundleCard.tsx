"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { bundleSavingPercent } from "@/lib/bundles";
import { BundlePublishToggle } from "@/components/admin/BundlePublishToggle";
import type { AdminBundleRow } from "@/lib/admin/bundles-query";

// One bundle, as a card on the admin Bundles screen.
//
// PRESENTATION ONLY. Every number shown here arrives already worked out
// on AdminBundleRow (lib/admin/bundles-query.ts) and is rendered exactly
// as given -- this file does no arithmetic of its own except the saving
// percentage, which comes from the existing bundleSavingPercent()
// helper rather than a second copy of the sum.
//
// Orange appears in exactly one place: the bundle price. The buttons
// use the admin's own styles so this screen looks like every other one,
// and the warning bar below uses a softer amber on purpose -- so "this
// is the price" and "this needs your attention" never look alike.
const NAVY = "#0F2D52";
const ORANGE = "#F97316";
const EMERALD = "#16A34A";
const BORDER = "#E5E7EB";
const TEXT = "#111111";
const SECONDARY = "#6B7280";

const VISIBLE_ITEMS = 3;

function StatusPill({ published }: { published: boolean }) {
  if (!published) {
    return (
      <span
        className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ backgroundColor: "#F3F4F6", color: SECONDARY }}
      >
        Draft
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: "#ECFDF5", color: "#047857" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: EMERALD }} aria-hidden="true" />
      Live
    </span>
  );
}

// A thumbnail that always occupies the same space, so a bundle with no
// photo yet does not make the row jump around.
function Thumb({ src, size, rounded }: { src: string | null; size: number; rounded: string }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${rounded}`}
      style={{ width: size, height: size, backgroundColor: "#F3F4F6", border: `1px solid ${BORDER}` }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px]"
          style={{ color: SECONDARY }}
        >
          No photo
        </span>
      )}
    </div>
  );
}

function PriceRow({
  label,
  value,
  valueColor,
  strike = false,
  big = false,
  note,
}: {
  label: string;
  value: string;
  valueColor?: string;
  strike?: boolean;
  big?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs" style={{ color: SECONDARY }}>
        {label}
      </span>
      <span
        className={big ? "text-xl font-bold" : "text-sm font-medium"}
        style={{
          color: valueColor ?? TEXT,
          textDecoration: strike ? "line-through" : undefined,
        }}
      >
        {value}
        {note && (
          <span className="ml-1 text-xs font-medium" style={{ color: valueColor ?? SECONDARY }}>
            {note}
          </span>
        )}
      </span>
    </div>
  );
}

export function BundleCard({ bundle }: { bundle: AdminBundleRow }) {
  const [expanded, setExpanded] = useState(false);

  const published = bundle.status === "published";
  const hiddenCount = bundle.items.length - VISIBLE_ITEMS;
  const shown = expanded ? bundle.items : bundle.items.slice(0, VISIBLE_ITEMS);

  // Straight off the row; the percentage reuses the same helper the rest
  // of the feature uses rather than recomputing the difference here.
  const savingPercent = bundleSavingPercent(bundle.separateTotal, bundle.price);

  // "3 products · Earbuds, Cable, Case" -- the same summary the old list
  // showed, just tightened so it does not wrap on a narrow card.
  const summary = bundle.items.map((item) => item.productName).join(", ");

  return (
    <li
      className="rounded-xl shadow-[var(--shadow-card)]"
      style={{ backgroundColor: "#FFFFFF", border: `1px solid ${BORDER}` }}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
        {/* ── name, photo, status ─────────────────────────────────── */}
        <div className="flex min-w-0 items-start gap-3 sm:col-start-1 sm:row-start-1 sm:gap-4">
          <Thumb src={bundle.image} size={56} rounded="rounded-lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/bundles/${bundle.id}`}
                className="truncate text-base font-bold hover:underline"
                style={{ color: TEXT }}
              >
                {bundle.name}
              </Link>
              <StatusPill published={published} />
            </div>
            <p className="mt-1 truncate text-sm" style={{ color: SECONDARY }}>
              {bundle.items.length} product{bundle.items.length === 1 ? "" : "s"}
              {summary ? ` · ${summary}` : ""}
            </p>
          </div>

        </div>

        {/* order-last puts these at the BOTTOM on a phone, under the
            price block, and full width; at sm+ the explicit placement
            below moves them back to the top right. */}
        <div className="order-last flex shrink-0 flex-col gap-2 sm:order-none sm:col-start-2 sm:row-start-1 sm:flex-row sm:items-center">
          <Link
            href={`/admin/bundles/${bundle.id}`}
            className="transition-brand inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-black/5 sm:w-auto"
            style={{ borderColor: NAVY, color: NAVY }}
          >
            Edit Bundle
          </Link>
          <BundlePublishToggle bundleId={bundle.id} published={published} />
        </div>

        {/* ── products and pricing ────────────────────────────────── */}
        <div className="sm:col-span-2 sm:row-start-2">
          <div className="border-t" style={{ borderColor: BORDER }} />
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: SECONDARY }}>
              Products
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {shown.map((item) => (
                <li key={item.variantId} className="flex items-center gap-2.5">
                  <Thumb src={item.image} size={32} rounded="rounded-md" />
                  <span className="min-w-0 flex-1 truncate text-sm" style={{ color: TEXT }}>
                    {item.productName}
                    {item.colorName && (
                      <span style={{ color: SECONDARY }}> · {item.colorName}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm" style={{ color: SECONDARY }}>
                    × {item.quantity}
                  </span>
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-sm font-medium hover:underline"
                style={{ color: NAVY }}
              >
                {expanded ? "Show less" : `+ ${hiddenCount} more`}
              </button>
            )}
          </div>

          <div
            className="flex min-w-0 flex-col gap-2 rounded-lg p-3"
            style={{ backgroundColor: "#FAFAFA", border: `1px solid ${BORDER}` }}
          >
            <PriceRow label="Bundle Price" value={formatPrice(bundle.price)} valueColor={ORANGE} big />
            <PriceRow label="Bought Separately" value={formatPrice(bundle.separateTotal)} strike />
            <PriceRow
              label="Customer Saves"
              value={formatPrice(bundle.saving)}
              valueColor={EMERALD}
              note={savingPercent > 0 ? `(${savingPercent}%)` : undefined}
            />
            <PriceRow
              label="Your Profit"
              // Never invented: null means at least one item has no cost
              // price entered, and a made-up number would read as fact.
              value={bundle.profit != null ? formatPrice(bundle.profit) : "—"}
              valueColor={bundle.profit != null ? EMERALD : SECONDARY}
            />
            <div className="border-t pt-2" style={{ borderColor: BORDER }}>
              <PriceRow
                label="Can Sell Now"
                value={`${bundle.availableUnits} bundle${bundle.availableUnits === 1 ? "" : "s"}`}
              />
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ── the existing unavailable warning, unchanged in meaning ── */}
      {bundle.blockedBy.length > 0 && (
        <div
          className="rounded-b-xl border-t px-4 py-3 sm:px-5"
          style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#92400E" }}>
            {published ? "This bundle is live but cannot be sold" : "This bundle cannot be sold yet"}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {bundle.blockedBy.map((blocker, index) => (
              <li key={index} className="text-sm" style={{ color: "#92400E" }}>
                <strong>{blocker.productName}</strong> — {blocker.reason}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm" style={{ color: "#B45309" }}>
            {published
              ? "Customers see it as out of stock. Republish that product, or unpublish this bundle."
              : "Republish that product, or swap it for something else in the bundle."}
          </p>
        </div>
      )}
    </li>
  );
}
