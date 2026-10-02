import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

// Renamed product AND category redirects, resolved from the database at
// BUILD time and served by the router as real 308s.
//
// Why this is here and not in the page: /product/[slug] and
// /category/[...slug] both have a loading.tsx, so each segment is wrapped
// in a Suspense boundary and Next flushes the 200 shell before the page
// component has decided anything. By then the status line is already
// sent, so permanentRedirect() from the page degrades to the documented
// streaming fallback -- a <meta http-equiv="refresh"> inside a 200
// response -- and notFound() cannot send a 404 either. Visitors still
// arrive at the right page, but a crawler sees HTTP 200 on the old URL,
// so no ranking signal or ad-link equity ever moves to the new one. These
// run before rendering, which is the only place a status code is still
// ours to set.
//
// The query string survives automatically: Next passes request query
// values through to the destination, so an ad link carrying ?variant=
// keeps it (see redirects.md, "any query values provided in the request
// will be passed through").
//
// The two redirect tables stay the single source of truth -- nothing is
// hardcoded here. A rename made in admin after this build still works
// through the page's own lookup (as a client-side meta refresh) and is
// promoted to a true 308 on the next deploy.
//
// A failure here must never fail the build: no env vars, an unreachable
// REST endpoint or an unexpected payload all return an empty list, which
// leaves exactly the behaviour that shipped before this existed.

type RedirectTarget = { slug?: unknown; status?: unknown; is_deleted?: unknown; is_active?: unknown };
type RedirectRow = { old_slug?: unknown } & Record<string, unknown>;

async function slugRedirects(spec: {
  /** URL prefix both sides of the redirect share, e.g. "/product". */
  prefix: string;
  /** The redirect table, e.g. "product_slug_redirects". */
  table: string;
  /** The embedded target table, which is also the key on each row. */
  target: string;
  /** Columns to embed from the target, e.g. "slug,status,is_deleted". */
  columns: string;
  /** REST filter identifying rows that are live NOW, for the guard below. */
  liveFilter: string;
  /** Whether an embedded target is live enough to redirect to. */
  isLive: (target: RedirectTarget) => boolean;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    const res = await fetch(
      `${url}/rest/v1/${spec.table}?select=old_slug,${spec.target}(${spec.columns})`,
      { headers },
    );
    if (!res.ok) return [];
    const rows: RedirectRow[] = await res.json();
    if (!Array.isArray(rows)) return [];

    // Guard against sending a LIVE url away from itself. Slugs are
    // reusable, so an old_slug can belong to something that exists right
    // now -- and this is not hypothetical: category_slug_redirects maps
    // "earbuds" to /category/electronic from an old restructure, while
    // "earbuds" is today an active category holding four products and one
    // of the pages we actually want ranking. A redirect here outranks the
    // route, so without this the page would become permanently
    // unreachable, with nothing in the route's own code to explain why.
    const oldSlugs = rows
      .map((row) => row.old_slug)
      .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);

    const taken = new Set<string>();
    if (oldSlugs.length > 0) {
      const inList = oldSlugs.map((slug) => `"${slug.replace(/"/g, '\\"')}"`).join(",");
      const live = await fetch(
        `${url}/rest/v1/${spec.target}?select=slug&${spec.liveFilter}&slug=in.(${encodeURIComponent(inList)})`,
        { headers },
      );
      if (!live.ok) return [];
      const liveRows: { slug?: unknown }[] = await live.json();
      if (!Array.isArray(liveRows)) return [];
      for (const row of liveRows) {
        if (typeof row.slug === "string") taken.add(row.slug);
      }
    }

    return rows.flatMap((row) => {
      const oldSlug = row.old_slug;
      const target = row[spec.target] as RedirectTarget | null;
      if (typeof oldSlug !== "string" || !oldSlug) return [];
      if (!target || typeof target.slug !== "string" || !spec.isLive(target)) return [];
      if (oldSlug === target.slug || taken.has(oldSlug)) return [];
      return [
        {
          source: `${spec.prefix}/${oldSlug}`,
          destination: `${spec.prefix}/${target.slug}`,
          permanent: true,
        },
      ];
    });
  } catch {
    return [];
  }
}

// The three image folders that still carried a third-party brand name in
// their path, long after the products themselves were renamed. The path
// is not cosmetic: it shipped inside og:image, twitter:image and the
// Product JSON-LD, so a crawler -- or an ads reviewer -- read
// "headset-marshall-major-iv" on a product called Retro Foldable
// Wireless Bluetooth Headphones.
//
// The folders are renamed; these keep every URL already shared, indexed
// or cached working, rather than turning them into 404s. A permanent
// redirect rather than a duplicate copy of the files: half the bytes, and
// it tells crawlers the old path is gone for good.
//
// :file matches one path segment, which is all these folders contain
// (1.jpg .. 4.jpg).
const IMAGE_FOLDER_RENAMES: { from: string; to: string }[] = [
  { from: "headset-marshall-major-iv", to: "retro-foldable-wireless-bluetooth-headphones" },
  { from: "powerbank-magsafe-10000mah", to: "magnetic-wireless-power-bank" },
  // Nothing in product_images referenced this one -- the product's images
  // are served from Supabase storage -- but the files were still publicly
  // fetchable at a path naming a brand, so it is renamed with the others.
  { from: "earbuds-airpods-pro-2", to: "tws-pro-wireless-earbuds-charging-case" },
];

