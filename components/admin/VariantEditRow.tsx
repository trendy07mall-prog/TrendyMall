"use client";

import { useState } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QuickEditVariantActive } from "@/components/admin/QuickEditVariantActive";
import { quickUpdateVariantPrice, quickUpdateVariantStock } from "@/lib/admin/products-mutations";
import { formatPrice } from "@/lib/utils";
import type { AdminVariantRow } from "@/lib/admin/products-query";

// A price edit changing the value by more than this fraction gets a confirm
// step first -- a typo safeguard (e.g. "1500" fat-fingered as "15000"), not
// a business rule. Stock edits never trigger this -- the task explicitly
// scopes it to price only.
const PRICE_CONFIRM_THRESHOLD = 0.5;

type FieldKey = "regularPrice" | "salePrice" | "stock";

interface PendingPriceConfirm {
  field: "regularPrice" | "salePrice";
  fromValue: number;
  toValue: number;
  nextRegularPrice: number;
  nextSalePrice: number | null;
}

const fieldInputClass =
  "w-24 rounded-[var(--radius-sm)] border border-[var(--foreground)] bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const fieldButtonClass =
  "rounded-[var(--radius-sm)] border border-transparent px-2 py-1 text-left text-sm hover:border-[var(--border)] hover:bg-black/[0.03] disabled:cursor-wait disabled:opacity-60";

