import Link from "next/link";
import { getCategories } from "@/lib/data/categories";
import { BundleForm } from "@/components/admin/BundleForm";
import { saveBundle } from "@/lib/admin/bundles";

export default async function NewBundlePage() {
  const categories = await getCategories({ activeOnly: false });

  return (
    <div>
      <Link href="/admin/bundles" className="text-sm text-[var(--muted)] hover:underline">
        ← Bundles
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">New bundle</h1>

      <div className="mt-6">
        <BundleForm
          bundle={null}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          action={saveBundle}
        />
      </div>
    </div>
  );
}
