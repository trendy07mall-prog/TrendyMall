"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { SearchIcon, CloseIcon } from "@/components/ui/Icon";

export function SearchBox() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[rgba(0,0,0,0.08)]"
    >
      <SearchIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      <input
        ref={inputRef}
        type="text"
        enterKeyHint="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        // type="text" (not "search") deliberately — type="search" gets its
        // own native rendering in Chrome/Edge on Windows that survives even
        // appearance-none + outline-none. Ring lives on the wrapper
        // (focus-within above); every focus state on the input itself is
        // explicitly cleared (see globals.css's :focus-visible fix for why
        // that alone wasn't previously enough) plus appearance-none for
        // Safari.
        className="w-36 appearance-none border-none bg-transparent text-sm shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-within:outline-none placeholder:text-[var(--muted)] sm:w-48 [-webkit-tap-highlight-color:transparent]"
      />
      <button
        type="button"
        aria-label="Close search"
        onClick={() => setOpen(false)}
        className="flex h-5 w-5 items-center justify-center text-[var(--muted)]"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </form>
  );
}
