"use client";

import { useState } from "react";
import { EyeIcon } from "@/components/ui/Icon";
import { QuickViewModal } from "@/components/product/QuickViewModal";

export function QuickViewButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="transition-brand pointer-events-auto absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-full bg-white/95 py-2 text-xs font-semibold text-[var(--foreground)] opacity-0 shadow-[var(--shadow-card)] group-hover:opacity-100"
      >
        <EyeIcon className="h-3.5 w-3.5" />
        Quick View
      </button>
      {open && <QuickViewModal slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}
