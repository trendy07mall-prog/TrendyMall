"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/ui/Icon";
import { Accordion, type AccordionItem } from "@/components/content/Accordion";

export interface FaqCategory {
  name: string;
  items: AccordionItem[];
}

// Reuses the existing Accordion component per category (idPrefix keeps
// each instance's DOM ids unique) rather than a second accordion
// implementation. Search is a plain client-side substring filter over
// question+answer text -- no new data source, just narrowing what's
// already been fetched server-side.
export function FaqSearch({ categories }: { categories: FaqCategory[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, query]);

  return (
    <div>
      <div className="relative mx-auto max-w-xl">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions..."
          aria-label="Search frequently asked questions"
          className="min-h-11 w-full rounded-full border border-[var(--border)] bg-white py-3 pr-4 pl-11 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
        />
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-[var(--muted)]">
            No questions match &quot;{query}&quot;. Try a different search, or contact us below.
          </p>
        )}
        {filtered.map((category) => (
          <div key={category.name}>
            <h2 className="font-heading text-lg font-bold">{category.name}</h2>
            <div className="mt-3">
              <Accordion items={category.items} idPrefix={`${category.name}-`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
