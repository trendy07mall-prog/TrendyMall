"use client";

import { useState } from "react";
import { FacebookIcon, LinkIcon, WhatsAppIcon } from "@/components/ui/Icon";

export function ShareButtons({ productName }: { productName: string }) {
  const [copied, setCopied] = useState(false);

  function getUrl() {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard permission failures
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${productName} — ${getUrl()}`)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-[var(--muted)]">Share:</span>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:bg-black/5"
      >
        <WhatsAppIcon className="h-4 w-4" />
      </a>
      <a
        href={facebookHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:bg-black/5"
      >
        <FacebookIcon className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label="Copy link"
        className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-xs font-medium transition-colors hover:bg-black/5"
      >
        <LinkIcon className="h-4 w-4" />
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
