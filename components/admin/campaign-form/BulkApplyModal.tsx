"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchProductsForPicker,
  getCategoriesForPicker,
  getVariantsForBulkScope,
} from "@/lib/admin/campaigns-query";
import type { PickerProduct } from "@/lib/admin/campaigns-query";
import type { Category } from "@/types";
import { formatPrice } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface BulkPickedVariant {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  regularPrice: number;
  salePrice: number | null;
  campaignPrice: number;
}

interface PreviewRow {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  currentPrice: number;
  regularPrice: number;
  salePrice: number | null;
  newPrice: number;
}

type ScopeMode = "category" | "products";
type RuleType = "fixed" | "percentage";

function currentPriceOf(v: { regularPrice: number; salePrice: number | null }): number {
  return v.salePrice ?? v.regularPrice;
}

export function BulkApplyModal({
  onClose,
  onAdd,
  alreadyAddedVariantIds,
}: {
  onClose: () => void;
  onAdd: (picks: BulkPickedVariant[]) => void;
  alreadyAddedVariantIds: Set<string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<ScopeMode>("category");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<PickerProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const [ruleType, setRuleType] = useState<RuleType>("percentage");
  const [ruleValue, setRuleValue] = useState<number>(10);

  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    getCategoriesForPicker().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "products") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewRows(null);
    let ignore = false;
    const timer = setTimeout(() => {
      searchProductsForPicker(productSearch, undefined, 15).then((results) => {
        if (!ignore) setProductResults(results);
      });
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [mode, productSearch]);

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

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setPreviewRows(null);
  }

  function computeNewPrice(current: number): number {
    const value = ruleType === "fixed" ? ruleValue : current * (1 - ruleValue / 100);
    return Math.round(Math.max(0, value) * 100) / 100;
  }

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const products = await getVariantsForBulkScope(
        mode === "category" ? categoryId || undefined : undefined,
        mode === "products" ? Array.from(selectedProductIds) : undefined,
      );
      const rows: PreviewRow[] = [];
      for (const product of products) {
        for (const variant of product.variants) {
          if (alreadyAddedVariantIds.has(variant.id)) continue;
          const current = currentPriceOf({ regularPrice: variant.regularPrice, salePrice: variant.salePrice });
          rows.push({
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantLabel: variant.colorName || variant.sku || "Default",
            currentPrice: current,
            regularPrice: variant.regularPrice,
            salePrice: variant.salePrice,
            newPrice: computeNewPrice(current),
          });
        }
      }
      setPreviewRows(rows);
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleConfirm() {
    if (!previewRows) return;
    onAdd(
      previewRows.map((r) => ({
        productId: r.productId,
        variantId: r.variantId,
        productName: r.productName,
        variantLabel: r.variantLabel,
        regularPrice: r.regularPrice,
        salePrice: r.salePrice,
        campaignPrice: r.newPrice,
      })),
    );
    onClose();
  }

  const canPreview = mode === "category" ? Boolean(categoryId) : selectedProductIds.size > 0;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)]">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bulk-apply campaign pricing"
        className="absolute top-1/2 left-1/2 flex h-[85vh] w-[90%] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-card)] bg-[var(--color-card)] shadow-[var(--shadow-card-hover)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-bold">Bulk-apply pricing</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-sm underline">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium">Scope</p>
              <div className="mt-2 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "category"}
                    onChange={() => {
                      setMode("category");
                      setPreviewRows(null);
                    }}
                  />
                  Entire category
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "products"}
                    onChange={() => {
                      setMode("products");
                      setPreviewRows(null);
                    }}
                  />
                  Selected products
                </label>
              </div>
            </div>

            {mode === "category" ? (
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPreviewRows(null);
                }}
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                />
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {productResults.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(p.id)}
                        onChange={() => toggleProduct(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted)]">{selectedProductIds.size} product(s) selected</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium">Pricing rule</p>
              <div className="mt-2 flex items-center gap-3">
                <select
                  value={ruleType}
                  onChange={(e) => {
                    setRuleType(e.target.value as RuleType);
                    setPreviewRows(null);
                  }}
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                >
                  <option value="percentage">% off</option>
                  <option value="fixed">Fixed price</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ruleValue}
                  onChange={(e) => {
                    setRuleValue(Number(e.target.value));
                    setPreviewRows(null);
                  }}
                  className="w-28 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={!canPreview || previewLoading}
              onClick={handlePreview}
              className="transition-brand self-start rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
            >
              {previewLoading ? "Loading…" : "Preview"}
            </button>

            {previewRows != null && (
              <div>
                <p className="text-sm font-medium">
                  {previewRows.length} variant{previewRows.length === 1 ? "" : "s"} will be affected
                </p>
                {previewRows.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[500px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left">
                          <th className="py-1.5 pr-3">Product</th>
                          <th className="py-1.5 pr-3">Current price</th>
                          <th className="py-1.5">New price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr key={row.variantId} className="border-b border-[var(--border)]">
                            <td className="py-1.5 pr-3">
                              {row.productName}
                              <span className="ml-1.5 text-xs text-[var(--muted)]">{row.variantLabel}</span>
                            </td>
                            <td className="py-1.5 pr-3 text-[var(--muted)]">{formatPrice(row.currentPrice)}</td>
                            <td className="py-1.5">{formatPrice(row.newPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
          <span className="text-sm text-[var(--muted)]">
            {previewRows ? `${previewRows.length} to add` : "Preview to see affected variants"}
          </span>
          <button
            type="button"
            disabled={!previewRows || previewRows.length === 0}
            onClick={handleConfirm}
            className="transition-brand rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
          >
            Confirm &amp; add{previewRows ? ` ${previewRows.length}` : ""} items
          </button>
        </div>
      </div>
    </div>
  );
}
