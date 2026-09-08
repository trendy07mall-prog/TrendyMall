"use client";

import { useEffect, useRef, useState } from "react";

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Replaces Framer Motion's whileInView + viewport={{ once, margin }}.
  // Same trigger semantics: fire once, 80px before the element reaches the
  // viewport. The animation itself is the .fade-in-target CSS class in
  // globals.css, which also handles prefers-reduced-motion -- so unlike
  // the old useReducedMotion() call, nothing about reduced motion depends
  // on JS running at all.
  //
  // Server and client render identical markup (the element always starts
  // with .fade-in-target), which is what the previous implementation was
  // careful about too: branching to a different element on the client is a
  // hydration mismatch, and React leaves the mismatched opacity:0 stuck
  // permanently -- strictly worse than the animation it was avoiding.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Without IntersectionObserver there is no trigger, so reveal
    // immediately rather than leaving the content invisible forever.
    if (typeof IntersectionObserver === "undefined") {
      // Same "read an environment capability that can't be known during
      // server render" case the rule is disabled for elsewhere in this
      // codebase (SlideCarousel's matchMedia, CartContext's localStorage).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect(); // `once`
          }
        }
      },
      { rootMargin: "-80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-in-target${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? ({ "--fade-in-delay": `${delay * 1000}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
