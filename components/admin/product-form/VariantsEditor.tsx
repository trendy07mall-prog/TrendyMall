"use client";

import { useState } from "react";
import Image from "next/image";
import { compressAndUploadMany } from "@/lib/images/upload-with-compression";
import { uploadHint } from "@/lib/images/targets";
import { colorKey } from "@/lib/variant-options";
import {
  addMissingCombinations,
  colorNameProblem,
  colorsFromRows,
  gridProblems,
  type GridColor,
  type GridGroup,
} from "@/lib/variant-grid";
import { FileInputButton } from "@/components/admin/FileInputButton";
import { VariantCountPreview } from "./VariantCountPreview";
import { VariantSkuField } from "./VariantSkuField";
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
  // Unticked "Sell" box: a combination the shop doesn't make. Kept in the
  // grid so the admin can see it, but ProductForm leaves it out of the
  // save, so the server never sees it (an existing row is deleted).
  notSold?: boolean;
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

// What ProductForm actually submits: sold rows only.
export function draftsToSave(drafts: VariantDraft[]): VariantDraft[] {
  return drafts
    .filter((d) => !d.notSold)
    .map((d) => {
      const rest = { ...d };
      delete rest.notSold;
      return rest;
    });
}

export function gridGroupsFor(
  variantAttributes: { attribute: Attribute; values: AttributeValue[] }[],
): GridGroup[] {
  return variantAttributes.map(({ attribute, values }) => ({
    id: attribute.id,
    name: attribute.name,
    valueIds: values.map((v) => v.id),
  }));
}

const baseInputClass =
  "min-w-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] disabled:opacity-50";
// Grid cells stretch to their column; the toolbar inputs set their own width.
const inputClass = `${baseInputClass} w-full`;

// Typing a recognized name in "New colour" auto-fills a matching swatch,
// so "white" doesn't silently save as black just because the admin forgot
// to also touch the colour picker. Anything not listed needs the picker.
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

function Dot({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/15"
      style={{ backgroundColor: hex || "transparent" }}
    />
  );
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
      <span>
        {n}. {title}
      </span>
      <span className="text-xs font-normal text-[var(--muted)]">{hint}</span>
    </p>
  );
}

