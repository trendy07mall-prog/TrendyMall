"use client";

import { useState } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QuickEditVariantActive } from "@/components/admin/QuickEditVariantActive";
import { quickUpdateVariantPrice, quickUpdateVariantStock } from "@/lib/admin/products-mutations";
import { VARIANT_GRID_COLS } from "@/lib/admin/variant-panel";
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
  "w-full rounded-[var(--radius-sm)] border border-[var(--foreground)] bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Bordered even at rest (not border-transparent-until-hover) -- the point
// is looking like an editable field before the admin ever touches it, not
// just once they've found it. Hover only darkens the border a step further.
const fieldButtonClass =
  "w-full truncate rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2 py-1 text-left text-sm transition-colors hover:border-[var(--border-hover)] disabled:cursor-wait disabled:opacity-60";

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

  function renderField(
    field: FieldKey,
    label: string,
    value: number | null,
    displayValue: string,
    valueClassName = "",
  ) {
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
        className={`${fieldButtonClass} ${valueClassName}`}
      >
        {isPending ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 animate-spin shrink-0 rounded-full border-2 border-black/10 border-t-[var(--foreground)]" />
            {displayValue}
          </span>
        ) : (
          displayValue
        )}
      </button>
    );
  }

  return (
    <div className={`grid ${VARIANT_GRID_COLS} items-center gap-3 py-1.5`}>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-[var(--border)]"
          style={{ backgroundColor: variant.colorHex ?? "#e5e7eb" }}
          aria-hidden="true"
        />
        <p className="min-w-0 truncate text-sm">
          {variant.colorName || variant.sku || "Default"}
          {variant.isDefault && <span className="ml-1.5 text-xs text-[var(--muted)]">(default)</span>}
        </p>
      </div>

      {renderField("regularPrice", "Regular price", regularPrice, formatPrice(regularPrice))}
      {renderField(
        "salePrice",
        "Sale price",
        salePrice,
        salePrice != null ? formatPrice(salePrice) : "—",
        "text-[var(--color-discount)]",
      )}
      {renderField("stock", "Stock", stock, String(stock))}

      <div className="flex items-center gap-2">
        <QuickEditVariantActive variantId={variant.id} isActive={isActive} onToggled={setIsActive} />
        <span
          className={`text-xs font-medium ${
            isActive ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
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
