"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchProductsForPicker,
  getCategoriesForPicker,
  getActiveCampaignOverlaps,
} from "@/lib/admin/campaigns-query";
import type { PickerProduct, CampaignOverlapInfo } from "@/lib/admin/campaigns-query";
import type { Category } from "@/types";
import { formatPrice } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface PickedVariant {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  regularPrice: number;
  salePrice: number | null;
}

export function ProductPickerModal({
  onClose,
  onAdd,
  alreadyAddedVariantIds,
  excludeCampaignId,
}: {
  onClose: () => void;
  onAdd: (picks: PickedVariant[]) => void;
  alreadyAddedVariantIds: Set<string>;
  excludeCampaignId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, PickedVariant>>(new Map());
  const [overlaps, setOverlaps] = useState<Map<string, CampaignOverlapInfo[]>>(new Map());

  useEffect(() => {
    getCategoriesForPicker().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    let ignore = false;
    const timer = setTimeout(() => {
      searchProductsForPicker(search, categoryId || undefined, 15).then((results) => {
        // A slower-resolving request from a previous keystroke could
        // otherwise arrive after this one and clobber correct results
        // with stale ones -- ignore it if a newer effect run has since
        // superseded this closure.
        if (ignore) return;
        setProducts(results);
        setLoading(false);

        // One batched query for every variant in this result set, not
        // per-row -- same "batch, never loop" discipline as Phase 2.
        const variantIds = results.flatMap((p) => p.variants.map((v) => v.id));
        getActiveCampaignOverlaps(variantIds, excludeCampaignId).then((map) => {
          if (!ignore) setOverlaps(map);
        });
      });
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search, categoryId, excludeCampaignId]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const container = containerRef.current;
    container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  function toggle(product: PickerProduct, variant: PickerProduct["variants"][number]) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(variant.id)) {
        next.delete(variant.id);
      } else {
        next.set(variant.id, {
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantLabel: variant.colorName || variant.sku || "Default",
          regularPrice: variant.regularPrice,
          salePrice: variant.salePrice,
        });
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)]">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add products to campaign"
        className="absolute top-1/2 left-1/2 flex h-[85vh] w-[90%] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-card)] bg-[var(--color-card)] shadow-[var(--shadow-card-hover)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-bold">Add products</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-sm underline">
            Close
          </button>
        </div>

        <div className="flex flex-wrap gap-3 border-b border-[var(--border)] p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or brand…"
            className="min-w-[200px] flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-[var(--muted)]">Searching…</p>}
          {!loading && products.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No products found.</p>
          )}
          <div className="flex flex-col gap-4">
            {products.map((product) => (
              <div key={product.id}>
                <p className="text-sm font-medium">
                  {product.name}
                  {product.sku && (
                    <span className="ml-2 text-xs text-[var(--muted)]">{product.sku}</span>
                  )}
                </p>
                <div className="mt-1 flex flex-col divide-y divide-[var(--border)]">
                  {product.variants.map((variant) => {
                    const alreadyAdded = alreadyAddedVariantIds.has(variant.id);
                    const variantOverlaps = overlaps.get(variant.id) ?? [];
                    return (
                      <div key={variant.id} className={`py-1.5 ${alreadyAdded ? "opacity-50" : ""}`}>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={alreadyAdded}
                              checked={selected.has(variant.id)}
                              onChange={() => toggle(product, variant)}
                            />
                            {variant.colorName || variant.sku || "Default"}
                            {alreadyAdded && (
                              <span className="text-xs text-[var(--muted)]">(already added)</span>
                            )}
                            {!variant.isActive && (
                              <span className="text-xs text-[var(--color-discount)]">(inactive)</span>
                            )}
                          </span>
                          <span className="text-[var(--muted)]">
                            {variant.salePrice != null ? (
                              <>
                                <span className="line-through">{formatPrice(variant.regularPrice)}</span>{" "}
                                {formatPrice(variant.salePrice)}
                              </>
                            ) : (
                              formatPrice(variant.regularPrice)
                            )}
                          </span>
                        </label>
                        {variantOverlaps.length > 0 && (
                          <p className="pl-6 text-xs text-[var(--color-warning)]">
                            Also in <span className="font-medium">{variantOverlaps[0].campaignName}</span> — {formatPrice(variantOverlaps[0].campaignPrice)}
                            {variantOverlaps[0].endAt && `, until ${new Date(variantOverlaps[0].endAt).toLocaleDateString()}`}
                            {variantOverlaps.length > 1 && ` (+${variantOverlaps.length - 1} more)`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
          <span className="text-sm text-[var(--muted)]">{selected.size} selected</span>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              onAdd(Array.from(selected.values()));
              onClose();
            }}
            className="transition-brand rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
          >
            Add {selected.size > 0 ? selected.size : ""} selected
          </button>
        </div>
      </div>
    </div>
  );
}