export function VariantsEditor({
  value,
  onChange,
  variantAttributes,
  onSkuChecked,
  onBusyChange,
}: {
  value: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
  /** Lets ProductForm keep Save disabled while variant images process. */
  onBusyChange?: (busy: boolean) => void;
  // Non-color attributes currently checked in AttributesField, grouped --
  // one optional single-select picker is rendered per group, per variant.
  variantAttributes: { attribute: Attribute; values: AttributeValue[] }[];
  // Passed straight through to each row's SKU field. Advisory only: it
  // feeds the sticky bar's wording and never gates saving.
  onSkuChecked?: (sku: string, taken: boolean) => void;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // Per row, so a rejection names the variant it belongs to.
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  // Which rows have their photos panel open.
  const [openPhotos, setOpenPhotos] = useState<Set<number>>(new Set());

  // The colours list. Starts from the colours the rows already use; a
  // colour added here has no rows until "Create all combinations" (or a
  // row picks it).
  const [colors, setColors] = useState<GridColor[]>(() => colorsFromRows(value));
  const [newColor, setNewColor] = useState<GridColor>({ name: "", hex: "#000000" });
  const [newHexTouched, setNewHexTouched] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ key: string; name: string; hex: string } | null>(null);

  const [bulk, setBulk] = useState({ regularPrice: "", salePrice: "", stock: "" });
  const [createdNote, setCreatedNote] = useState<string | null>(null);

  const groups = gridGroupsFor(variantAttributes);
  const problems = gridProblems(value, groups);
  const badRows = new Set([...problems.duplicates, ...problems.missing.map((m) => m.index)]);

  function updateRow(index: number, patch: Partial<VariantDraft>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  // Row indexes move when rows are added or removed, so per-row UI state
  // keyed by index starts fresh.
  function resetRowState() {
    setOpenPhotos(new Set());
    setRowErrors({});
  }

  function addRow() {
    const first = colors[0];
    onChange([...value, { ...BLANK_VARIANT_DRAFT, colorName: first?.name ?? "", colorHex: first?.hex ?? "" }]);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
    resetRowState();
  }

  // --- colours list ----------------------------------------------------

  function handleNewColorName(name: string) {
    setColorError(null);
    const match = COMMON_COLOR_HEX[name.trim().toLowerCase()];
    setNewColor((prev) => ({ name, hex: !newHexTouched && match ? match : prev.hex }));
  }

  function addColor() {
    const problem = colorNameProblem(newColor.name, colors);
    if (problem) {
      setColorError(problem);
      return;
    }
    const typed = newColor.name.trim();
    // "blue" -> "Blue"; anything with capitals is kept as typed.
    const name = typed === typed.toLowerCase() ? typed.replace(/\b\w/g, (ch) => ch.toUpperCase()) : typed;
    setColors([...colors, { name, hex: newColor.hex }]);
    setNewColor({ name: "", hex: "#000000" });
    setNewHexTouched(false);
  }

  function rowsUsing(key: string) {
    return value.filter((r) => colorKey(r.colorName) === key).length;
  }

  function removeColor(key: string) {
    setColors(colors.filter((c) => colorKey(c.name) !== key));
  }

  // Renaming or re-colouring a colour changes every row of that colour.
  function saveColorEdit() {
    if (!editing) return;
    const problem = colorNameProblem(editing.name, colors, editing.key);
    if (problem) {
      setColorError(problem);
      return;
    }
    const name = editing.name.trim();
    setColors(colors.map((c) => (colorKey(c.name) === editing.key ? { name, hex: editing.hex } : c)));
    onChange(
      value.map((r) => (colorKey(r.colorName) === editing.key ? { ...r, colorName: name, colorHex: editing.hex } : r)),
    );
    setEditing(null);
    setColorError(null);
  }

  // --- rows ------------------------------------------------------------

  function pickRowColor(index: number, key: string) {
    const color = colors.find((c) => colorKey(c.name) === key);
    updateRow(index, { colorName: color?.name ?? "", colorHex: color?.hex ?? "" });
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

  function createAll() {
    const { rows, added } = addMissingCombinations(value, colors, groups, BLANK_VARIANT_DRAFT);
    // A lone blank starter row (new product) is replaced, not kept.
    const starter = value.length === 1 && !value[0].id && !value[0].regularPrice.trim() && !value[0].colorName;
    const next = starter && added > 0 ? rows.filter((r) => r !== value[0]) : rows;
    onChange(next);
    resetRowState();
    setCreatedNote(
      added === 0
        ? "Every combination already has a row."
        : `Added ${added} ${added === 1 ? "row" : "rows"}. Untick any you don't sell.`,
    );
  }

  function applyBulk() {
    const patch: Partial<VariantDraft> = {};
    if (bulk.regularPrice.trim()) patch.regularPrice = bulk.regularPrice.trim();
    if (bulk.salePrice.trim()) patch.salePrice = bulk.salePrice.trim();
    if (bulk.stock.trim()) patch.stock = bulk.stock.trim();
    if (Object.keys(patch).length === 0) return;
    onChange(value.map((r) => (r.notSold ? r : { ...r, ...patch })));
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
    onBusyChange?.(true);
    setRowErrors((prev) => ({ ...prev, [index]: [] }));

    // Rejections used to be dropped on the floor here -- the old loop was
    // `if (result.url) uploaded.push(...)` with no error branch at all, so
    // a variant image that failed simply never appeared and said nothing.
    const { urls, errors } = await compressAndUploadMany(files, "product", "variants");

    setUploadingIndex(null);
    onBusyChange?.(false);
    setRowErrors((prev) => ({ ...prev, [index]: errors }));
    if (urls.length > 0) {
      updateRow(index, { imageUrls: [...value[index].imageUrls, ...urls] });
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

  function togglePhotos(index: number) {
    setOpenPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // Sell | Colour | one per option | Price | Sale | Stock | SKU | Photos | ✕
  const columns = [
    "40px",
    "minmax(130px,1.2fr)",
    ...variantAttributes.map(() => "minmax(110px,1fr)"),
    "88px",
    "88px",
    "68px",
    "minmax(110px,1fr)",
    "76px",
    "24px",
  ].join(" ");
  const gridStyle = { "--variant-cols": columns } as React.CSSProperties;
  const rowGrid =
    "grid grid-cols-2 gap-2 sm:[grid-template-columns:var(--variant-cols)] sm:items-center";
  const soldCount = value.filter((r) => !r.notSold).length;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Colours */}
      <div className="flex flex-col gap-2">
        <StepTitle n={1} title="Colours" hint="Add each colour once. Leave empty if this product has no colour choice." />
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((c) => {
            const key = colorKey(c.name);
            const used = rowsUsing(key);
            if (editing?.key === key) {
              return (
                <span key={key} className="flex items-center gap-1.5 rounded-full border border-[var(--pf-navy)] py-1 pl-1.5 pr-2">
                  <input
                    type="color"
                    value={editing.hex}
                    onChange={(e) => setEditing({ ...editing, hex: e.target.value })}
                    aria-label={`Swatch for ${c.name}`}
                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => {
                      setColorError(null);
                      setEditing({ ...editing, name: e.target.value });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveColorEdit();
                      }
                    }}
                    aria-label="Colour name"
                    className="w-24 bg-transparent text-sm focus:outline-none"
                  />
                  <button type="button" onClick={saveColorEdit} className="text-xs font-semibold text-[var(--pf-navy)]">
                    Done
                  </button>
                </span>
              );
            }
            return (
              <span key={key} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] py-1 pl-1.5 pr-2 text-sm">
                <Dot hex={c.hex} />
                <button
                  type="button"
                  onClick={() => setEditing({ key, name: c.name, hex: c.hex })}
                  title="Rename or change the swatch (changes every row of this colour)"
                  className="font-medium hover:underline"
                >
                  {c.name}
                </button>
                <span className="text-xs text-[var(--muted)]">{c.hex}</span>
                <button
                  type="button"
                  onClick={() => removeColor(key)}
                  disabled={used > 0}
                  title={used > 0 ? `Used by ${used} ${used === 1 ? "row" : "rows"}. Remove or untick those rows first.` : "Remove colour"}
                  aria-label={`Remove ${c.name}`}
                  className="text-xs text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ✕
                </button>
              </span>
            );
          })}
          <span className="flex items-center gap-1.5">
            <input
              type="color"
              value={newColor.hex}
              onChange={(e) => {
                setNewHexTouched(true);
                setNewColor({ ...newColor, hex: e.target.value });
              }}
              aria-label="New colour swatch"
              className="h-8 w-8 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent p-0.5"
            />
            <input
              type="text"
              placeholder="New colour name"
              value={newColor.name}
              onChange={(e) => handleNewColorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addColor();
                }
              }}
              className={`${baseInputClass} w-40`}
            />
            <button
              type="button"
              onClick={addColor}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-black/5"
            >
              Add colour
            </button>
          </span>
        </div>
        {colorError ? (
          <p className="text-xs text-red-600">{colorError}</p>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Only the colour name here, like &ldquo;White&rdquo;. Mah, connector and other options have their own
            boxes, so &ldquo; - &rdquo; isn&rsquo;t allowed in a name. Click a colour to rename it everywhere.
          </p>
        )}
      </div>

      {/* 2. Options */}
      <div className="flex flex-col gap-2">
        <StepTitle n={2} title="Options" hint="Ticked under Product attributes above." />
        <VariantCountPreview variantAttributes={variantAttributes} colorCount={colors.length} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={createAll}
            disabled={uploadingIndex !== null || (colors.length === 0 && groups.every((g) => g.valueIds.length === 0))}
            className="rounded-full bg-[var(--pf-navy)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Create all combinations
          </button>
          <span aria-live="polite" className="text-xs text-[var(--muted)]">
            {createdNote ?? "Keeps every row you already have, with its price, stock and photos. Only adds the missing ones."}
          </span>
        </div>
      </div>

      {/* 3. Rows */}
      <div className="flex flex-col gap-2">
        <StepTitle n={3} title="Price, stock and photos" hint="Untick a row the shop doesn't sell. It won't show in the shop." />

        <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-sm)] bg-[var(--pf-navy-soft)] px-3 py-2.5">
          <span className="self-center text-[13px] font-medium text-[var(--pf-navy)]">Set for all ticked rows:</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value={bulk.regularPrice}
            onChange={(e) => setBulk({ ...bulk, regularPrice: e.target.value })}
            className={`${baseInputClass} w-24 bg-[var(--color-card)]`}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Sale price"
            value={bulk.salePrice}
            onChange={(e) => setBulk({ ...bulk, salePrice: e.target.value })}
            className={`${baseInputClass} w-24 bg-[var(--color-card)]`}
          />
          <input
            type="number"
            min="0"
            placeholder="Stock"
            value={bulk.stock}
            onChange={(e) => setBulk({ ...bulk, stock: e.target.value })}
            className={`${baseInputClass} w-20 bg-[var(--color-card)]`}
          />
          <button
            type="button"
            onClick={applyBulk}
            className="rounded-full border border-[var(--pf-navy)] px-3 py-1.5 text-sm font-medium text-[var(--pf-navy)] hover:bg-[var(--color-card)]"
          >
            Apply
          </button>
        </div>

        <div className="overflow-x-auto" style={gridStyle}>
          <div className="flex flex-col sm:min-w-[800px]">
            <div className={`${rowGrid} hidden border-b border-[var(--border)] px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] sm:grid`}>
              <span>Sell</span>
              <span>Colour</span>
              {variantAttributes.map(({ attribute }) => (
                <span key={attribute.id}>{attribute.name}</span>
              ))}
              <span>Price *</span>
              <span>Sale price</span>
              <span>Stock</span>
              <span>SKU</span>
              <span>Photos</span>
              <span />
            </div>

            {value.map((row, index) => {
              const rowKey = colorKey(row.colorName);
              const sold = !row.notSold;
              const bad = badRows.has(index);
              return (
                <div
                  key={index}
                  className={
                    "flex flex-col gap-2 border-b border-[var(--border)] px-2 py-2 " +
                    (bad ? "rounded-[var(--radius-sm)] bg-[var(--pf-bad-bg)] ring-1 ring-[var(--pf-bad)] " : "") +
                    (sold ? "" : "bg-black/[0.03]")
                  }
                >
                  <div className={rowGrid}>
                    <label className="col-span-2 flex items-center gap-2 text-xs sm:col-span-1">
                      <input
                        type="checkbox"
                        checked={sold}
                        onChange={(e) => updateRow(index, { notSold: !e.target.checked })}
                        aria-label={`Sell row ${index + 1}`}
                        className="h-4 w-4 accent-[var(--pf-navy)]"
                      />
                      <span className="sm:hidden">{sold ? "Sold" : "Not sold"}</span>
                    </label>

                    <span className="col-span-2 flex items-center gap-1.5 sm:col-span-1">
                      <Dot hex={row.colorHex} />
                      <select
                        value={rowKey}
                        onChange={(e) => pickRowColor(index, e.target.value)}
                        disabled={!sold}
                        aria-label={`Colour for row ${index + 1}`}
                        className={inputClass}
                      >
                        <option value="">No colour</option>
                        {colors.map((c) => (
                          <option key={colorKey(c.name)} value={colorKey(c.name)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </span>

                    {variantAttributes.map(({ attribute, values }) => {
                      const selected = values.find((v) => row.attributeValueIds.includes(v.id));
                      return (
                        <label key={attribute.id} className="flex flex-col gap-1 text-xs">
                          <span className="text-[var(--muted)] sm:hidden">{attribute.name}</span>
                          <select
                            value={selected?.id ?? ""}
                            onChange={(e) => setAttributeValue(index, attribute, e.target.value)}
                            disabled={!sold}
                            aria-label={`${attribute.name} for row ${index + 1}`}
                            className={inputClass}
                          >
                            <option value="">— none —</option>
                            {values.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.value}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price *"
                      value={row.regularPrice}
                      onChange={(e) => updateRow(index, { regularPrice: e.target.value })}
                      disabled={!sold}
                      required={sold}
                      aria-label={`Price for row ${index + 1}`}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Sale"
                      value={row.salePrice}
                      onChange={(e) => updateRow(index, { salePrice: e.target.value })}
                      disabled={!sold}
                      aria-label={`Sale price for row ${index + 1}`}
                      title="Leave blank if this variant isn't on sale"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={row.stock}
                      onChange={(e) => updateRow(index, { stock: e.target.value })}
                      disabled={!sold}
                      aria-label={`Stock for row ${index + 1}`}
                      className={inputClass}
                    />
                    <VariantSkuField
                      value={row.sku}
                      onChange={(sku) => updateRow(index, { sku })}
                      variantId={row.id}
                      className={inputClass}
                      onChecked={onSkuChecked}
                    />
                    <button
                      type="button"
                      onClick={() => togglePhotos(index)}
                      disabled={!sold}
                      aria-expanded={openPhotos.has(index)}
                      className="justify-self-start text-xs font-semibold text-[var(--pf-highlight)] disabled:text-[var(--muted)]"
                    >
                      {!sold
                        ? "Not sold"
                        : row.imageUrls.length > 0
                          ? `${row.imageUrls.length} ${row.imageUrls.length === 1 ? "photo" : "photos"}`
                          : "+ Photos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      aria-label={`Remove row ${index + 1}`}
                      title="Remove row"
                      className="justify-self-end text-xs text-red-600"
                    >
                      ✕
                    </button>
                  </div>

                  {sold && (openPhotos.has(index) || uploadingIndex === index || (rowErrors[index] ?? []).length > 0) && (
                    <div className="flex flex-col gap-1.5 sm:pl-[40px]">
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
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={(e) => handleImagesChange(index, e)}
                            disabled={uploadingIndex !== null}
                          />
                        )}
                        {uploadingIndex === index && (
                          <span className="text-xs text-[var(--muted)]">Compressing and uploading…</span>
                        )}
                        {row.imageUrls.length < MAX_VARIANT_IMAGES && (
                          <span className="w-full text-xs text-[var(--muted)]">{uploadHint("product")}</span>
                        )}
                        {/* Was silently discarded before -- see handleImagesChange. */}
                        {(rowErrors[index] ?? []).map((message) => (
                          <span key={message} className="w-full text-xs text-red-600">
                            {message}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={uploadingIndex !== null}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40"
          >
            + Add row
          </button>
          <span className="text-xs text-[var(--muted)]">
            {soldCount} of {value.length} {value.length === 1 ? "row" : "rows"} sold. Every product needs at least one
            ticked row with a price.
          </span>
        </div>
      </div>
    </div>
  );
}
