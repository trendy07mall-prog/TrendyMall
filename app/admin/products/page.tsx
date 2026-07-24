import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, getEffectivePrice } from "@/lib/utils";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name"),
  ]);

  const categoryNames = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Products</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/import"
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
          >
            Import CSV
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
          >
            Add product
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Featured</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4">{product.name}</td>
                <td className="py-2 pr-4">
                  {categoryNames.get(product.category_id) ?? "—"}
                </td>
                <td className="py-2 pr-4">{formatPrice(getEffectivePrice(product))}</td>
                <td className="py-2 pr-4">{product.stock}</td>
                <td className="py-2 pr-4 capitalize">{product.status}</td>
                <td className="py-2 pr-4">{product.is_featured ? "Yes" : "No"}</td>
                <td className="py-2">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
