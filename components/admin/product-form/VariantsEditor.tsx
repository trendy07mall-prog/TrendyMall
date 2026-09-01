"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/admin/uploads";
import { FileInputButton } from "@/components/admin/FileInputButton";
import type { Attribute, AttributeValue } from "@/types";

const MAX_VARIANT_IMAGES = 4;

export interface VariantDraft {
  // Present only for a variant that already exists in the DB — populated
  // when editing a product, omitted for a row added in this session. Lets
  // the server sync variants by stable identity instead of deleting and
  // reinserting with a fresh id on every save.
  id?: string;
  // Optional now -- a product with no real color/size choice gets exactly
  // one variant row with these left blank (no swatch shown anywhere on
  // the storefront), per the pricing migration's "every product gets at
  // least one variant" design. Price lives ONLY here now -- there is no
  // more product-level price field anywhere in this form.
  colorName: string;
  colorHex: string;
  stock: string;
  regularPrice: string;
  salePrice: string;
  sku: string;
  // Up to 4, first = primary (shown on the swatch/card). Capped again
  // server-side in lib/admin/products.ts -- never trust the client alone.
  imageUrls: string[];
  // Which non-color attribute value this variant represents, one per
  // attribute the product has assigned (e.g. a specific Mah capacity).
  // Left unset for an attribute = this variant doesn't distinguish on it,
  // matching today's behavior for every product that hasn't opted in.
  attributeValueIds: string[];
}

// Every product needs at least one variant to hold its price now -- used
// both as VariantsEditor's own starting row and as ProductForm's submit-time
// fallback if an admin removes every row.
export const BLANK_VARIANT_DRAFT: VariantDraft = {
  colorName: "",
  colorHex: "",
  stock: "",
  regularPrice: "",
  salePrice: "",
  sku: "",
  imageUrls: [],
  attributeValueIds: [],
};

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Every new row defaults colorHex to black (see addRow below) -- typing a
// recognized name here auto-fills a matching hex so "white" doesn't
// silently save as black just because the admin forgot to also touch the
// color picker. Only the common/likely cases; anything not listed still
// needs the picker set manually, same as before.
const COMMON_COLOR_HEX: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  gray: "#6b7280",
  grey: "#6b7280",
  silver: "#c0c0c0",
  gold: "#d4af37",
  pink: "#ec4899",
  purple: "#a855f7",
  orange: "#f97316",
  brown: "#78350f",
  navy: "#1e3a8a",
  beige: "#f5f5dc",
};

