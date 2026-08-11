import Link from "next/link";
import {
  getAdminProducts,
  getProductSummaryCounts,
  getDistinctBrands,
  ADMIN_PRODUCTS_PAGE_SIZE,
} from "@/lib/admin/products-query";
import { parseAdminProductFilterState, countActiveAdminFilters } from "@/lib/admin/product-filters";
import { getCategories } from "@/lib/data/categories";
import { ProductSummaryCards } from "@/components/admin/ProductSummaryCards";
import { ProductSearchBar } from "@/components/admin/ProductSearchBar";
import { ProductFilterBar } from "@/components/admin/ProductFilterBar";
import { DownloadTemplateButton } from "@/components/admin/DownloadTemplateButton";
import { ExportProductsButton } from "@/components/admin/ExportProductsButton";
import { ProductsTable } from "@/components/admin/ProductsTable";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state = parseAdminProductFilterState(sp);
  const requestedPage = Number(sp.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [{ products, totalCount }, counts, categories, brands] = await Promise.all([
    getAdminProducts(state, page, ADMIN_PRODUCTS_PAGE_SIZE),
    getProductSummaryCounts(),
    getCategories({ activeOnly: false }),
    getDistinctBrands(),
  ]);

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const isDeletedView = state.status === "deleted";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Products</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DownloadTemplateButton />
          <ExportProductsButton filters={state} />
          <Link
            href="/admin/products/import"
            className="transition-brand rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Import CSV
          </Link>
          <Link
            href="/admin/products/new"
            className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
          >
            + Add Product
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ProductSummaryCards counts={counts} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <ProductSearchBar basePath="/admin/products" state={state} />
        <ProductFilterBar
          basePath="/admin/products"
          state={state}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          brands={brands}
        />
      </div>

      <div className="mt-6">
        <ProductsTable
          products={products}
          totalCount={totalCount}
          page={page}
          pageSize={ADMIN_PRODUCTS_PAGE_SIZE}
          basePath="/admin/products"
          searchParams={sp}
          categoryNames={categoryNames}
          isDeletedView={isDeletedView}
          hasActiveFilters={countActiveAdminFilters(state) > 0}
        />
      </div>
    </div>
  );
}
