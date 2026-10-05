import Link from "next/link";
import { REVIEW_FILTERS, type ReviewCounts, type ReviewFilter } from "@/lib/admin/reviews-query";

// Tabs and search for the Reviews page.
//
// Both are URL parameters, not React state, so this stays a Server
// Component: the filtering happens on the server, a filtered view can be
// bookmarked or sent to someone, and the back button behaves. Same
// approach as ProductStatusTabs.
//
// The search box is a plain GET form -- no JavaScript, no debounce, no
// controlled input to keep in sync. Submitting navigates.
export function ReviewFilters({
  basePath,
  filter,
  query,
  counts,
}: {
  basePath: string;
  filter: ReviewFilter;
  query: string;
  counts: ReviewCounts;
}) {
  const countFor: Record<ReviewFilter, number> = {
    all: counts.total,
    "needs-reply": counts.needsReply,
    pending: counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
  };

  // Built from parts rather than by editing a finished URL string -- the
  // "clear search" link only differs by one parameter, and doing that with
  // a regex over a query string is how a stray & or ? gets left behind.
  const href = (value: ReviewFilter, keepQuery = true) => {
    const params = new URLSearchParams();
    if (value !== "all") params.set("filter", value);
    // The search survives a tab change -- switching tab while looking for
    // something should narrow the same search, not throw it away.
    if (keepQuery && query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {REVIEW_FILTERS.map((tab) => {
          const isActive = filter === tab.value;
          return (
            <Link
              key={tab.value}
              href={href(tab.value)}
              className={`transition-brand shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ${
                isActive
                  ? "border-[#0F2D52] bg-[#0F2D52] text-white"
                  : "border-[var(--border)] text-[var(--foreground)] hover:bg-black/5"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${isActive ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}>
                {countFor[tab.value]}
              </span>
            </Link>
          );
        })}
      </div>

      <form method="get" action={basePath} className="flex gap-2 lg:shrink-0">
        {/* Keeps the current tab when a search is submitted. */}
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search reviews, customers, products…"
          className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-[var(--border)] px-3 py-1.5 text-sm focus:border-[#0F2D52] focus:outline-none lg:w-72"
        />
        <button
          type="submit"
          className="transition-brand shrink-0 rounded-[var(--radius-btn)] bg-[#111111] px-4 py-1.5 text-sm font-semibold text-white hover:bg-black/80"
        >
          Search
        </button>
        {query.trim() && (
          <Link
            href={href(filter, false)}
            className="transition-brand shrink-0 rounded-[var(--radius-btn)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-black/5"
          >
            Clear
          </Link>
        )}
      </form>
    </div>
  );
}