function imageFolderRedirects() {
  return IMAGE_FOLDER_RENAMES.map(({ from, to }) => ({
    source: `/images/${from}/:file`,
    destination: `/images/${to}/:file`,
    permanent: true,
  }));
}

async function buildSlugRedirects() {
  const [products, categories] = await Promise.all([
    slugRedirects({
      prefix: "/product",
      table: "product_slug_redirects",
      target: "products",
      columns: "slug,status,is_deleted",
      liveFilter: "is_deleted=eq.false",
      isLive: (target) => target.status === "published" && target.is_deleted === false,
    }),
    slugRedirects({
      prefix: "/category",
      table: "category_slug_redirects",
      target: "categories",
      columns: "slug,is_active",
      // Only the single-segment form, which is what the category page
      // canonicalises to and what the sitemap lists. A deeper path like
      // /category/a/b resolves on its last segment in the route itself.
      liveFilter: "is_active=eq.true",
      isLive: (target) => target.is_active === true,
    }),
  ]);
  return [...products, ...categories, ...imageFolderRedirects()];
}

const nextConfig: NextConfig = {
  redirects: buildSlugRedirects,
  experimental: {
    viewTransition: true,
    // Default is 1MB, well under the 5MB image uploads this app allows
    // (lib/admin/uploads.ts, lib/uploadPaymentSlip.ts) -- without this, a
    // file between 1-5MB never reaches that code's own size check at all;
    // it's rejected at the platform layer first, as an unhandled request
    // failure rather than the friendly "File must be under 5MB." message.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  // sharp is a native binary and must not be bundled by webpack -- it is
  // require()d from node_modules at request time by lib/admin/uploads.ts,
  // which downscales inline description images before storing them.
  serverExternalPackages: ["sharp"],
  // ...but marking it external is exactly what stopped it working on
  // Vercel. sharp picks its native binding at RUNTIME (it tries each
  // @img/sharp-<platform> package in turn), so there is no static require
  // for Next's file tracing to follow, and the .node/.so files never made
  // it into the deployed function. A build that succeeded and an upload
  // that silently stored the original 2400x2400 were the only symptoms;
  // the real error was only in the function log:
  //
  //   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
  //
  // outputFileTracingIncludes is Next's documented answer for "tracing
  // cannot see this file". Keys are route globs matched against the route
  // path; values are globs resolved from the project root.
  //
  // Scoped to /admin/** because a Server Action is traced under whichever
  // route invoked it, and the description editor is reachable from three:
  // /admin/products/new, /admin/products/[id]/edit and
  // /admin/settings/policies. Nothing customer-facing pulls sharp in, so
  // the storefront's functions stay unaffected.
  //
  // @img/** rather than a named platform package: npm only installs the
  // optional @img packages matching the build machine, so this resolves to
  // the linux-x64 binding plus its libvips on Vercel (and the win32 one
  // locally) without hardcoding either. Both halves are needed -- on Linux
  // the binding (@img/sharp-linux-x64) and libvips
  // (@img/sharp-libvips-linux-x64) are separate packages, and it was the
  // latter that was missing.
  outputFileTracingIncludes: {
    "/admin/**": ["./node_modules/@img/**/*", "./node_modules/sharp/**/*"],
  },
  images: {
    // HeroSlider requests quality={88}; Next 16 rejects any quality not
    // explicitly listed here (75 is the implicit default used everywhere
    // else via next/image's defaults).
    qualities: [75, 88],
    // Quota control, not just browser caching. A transformation is billed
    // when a given source+size+format+quality combination isn't already in
    // Vercel's optimizer cache; once cached, repeat requests are free until
    // the entry expires. The default TTL re-bills the same images
    // relatively often, which is what made the Aug 2026 quota blow through
    // 5,000 in a month. Product/banner images here are effectively
    // immutable -- a changed image is a new upload at a new Supabase URL,
    // never the same URL mutated in place -- so a long TTL is safe and cuts
    // repeat transformations of identical images to near zero.
    minimumCacheTTL: 31 * 24 * 60 * 60, // 31 days
    // Every DISTINCT width Next is allowed to request is a separately
    // billed transformation per image. The defaults offer 8 device widths
    // plus 8 fixed sizes, far more granularity than this layout actually
    // uses, so the same image gets re-encoded at widths no breakpoint here
    // ever asks for. These lists cover this site's real breakpoints (the
    // 2/3/4-column product grids, full-bleed hero/banners) with markedly
    // fewer variants per image.
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [96, 256, 384],
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
