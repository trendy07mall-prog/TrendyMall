"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Category } from "@/types";

// A searchable replacement for the category <select>. Strictly a component
// swap: the value it reports is the same category id string the <select>
// put in FormData, including the "__new__" sentinel, so resolveCategoryId
// on the server is untouched.
//
// The list arrives already flattened depth-first by the page
// (buildCategoryTree -> flattenCategoryTree), which is what lets both the
// "group under the top-level ancestor" panel and the breadcrumb chip be
// derived from a flat array.

function ancestorsOf(category: Category, byId: Map<string, Category>): Category[] {
  const chain: Category[] = [];
  let current: Category | undefined = category;
  // Guarded by ids already seen, so a cycle in the data (a parent_id
  // pointing back down its own chain) can't spin here forever.
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}

// Splits a label around the first case-insensitive occurrence of the query
// so only the matched run is highlighted, not the whole name.
function highlight(label: string, query: string) {
  if (!query) return label;
  const at = label.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return label;
  return (
    <>
      {label.slice(0, at)}
      <mark className="bg-transparent font-semibold text-[var(--pf-highlight)]">
        {label.slice(at, at + query.length)}
      </mark>
      {label.slice(at + query.length)}
    </>
  );
}

export function CategoryCombobox({
  categories,
  value,
  onChange,
  newCategoryValue,
}: {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  newCategoryValue: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // The highlighted row is stored with the query it was chosen under, so
  // editing the search text resets the highlight by simply no longer
  // matching -- no effect needed to clear it. A null index means "nothing
  // highlighted yet", which is distinct from "highlighting row 0": the
  // first ArrowDown has to land ON the first result rather than skip past
  // it to the second.
  const [active, setActive] = useState<{ query: string; index: number | null }>({
    query: "",
    index: null,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const domId = useId();

  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  );

  const selected = value && value !== newCategoryValue ? byId.get(value) : undefined;
  const isNew = value === newCategoryValue;
  const breadcrumb = selected ? ancestorsOf(selected, byId) : [];

  // Grouped by top-level ancestor, preserving the depth-first order the
  // page already established within each group.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = categories.filter((c) => !q || c.name.toLowerCase().includes(q));
    const out: { label: string; items: Category[] }[] = [];
    for (const category of matches) {
      const label = ancestorsOf(category, byId)[0]?.name ?? "Categories";
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(category);
      else out.push({ label, items: [category] });
    }
    return out;
  }, [categories, byId, query]);

  // Flat view of what the panel renders, so the arrow keys can walk it
  // without caring where the group boundaries fall. "Add new" is always
  // the final row.
  const options = useMemo(
    () => [...groups.flatMap((g) => g.items.map((c) => c.id)), newCategoryValue],
    [groups, newCategoryValue],
  );

  const highlighted = active.query === query ? active.index : null;
  // What the panel draws and what Enter commits: the first row until the
  // admin moves off it.
  const activeIndex = highlighted ?? 0;
  const setActiveIndex = (index: number) => setActive({ query, index });

  // Close on an outside pointer press, so the panel never sits open over
  // the rest of the form.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function commit(categoryId: string) {
    onChange(categoryId);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
    // Focus goes back to the search box so clearing flows straight into
    // picking a replacement, keyboard included. The input only mounts once
    // the chip is gone, hence the deferral to after this render commits.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      // From "nothing highlighted", the arrows enter the list at its near
      // end rather than stepping off the implicit first row.
      if (highlighted === null) {
        setActiveIndex(event.key === "ArrowDown" ? 0 : options.length - 1);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((highlighted + step + options.length) % options.length);
      return;
    }
    if (event.key === "Enter") {
      // Swallowed only while the panel is open with something highlighted;
      // otherwise Enter stays the form's own submit key.
      if (open && options[activeIndex]) {
        event.preventDefault();
        commit(options[activeIndex]);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <label htmlFor={domId + "-input"} className="text-sm font-medium">
        Category
      </label>

      {selected || isNew ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--pf-navy)] bg-[var(--pf-navy-soft)] py-1.5 pr-2 pl-3 text-sm text-[var(--pf-navy)]">
            <span className="truncate">
              {isNew
                ? "New category"
                : breadcrumb.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && <span className="mx-1 opacity-50">›</span>}
                      {c.name}
                    </span>
                  ))}
            </span>
            <button
              type="button"
              onClick={clear}
              aria-label="Clear selected category"
              className="shrink-0 rounded-full px-1 leading-none hover:bg-black/10"
            >
              ✕
            </button>
          </span>
        </div>
      ) : (
        <input
          ref={inputRef}
          id={domId + "-input"}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={domId + "-listbox"}
          aria-activedescendant={
            open && options[activeIndex] ? domId + "-opt-" + options[activeIndex] : undefined
          }
          placeholder="Search categories…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--pf-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--pf-navy)]"
        />
      )}

      {open && !selected && !isNew && (
        <div
          id={domId + "-listbox"}
          role="listbox"
          className="absolute top-full left-0 z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--color-card)] py-1 shadow-[0_8px_24px_rgba(15,45,82,0.12)]"
        >
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-[var(--pf-text-3)]">
                {group.label}
              </div>
              {group.items.map((category) => {
                const index = options.indexOf(category.id);
                return (
                  <div
                    key={category.id}
                    id={domId + "-opt-" + category.id}
                    role="option"
                    aria-selected={index === activeIndex}
                    // pointerdown (not click) and preventDefault: the panel
                    // is dismissed by the document pointerdown listener
                    // above, which would otherwise unmount this row before
                    // its click ever fired.
                    onPointerDown={(e) => {
                      e.preventDefault();
                      commit(category.id);
                    }}
                    onPointerEnter={() => setActiveIndex(index)}
                    className={
                      "cursor-pointer px-3 py-1.5 text-sm " +
                      (index === activeIndex ? "bg-[var(--pf-navy-soft)]" : "")
                    }
                    style={{ paddingLeft: 12 + category.depth * 14 + "px" }}
                  >
                    {highlight(category.name, query.trim())}
                  </div>
                );
              })}
            </div>
          ))}

          {groups.length === 0 && (
            <p className="px-3 py-2 text-sm text-[var(--pf-text-2)]">No matching category.</p>
          )}

          <div
            id={domId + "-opt-" + newCategoryValue}
            role="option"
            aria-selected={options[activeIndex] === newCategoryValue}
            onPointerDown={(e) => {
              e.preventDefault();
              commit(newCategoryValue);
            }}
            onPointerEnter={() => setActiveIndex(options.length - 1)}
            className={
              "mt-1 cursor-pointer border-t border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--pf-navy)] " +
              (options[activeIndex] === newCategoryValue ? "bg-[var(--pf-navy-soft)]" : "")
            }
          >
            + Add new category
          </div>
        </div>
      )}

      {/* Carries both the submitted value and the `required` the <select>
          used to enforce, so an empty category is still blocked by the
          browser rather than by a new rule of our own.

          Transparent but genuinely rendered and focusable: Chrome aborts a
          submit with "An invalid form control is not focusable" -- and no
          visible message at all -- when a required control is display:none
          or visibility:hidden. Sized 1px at the bottom edge of the field so
          the native bubble still points at the combobox. */}
      <input
        type="text"
        name="categoryId"
        value={value}
        required
        tabIndex={-1}
        aria-hidden="true"
        // Deliberately NOT readOnly: a readonly control is barred from
        // constraint validation, which silently turned `required` off and
        // moved the empty-category rejection from the browser to the
        // server. It is unreachable anyway -- transparent, out of the tab
        // order and pointer-events-none -- so the no-op onChange is only
        // here to keep React from treating it as uncontrolled.
        onChange={() => {}}
        onFocus={() => inputRef.current?.focus()}
        className="pointer-events-none absolute bottom-0 left-3 h-px w-px opacity-0"
      />
    </div>
  );
}
