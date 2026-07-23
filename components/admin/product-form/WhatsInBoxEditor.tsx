"use client";

import { useState } from "react";

const inputClass =
  "flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function WhatsInBoxEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const item = draft.trim();
    if (!item) return;
    onChange([...value, item]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">What&apos;s in the box</label>
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((item, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <span className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2">
                {item}
              </span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-xs text-[var(--muted)] underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          placeholder="e.g. Charging cable"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          className={inputClass}
        />
        <button
          type="button"
          onClick={addItem}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          Add
        </button>
      </div>
    </div>
  );
}
