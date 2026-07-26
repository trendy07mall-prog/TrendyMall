"use client";

import { useViewMode } from "@/context/ViewModeContext";
import { GridIcon, ListIcon } from "@/components/ui/Icon";

export function ViewToggle() {
  const { view, setView } = useViewMode();

  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--border)] p-0.5">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        onClick={() => setView("grid")}
        className={`transition-brand flex h-11 w-11 items-center justify-center rounded-[calc(var(--radius-btn)-2px)] ${
          view === "grid"
            ? "bg-[var(--foreground)] text-white"
            : "text-[var(--muted)] hover:bg-black/5"
        }`}
      >
        <GridIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={view === "list"}
        onClick={() => setView("list")}
        className={`transition-brand flex h-11 w-11 items-center justify-center rounded-[calc(var(--radius-btn)-2px)] ${
          view === "list"
            ? "bg-[var(--foreground)] text-white"
            : "text-[var(--muted)] hover:bg-black/5"
        }`}
      >
        <ListIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
