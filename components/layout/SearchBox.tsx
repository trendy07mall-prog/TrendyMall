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
      className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 transition-all duration-200 focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[var(--foreground)]/10"
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
        // (focus-within above).
        className="w-36 border-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)] focus:outline-none focus:ring-0 sm:w-48"
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
