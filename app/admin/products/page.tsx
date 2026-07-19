import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

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
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Add product
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black text-left dark:border-white">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr
                key={product.id}
                className="border-b border-zinc-200 dark:border-zinc-800"
              >
                <td className="py-2 pr-4">{product.name}</td>
                <td className="py-2 pr-4">
                  {categoryNames.get(product.category_id) ?? "—"}
                </td>
                <td className="py-2 pr-4">{formatPrice(product.price)}</td>
                <td className="py-2 pr-4">{product.stock}</td>
                <td className="py-2 pr-4">{product.is_active ? "Yes" : "No"}</td>
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
