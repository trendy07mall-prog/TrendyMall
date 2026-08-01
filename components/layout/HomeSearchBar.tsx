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

  useEffect(() => {
    if (!isHome) return;

    // The sentinel mounts as part of the page content, which commits in
    // the same pass as this layout-level component — but a short retry
    // guards against ever observing nothing if that ordering assumption
    // doesn't hold for some route-transition edge case.
    let observer: IntersectionObserver | null = null;
    let attempts = 0;
    let raf = 0;

    function attach() {
      const sentinel = document.getElementById("hero-sentinel");
      if (!sentinel) {
        if (attempts++ < 20) raf = requestAnimationFrame(attach);
        return;
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        },
        { threshold: 0 },
      );
      observer.observe(sentinel);
    }

    attach();
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [isHome]);

  if (!isHome) {
    return (
      <div className="border-b border-[var(--border)] bg-white py-3 print:hidden">
        <SiteSearchBar />
      </div>
    );
  }

  return (
    <div
      // top-[84px] matches the header's real rendered height (20px
      // vertical padding + the 44px icon row is now the tallest flex
      // item, taller than the 40px logo) — was top-20 (80px) before the
      // header icons were bumped to a 44px touch target.
      className={`fixed inset-x-0 top-[84px] z-[var(--z-sticky-bar)] border-b border-[var(--border)] bg-white py-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)] print:hidden ${
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
