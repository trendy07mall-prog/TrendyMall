"use client";

import { useEffect, useState } from "react";
import { CloseIcon, TruckIcon, CashIcon, WhatsAppIcon } from "@/components/ui/Icon";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";
import type { AnnouncementMessage } from "@/lib/data/settings";

const STORAGE_KEY = "trendymall-announcement-dismissed";

const ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
  truck: TruckIcon,
  cash: CashIcon,
  whatsapp: WhatsAppIcon,
};

// This bar is the only thing on the storefront matching app/manifest.ts's
// theme_color (#111111) -- mobile browsers use that as a fallback chrome
// tint whenever no explicit <meta name="theme-color"> is present, which is
// correct while this bar is showing but leaves a stray dark bar above the
// (white) header once it's dismissed. Keeping an explicit meta tag in sync
// with this component's own dismissed state fixes it at the one place that
// actually knows which state is true, rather than a per-page guess -- same
// fix /admin already applies statically via its own viewport export, since
// it never shows this bar at all.
function syncThemeColor(dismissed: boolean) {
  const content = dismissed ? "#ffffff" : "#111111";
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

// Delivery-rate entries always render the REAL rate from
// lib/delivery-fee.ts and the WhatsApp entry always uses the real settings
// number -- an admin can choose that a slot shows one of these, but can
// never free-type the rate/number itself (Settings > Announcement).
function resolveMessage(message: AnnouncementMessage, whatsappNumber: string) {
  if (message.kind === "delivery_in_zone") {
    return { text: `Colombo 1–15: ${formatPrice(RATE_IN_ZONE)}`, href: undefined };
  }
  if (message.kind === "delivery_outside_zone") {
    return { text: `Outside Colombo: ${formatPrice(RATE_OUTSIDE_ZONE)}`, href: undefined };
  }
  if (message.kind === "whatsapp") {
    return { text: message.text ?? "Need Help? WhatsApp Us", href: `https://wa.me/${whatsappNumber}` };
  }
  return { text: message.text ?? "", href: message.href };
}

function MessageContent({ item }: { item: { icon: string; text: string; href?: string } }) {
  const Icon = ICONS[item.icon] ?? TruckIcon;
  const inner = (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {item.text}
    </span>
  );
  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
        {inner}
      </a>
    );
  }
  return inner;
}

export function AnnouncementBar({
  enabled,
  messages,
  autoRotate,
  rotateSpeedMs,
  whatsappNumber,
}: {
  enabled: boolean;
  messages: AnnouncementMessage[];
  autoRotate: boolean;
  rotateSpeedMs: number;
  whatsappNumber: string;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const resolved = messages.map((message) => ({
    icon: message.icon ?? "truck",
    ...resolveMessage(message, whatsappNumber),
  }));

  useEffect(() => {
    let isDismissed = false;
    try {
      isDismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isDismissed) setDismissed(true);
    } catch {
      // ignore
    }
    syncThemeColor(isDismissed && enabled);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mql.matches);
    function onChange() {
      setReducedMotion(mql.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!autoRotate || resolved.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % resolved.length);
    }, rotateSpeedMs);
    return () => clearInterval(id);
  }, [autoRotate, rotateSpeedMs, resolved.length]);

  if (!enabled || resolved.length === 0 || !hydrated || dismissed) return null;

  return (
    <div className="relative z-[var(--z-announcement)] flex items-center justify-center gap-4 bg-[var(--foreground)] px-10 py-2 text-xs text-white sm:text-sm print:hidden">
      <div className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:flex">
        {resolved.map((item, index) => (
          <span key={index} className={index === 0 ? "" : "border-l border-white/20 pl-4"}>
            <MessageContent item={item} />
          </span>
        ))}
      </div>

      <div className="relative h-4 w-full sm:hidden">
        {resolved.map((item, index) => (
          <span
            key={index}
            aria-hidden={index !== activeIndex}
            className={`transition-brand absolute inset-0 flex items-center justify-center ${
              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            style={reducedMotion ? { transitionDuration: "0ms" } : undefined}
          >
            <MessageContent item={item} />
          </span>
        ))}
      </div>

      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, "1");
          } catch {
            // ignore
          }
          syncThemeColor(true);
          setDismissed(true);
        }}
        className="absolute top-1/2 right-3 -translate-y-1/2 opacity-80 transition-opacity hover:opacity-100"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
