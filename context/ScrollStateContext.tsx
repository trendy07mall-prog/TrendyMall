"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface ScrollStateValue {
  // Mirrors NavbarClient's own historical "stuck" signal exactly (same
  // sentinel technique, same semantics: true once the page has scrolled
  // past the header's natural position, false again only once scrolled
  // all the way back to the top) -- lifted up here so components other
  // than the header itself (the mobile bottom nav, in this case) can react
  // to the SAME scroll-state source without each running their own
  // independent listener. A sticky element's own getBoundingClientRect().top
  // can't be used for this -- once stuck, it reads 0 by definition of
  // position:sticky, which is why a separate non-sticky sentinel (rendered
  // in app/layout.tsx immediately before the header) is still required.
  headerStuck: boolean;
}

const ScrollStateContext = createContext<ScrollStateValue>({ headerStuck: false });

export function ScrollStateProvider({ children }: { children: React.ReactNode }) {
  const [headerStuck, setHeaderStuck] = useState(false);

  // Direct getBoundingClientRect() reads on every scroll/resize/
  // ResizeObserver event, no throttle -- the exact technique
  // NavbarClient.tsx/HomeSearchBar.tsx already proved reliable (a
  // throttled/rAF-gated version was confirmed via Playwright to silently
  // drop events on real WebKit during fast/reload-mid-scroll scenarios).
  // The two nested requestAnimationFrame calls before the first
  // measurement are the same fix for the same AnnouncementBar hydration
  // race NavbarClient's original "stuck" effect needed: AnnouncementBar
  // renders nothing until its own effect flips `hydrated` true, so a
  // measurement taken synchronously on mount could catch the sentinel
  // still sitting at its pre-AnnouncementBar position for one frame.
  useEffect(() => {
    function measure() {
      const sentinel = document.getElementById("header-sticky-sentinel");
      if (sentinel) setHeaderStuck(sentinel.getBoundingClientRect().top < 0);
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <ScrollStateContext.Provider value={{ headerStuck }}>{children}</ScrollStateContext.Provider>
  );
}

export function useScrollState(): ScrollStateValue {
  return useContext(ScrollStateContext);
}
