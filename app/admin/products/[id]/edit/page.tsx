import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProduct, deleteProduct } from "@/lib/admin/products";
import { getBrands } from "@/lib/data/brands";
import { getTags, getProductTagIds } from "@/lib/data/tags";
import { getAllTemplatesWithFields, getProductSpecValues } from "@/lib/data/spec-templates";
import { getAllAttributesWithValues, getProductAttributeValueIds } from "@/lib/data/attributes";
import { ProductForm } from "@/components/admin/ProductForm";
import { buildCategoryTree, flattenCategoryTree } from "@/lib/category-tree";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, brands, tags, templatesWithFields, attributesWithValues] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase.from("categories").select("*").order("sort_order"),
      getBrands({ activeOnly: false }),
      getTags({ activeOnly: false }),
      getAllTemplatesWithFields(),
      getAllAttributesWithValues(),
    ]);

  if (!product) notFound();

  const orderedCategories = flattenCategoryTree(buildCategoryTree(categories ?? []));

  const [{ data: images }, { data: variantRows }, defaultTagIds, defaultSpecValues, defaultAttributeValueIds] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true }),
      getProductTagIds(product.id),
      getProductSpecValues(product.id),
      getProductAttributeValueIds(product.id),
    ]);

  const variantIds = (variantRows ?? []).map((v) => v.id);
  const { data: variantImageRows } =
    variantIds.length > 0
      ? await supabase
          .from("product_variant_images")
          .select("variant_id, image_url, sort_order")
          .in("variant_id", variantIds)
          .order("sort_order", { ascending: true })
      : { data: [] as { variant_id: string; image_url: string }[] };

  const imageUrlsByVariantId = new Map<string, string[]>();
  for (const row of variantImageRows ?? []) {
    const list = imageUrlsByVariantId.get(row.variant_id) ?? [];
    list.push(row.image_url);
    imageUrlsByVariantId.set(row.variant_id, list);
  }
  const variants = (variantRows ?? []).map((v) => ({
    ...v,
    imageUrls: imageUrlsByVariantId.get(v.id) ?? (v.variant_image_url ? [v.variant_image_url] : []),
  }));

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
        categories={orderedCategories}
        brands={brands}
        tags={tags}
        templatesWithFields={templatesWithFields}
        attributesWithValues={attributesWithValues}
        product={product}
        images={images ?? []}
        variants={variants}
        defaultTagIds={defaultTagIds}
        defaultSpecValues={defaultSpecValues}
        defaultAttributeValueIds={defaultAttributeValueIds}
        action={boundUpdate}
      />
    </div>
  );
}
