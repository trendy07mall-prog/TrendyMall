"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckIcon } from "@/components/ui/Icon";

export function OrderSuccessCheck() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <motion.div
      initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]"
    >
      <CheckIcon className="h-7 w-7" />
    </motion.div>
  );
}
