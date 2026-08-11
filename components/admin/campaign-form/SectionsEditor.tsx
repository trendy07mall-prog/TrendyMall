"use client";

import type { SectionDraft } from "@/components/admin/CampaignForm";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Sections</label>
        <button
          type="button"
          onClick={addSection}
          className="text-sm underline"
        >
          + Add section
        </button>
      </div>

      {sections.length === 0 && (
        <p className="text-xs text-[var(--muted)]">
          Optional — group products into named sections (e.g. &quot;Under Rs 1,000&quot;). Items
          with no section render together.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sections.map((section, index) => (
          <div
            key={section.clientKey}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-2"
          >
            <input
              type="text"
              value={section.name}
              onChange={(e) => updateSection(section.clientKey, { name: e.target.value })}
              placeholder="Section name"
              className={`${inputClass} flex-1`}
            />
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <input
                type="checkbox"
                checked={section.isActive}
                onChange={(e) => updateSection(section.clientKey, { isActive: e.target.checked })}
              />
              Active
            </label>
            <button
              type="button"
              aria-label="Move section earlier"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className="px-1 text-sm disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Move section later"
              disabled={index === sections.length - 1}
              onClick={() => move(index, 1)}
              className="px-1 text-sm disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="Remove section"
              onClick={() => removeSection(section.clientKey)}
              className="px-1 text-sm text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
