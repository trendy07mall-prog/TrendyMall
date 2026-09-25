// Timestamps are stored in UTC (timestamptz) and that is correct --
// nothing here changes storage. What was wrong is the DISPLAY: dates were
// formatted with toLocaleString()/toLocaleDateString() without a timeZone,
// which means "use whatever zone the machine running this code happens to
// be in".
//
// That machine is not the same on every page. On Vercel the server runs in
// UTC, so anything server-rendered showed times 5h30m behind Sri Lanka --
// order TM-2026-00177, placed at 11:39:44 PM, read as "6:09:44 PM" in the
// admin. The handful of these that run in the browser instead showed the
// VIEWER's zone, which looks correct from Colombo but would show Dubai
// time to someone in Dubai, and makes the same timestamp render
// differently depending on which page you look at it from.
//
// A store trading in one country wants one answer to "when did this
// happen", so these pin the zone explicitly. Same reasoning, and same root
// cause, as the delivery-estimate fix in lib/delivery.ts.
//
// Named for the store rather than for orders because they now back every
// customer- and admin-facing timestamp: orders, the error log, newsletter
// sign-ups and review dates.
//
// The locale is pinned to en-US too, because it was previously implicit
// and therefore had the same split-brain problem -- en-US is what the
// server was already producing, so the admin's view is unchanged apart
// from the hours.
export const STORE_TIME_ZONE = "Asia/Colombo";

const LOCALE = "en-US";

// "9/25/2026, 11:39:44 PM" -- the full stamp, for "Placed ..." lines and
// log entries.
// Matches what a bare toLocaleString() used to produce, in the right zone.
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

// "9/25/2026" -- date only, for list rows and documents.
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

// "Sep 25, 11:39 PM" -- the compact stamp used in the admin orders table
// and the status timeline, where the year is implied by context.
const stampFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STORE_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// "Sep 25, 2026, 11:39 PM" -- the same, plus the year, for finance tables
// that span more than one year.
const stampWithYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STORE_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatStoreDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatStoreDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatStoreStamp(iso: string): string {
  return stampFormatter.format(new Date(iso));
}

export function formatStoreStampWithYear(iso: string): string {
  return stampWithYearFormatter.format(new Date(iso));
}
