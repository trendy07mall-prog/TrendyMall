// Shared by the server page and the client table/panel, so the badge shown
// next to a name and the "going quiet" figure in the stats strip can never
// disagree about what the words mean.

// A customer is "going quiet" once their most recent order is this old.
// Deliberately a constant rather than a per-customer flag: it's a view over
// order dates, so it re-evaluates itself the moment they order again --
// nothing needs to be cleared or recalculated when that happens.
export const GOING_QUIET_DAYS = 60;

// Lifetime spend at or above this earns the VIP badge. A single threshold,
// not a per-customer marker, for the same reason: it follows the data.
// LKR, matching orders.total.
export const VIP_TOTAL_SPENT = 50_000;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / DAY_MS);
}

export function isGoingQuiet(lastOrderAt: string, now?: number): boolean {
  return daysSince(lastOrderAt, now) >= GOING_QUIET_DAYS;
}

export function isVip(totalSpent: number): boolean {
  return totalSpent >= VIP_TOTAL_SPENT;
}

// "22 days ago" under the absolute date in the Last order column. Kept
// coarse on purpose -- this sits beside the real date, so it only has to
// convey recency at a glance, not precision.
export function relativeTime(iso: string, now: number = Date.now()): string {
  const days = daysSince(iso, now);
  if (days < 0) return "just now";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

// Up to two letters from the name, for the avatar. Falls back to the email
// so a customer whose name is somehow blank still gets a readable circle
// rather than an empty one.
export function initialsOf(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// One row of the customers list. Derived entirely from orders (see
// app/admin/customers/page.tsx) -- there is no customers table, and this
// ticket deliberately did not introduce one.
export interface CustomerSummary {
  userId: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
}
