import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/admin/products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
      <ProductForm categories={categories ?? []} action={createProduct} />
    </div>
  );
}
