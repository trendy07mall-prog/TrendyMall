import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/admin/products";
import { getBrands } from "@/lib/data/brands";
import { getTags } from "@/lib/data/tags";
import { getAllTemplatesWithFields } from "@/lib/data/spec-templates";
import { getAllAttributesWithValues } from "@/lib/data/attributes";
import { ProductForm } from "@/components/admin/ProductForm";
import { buildCategoryTree, flattenCategoryTree } from "@/lib/category-tree";

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: categories }, brands, tags, templatesWithFields, attributesWithValues] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    getBrands({ activeOnly: false }),
    getTags({ activeOnly: false }),
    getAllTemplatesWithFields(),
    getAllAttributesWithValues(),
  ]);

  const orderedCategories = flattenCategoryTree(buildCategoryTree(categories ?? []));

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Add product</h1>
      <ProductForm
        categories={orderedCategories}
        brands={brands}
        tags={tags}
        templatesWithFields={templatesWithFields}
        attributesWithValues={attributesWithValues}
        action={createProduct}
      />
    </div>
  );
}
