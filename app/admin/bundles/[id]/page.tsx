import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/data/categories";
import { getAdminBundle } from "@/lib/admin/bundles-query";
import { BundleForm } from "@/components/admin/BundleForm";
import { saveBundle } from "@/lib/admin/bundles";

export default async function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bundle, categories] = await Promise.all([
    getAdminBundle(id),
    getCategories({ activeOnly: false }),
  ]);
  if (!bundle) notFound();

  return (
    <div>
      <Link href="/admin/bundles" className="text-sm text-[var(--muted)] hover:underline">
        ← Bundles
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{bundle.name}</h1>
        <span className="rounded-full bg-black/10 px-2 py-[2px] text-[11px] font-semibold">
          {bundle.status === "published" ? "Live" : "Draft"}
        </span>
        {bundle.status === "published" && (
          <Link href={`/product/${bundle.slug}`} className="text-sm underline" target="_blank">
            View on site
          </Link>
        )}
      </div>

      <div className="mt-6">
        <BundleForm
          bundle={bundle}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          action={saveBundle}
        />
      </div>
    </div>
  );
}
