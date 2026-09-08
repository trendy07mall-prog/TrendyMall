"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/Icon";

export function OrderSuccessCheck() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div
      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] ${
        reducedMotion ? "" : "success-check-pop"
      }`}
    >
      <CheckIcon className="h-7 w-7" />
    </div>
  );
}
