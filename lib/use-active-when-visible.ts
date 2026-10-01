"use client";

import { useCallback, useEffect, useState } from "react";

// "Is this element on screen, and has the page finished settling?"
//
// Used to decide whether a carousel should be auto-advancing. Two
// conditions, both of which matter on a phone:
//
//   * ON SCREEN -- a carousel scrolled past is animating something
//     nobody can see, and every advance is a scroll, a repaint and a
//     fresh set of lazy image requests. The homepage has several.
//
//   * PAGE IDLE -- auto-advance must not start while the browser is
//     still busy with first paint and hydration. Starting a timer
//     during that window is exactly what pushes work into the blocking
//     period the TBT score measures.
//
// Returns a callback ref to put on the element, and whether it should
// currently be doing work.
export function useActiveWhenVisible(): {
  ref: (node: HTMLElement | null) => void;
  active: boolean;
} {
  const [node, setNode] = useState<HTMLElement | null>(null);
  // Starts true where IntersectionObserver is unavailable, so such a
  // browser behaves exactly as it did before this hook existed.
  const supported = typeof IntersectionObserver !== "undefined";
  const [visible, setVisible] = useState(!supported);
  const [idle, setIdle] = useState(false);
  const ref = useCallback((next: HTMLElement | null) => setNode(next), []);

  useEffect(() => {
    // requestIdleCallback is not in Safari; a timeout is the honest
    // fallback and still keeps the timer out of the first paint.
    if (typeof window === "undefined") return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const handle = w.requestIdleCallback(() => setIdle(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(() => setIdle(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!node) return;
    // No IntersectionObserver (a very old browser): treat it as visible,
    // which is what it did before this existed. Derived rather than set
    // in the effect body -- `supported` is a constant for the lifetime
    // of the page, so it belongs in the render path, not in a state
    // write that would cascade a second render.
    if (!supported) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, supported]);

  return { ref, active: visible && idle };
}
