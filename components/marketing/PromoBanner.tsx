"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/ui/Icon";
import type { SiteBanner } from "@/types";

const STORAGE_KEY = "trendymall-dismissed-banner-id";

export function PromoBanner({ banner }: { banner: SiteBanner | null }) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reading localStorage only after mount (not in useState's initializer)
    // is intentional: it keeps the server-rendered and first client render
    // identical, avoiding a hydration mismatch. Keyed by banner id, not just
    // a boolean, so dismissing one banner doesn't hide a later, different one.
    if (banner) {
      try {
        const dismissedId = window.localStorage.getItem(STORAGE_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (dismissedId === banner.id) setDismissed(true);
      } catch {
        // ignore
      }
    }
    setHydrated(true);
  }, [banner]);

  if (!banner || !hydrated || dismissed) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-[var(--foreground)] px-4 py-2 text-center text-sm text-white">
      {banner.link_url ? (
        <Link href={banner.link_url} className="underline underline-offset-2">
          {banner.message}
        </Link>
      ) : (
        <span>{banner.message}</span>
      )}
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, banner.id);
          } catch {
            // ignore
          }
          setDismissed(true);
        }}
        className="shrink-0 opacity-80 transition-opacity hover:opacity-100"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
