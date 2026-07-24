import Link from "next/link";
import { CsvImportForm } from "@/components/admin/CsvImportForm";

export default function AdminProductsImportPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Bulk Import Products
      </h1>
      <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
        Import multiple products at once from a CSV file. This covers name,
        brand, model, SKU, pricing, stock, category, status, description,
        compatible devices, and what&apos;s in the box — photos and color
        variants aren&apos;t supported here, so add those afterward by
        editing each imported product. The <strong>category</strong> column
        must exactly match an existing category name, or that row is
        skipped.
      </p>
      <div className="mt-8">
        <CsvImportForm />
      </div>
      <Link href="/admin/products" className="mt-8 inline-block text-sm underline">
        Back to Products
      </Link>
    </div>
  );
}
