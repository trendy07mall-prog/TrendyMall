import Link from "next/link";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";
import { FacebookIcon, InstagramIcon } from "@/components/ui/Icon";

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/shipping", label: "Shipping Policy" },
  { href: "/returns", label: "Returns" },
  { href: "/faq", label: "FAQ" },
  { href: "/track-order", label: "Track Order" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

const TRUST_INDICATORS = [
  "Fast Islandwide Delivery",
  "Cash on Delivery",
  "Secure Checkout",
  "Quality Checked Products",
  "Customer Support",
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-heading text-lg font-extrabold tracking-tight">
              TrendyMall
            </span>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Sri Lanka&apos;s trusted destination for premium mobile phone
              accessories.
            </p>
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
                  href="https://wa.me/94775312484"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)]"
                >
                  WhatsApp: 077 531 2484
                </a>
              </li>
              <li>
                <a href="tel:+94750187145" className="hover:text-[var(--foreground)]">
                  Phone: 075 018 7145
                </a>
              </li>
              <li>
                <a
                  href="mailto:trendy07mall@gmail.com"
                  className="hover:text-[var(--foreground)]"
                >
                  trendy07mall@gmail.com
                </a>
              </li>
              <li>Salawatta Road, Wellampitiya, Sri Lanka</li>
              <li>Open daily 10am – 4pm</li>
            </ul>

            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.facebook.com/share/18oKpTZ1fg/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TrendyMall on Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:bg-black/5"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/trendy_.mall_._?igsh=MTE4M2IyM3lpeWs1YQ%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TrendyMall on Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:bg-black/5"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Stay Updated</h3>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Be the first to know about new arrivals, exclusive offers, and
              special promotions.
            </p>
            <div className="mt-4">
              <NewsletterSignup />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
          {TRUST_INDICATORS.map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <span aria-hidden="true">✓</span>
              {item}
            </span>
          ))}
        </div>

        <p className="mt-6 text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} TrendyMall. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
