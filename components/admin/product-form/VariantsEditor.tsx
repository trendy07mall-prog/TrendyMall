"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/admin/uploads";
import type { Attribute, AttributeValue } from "@/types";

const MAX_VARIANT_IMAGES = 4;

export interface VariantDraft {
  // Present only for a variant that already exists in the DB — populated
  // when editing a product, omitted for a row added in this session. Lets
  // the server sync variants by stable identity instead of deleting and
  // reinserting with a fresh id on every save.
  id?: string;
  colorName: string;
  colorHex: string;
  stock: string;
  price: string;
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

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

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

  function updateRow(index: number, patch: Partial<VariantDraft>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([
      ...value,
      { colorName: "", colorHex: "#000000", stock: "", price: "", sku: "", imageUrls: [], attributeValueIds: [] },
    ]);
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
      <label className="text-sm font-medium">Color variants</label>

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
              onChange={(e) => updateRow(index, { colorName: e.target.value })}
              className={`${inputClass} flex-1`}
            />
            <input
              type="color"
              value={row.colorHex}
              onChange={(e) => updateRow(index, { colorHex: e.target.value })}
              className="h-9 w-9 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent p-0.5"
              aria-label="Color swatch"
            />
            <input
              type="text"
              value={row.colorHex}
              onChange={(e) => updateRow(index, { colorHex: e.target.value })}
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
              placeholder="Price (optional)"
              value={row.price}
              onChange={(e) => updateRow(index, { price: e.target.value })}
              className={inputClass}
              title="Leave blank to use the product's price"
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
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImagesChange(index, e)}
                  className="w-40 text-xs"
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
