import Link from "next/link";
import Image from "next/image";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";
import { BankIcon, CashIcon, CreditCardIcon, FacebookIcon, InstagramIcon } from "@/components/ui/Icon";

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

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-white print:hidden">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight">
              <Image
                src="/images/logo/tm_logo_clear_animated.png"
                alt=""
                width={32}
                height={32}
                className="rounded-md"
              />
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
                className="transition-brand flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] hover:-translate-y-0.5 hover:bg-black/5"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/trendy_.mall_._?igsh=MTE4M2IyM3lpeWs1YQ%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TrendyMall on Instagram"
                className="transition-brand flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] hover:-translate-y-0.5 hover:bg-black/5"
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

        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--muted)]">
            © {new Date().getFullYear()} TrendyMall. All rights reserved.
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
