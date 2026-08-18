import Link from "next/link";

// Plain Links carrying the full current search-param set forward (minus
// the one param this control owns) -- same query-param-driven filtering
// convention /admin/orders and /admin/products already use (?tab=,
// ?stockStatus=), so switching one range control never resets the other,
// and no client-side state/JS is needed at all.
export function RangeTabs<T extends string>({
  options,
  activeValue,
  paramName,
  currentParams,
  basePath = "/admin",
}: {
  options: { value: T; label: string }[];
  activeValue: T;
  paramName: string;
  currentParams: Record<string, string | undefined>;
  basePath?: string;
}) {
  return (
    <div className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-1">
      {options.map((opt) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(currentParams)) {
          if (value && key !== paramName) params.set(key, value);
        }
        params.set(paramName, opt.value);
        const isActive = activeValue === opt.value;
        return (
          <Link
            key={opt.value}
            href={`${basePath}?${params.toString()}`}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-brand ${
              isActive ? "bg-[#0F2D52] text-white" : "text-[var(--color-text-secondary)] hover:bg-black/5"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
