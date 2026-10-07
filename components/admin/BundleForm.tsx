"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { bundleSaving, bundleSeparateTotal } from "@/lib/bundles";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import {
  searchProductsForBundlePicker,
  quoteBundleTotals,
  type AdminBundleRow,
  type BundlePickerProduct,
} from "@/lib/admin/bundles-query";
import type { BundleFormState } from "@/lib/admin/bundles";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// One chosen item, as the form holds it while it is being edited. The
// prices are copied in from the picker so the "separate total" updates
// the instant something is added, without waiting for the server -- the
// server then confirms the same figure, plus the profit, which is the
// one number the browser is never allowed to compute (it would need the
// cost prices, and those must not leave the server as a list).
interface ChosenItem {
  productId: string;
  variantId: string;
  productName: string;
  colorName: string | null;
  image: string | null;
  quantity: number;
  regularPrice: number;
  salePrice: number | null;
}

export function BundleForm({
  bundle,
  categories,
  action,
}: {
  bundle: AdminBundleRow | null;
  categories: { id: string; name: string }[];
  action: (state: BundleFormState, formData: FormData) => Promise<BundleFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const [name, setName] = useState(bundle?.name ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [categoryId, setCategoryId] = useState(bundle?.categoryId ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(bundle?.image ?? null);
  const [price, setPrice] = useState(bundle ? String(bundle.price) : "");
  const [items, setItems] = useState<ChosenItem[]>(
    (bundle?.items ?? []).map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      colorName: item.colorName,
      image: item.image,
      quantity: item.quantity,
      regularPrice: item.regularPrice,
      salePrice: item.salePrice,
    })),
  );

  // "Publish" and "Save draft" are two submits of the same form; this
  // carries which button was pressed, because a form cannot have two
  // different values for one hidden field.
  const publishRef = useRef<HTMLInputElement>(null);

  // ── the picker ───────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BundlePickerProduct[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Same treatment as the campaign product picker's loading flag: the
    // spinner has to go up the moment a key is pressed, before the
    // debounce even starts, or the list looks frozen while typing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearching(true);
    const timer = setTimeout(() => {
      searchProductsForBundlePicker(search, 12)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  // ── the three numbers ────────────────────────────────────────────────
  // Separate total and saving are worked out here as you type, from
  // prices already on screen. Profit is not: it needs the cost prices,
  // which stay on the server.
  const bundlePrice = Number(price) || 0;
  const separateTotal = useMemo(() => bundleSeparateTotal(items), [items]);
  const saving = bundleSaving(separateTotal, bundlePrice);
  const pricedAboveParts = items.length > 0 && bundlePrice > separateTotal;

  const [quotedTotals, setQuotedTotals] = useState<{
    profit: number | null;
    availableUnits: number;
  } | null>(null);
  // Derived, not stored: with nothing chosen there is nothing to quote,
  // so an empty list reads as "no totals" without an effect having to
  // reset anything.
  const serverTotals = items.length === 0 ? null : quotedTotals;

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      quoteBundleTotals(
        items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        bundlePrice,
      ).then((totals) => {
        if (!cancelled) {
          setQuotedTotals({ profit: totals.profit, availableUnits: totals.availableUnits });
        }
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [items, bundlePrice]);

  const chosenVariantIds = new Set(items.map((i) => i.variantId));

  function addItem(product: BundlePickerProduct, variantId: string) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant || chosenVariantIds.has(variantId)) return;
    setItems((current) => [
      ...current,
      {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        colorName: variant.colorName,
        image: product.image,
        quantity: 1,
        regularPrice: variant.regularPrice,
        salePrice: variant.salePrice,
      },
    ]);
  }

  function setQuantity(variantId: string, quantity: number) {
    setItems((current) =>
      current.map((item) =>
        item.variantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
    );
  }

  function removeItem(variantId: string) {
    setItems((current) => current.filter((item) => item.variantId !== variantId));
  }

  const errorMessage = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {bundle && <input type="hidden" name="id" value={bundle.id} />}
      <input type="hidden" name="items" value={JSON.stringify(
        items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      )} />
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <input ref={publishRef} type="hidden" name="publish" value="false" />

      {errorMessage && (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-discount)] px-3 py-2 text-sm text-[var(--color-discount)]">
          {errorMessage}
        </p>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold">Bundle details</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Bundle name
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Travel Essentials Kit"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Category
            <select
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Choose a category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="What the bundle is for, in a sentence or two."
          />
        </label>
        <div className="mt-4">
          <SingleImageUploader
            label="Bundle photo"
            kind="product"
            name="bundleImage"
            value={imageUrl}
            onChange={setImageUrl}
            prefix="products"
            hint={`One photo showing everything in the bundle together.
Square image, 1080 × 1080 px recommended (1:1). Keep products in the centre.`}
            // Previews in the same square box the shop card uses, so
            // what is seen here is what the customer will see.
            previewShape="square"
            warnIfNotSquare
          />
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold">What&apos;s in the bundle</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Pick the exact option that goes in the box — the customer does not choose. Only published
          products appear here, and a bundle cannot contain another bundle.
        </p>

        {items.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.variantId}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] p-2"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
                  {item.image && <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.colorName ?? "Default option"} ·{" "}
                    {formatPrice(item.salePrice ?? item.regularPrice)} each
                  </p>
                </div>
                <label className="flex items-center gap-1 text-xs">
                  Qty
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => setQuantity(item.variantId, Number(e.target.value))}
                    className={`${inputClass} w-16`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="rounded-full px-2 py-1 text-xs text-[var(--color-discount)] hover:bg-black/5"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} w-full`}
            placeholder="Search products by name, SKU or brand…"
          />
          <div className="mt-2 max-h-72 overflow-y-auto">
            {searching && <p className="py-2 text-sm text-[var(--muted)]">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="py-2 text-sm text-[var(--muted)]">No published products found.</p>
            )}
            {results.map((product) => (
              <div key={product.id} className="border-b border-[var(--border)] py-2 last:border-0">
                <p className="text-sm font-medium">{product.name}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const already = chosenVariantIds.has(variant.id);
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={already}
                        onClick={() => addItem(product, variant.id)}
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-40"
                      >
                        {variant.colorName ?? "Default"} ·{" "}
                        {formatPrice(variant.salePrice ?? variant.regularPrice)}
                        {variant.stock != null ? ` · ${variant.stock} in stock` : ""}
                        {already ? " · added" : ""}
                      </button>
                    );
                  })}
                  {product.variants.length === 0 && (
                    <span className="text-xs text-[var(--muted)]">No active options.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold">Price</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Bundle price (Rs)
            <input
              name="price"
              type="number"
              min={1}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
              required
            />
          </label>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-[var(--muted)]">Bought separately</dt>
            <dd className="mt-0.5 font-medium">{formatPrice(separateTotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Customer saves</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-discount)]">{formatPrice(saving)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Your profit</dt>
            <dd className="mt-0.5 font-medium">
              {/* Never a guess: if any item has no cost price entered, this
                  says so instead of showing a number built on a missing
                  one (see bundleProfit in lib/bundles.ts). */}
              {serverTotals?.profit != null ? formatPrice(serverTotals.profit) : "Add cost prices to see"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Can sell now</dt>
            <dd className="mt-0.5 font-medium">
              {serverTotals ? `${serverTotals.availableUnits} bundles` : "—"}
            </dd>
          </div>
        </dl>

        {pricedAboveParts && (
          <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-warning)] px-3 py-2 text-sm text-[var(--color-warning)]">
            This bundle costs more than buying the items separately, so there is nothing to
            advertise. Lower the price, or the customer will work it out.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          onClick={() => {
            if (publishRef.current) publishRef.current.value = "false";
          }}
          className="transition-brand rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          disabled={pending}
          onClick={() => {
            if (publishRef.current) publishRef.current.value = "true";
          }}
          className="transition-brand rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : bundle?.status === "published" ? "Save & keep live" : "Publish"}
        </button>
        <p className="text-xs text-[var(--muted)]">
          A bundle stays a draft until you publish it. Drafts are invisible to customers.
        </p>
      </div>
    </form>
  );
}
