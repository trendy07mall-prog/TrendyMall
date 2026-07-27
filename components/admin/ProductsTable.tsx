"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchIcon, ImageIcon, TrashIcon } from "@/components/ui/Icon";
import { StockBadge } from "@/components/admin/StockBadge";
import { ProductStatusBadge } from "@/components/admin/ProductStatusBadge";
import { QuickEditPrice } from "@/components/admin/QuickEditPrice";
import { QuickEditStock } from "@/components/admin/QuickEditStock";
import { QuickEditStatus } from "@/components/admin/QuickEditStatus";
import { QuickEditFeatured } from "@/components/admin/QuickEditFeatured";
import { ProductActionsMenu } from "@/components/admin/ProductActionsMenu";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { Pagination } from "@/components/product/Pagination";
import type { AdminProductRow } from "@/lib/admin/products-query";

export function ProductsTable({
  products,
  totalCount,
  page,
  pageSize,
  basePath,
  searchParams,
  categoryNames,
  isDeletedView,
  hasActiveFilters,
}: {
  products: AdminProductRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  categoryNames: Map<string, string>;
  isDeletedView: boolean;
  hasActiveFilters: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const emptyState = isDeletedView
    ? {
        Icon: TrashIcon,
        title: "Nothing in the Deleted filter.",
        description: "Products you soft-delete show up here and can be restored.",
        cta: null,
      }
    : hasActiveFilters
      ? {
          Icon: SearchIcon,
          title: "No products match the current filters.",
          description: null,
          cta: { label: "Clear filters", href: basePath },
        }
      : {
          Icon: ImageIcon,
          title: "No products yet.",
          description: null,
          cta: { label: "+ Add Product", href: "/admin/products/new" },
        };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        Showing {rangeStart}–{rangeEnd} of {totalCount} product{totalCount === 1 ? "" : "s"}
      </p>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="w-8 py-2 pr-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="py-2 pr-4">Image</th>
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Featured</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const lowStock = product.stock > 0 && product.stock < 5;
              return (
                <tr
                  key={product.id}
                  className={`border-b border-[var(--border)] ${lowStock ? "bg-[var(--color-warning)]/5" : ""}`}
                >
                  <td className="py-2 pr-2 align-top">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleOne(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <div className="relative h-[60px] w-[60px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-black/5">
                      {product.image ? (
                        <Image src={product.image} alt="" fill sizes="60px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-[var(--muted)]">
                          No image
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <p className="line-clamp-2 max-w-[220px] font-medium">{product.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {[product.brand, product.sku].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {categoryNames.get(product.category_id) ?? "—"}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <QuickEditPrice
                      productId={product.id}
                      actualPrice={product.actual_price}
                      specialPrice={product.special_price}
                    />
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <div className="flex flex-col gap-1">
                      <QuickEditStock productId={product.id} stock={product.stock} />
                      <StockBadge stock={product.stock} />
                    </div>
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {isDeletedView ? (
                      <ProductStatusBadge status={product.status} />
                    ) : (
                      <QuickEditStatus productId={product.id} status={product.status} />
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {isDeletedView ? (
                      product.is_featured ? "★" : "—"
                    ) : (
                      <QuickEditFeatured productId={product.id} isFeatured={product.is_featured} />
                    )}
                  </td>
                  <td className="py-2 align-top">
                    <ProductActionsMenu
                      productId={product.id}
                      productSlug={product.slug}
                      productName={product.name}
                      isDeletedView={isDeletedView}
                    />
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <emptyState.Icon className="h-8 w-8 text-[var(--muted)]" />
                    <p className="text-sm text-[var(--muted)]">{emptyState.title}</p>
                    {emptyState.description && (
                      <p className="text-xs text-[var(--muted)]">{emptyState.description}</p>
                    )}
                    {emptyState.cta && (
                      <Link
                        href={emptyState.cta.href}
                        className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
                      >
                        {emptyState.cta.label}
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="mt-4 flex flex-col gap-3 lg:hidden">
        {products.map((product) => {
          const lowStock = product.stock > 0 && product.stock < 5;
          return (
            <div
              key={product.id}
              className={`flex gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-3 ${
                lowStock ? "bg-[var(--color-warning)]/5" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(product.id)}
                onChange={() => toggleOne(product.id)}
                aria-label={`Select ${product.name}`}
                className="mt-1 self-start"
              />
              <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-black/5">
                {product.image ? (
                  <Image src={product.image} alt="" fill sizes="60px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-[var(--muted)]">
                    No image
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {[product.brand, product.sku].filter(Boolean).join(" · ") || "—"} ·{" "}
                      {categoryNames.get(product.category_id) ?? "—"}
                    </p>
                  </div>
                  <ProductActionsMenu
                    productId={product.id}
                    productSlug={product.slug}
                    productName={product.name}
                    isDeletedView={isDeletedView}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <QuickEditPrice
                    productId={product.id}
                    actualPrice={product.actual_price}
                    specialPrice={product.special_price}
                  />
                  <QuickEditStock productId={product.id} stock={product.stock} />
                  <StockBadge stock={product.stock} />
                </div>
                <div className="flex items-center gap-3">
                  {isDeletedView ? (
                    <>
                      <ProductStatusBadge status={product.status} />
                      <span className="text-xs text-[var(--muted)]">
                        {product.is_featured ? "★ Featured" : "—"}
                      </span>
                    </>
                  ) : (
                    <>
                      <QuickEditStatus productId={product.id} status={product.status} />
                      <QuickEditFeatured productId={product.id} isFeatured={product.is_featured} />
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {products.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <emptyState.Icon className="h-8 w-8 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">{emptyState.title}</p>
            {emptyState.cta && (
              <Link
                href={emptyState.cta.href}
                className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
              >
                {emptyState.cta.label}
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination
          basePath={basePath}
          currentPage={page}
          totalPages={totalPages}
          searchParams={searchParams}
        />
      </div>

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={[...selectedIds]}
          onClear={() => setSelectedIds(new Set())}
          isDeletedView={isDeletedView}
        />
      )}
    </div>
  );
}
