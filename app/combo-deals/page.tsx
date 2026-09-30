import type { Metadata } from "next";
import { getCachedComboDeals } from "@/lib/data/cached";
import { getBundleDetailsForProducts } from "@/lib/data/bundles";
import { ComboCard } from "@/components/marketing/ComboCard";
import { ComboDealsEmpty } from "@/components/marketing/ComboDealsEmpty";
import { SITE_URL } from "@/lib/site";

// The "View all Combo Deals" destination.
//
// A dedicated page rather than the shop filtered to a category, because
// there is no bundle category to filter by: a bundle is filed under
// whatever its contents belong to, and today's sit in three different
// ones. Grouping them would mean re-filing real products, and teaching
// /shop about product_kind would mean changing the shop's own query --
// both far more invasive than this page, which reuses the homepage's
// data function and the same card.
//
// Shows what the homepage strip shows, without the cap: published
// bundles with stock above zero. That one condition is enough because
// sql/089 keeps a bundle's stock equal to what its contents allow and
// sql/091 drops it to 0 the moment anything inside cannot be sold.

// A ceiling, not a page size: it stops a runaway query ever trying to
// render thousands of cards. A shop this size will not come close.
const MAX = 60;

export const metadata: Metadata = {
  title: "Combo Deals",
  description:
    "Handpicked bundles at a lower price than buying separately. Product combos from TrendyMall — two or more items sold together for less. Cash on Delivery and islandwide delivery in Sri Lanka.",
  alternates: { canonical: `${SITE_URL}/combo-deals` },
  openGraph: {
    title: "Combo Deals | TrendyMall",
    description: "Handpicked bundles at a lower price than buying separately.",
    url: `${SITE_URL}/combo-deals`,
    type: "website",
  },
};

export default async function ComboDealsPage() {
  const bundles = await getCachedComboDeals(MAX);
  const details =
    bundles.length > 0
      ? await getBundleDetailsForProducts(bundles.map((product) => product.id))
      : new Map();

  return (
    <div
      className="combo-fonts w-full flex-1"
      style={{ backgroundColor: "#FAFAFA" }}
    >
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 py-10 sm:py-14">
        <header className="md:text-center">
          <p
            className="text-[11px] font-bold md:text-[13px]"
            style={{ color: "#F97316", letterSpacing: "3px" }}
          >
            BUY TOGETHER · SAVE MORE
          </p>
          <h1
            className="mt-2 text-[28px] leading-tight font-extrabold md:text-[44px]"
            style={{ color: "#0F2D52" }}
          >
            Combo Deals
          </h1>
          <p className="mt-2 text-[15px] md:text-[16px]" style={{ color: "#6B7280" }}>
            Handpicked bundles at a lower price than buying separately
          </p>
        </header>

        {bundles.length === 0 ? (
          <ComboDealsEmpty />
        ) : (
          <>
            <p className="mt-6 text-[14px] md:text-center" style={{ color: "#6B7280" }}>
              {bundles.length} bundle{bundles.length === 1 ? "" : "s"} available
            </p>
            {/* Medium cards, 4 per row on desktop, 2 on tablet, 1 on a
                phone. justify-items-center keeps the fixed-width cards
                centred in their columns rather than left-hugging. */}
            {/* Two across even on a phone -- the compact card is narrow
                enough, and one-per-row made the page a long scroll. */}
            <div className="mt-8 grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {bundles.map((product) => (
                <ComboCard
                  key={product.id}
                  data={{ product, itemCount: details.get(product.id)?.items.length ?? 0 }}
                  variant="grid"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
