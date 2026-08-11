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
        <div className="relative aspect-[1200/675] w-full overflow-hidden rounded-[var(--radius-card)] md:hidden">
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
        <div className="relative hidden aspect-[1920/650] w-full overflow-hidden rounded-[var(--radius-card)] md:block">
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
