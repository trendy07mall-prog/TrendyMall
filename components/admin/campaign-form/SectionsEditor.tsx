"use client";

import type { SectionDraft } from "@/components/admin/CampaignForm";
import { ChevronDownIcon, TrashIcon } from "@/components/ui/Icon";

const inputClass =
  "flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function SectionsEditor({
  sections,
  onChange,
}: {
  sections: SectionDraft[];
  onChange: (next: SectionDraft[]) => void;
}) {
  function addSection() {
    onChange([
      ...sections,
      { clientKey: crypto.randomUUID(), name: "", sortOrder: sections.length, isActive: true },
    ]);
  }

  function updateSection(clientKey: string, patch: Partial<SectionDraft>) {
    onChange(sections.map((s) => (s.clientKey === clientKey ? { ...s, ...patch } : s)));
  }

  function removeSection(clientKey: string) {
    onChange(sections.filter((s) => s.clientKey !== clientKey));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((s, i) => ({ ...s, sortOrder: i })));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Sections</h2>
          <p className="text-sm text-[var(--muted)]">
            Optional — group products into named sections (e.g. &quot;Under Rs 1,000&quot;).
          </p>
        </div>
        <button
          type="button"
          onClick={addSection}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
        >
          + Add section
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {sections.map((section, index) => (
          <div
            key={section.clientKey}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-2.5"
          >
            <input
              type="text"
              value={section.name}
              onChange={(e) => updateSection(section.clientKey, { name: e.target.value })}
              placeholder="Section name"
              className={inputClass}
            />
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-[var(--muted)]">
              <input
                type="checkbox"
                checked={section.isActive}
                onChange={(e) => updateSection(section.clientKey, { isActive: e.target.checked })}
                className="h-4 w-4 accent-indigo-600"
              />
              Active
            </label>
            <button
              type="button"
              aria-label="Move section earlier"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-30"
            >
              <ChevronDownIcon className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Move section later"
              disabled={index === sections.length - 1}
              onClick={() => move(index, 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-30"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Remove section"
              onClick={() => removeSection(section.clientKey)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
