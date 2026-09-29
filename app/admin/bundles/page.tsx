import Link from "next/link";
import { getAdminBundles } from "@/lib/admin/bundles-query";
import { BundleCard } from "@/components/admin/BundleCard";

// Bundles get their own screen rather than a filter on Products, because
// almost everything on the product list (SKU, price editing, an editable
// stock box) means nothing for a bundle -- its price lives on a single
// hidden option and its stock is maintained by the database. This screen
// shows the figures that DO matter: what it saves the customer, what it
// makes, and how many can be sold right now.
//
// Presentation only. Every value comes from getAdminBundles() already
// worked out and is displayed exactly as given.
export default async function AdminBundlesPage() {
  const bundles = await getAdminBundles();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="font-heading text-[28px] leading-tight font-bold tracking-tight"
            style={{ color: "#111111" }}
          >
            Bundles
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "#6B7280" }}>
            Two or more products sold together for one price.
          </p>
        </div>
        <Link
          href="/admin/bundles/new"
          className="transition-brand inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
        >
          + Add Bundle
        </Link>
      </div>

      {bundles.length === 0 ? (
        <div
          className="mt-8 rounded-xl border border-dashed p-10 text-center"
          style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
        >
          <p className="text-sm font-medium" style={{ color: "#111111" }}>
            No bundles yet
          </p>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            Create one and it stays a draft until you publish it.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} />
          ))}
        </ul>
      )}
    </div>
  );
}
