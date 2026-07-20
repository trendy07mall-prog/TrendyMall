import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProduct, deleteProduct } from "@/lib/admin/products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, product.id);
  const boundDelete = deleteProduct.bind(null, product.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Edit product
        </h1>
        <form action={boundDelete}>
          <button
            type="submit"
            className="text-sm text-red-600 underline"
          >
            Delete
          </button>
        </form>
      </div>
      <ProductForm
        categories={categories ?? []}
        product={product}
        action={boundUpdate}
      />
    </div>
  );
}
