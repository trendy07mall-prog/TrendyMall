import { createClient } from "@/lib/supabase/server";
import { getTags } from "@/lib/data/tags";
import { TagList } from "@/components/admin/TagList";

export default async function AdminTagsPage() {
  const supabase = await createClient();
  const [tags, { data: productTagRows }] = await Promise.all([
    getTags({ activeOnly: false }),
    supabase.from("product_tags").select("tag_id"),
  ]);

  const productCountByTagId: Record<string, number> = {};
  for (const row of productTagRows ?? []) {
    productCountByTagId[row.tag_id] = (productCountByTagId[row.tag_id] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Tags</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Manage the tags products can be labeled with (Featured, Best Seller, etc.).
      </p>
      <div className="mt-6">
        <TagList tags={tags} productCountByTagId={productCountByTagId} />
      </div>
    </div>
  );
}
