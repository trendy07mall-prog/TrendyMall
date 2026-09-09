"use client";

import { formatPrice } from "@/lib/utils";
import {
  initialsOf,
  isGoingQuiet,
  isVip,
  relativeTime,
  type CustomerSummary,
} from "@/lib/admin/customer-segments";
import { SORT_LABELS, SORT_KEYS, type SortKey, type SortState } from "./customer-sort";

function Avatar({ customer }: { customer: CustomerSummary }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ac-navy-soft)] text-[11px] font-semibold text-[var(--ac-navy)]"
    >
      {initialsOf(customer.name, customer.email)}
    </span>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M2 3h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm0 1.5v.4l6 3.3 6-3.3v-.4H2Zm12 2.1L8.4 9.7a.9.9 0 0 1-.8 0L2 6.6V11.5h12V6.6Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M5.2 1.8a1.2 1.2 0 0 0-1.6-.3L2.4 2.3C1.6 2.8 1.3 3.8 1.7 4.7a17 17 0 0 0 9.6 9.6c.9.4 1.9.1 2.4-.7l.8-1.2a1.2 1.2 0 0 0-.3-1.6l-2-1.4a1.2 1.2 0 0 0-1.5.1l-.8.7a13.4 13.4 0 0 1-4.1-4.1l.7-.8a1.2 1.2 0 0 0 .1-1.5l-1.4-2Z" />
    </svg>
  );
}

// Light gray for "going quiet" and light orange for VIP -- both derived
// from the same order data the row already shows, so neither can go stale
// against it.
function Badges({ customer }: { customer: CustomerSummary }) {
  return (
    <>
      {isVip(customer.totalSpent) && (
        <span className="rounded-full bg-[var(--ac-orange-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ac-orange)]">
          VIP
        </span>
      )}
      {isGoingQuiet(customer.lastOrderAt) && (
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[var(--ac-text-2)]">
          Going quiet
        </span>
      )}
    </>
  );
}

export function CustomersTable({
  customers,
  sort,
  onSortChange,
  onSelect,
}: {
  customers: CustomerSummary[];
  sort: SortState;
  onSortChange: (next: SortState) => void;
  onSelect: (customer: CustomerSummary) => void;
}) {
  // Clicking the active column flips direction; clicking a new one starts
  // at descending, which is the useful end for all three of these (most
  // orders, highest spend, most recent).
  function toggle(key: SortKey) {
    onSortChange(
      sort.key === key
        ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--color-card)]">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            {SORT_KEYS.map((key) => (
              <th key={key} className="px-4 py-3 font-medium" aria-sort={
                sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
              }>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="flex items-center gap-1 hover:text-[var(--ac-navy)]"
                >
                  {SORT_LABELS[key]}
                  <span aria-hidden="true" className="text-[10px] text-[var(--ac-text-3)]">
                    {sort.key === key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.userId}
              // The whole row opens the panel. It is also a real tab stop
              // with Enter/Space, so this isn't a mouse-only affordance --
              // the contact links inside stop propagation so clicking an
              // email still just opens the mail client.
              tabIndex={0}
              role="button"
              aria-label={`Open ${customer.name}`}
              onClick={() => onSelect(customer)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(customer);
                }
              }}
              className="cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--ac-navy-soft)] focus-visible:bg-[var(--ac-navy-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ac-navy)]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar customer={customer} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{customer.name}</span>
                    <Badges customer={customer} />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <a
                  href={`mailto:${customer.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[var(--ac-navy)] hover:underline"
                >
                  <MailIcon />
                  {customer.email}
                </a>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 flex items-center gap-1.5 text-[var(--ac-green)] hover:underline"
                  >
                    <PhoneIcon />
                    {customer.phone}
                  </a>
                )}
              </td>
              <td className="px-4 py-3">{customer.orderCount}</td>
              <td className="px-4 py-3">{formatPrice(customer.totalSpent)}</td>
              <td className="px-4 py-3">
                <div>{new Date(customer.lastOrderAt).toLocaleDateString()}</div>
                <div className="text-xs text-[var(--ac-text-3)]">
                  {relativeTime(customer.lastOrderAt)}
                </div>
              </td>
            </tr>
          ))}

          {customers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-[var(--ac-text-2)]">
                No customers match that search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
