"use client";

import { useCallback, useEffect, useState } from "react";

// ONE clock for every countdown on the page.
//
// Why this exists: the homepage renders 26 countdowns -- one per
// campaign-joined product card, plus the banners -- and each used to run
// its own setInterval. That is 26 timers waking the main thread every
// second, each causing its own React render, on a phone that is already
// busy. The work is small per timer and considerable in aggregate.
//
// Now there is a single interval for the whole page. Components
// subscribe to it, and it only runs while at least one of them is
// listening -- so a page with no countdowns has no timer at all.
//
// It also ticks on the second boundary rather than 1000ms after mount,
// so every countdown on the page changes digit at the same instant
// instead of drifting apart by fractions of a second.

type Listener = () => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleNextTick() {
  if (timer !== null) return;
  // Land just after the next whole second, so the displayed digits are
  // never a frame behind the real clock.
  const delay = 1000 - (Date.now() % 1000) + 10;
  timer = setTimeout(() => {
    timer = null;
    for (const listener of listeners) listener();
    if (listeners.size > 0) scheduleNextTick();
  }, delay);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  scheduleNextTick();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

// How many milliseconds are left until `targetMs`, recomputed once a
// second -- but only while the element is actually on screen.
//
// A countdown scrolled far below the fold is changing digits nobody can
// read, so it unsubscribes until it comes back into view. Coming back
// recomputes immediately from the real clock, so it is never stale: the
// value is always derived from Date.now(), never counted down by hand.
//
// Returns null until the first client tick. That is deliberate and
// unchanged from the original: rendering a real number during SSR would
// near-guarantee a hydration mismatch, because the server's second and
// the client's second are not the same second.
export function useCountdownRemaining(targetMs: number): {
  remaining: number | null;
  ref: (node: HTMLDivElement | null) => void;
} {
  const [remaining, setRemaining] = useState<number | null>(null);
  // A callback ref held in state, not a plain useRef, because the
  // element does not exist on the first render: the component returns
  // null until the first tick arrives. With a plain ref the effect would
  // run once against a null element, fall back to always-ticking, and
  // the observer would never attach at all. Storing the node in state
  // re-runs the effect the moment it appears.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((next: HTMLDivElement | null) => setNode(next), []);

  useEffect(() => {
    const element = node;
    let unsubscribe: (() => void) | null = null;

    const update = () => setRemaining(targetMs - Date.now());

    const start = () => {
      if (unsubscribe) return;
      update();
      unsubscribe = subscribe(update);
    };
    const stop = () => {
      unsubscribe?.();
      unsubscribe = null;
    };

    // No IntersectionObserver (very old browser, or no element yet):
    // fall back to always ticking, which is what it did before.
    if (!element || typeof IntersectionObserver === "undefined") {
      start();
      return stop;
    }

    // rootMargin so it starts a little before it scrolls into view and
    // is already showing the right time when it arrives.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      stop();
    };
  }, [targetMs, node]);

  return { remaining, ref };
}
