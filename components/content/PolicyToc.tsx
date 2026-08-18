import type { PolicyTocEntry } from "@/lib/policy-toc";

// Same lg:sticky lg:top-6 lg:w-{N} lg:shrink-0 convention
// SettingsSidebar.tsx/FinanceSidebar.tsx already use for admin section
// navs -- plain anchor links, no client JS needed (native #hash scrolling
// is keyboard-navigable and works without hydration).
export function PolicyToc({ toc }: { toc: PolicyTocEntry[] }) {
  if (toc.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="lg:sticky lg:top-6 lg:w-64 lg:shrink-0"
    >
      <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        On this page
      </p>
      <ul className="mt-3 flex flex-col gap-1 border-l border-[var(--border)]">
        {toc.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="block min-h-11 border-l-2 border-transparent py-2 pl-4 text-sm text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
