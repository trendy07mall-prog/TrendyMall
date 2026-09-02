import Image, { getImageProps } from "next/image";

// Adapts HeroSlider.tsx's device-specific art-direction technique (two
// <Image>s gated by md:hidden/hidden md:block, not one CSS-resized image) --
// but simplified: a campaign has exactly one desktop and one mobile image,
// not a multi-slide carousel, so none of HeroSlider's autoplay/dot/swipe
// state is needed, and this can stay a plain server component.
//
// No placeholder="blur" here -- HeroSlider's blurDataURL values are
// hand-authored base64 literals for known local images; admin-uploaded
// campaign banners have no equivalent pre-generated placeholder.
const MOBILE_SIZES = "100vw";
const DESKTOP_SIZES = "100vw";

export function CampaignBanner({
  desktopUrl,
  mobileUrl,
  alt,
}: {
  desktopUrl: string | null;
  mobileUrl: string | null;
  alt: string;
}) {
  const desktop = desktopUrl ?? mobileUrl;
  const mobile = mobileUrl ?? desktopUrl;
  if (!desktop && !mobile) return null;

  const { props: mobilePreload } = mobile
    ? getImageProps({ src: mobile, alt: "", fill: true, quality: 88, sizes: MOBILE_SIZES })
    : { props: null };
  const { props: desktopPreload } = desktop
    ? getImageProps({ src: desktop, alt: "", fill: true, quality: 88, sizes: DESKTOP_SIZES })
    : { props: null };

  return (
    <div className="mx-auto w-full max-w-[1920px] px-6 pt-6">
      {mobilePreload && (
        <link
          rel="preload"
          as="image"
          href={mobilePreload.src}
          imageSrcSet={mobilePreload.srcSet}
          imageSizes={MOBILE_SIZES}
          media="(max-width: 767px)"
        />
      )}
      {desktopPreload && (
        <link
          rel="preload"
          as="image"
          href={desktopPreload.src}
          imageSrcSet={desktopPreload.srcSet}
          imageSizes={DESKTOP_SIZES}
          media="(min-width: 768px)"
        />
      )}

      {mobile && (
        // 800/600 (4:3) matches the "Recommended 800×600" hint on the
        // mobile banner upload field exactly -- this used to be 1200/675
        // (16:9), which forced object-cover to crop ~25% off the top and
        // bottom of a genuinely-4:3 upload (exactly where an admin's badge/
        // CTA overlay lives), even though the image itself was correctly
        // sized. Matching the container to the real upload ratio means
        // cover has nothing left to crop.
        <div className="relative aspect-[800/600] w-full overflow-hidden rounded-[var(--radius-card)] md:hidden">
          <Image
            src={mobile}
            alt={alt}
            fill
            loading="lazy"
            quality={88}
            sizes={MOBILE_SIZES}
            className="object-cover"
          />
        </div>
      )}
      {desktop && (
        // 1600/500 (3.2:1) matches the "Recommended 1600×500" hint on the
        // desktop banner upload field exactly -- this used to be 1920/650
        // (≈2.95:1), which forced object-cover to crop ~80px off each SIDE
        // of a genuinely-3.2:1 upload at 1920px wide (exactly where the
        // logo/headline sit on one edge and the product image/CTA sit on
        // the other), even though the image itself was correctly sized.
        // Same root cause and fix as the mobile 4:3 correction above.
        <div className="relative hidden aspect-[1600/500] w-full overflow-hidden rounded-[var(--radius-card)] md:block">
          <Image
            src={desktop}
            alt={alt}
            fill
            loading="lazy"
            quality={88}
            sizes={DESKTOP_SIZES}
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
