import Link from "next/link";
import Image from "next/image";
import { getAdminBundles } from "@/lib/admin/bundles-query";
import { formatPrice } from "@/lib/utils";
import { BundlePublishToggle } from "@/components/admin/BundlePublishToggle";

// Bundles get their own screen rather than a filter on Products, because
// almost everything on the product list (stock, SKU, price editing) means
// nothing for a bundle -- its stock is never maintained and its price
// lives on a single hidden option. A separate list can show the figures
// that DO matter: what it saves the customer, what it makes, and how many
// can be sold right now.
export default async function AdminBundlesPage() {
  const bundles = await getAdminBundles();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Bundles</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Two or more products sold together for one price.
          </p>
        </div>
        <Link
          href="/admin/bundles/new"
          className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
        >
          + Add Bundle
        </Link>
      </div>

      {bundles.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          No bundles yet. Create one and it stays a draft until you publish it.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {bundles.map((bundle) => (
            <li
              key={bundle.id}
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4"
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
                  {bundle.image && (
                    <Image src={bundle.image} alt="" fill sizes="56px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/bundles/${bundle.id}`} className="font-medium hover:underline">
                    {bundle.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {bundle.items.length} product{bundle.items.length === 1 ? "" : "s"} ·{" "}
                    {bundle.items.map((item) => item.productName).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                      bundle.status === "published"
                        ? "bg-[#16a34a] text-white"
                        : "bg-black/10 text-[var(--foreground)]"
                    }`}
                  >
                    {bundle.status === "published" ? "Live" : "Draft"}
                  </span>
                  <BundlePublishToggle
                    bundleId={bundle.id}
                    published={bundle.status === "published"}
                  />
                </div>
              </div>

              {/* One unsellable item makes the whole bundle unavailable
                  (sql/091), and its stock silently reads 0. Without this
                  the owner would see a zero with no explanation, so it
                  names the item and what to fix. Loudest when the bundle
                  is still live, because that is the case that is losing
                  orders right now. */}
              {bundle.blockedBy.length > 0 && (
                <div
                  className={`mt-3 rounded-[var(--radius-sm)] border px-3 py-2 text-sm ${
                    bundle.status === "published"
                      ? "border-[var(--color-discount)] text-[var(--color-discount)]"
                      : "border-[var(--color-warning)] text-[var(--color-warning)]"
                  }`}
                >
                  <p className="font-semibold">
                    {bundle.status === "published"
                      ? "This bundle is LIVE but cannot be sold"
                      : "This bundle cannot be sold yet"}
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {bundle.blockedBy.map((blocker, index) => (
                      <li key={index}>
                        <strong>{blocker.productName}</strong> — {blocker.reason}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">
                    {bundle.status === "published"
                      ? "Customers see it as out of stock. Republish that product, or unpublish this bundle."
                      : "Republish that product, or swap it for something else in the bundle."}
                  </p>
                </div>
              )}

              <dl className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3 text-sm sm:grid-cols-5">
                <div>
                  <dt className="text-xs text-[var(--muted)]">Bundle price</dt>
                  <dd className="mt-0.5 font-medium">{formatPrice(bundle.price)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Bought separately</dt>
                  <dd className="mt-0.5">{formatPrice(bundle.separateTotal)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Customer saves</dt>
                  <dd className="mt-0.5 text-[var(--color-discount)]">{formatPrice(bundle.saving)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Your profit</dt>
                  {/* Blank rather than zero when a cost price is missing --
                      a profit figure built on a guess reads as fact. */}
                  <dd className="mt-0.5">
                    {bundle.profit != null ? formatPrice(bundle.profit) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Can sell now</dt>
                  {/* From the lowest-stocked item inside, worked out live.
                      The bundle's own stock column is never maintained. */}
                  <dd className={`mt-0.5 ${bundle.availableUnits === 0 ? "text-[var(--color-discount)]" : ""}`}>
                    {bundle.availableUnits}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
