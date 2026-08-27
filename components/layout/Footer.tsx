import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";
import { getBrandingSettings, getGeneralSettings, getPaymentSettings, getSocialSettings } from "@/lib/data/settings";
import { isPayHereEnabled } from "@/lib/payhere";
import { getWhatsAppUrl } from "@/lib/site";
import { formatBusinessHoursSummary } from "@/lib/campaign-datetime";
import {
  CheckIcon,
  ClockIcon,
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  TikTokIcon,
  WhatsAppIcon,
  YouTubeIcon,
  TwitterIcon,
} from "@/components/ui/Icon";

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/shipping", label: "Shipping Policy" },
  { href: "/returns", label: "Returns" },
  { href: "/warranty", label: "Warranty" },
  { href: "/faq", label: "FAQ" },
  { href: "/track-order", label: "Track Order" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

const SOCIAL_ICONS = {
  facebookUrl: { icon: FacebookIcon, label: "Facebook" },
  instagramUrl: { icon: InstagramIcon, label: "Instagram" },
  tiktokUrl: { icon: TikTokIcon, label: "TikTok" },
  youtubeUrl: { icon: YouTubeIcon, label: "YouTube" },
  twitterUrl: { icon: TwitterIcon, label: "X (Twitter)" },
} as const;

// Orange-tinted icon chip shared by every Customer Service row -- same
// "tinted background, saturated icon" pattern WhatsAppOrderButton.tsx
// already uses, just the site's other established accent (--color-warning)
// instead of WhatsApp's own green, since this chip fronts phone/email/
// location/hours too, not only WhatsApp.
function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex min-w-0 flex-col pt-0.5">
        <span className="text-xs font-semibold tracking-wide text-white uppercase">{label}</span>
        <span className="mt-0.5 text-sm text-white/75">{children}</span>
      </span>
    </li>
  );
}

export async function Footer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [branding, general, social, payment] = await Promise.all([
    getBrandingSettings(),
    getGeneralSettings(),
    getSocialSettings(),
    getPaymentSettings(),
  ]);
  const socialLinks = (Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[])
    .map((key) => ({ url: social[key], ...SOCIAL_ICONS[key] }))
    .filter((entry) => entry.url);
  const whatsappUrl = getWhatsAppUrl(undefined, general.whatsappNumber);
  const whatsappDisplay = general.whatsappNumber.replace(/^94/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  const phoneDisplay = general.phone.replace(/^\+94/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

  // Same gate checkout/About use (app/checkout/page.tsx, app/about/page.tsx)
  // -- Card only reads as accepted here if it would actually be selectable
  // at checkout.
  const cardAvailable = isPayHereEnabled() && payment.onlinePaymentEnabled;
  const paymentBadges = [
    { label: "Cash on Delivery", active: payment.codEnabled },
    { label: "Bank Transfer", active: payment.bankTransferEnabled },
    { label: "Card", active: cardAvailable },
  ];

  return (
    // Same navy gradient PageHero.tsx/AboutHero.tsx already establish, not
    // a new one -- keeps the footer visually part of the same brand system
    // as every other full-bleed navy section on the site.
    <footer className="bg-gradient-to-br from-[#0F2D52] to-[#173f70] text-white print:hidden">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 py-16">
        <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-12">
          <div className="order-1">
            {/* The source logo file has a baked-in opaque white background
                (confirmed by pixel sampling — see NavbarClient.tsx's glass
                header, which hit the exact same issue), so it needs the
                same small white chip behind it here, or it shows as a
                stray white rectangle on this new navy background. */}
            <div className="inline-flex rounded-lg bg-white/95 px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
              <Image
                src={branding.logoDesktopUrl}
                alt={general.storeName}
                width={77}
                height={46}
                unoptimized
              />
            </div>
            <p className="mt-4 text-sm text-white/70">{general.tagline}</p>

            {/* Real, already-established facts (About page's delivery/
                returns content, DeliveryInfoCard.tsx's "At a Glance" card)
                — Cash on Delivery is gated on the same real Settings flag
                the payment badges below use, not asserted unconditionally,
                since it's the one fact here that admins can actually turn
                off. */}
            <ul className="mt-5 flex flex-col gap-2 text-sm text-white/80">
              {payment.codEnabled && (
                <li className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  Cash on Delivery available
                </li>
              )}
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                Islandwide delivery
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                48-hour return window
              </li>
            </ul>

            {socialLinks.length > 0 && (
              <div className="mt-5 flex items-center gap-2.5">
                {socialLinks.map(({ url, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`TrendyMall on ${label}`}
                    className="transition-brand flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="order-3 sm:order-2">
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Company</h3>
            <ul className="mt-5 flex flex-col gap-2.5 text-sm text-white/70">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-2 sm:order-3">
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Customer Service</h3>
            <ul className="mt-5 flex flex-col gap-4">
              <ContactRow icon={WhatsAppIcon} label="WhatsApp">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {whatsappDisplay}
                </a>
              </ContactRow>
              <ContactRow icon={PhoneIcon} label="Phone">
                <a href={`tel:${general.phone}`} className="hover:text-white">
                  {phoneDisplay}
                </a>
              </ContactRow>
              <ContactRow icon={MailIcon} label="Email">
                <a href={`mailto:${general.email}`} className="hover:text-white">
                  {general.email}
                </a>
              </ContactRow>
              <ContactRow icon={MapPinIcon} label="Location">
                {general.address}
              </ContactRow>
              <ContactRow icon={ClockIcon} label="Hours">
                {formatBusinessHoursSummary(general.businessHours)}
              </ContactRow>
            </ul>
          </div>

          <div className="order-4">
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Stay Updated</h3>
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="text-sm text-white/70">
                Be the first to know about new arrivals, exclusive offers, and
                special promotions.
              </p>
              <div className="mt-4">
                <NewsletterSignup defaultEmail={user?.email} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} {general.storeName}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-white/60">We accept:</span>
            {paymentBadges.map((badge) => (
              // The dot carries the status now (green = accepted today, gray
              // = not yet) instead of a "— Coming Soon" text suffix -- still
              // announced properly via the badge's own title/aria-label for
              // anyone who can't rely on color alone.
              <span
                key={badge.label}
                title={badge.active ? `${badge.label} — accepted` : `${badge.label} — coming soon`}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    badge.active ? "bg-[var(--color-success)]" : "bg-white/30"
                  }`}
                />
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
