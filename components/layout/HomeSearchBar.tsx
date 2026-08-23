"use client";

import { useEffect, useRef, useState } from "react";
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
  const tickingRef = useRef(false);

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
  // once IO stops calling back. A synchronous rect read on every already-
  // throttled scroll/resize tick this effect already runs doesn't have
  // that failure mode — there's no separate callback to miss.
  useEffect(() => {
    if (!isHome) return;

    function measure() {
      const header = document.querySelector("header");
      if (header) setHeaderBottom(header.getBoundingClientRect().bottom);
      const sentinel = document.getElementById("hero-sentinel");
      if (sentinel) setVisible(sentinel.getBoundingClientRect().top < 0);
      tickingRef.current = false;
    }

    function onScrollOrResize() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
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
      <SiteSearchBar />
    </div>
  );
}
