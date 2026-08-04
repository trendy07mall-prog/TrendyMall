import { createClient } from "@/lib/supabase/server";
import { getBrands } from "@/lib/data/brands";
import { BrandList } from "@/components/admin/BrandList";

export default async function AdminBrandsPage() {
  const supabase = await createClient();
  const [brands, { data: productRows }] = await Promise.all([
    getBrands({ activeOnly: false }),
    supabase.from("products").select("brand_id").eq("is_deleted", false).not("brand_id", "is", null),
  ]);

  const productCountByBrandId: Record<string, number> = {};
  for (const row of productRows ?? []) {
    if (row.brand_id) {
      productCountByBrandId[row.brand_id] = (productCountByBrandId[row.brand_id] ?? 0) + 1;
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Brands</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Manage the brands products can be tagged with.
      </p>
      <div className="mt-6">
        <BrandList brands={brands} productCountByBrandId={productCountByBrandId} />
      </div>
    </div>
  );
}