// Same click-to-edit / Enter-or-blur-to-save / Escape-to-cancel shape as
// QuickEditPrice and QuickEditStock (the existing product-level quick-edit
// pair), extended here with Enter/Escape key handling and a big-change
// confirm step that neither of those two needed. Writes through the exact
// same quickUpdateVariantPrice/quickUpdateVariantStock functions the full
// product edit form and single-variant quick-edit already use -- never a
// second parallel update path.
export function VariantEditRow({ variant }: { variant: AdminVariantRow }) {
  const [regularPrice, setRegularPrice] = useState(variant.regularPrice);
  const [salePrice, setSalePrice] = useState(variant.salePrice);
  const [stock, setStock] = useState(variant.stock ?? 0);
  const [isActive, setIsActive] = useState(variant.isActive);

  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingField, setPendingField] = useState<FieldKey | null>(null);
  const [priceConfirm, setPriceConfirm] = useState<PendingPriceConfirm | null>(null);

  const { showToast } = useToast();

  function startEdit(field: FieldKey, currentValue: number | null) {
    setEditingField(field);
    setDraft(currentValue != null ? String(currentValue) : "");
  }

  function cancelEdit() {
    setEditingField(null);
    setDraft("");
  }

  async function commitPrice(nextRegularPrice: number, nextSalePrice: number | null, field: FieldKey) {
    setPendingField(field);
    const prevRegular = regularPrice;
    const prevSale = salePrice;
    setRegularPrice(nextRegularPrice);
    setSalePrice(nextSalePrice);
    const result = await quickUpdateVariantPrice(variant.id, {
      regularPrice: nextRegularPrice,
      salePrice: nextSalePrice,
    });
    setPendingField(null);
    if ("error" in result) {
      setRegularPrice(prevRegular);
      setSalePrice(prevSale);
      showToast(result.error, "error");
    } else {
      showToast("Price updated");
    }
  }

  async function commitStock(nextStock: number) {
    setPendingField("stock");
    const prevStock = stock;
    setStock(nextStock);
    const result = await quickUpdateVariantStock(variant.id, nextStock);
    setPendingField(null);
    if ("error" in result) {
      setStock(prevStock);
      showToast(result.error, "error");
    } else {
      showToast("Stock updated");
    }
  }

  function attemptCommit(field: FieldKey) {
    if (editingField !== field) return; // Enter already committed; ignore the trailing blur
    const raw = draft.trim();
    cancelEdit();

    if (field === "stock") {
      const parsed = Number(raw);
      if (raw === "" || !Number.isInteger(parsed) || parsed < 0) {
        showToast("Stock must be a non-negative whole number.", "error");
        return;
      }
      if (parsed === stock) return;
      commitStock(parsed);
      return;
    }

    const isRegular = field === "regularPrice";

    // Clearing sale price back to "no sale" -- the one case an empty field
    // is valid input rather than a parse failure.
    if (!isRegular && raw === "") {
      if (salePrice === null) return;
      commitPrice(regularPrice, null, field);
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || (isRegular && parsed === 0)) {
      showToast(
        isRegular ? "Price must be greater than 0." : "Sale price must be a valid number.",
        "error",
      );
      return;
    }

    const nextRegularPrice = isRegular ? parsed : regularPrice;
    const nextSalePrice = isRegular ? salePrice : parsed;
    // Matches the full product edit form and the existing single-variant
    // quick-edit exactly -- a hard block, not a soft warning (the task
    // description assumed "soft warning," but that's not what exists
    // anywhere else in the app; see the audit note on this).
    if (nextSalePrice != null && nextSalePrice >= nextRegularPrice) {
      showToast("Sale price must be less than the regular price.", "error");
      return;
    }

    const currentValue = isRegular ? regularPrice : (salePrice ?? 0);
    if (parsed === currentValue) return;

    if (currentValue > 0 && Math.abs(parsed - currentValue) / currentValue > PRICE_CONFIRM_THRESHOLD) {
      setPriceConfirm({
        field,
        fromValue: currentValue,
        toValue: parsed,
        nextRegularPrice,
        nextSalePrice,
      });
      return;
    }

    commitPrice(nextRegularPrice, nextSalePrice, field);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, field: FieldKey) {
    if (event.key === "Enter") {
      event.preventDefault();
      attemptCommit(field);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  function renderField(field: FieldKey, label: string, value: number | null, displayValue: string) {
    const isEditing = editingField === field;
    const isPending = pendingField === field;

    if (isEditing) {
      return (
        <input
          type="number"
          min="0"
          step={field === "stock" ? "1" : "0.01"}
          autoFocus
          value={draft}
          disabled={isPending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => attemptCommit(field)}
          onKeyDown={(e) => handleKeyDown(e, field)}
          aria-label={label}
          className={fieldInputClass}
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => startEdit(field, value)}
        disabled={isPending}
        aria-label={`Edit ${label}`}
        className={fieldButtonClass}
      >
        {isPending ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/10 border-t-[var(--foreground)]" />
            {displayValue}
          </span>
        ) : (
          displayValue
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-[var(--border)]"
          style={{ backgroundColor: variant.colorHex ?? "#e5e7eb" }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate text-sm">
            {variant.colorName || variant.sku || "Default"}
            {variant.isDefault && <span className="ml-1.5 text-xs text-[var(--muted)]">(default)</span>}
          </p>
          <span
            className={`text-[11px] font-medium uppercase tracking-wide ${
              isActive ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)] uppercase">Regular</span>
          {renderField("regularPrice", "Regular price", regularPrice, formatPrice(regularPrice))}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)] uppercase">Sale</span>
          {renderField(
            "salePrice",
            "Sale price",
            salePrice,
            salePrice != null ? formatPrice(salePrice) : "—",
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)] uppercase">Stock</span>
          {renderField("stock", "Stock", stock, String(stock))}
        </div>
        <QuickEditVariantActive
          variantId={variant.id}
          isActive={isActive}
          onToggled={setIsActive}
        />
      </div>

      {priceConfirm && (
        <ConfirmDialog
          title="Large price change"
          message={`This changes the ${priceConfirm.field === "regularPrice" ? "regular" : "sale"} price from ${formatPrice(priceConfirm.fromValue)} to ${formatPrice(priceConfirm.toValue)} — more than a 50% change. Continue?`}
          confirmLabel="Save Anyway"
          onConfirm={() => {
            const { nextRegularPrice, nextSalePrice, field } = priceConfirm;
            setPriceConfirm(null);
            commitPrice(nextRegularPrice, nextSalePrice, field);
          }}
          onClose={() => setPriceConfirm(null)}
        />
      )}
    </div>
  );
}
