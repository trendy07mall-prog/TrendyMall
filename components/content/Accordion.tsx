"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/Icon";

export interface AccordionItem {
  question: string;
  answer: string;
}

// idPrefix defaults to "" (empty string), preserving today's exact
// `faq-panel-${index}` ids -- only needed when multiple Accordion
// instances render on the same page (e.g. one per FAQ category), where
// plain numeric ids would otherwise collide across instances.
export function Accordion({ items, idPrefix = "" }: { items: AccordionItem[]; idPrefix?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`faq-panel-${idPrefix}${index}`}
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium"
            >
              {item.question}
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open && (
              <div
                id={`faq-panel-${idPrefix}${index}`}
                className="pb-4 text-sm text-[var(--muted)]"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
