"use client";

import { motion, useReducedMotion } from "framer-motion";

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  // Respects prefers-reduced-motion by zeroing the transition duration/delay
  // once triggered -- NOT by branching to a differently-typed element
  // (e.g. a plain <div> instead of motion.div). That branch looked
  // reasonable but breaks on the server: SSR always renders motion.div's
  // `initial` styles (useReducedMotion() has no matchMedia to read on the
  // server, so it's always null there), so a client-only branch to a plain
  // <div> is a genuine hydration mismatch -- React logs "won't be patched
  // up" and leaves the mismatched opacity:0 styling stuck permanently,
  // which is strictly worse than the animation it was trying to skip.
  // Keeping the same motion.div/initial values on every render keeps
  // server and client output identical, so hydration never mismatches;
  // only the transition (post-hydration behavior) changes.
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
