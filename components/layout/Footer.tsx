import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";
import { getBrandingSettings, getGeneralSettings, getSocialSettings } from "@/lib/data/settings";
import { getWhatsAppUrl } from "@/lib/site";
import { formatBusinessHoursSummary } from "@/lib/campaign-datetime";
import {
  BankIcon,
  CashIcon,
  CreditCardIcon,
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
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

export async function Footer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [branding, general, social] = await Promise.all([
    getBrandingSettings(),
    getGeneralSettings(),
    getSocialSettings(),
  ]);
  const socialLinks = (Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[])
    .map((key) => ({ url: social[key], ...SOCIAL_ICONS[key] }))
    .filter((entry) => entry.url);
  const whatsappUrl = getWhatsAppUrl(undefined, general.whatsappNumber);
  const whatsappDisplay = general.whatsappNumber.replace(/^94/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  const phoneDisplay = general.phone.replace(/^\+94/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

  return (
    <footer className="border-t border-[var(--border)] bg-white print:hidden">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            {/* unoptimized: a static 563x334 source file displayed at a
                fixed 67x40 -- well over 8x the display size already, so
                the browser downscales it directly with no loss of
                sharpness at any real pixel density, and it doesn't need
                to go through Next's Image Optimization pipeline for a
                fixed-size decorative logo rendered on every page. */}
            <Image
              src={branding.logoDesktopUrl}
              alt={general.storeName}
              width={67}
              height={40}
              unoptimized
            />
            <p className="mt-3 text-sm text-[var(--muted)]">{general.tagline}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[var(--foreground)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Customer Service</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)]"
                >
                  WhatsApp: {whatsappDisplay}
                </a>
              </li>
              <li>
                <a href={`tel:${general.phone}`} className="hover:text-[var(--foreground)]">
                  Phone: {phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${general.email}`} className="hover:text-[var(--foreground)]">
                  {general.email}
                </a>
              </li>
              <li>{general.address}</li>
              <li>{formatBusinessHoursSummary(general.businessHours)}</li>
            </ul>

            {socialLinks.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                {socialLinks.map(({ url, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`TrendyMall on ${label}`}
                    className="transition-brand flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] hover:-translate-y-0.5 hover:bg-black/5"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold">Stay Updated</h3>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Be the first to know about new arrivals, exclusive offers, and
              special promotions.
            </p>
            <div className="mt-4">
              <NewsletterSignup defaultEmail={user?.email} />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--muted)]">
            © {new Date().getFullYear()} {general.storeName}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--muted)]">We accept:</span>
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">
              <CashIcon className="h-3.5 w-3.5" />
              Cash on Delivery
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">
              <BankIcon className="h-3.5 w-3.5" />
              Bank Transfer
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
              <CreditCardIcon className="h-3.5 w-3.5" />
              Card — Coming Soon
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
