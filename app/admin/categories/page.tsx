import { getCategories } from "@/lib/data/categories";
import { getSpecTemplates } from "@/lib/data/spec-templates";
import { CategoryTree } from "@/components/admin/CategoryTree";

export default async function AdminCategoriesPage() {
  const [categories, specTemplates] = await Promise.all([
    getCategories({ activeOnly: false }),
    getSpecTemplates(),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Drag a category onto another to make it a sub-category, or drop it above a row to reorder.
      </p>
      <div className="mt-6">
        <CategoryTree categories={categories} specTemplateOptions={specTemplates} />
      </div>
    </div>
  );
}