export function VariantsEditor({
  value,
  onChange,
  variantAttributes,
}: {
  value: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
  // Non-color attributes currently checked in AttributesField, grouped --
  // one optional single-select picker is rendered per group, per variant.
  variantAttributes: { attribute: Attribute; values: AttributeValue[] }[];
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // Rows whose hex the admin has manually set (via either the color picker
  // or the text field) -- once touched, typing a color name no longer
  // auto-fills over it. Transient UI state only, never saved.
  const [touchedHexRows, setTouchedHexRows] = useState<Set<number>>(new Set());

  function updateRow(index: number, patch: Partial<VariantDraft>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  // Typing a recognized color name auto-fills a matching hex, so "white"
  // doesn't silently save with no swatch color just because the admin
  // forgot to also touch the color picker. Only applies to rows added
  // this session (no `id` yet) and only once a name is actually typed --
  // an existing, already-saved variant's hex was a deliberate choice and
  // must never be silently overwritten just because its name was edited,
  // and a genuinely color-less "default" variant must be able to stay
  // blank rather than defaulting to some color that was never chosen.
  function handleColorNameChange(index: number, name: string) {
    const patch: Partial<VariantDraft> = { colorName: name };
    if (!value[index].id && !touchedHexRows.has(index)) {
      const match = COMMON_COLOR_HEX[name.trim().toLowerCase()];
      if (match) patch.colorHex = match;
    }
    updateRow(index, patch);
  }

  function handleColorHexChange(index: number, hex: string) {
    setTouchedHexRows((prev) => new Set(prev).add(index));
    updateRow(index, { colorHex: hex });
  }

  function addRow() {
    onChange([...value, { ...BLANK_VARIANT_DRAFT }]);
  }

  // A variant links at most one value per attribute -- picking a new value
  // for an attribute replaces whatever this variant previously had for it.
  function setAttributeValue(rowIndex: number, attribute: Attribute, valueId: string) {
    const group = variantAttributes.find((g) => g.attribute.id === attribute.id);
    const groupValueIds = new Set((group?.values ?? []).map((v) => v.id));
    const kept = value[rowIndex].attributeValueIds.filter((id) => !groupValueIds.has(id));
    updateRow(rowIndex, {
      attributeValueIds: valueId ? [...kept, valueId] : kept,
    });
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setTouchedHexRows((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  }

  async function handleImagesChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []).slice(
      0,
      MAX_VARIANT_IMAGES - value[index].imageUrls.length,
    );
    if (files.length === 0) return;

    setUploadingIndex(index);
    const uploaded: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadAdminImage("variants", formData);
      if (result.url) uploaded.push(result.url);
    }
    setUploadingIndex(null);
    if (uploaded.length > 0) {
      updateRow(index, { imageUrls: [...value[index].imageUrls, ...uploaded] });
    }
    event.target.value = "";
  }

  function moveImage(rowIndex: number, imageIndex: number, direction: -1 | 1) {
    const urls = value[rowIndex].imageUrls;
    const target = imageIndex + direction;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    [next[imageIndex], next[target]] = [next[target], next[imageIndex]];
    updateRow(rowIndex, { imageUrls: next });
  }

  function removeImage(rowIndex: number, imageIndex: number) {
    updateRow(rowIndex, {
      imageUrls: value[rowIndex].imageUrls.filter((_, i) => i !== imageIndex),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium">Variants &amp; Pricing</label>
        <p className="text-xs text-[var(--muted)]">
          Every product needs at least one row here for its price. If this product has no
          real color choice, leave the color fields blank on a single row — no color
          selector will show on the product page.
        </p>
      </div>

      {value.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Color name"
              value={row.colorName}
              onChange={(e) => handleColorNameChange(index, e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <input
              type="color"
              value={row.colorHex}
              onChange={(e) => handleColorHexChange(index, e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent p-0.5"
              aria-label="Color swatch"
            />
            <input
              type="text"
              value={row.colorHex}
              onChange={(e) => handleColorHexChange(index, e.target.value)}
              className={`${inputClass} w-24`}
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="ml-auto text-xs text-red-600 underline"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              type="number"
              min="0"
              placeholder="Stock (optional)"
              value={row.stock}
              onChange={(e) => updateRow(index, { stock: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Regular price *"
              value={row.regularPrice}
              onChange={(e) => updateRow(index, { regularPrice: e.target.value })}
              className={inputClass}
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Sale price (optional)"
              value={row.salePrice}
              onChange={(e) => updateRow(index, { salePrice: e.target.value })}
              className={inputClass}
              title="Leave blank if this variant isn't on sale"
            />
            <input
              type="text"
              placeholder="SKU (optional)"
              value={row.sku}
              onChange={(e) => updateRow(index, { sku: e.target.value })}
              className={inputClass}
            />
          </div>

          {variantAttributes.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {variantAttributes.map(({ attribute, values }) => {
                const selected = values.find((v) => row.attributeValueIds.includes(v.id));
                return (
                  <label key={attribute.id} className="flex flex-col gap-1 text-xs">
                    <span className="text-[var(--muted)]">{attribute.name}</span>
                    <select
                      value={selected?.id ?? ""}
                      onChange={(e) => setAttributeValue(index, attribute, e.target.value)}
                      className={inputClass}
                    >
                      <option value="">— not distinguished —</option>
                      {values.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.value}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--muted)]">
              Images ({row.imageUrls.length}/{MAX_VARIANT_IMAGES}, first is primary)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {row.imageUrls.map((url, imageIndex) => (
                <div
                  key={`${url}-${imageIndex}`}
                  className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] p-1.5"
                >
                  <span className="relative block h-14 w-14 overflow-hidden rounded-[var(--radius-sm)]">
                    <Image src={url} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      aria-label="Move image earlier"
                      disabled={imageIndex === 0}
                      onClick={() => moveImage(index, imageIndex, -1)}
                      className="px-1 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move image later"
                      disabled={imageIndex === row.imageUrls.length - 1}
                      onClick={() => moveImage(index, imageIndex, 1)}
                      className="px-1 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeImage(index, imageIndex)}
                      className="px-1 text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {row.imageUrls.length < MAX_VARIANT_IMAGES && (
                <FileInputButton
                  label="Add Images"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImagesChange(index, e)}
                />
              )}
              {uploadingIndex === index && (
                <span className="text-xs text-[var(--muted)]">Uploading…</span>
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
      >
        + Add color variant
      </button>
    </div>
  );
}
