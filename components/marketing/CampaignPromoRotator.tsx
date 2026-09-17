"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";
import { BoltIcon } from "@/components/ui/Icon";

// The hero's campaign tile. More than one campaign can be genuinely active
// at the same time (getHomepageCampaigns has always returned a list), but
// the hero only ever rendered the first one, so a second live campaign was
// invisible there. This rotates through all of them in that one slot.
//
// Deliberately NOT built on SlideCarousel: that component's slides are
// plain images with an optional title/subtitle/button overlay, and a
// campaign tile's overlay is a live <CampaignCountdown> plus a bolt icon
// and name. Rather than widen SlideCarousel's Slide shape (it is shared
// with the hero itself and the /shop banner), this is a small crossfade of
// its own that borrows SlideCarousel's timing and dot styling.
export interface CampaignPromoItem {
  id: string;
  slug: string;
  name: string;
  endAt: string | null;
  image: string | null;
}

// Matches SlideCarousel's DEFAULT_SLIDE_DURATION, so the two rotating
// things in the hero tick at the same rate rather than drifting against
// each other at different intervals.
const ROTATE_MS = 4000;
const TRANSITION_MS = 600;

const promoTileClass =
  "relative block overflow-hidden rounded-[24px] bg-black/5 shadow-[0_15px_35px_rgba(0,0,0,0.10)]";

function CampaignTile({
  campaign,
  sizes,
  imageClassName,
  twoLineCaption,
}: {
  campaign: CampaignPromoItem;
  sizes: string;
  imageClassName: string;
  twoLineCaption: boolean;
}) {
  return (
    <>
      {campaign.image && (
        <Image
          src={campaign.image}
          alt=""
          fill
          quality={88}
          sizes={sizes}
          className={imageClassName}
        />
      )}
      {/* Kept to a 20px strip (28px two-line on a half-width phone tile):
          campaign banners put their date line low on the image, and a taller
          strip covered the live banner's date line at 1024px. */}
      {twoLineCaption ? (
        <span className="absolute inset-x-0 bottom-0 flex flex-col bg-black/55 px-2 py-0.5 text-[11px] leading-3 text-white">
          <span className="flex min-w-0 items-center gap-1 font-bold">
            <BoltIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{campaign.name}</span>
          </span>
          {campaign.endAt && (
            <CampaignCountdown target={campaign.endAt} label="Ends in" size="sm" tone="white" />
          )}
        </span>
      ) : (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-3 py-0.5 text-xs leading-4 text-white">
          <span className="flex min-w-0 items-center gap-1.5 font-bold">
            <BoltIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{campaign.name}</span>
          </span>
          {campaign.endAt && (
            <CampaignCountdown target={campaign.endAt} label="Ends in" size="sm" tone="white" />
          )}
        </span>
      )}
    </>
  );
}

export function CampaignPromoRotator({
  campaigns,
  sizes,
  className,
  imageClassName = "object-cover",
  twoLineCaption = false,
}: {
  campaigns: CampaignPromoItem[];
  sizes: string;
  className: string;
  imageClassName?: string;
  twoLineCaption?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // One campaign is not a carousel: no interval, no dots, no stacking --
  // exactly the static tile this slot rendered before rotation existed.
  const rotating = campaigns.length > 1;

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Same "sync from an external system on mount" pattern SlideCarousel
    // uses -- the OS preference can't be known during server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!rotating) return;
    function onVisibilityChange() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [rotating]);

  // Re-created whenever `active` changes, for a tick or a dot click alike,
  // which is what resets the countdown on manual interaction -- the same
  // shape as SlideCarousel's autoplay effect.
  useEffect(() => {
    if (!rotating || paused) return;
    const id = setInterval(() => {
      setActive((current) => (current + 1) % campaigns.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [rotating, paused, campaigns.length, active]);

  // If a campaign ends while the page is open, router.refresh() (fired by
  // CampaignCountdown) re-renders this with a shorter list; clamp so the
  // index can never point past the end.
  const current = Math.min(active, campaigns.length - 1);

  if (campaigns.length === 0) return null;

  if (!rotating) {
    const only = campaigns[0];
    return (
      <Link
        href={`/campaign/${only.slug}`}
        className={`${promoTileClass} ${className} ${only.image ? "" : "bg-[var(--color-warning)]"}`}
      >
        <CampaignTile
          campaign={only}
          sizes={sizes}
          imageClassName={imageClassName}
          twoLineCaption={twoLineCaption}
        />
      </Link>
    );
  }

  return (
    <div
      className={`${promoTileClass} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {campaigns.map((campaign, index) => {
        const isActive = index === current;
        return (
          // Absolutely stacked and crossfaded, so the slot's own box never
          // changes size between campaigns -- no layout shift, whatever
          // shape each banner happens to be.
          <Link
            key={campaign.id}
            href={`/campaign/${campaign.slug}`}
            aria-hidden={!isActive}
            tabIndex={isActive ? 0 : -1}
            className={`absolute inset-0 overflow-hidden ${isActive ? "" : "pointer-events-none"} ${
              campaign.image ? "" : "bg-[var(--color-warning)]"
            }`}
            style={{
              opacity: isActive ? 1 : 0,
              transition: `opacity ${reducedMotion ? 0 : TRANSITION_MS}ms ease-in-out`,
            }}
          >
            <CampaignTile
              campaign={campaign}
              sizes={sizes}
              imageClassName={imageClassName}
              twoLineCaption={twoLineCaption}
            />
          </Link>
        );
      })}

      {/* Same dot language as SlideCarousel, scaled down for a tile this
          small and pinned to the top-right so it never sits on the caption
          strip along the bottom edge. No 44px touch targets here on
          purpose: a full-size hit area would cover most of a half-width
          phone tile and swallow taps meant for the campaign link itself,
          which is this tile's primary action.
          On its own scrim, unlike SlideCarousel's dots: those sit over
          full-bleed hero art, while a campaign banner is admin-uploaded and
          frequently light in its top-right corner (the live "Big Bang Flash
          Sale" banner is near-white there), which left plain white dots
          almost invisible. Same black/55 as the caption strip below. */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-1">
        {campaigns.map((campaign, index) => (
          <button
            key={campaign.id}
            type="button"
            aria-label={`Show ${campaign.name}`}
            aria-current={index === current}
            onClick={() => setActive(index)}
            className="flex h-5 w-4 items-center justify-center"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                index === current ? "w-4 bg-white" : "w-1.5 bg-white/45"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
