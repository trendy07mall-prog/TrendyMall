import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
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
