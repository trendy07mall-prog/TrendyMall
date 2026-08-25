"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SiteSearchBar } from "@/components/layout/SiteSearchBar";

// Every other page keeps the existing always-visible search bar exactly as
// it was — this component only changes behavior on "/". There, the bar is
// hidden at the top of the page and fades/slides in once the visitor has
// scrolled past the hero (watched via the #hero-sentinel div HeroSlider
// renders right after itself), rather than reserving space in the normal
// flow the way the sitewide bar does.
export function HomeSearchBar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(84);

  useEffect(() => {
    if (!isHome) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mql.matches);
    function onChange() {
      setReducedMotion(mql.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [isHome]);

  // The bar used to sit at a hardcoded top-[84px], assuming the sticky
  // <header> always occupies exactly the viewport's first 84px — true only
  // once scrolled past AnnouncementBar+PromoBanner (normal-flow siblings
  // above it in app/layout.tsx). Their combined height varies — the mobile
  // PromoBanner text can wrap to 2 lines where desktop's wider layout keeps
  // it to 1 — and the hero's fixed aspect ratio makes the hero-sentinel
  // trigger much earlier on narrow phones, so `visible` could flip on
  // before the header had actually finished sticking to y:0. In that
  // window the header (still below the not-yet-scrolled banner stack)
  // visually outranks and covers this fixed-position bar. Tracking the
  // header's real live bottom edge instead of a fixed number is
  // self-correcting for that window, for any future header height change,
  // and for both mobile and desktop — not a new magic number to go stale.
  //
  // `visible` is computed here too (direct getBoundingClientRect() read on
  // #hero-sentinel), not via a separate IntersectionObserver as this used
  // to do — IO's callback is spec'd as best-effort/batched, and confirmed
  // via Playwright that it can silently miss firing during a fast
  // (especially mobile, momentum-scroll-like) scroll: the bar would then
  // stay permanently hidden for the rest of the session even though the
  // hero was long since scrolled past, since nothing else ever re-checks
  // once IO stops calling back. A synchronous rect read on every
  // scroll/resize tick this effect already runs doesn't have that failure
  // mode — there's no separate callback to miss.
  //
  // #hero-sentinel itself is only guaranteed to exist once HeroSlider (an
  // async Server Component awaiting DB calls) has actually rendered — this
  // route has a root app/loading.tsx, so Next.js streams the shared layout
  // (this component included) in and hydrates it before that async page
  // content necessarily resolves. Confirmed via Playwright, in two layers:
  // 1) On a reload mid-scroll, the browser's own scroll-restoration can
  //    fire several real 'scroll' events before the sentinel exists yet,
  //    each one reading `sentinel === null` and silently no-op'ing.
  // 2) Once the sentinel node IS inserted, its position can still be wrong
  //    for a few more frames: the hero images haven't finished loading, so
  //    the page's total scrollable height hasn't grown to its true size
  //    yet, meaning `getBoundingClientRect().top` briefly under-reports
  //    the same way it would for a shorter page. A first attempt used a
  //    one-shot MutationObserver (fire once when the sentinel appears,
  //    then disconnect) — confirmed via Playwright that this reliably
  //    catches the sentinel's insertion, but the single measurement it
  //    takes at that instant can land inside this second, narrower window
  //    and compute the wrong value, with no further scroll/resize event to
  //    self-correct it afterward.
  //
  // A ResizeObserver on document.body covers both: inserting the hero
  // content changes body's rendered height (catches gap #1), and it fires
  // AGAIN as images finish loading and the page's height settles (catches
  // gap #2) — not one-shot, so every genuine layout change gets its own
  // fresh measurement for as long as this component is mounted, the same
  // way the scroll listener already does.
  //
  // measure() is called directly for every scroll/resize/ResizeObserver
  // event, not funneled through a single tickingRef-gated
  // requestAnimationFrame() the way this used to. That gate was meant to
  // coalesce high-frequency scroll events into one measurement per frame,
  // but it had a real failure mode: if the ResizeObserver's callback fired
  // while a scroll event's rAF was still pending, the gate silently
  // dropped it -- the exact "one event that would have self-corrected
  // this gets swallowed" bug this whole effect exists to avoid, just for
  // a different reason than the ones above. Confirmed via Playwright: on
  // WebKit specifically (mobile Safari's real rendering engine, not just
  // Chromium's mobile emulation), a refresh mid-scroll reproduced this
  // ~70% of the time. NavbarClient.tsx's equivalent measurement already
  // calls its version of measure() directly with no such gate and proved
  // reliable across the same scenario in the same testing -- this now
  // matches that, and removes the inconsistency between two components
  // that are supposed to mirror each other. measure() itself is cheap (a
  // couple of getBoundingClientRect() reads), so there's no real
  // performance case for coalescing it in the first place.
  useEffect(() => {
    if (!isHome) return;

    function measure() {
      const header = document.querySelector("header");
      if (header) setHeaderBottom(header.getBoundingClientRect().bottom);
      const sentinel = document.getElementById("hero-sentinel");
      if (sentinel) setVisible(sentinel.getBoundingClientRect().top < 0);
    }

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
    };
  }, [isHome]);

  if (!isHome) {
    return (
      <div className="py-4 print:hidden">
        <SiteSearchBar />
      </div>
    );
  }

  return (
    <div
      style={{ top: headerBottom }}
      className={`fixed inset-x-0 z-[var(--z-sticky-bar)] py-4 print:hidden ${
        reducedMotion ? "" : "transition-[opacity,transform] duration-300 ease-in-out"
      } ${visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
      aria-hidden={!visible}
      // Hidden-but-still-mounted (for the fade-out transition) must not
      // leave its input/button focusable — aria-hidden alone doesn't
      // remove them from the tab order, inert does.
      inert={!visible ? true : undefined}
    >
      {/* compact only changes SiteSearchBar's unprefixed (<640px) classes —
          identical to the default bar at sm:+ widths, so this is scoped to
          mobile without a separate viewport check. */}
      <SiteSearchBar compact />
    </div>
  );
}
