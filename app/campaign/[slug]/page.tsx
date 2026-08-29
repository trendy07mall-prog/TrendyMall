import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getCampaignPageData,
  getCampaignFeaturedDisplayByProduct,
  applyCampaignFeaturedDisplay,
  getCampaignSoldCounts,
} from "@/lib/data/campaigns";
import { getProductsByIds } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";
import { getCampaignRuntimeStatus } from "@/lib/campaign-status";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Pagination } from "@/components/product/Pagination";
import { CampaignBanner } from "@/components/marketing/CampaignBanner";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";
import type { ProductWithPrimaryImage } from "@/types";

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCampaignPageData(slug);
  if (!data) return { title: "Campaign not found" };

  const { campaign } = data;
  const runtime = getCampaignRuntimeStatus(campaign);
  const title = campaign.meta_title ?? campaign.name;
  const description =
    campaign.meta_description ?? campaign.description ?? `${campaign.name} at TrendyMall.`;
  const image = campaign.og_image_url ?? campaign.desktop_banner_url ?? campaign.thumbnail_url;

  return {
    title,
    description,
    alternates: {
      canonical: `/campaign/${campaign.slug}`,
    },
    openGraph: {
      title: `${title} | TrendyMall`,
      description,
      url: `/campaign/${campaign.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | TrendyMall`,
      description,
      images: image ? [image] : undefined,
    },
    // Only reachable by an admin's own session (RLS) when draft/disabled --
    // belt-and-braces, since nothing else can ever request this page in
    // that state.
    robots: runtime === "draft" || runtime === "disabled" ? { index: false } : undefined,
  };
}

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const data = await getCampaignPageData(slug);
  if (!data) notFound();

  const { campaign, groups } = data;
  const runtime = getCampaignRuntimeStatus(campaign);

  const allProductIds = [...new Set(groups.flatMap((g) => g.productIds))];
  const products = await getProductsByIds(allProductIds);

  // Campaign-context display fix: every product on this page must feature
  // its OWN campaign-joined variant's price/badge/countdown/sold-count,
  // never the product's globally-cheapest variant if that happens to be a
  // different, non-campaign one -- see getCampaignFeaturedDisplayByProduct's
  // own comment in lib/data/campaigns.ts.
  const supabase = await createClient();
  const [soldCounts, featuredByProductId] = await Promise.all([
    getCampaignSoldCounts(supabase, [campaign.id]),
    getCampaignFeaturedDisplayByProduct(supabase, campaign.id, allProductIds),
  ]);
  const featuredProducts = applyCampaignFeaturedDisplay(
    products,
    campaign,
    featuredByProductId,
    soldCounts.get(campaign.id) ?? new Map(),
  );
  const productById = new Map(featuredProducts.map((p) => [p.id, p]));

  const totalCount = allProductIds.length;
  const sp = await searchParams;
  const basePath = `/campaign/${campaign.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: campaign.name,
    description: campaign.description ?? undefined,
    url: `${SITE_URL}${basePath}`,
  };

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-12">
      <JsonLd data={jsonLd} />

      {(runtime === "draft" || runtime === "disabled") && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-4 py-3 text-sm font-medium text-[var(--color-warning)]">
          Preview — not visible to customers ({runtime}).
        </div>
      )}

      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: campaign.name }]} />

      <CampaignBanner
        desktopUrl={campaign.desktop_banner_url}
        mobileUrl={campaign.mobile_banner_url}
        alt={campaign.name}
      />

      <h1 className="font-heading mt-6 text-2xl font-bold tracking-tight">{campaign.name}</h1>
      {campaign.description && <p className="mt-2 text-[var(--muted)]">{campaign.description}</p>}

      {runtime === "scheduled" && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] px-4 py-3">
          <p className="text-sm font-medium">
            This campaign starts on {new Date(campaign.start_at).toLocaleString()}.
          </p>
          {campaign.show_countdown && (
            <CampaignCountdown target={campaign.start_at} label="Starts in" />
          )}
        </div>
      )}

      {runtime === "ended" && (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] px-4 py-3">
          <p className="text-sm font-medium">
            This campaign has ended.{" "}
            <Link href="/shop" className="underline">
              Browse current promotions
            </Link>
            .
          </p>
        </div>
      )}

      {runtime === "active" && campaign.show_countdown && campaign.end_at && (
        <div className="mt-4">
          <CampaignCountdown target={campaign.end_at} label="Ends in" />
        </div>
      )}

      {totalCount === 0 && (
        <p className="mt-10 text-[var(--muted)]">No products currently in this campaign.</p>
      )}

      {totalCount > PAGE_SIZE ? (
        // Rare for this catalog's scale -- falls back to one flat,
        // paginated grid (section headings dropped) using the exact same
        // component/?page=/JS-slice pattern /shop already uses, rather
        // than inventing per-section pagination the shared component
        // doesn't support.
        (() => {
          const totalPages = Math.max(1, Math.ceil(allProductIds.length / PAGE_SIZE));
          const requestedPage = Number(sp.page);
          const currentPage = Number.isInteger(requestedPage)
            ? Math.min(Math.max(requestedPage, 1), totalPages)
            : 1;
          const pagedIds = allProductIds.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE,
          );
          const pagedProducts = pagedIds
            .map((id) => productById.get(id))
            .filter((p): p is ProductWithPrimaryImage => p != null);
          return (
            <div className="mt-8">
              <ProductGrid
                products={pagedProducts}
                emptyMessage="No products in this campaign."
                linkToFeaturedVariant
              />
              <Pagination
                basePath={basePath}
                currentPage={currentPage}
                totalPages={totalPages}
                searchParams={sp}
              />
            </div>
          );
        })()
      ) : (
        groups.map((group, index) => {
          const groupProducts = group.productIds
            .map((id) => productById.get(id))
            .filter((p): p is ProductWithPrimaryImage => p != null);
          if (groupProducts.length === 0) return null;
          return (
            <div key={group.section?.id ?? `unsectioned-${index}`} className="mt-10">
              {group.section && (
                <h2 className="font-heading mb-4 text-xl font-bold tracking-tight">
                  {group.section.name}
                </h2>
              )}
              <ProductGrid products={groupProducts} linkToFeaturedVariant />
            </div>
          );
        })
      )}
    </div>
  );
}
