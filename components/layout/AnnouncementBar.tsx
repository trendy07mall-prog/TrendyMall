"use client";

import { useEffect, useState } from "react";
import { CloseIcon, TruckIcon, CashIcon, WhatsAppIcon } from "@/components/ui/Icon";

const STORAGE_KEY = "trendymall-announcement-dismissed";
const ROTATE_MS = 4000;

const MESSAGES = [
  { icon: TruckIcon, text: "Colombo 1–15: Rs.255" },
  { icon: TruckIcon, text: "Outside Colombo: Rs.400" },
  { icon: CashIcon, text: "Cash on Delivery" },
  {
    icon: WhatsAppIcon,
    text: "Need Help? WhatsApp Us",
    href: "https://wa.me/94775312484",
  },
] as const;

function MessageContent({ item }: { item: (typeof MESSAGES)[number] }) {
  const Icon = item.icon;
  const inner = (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {item.text}
    </span>
  );
  if ("href" in item && item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
        {inner}
      </a>
    );
  }
  return inner;
}

export function AnnouncementBar() {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setDismissed(true);
    } catch {
      // ignore
    }
    setHydrated(true);
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
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  if (!hydrated || dismissed) return null;

  return (
    <div className="relative z-[var(--z-announcement)] flex items-center justify-center gap-4 bg-[var(--foreground)] px-10 py-2 text-xs text-white sm:text-sm">
      <div className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:flex">
        {MESSAGES.map((item, index) => (
          <span
            key={item.text}
            className={index === 0 ? "" : "border-l border-white/20 pl-4"}
          >
            <MessageContent item={item} />
          </span>
        ))}
      </div>

      <div className="relative h-4 w-full sm:hidden">
        {MESSAGES.map((item, index) => (
          <span
            key={item.text}
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
          setDismissed(true);
        }}
        className="absolute top-1/2 right-3 -translate-y-1/2 opacity-80 transition-opacity hover:opacity-100"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
