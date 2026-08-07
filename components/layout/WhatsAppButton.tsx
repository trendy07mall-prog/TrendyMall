"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/ui/Icon";

const WHATSAPP_URL = "https://wa.me/94775312484";

export function WhatsAppButton() {
  // Nothing should compete with the primary CTA on checkout — every
  // checkout error state already has its own "Message us on WhatsApp"
  // link, so the FAB adds no value there and only risks covering the
  // Place Order button. Every other storefront page keeps it.
  const pathname = usePathname();
  if (pathname?.startsWith("/checkout")) return null;

  return (
    <div
      className="group fixed right-5 z-[var(--z-whatsapp)] transition-[bottom] duration-[220ms] ease-in-out motion-reduce:transition-none print:hidden sm:right-8"
      // Shifts up above whatever sticky bottom bar the current page has
      // (--mobile-bottom-bar-offset, published by that page — see
      // app/cart/page.tsx / CheckoutForm.tsx), and respects the iPhone
      // home-indicator safe area — same calc() pattern already used by
      // ToastProvider.tsx for the same reason. --pdp-floating-bar-height is
      // a second, separate term: the PDP's bottom nav stays visible (unlike
      // cart/checkout), so the PDP's floating purchase bar can't reuse
      // --mobile-bottom-bar-offset (the nav already writes that one on this
      // route) — published only while that bar is actually visible,
      // defaults to 0px everywhere else.
      style={{
        bottom:
          "calc(var(--whatsapp-fab-bottom-base) + env(safe-area-inset-bottom) + var(--mobile-bottom-bar-offset, 0px) + var(--pdp-floating-bar-height, 0px))",
      }}
    >
      <span
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 rounded-lg bg-[#111111] px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
      >
        Chat with us on WhatsApp
      </span>
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        // Deliberately not using the shared --shadow-card/--shadow-card-hover
        // tokens — those are now flattened for inline content cards, but a
        // floating action button still needs real elevation to read as
        // floating above the page, so its shadow is set explicitly here.
        className="transition-brand relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-[#25D366]"
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
        />
        <WhatsAppIcon className="relative h-7 w-7" />
      </motion.a>
    </div>
  );
}
