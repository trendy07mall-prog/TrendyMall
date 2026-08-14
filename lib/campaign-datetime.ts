// datetime-local inputs produce a plain "YYYY-MM-DDTHH:mm" string with no
// timezone info. Naively doing `new Date(value).toISOString()` in the
// Server Action would parse those wall-clock numbers using the SERVER
// PROCESS's local timezone -- correct by accident only if the server
// happens to run in Sri Lanka time. Since the whole point of the
// datetime-local field is "this is Sri Lanka time," the offset is applied
// explicitly here instead, so the result is correct regardless of what
// timezone the Node process itself is running in.
export const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// "2026-06-15T12:00" (meant as Sri Lanka time) -> correct UTC ISO string.
export function sriLankaInputToUtcIso(localValue: string): string | null {
  if (!localValue) return null;
  // Appending "Z" makes Date.parse read the wall-clock numbers as UTC,
  // which lets us do the offset subtraction ourselves rather than
  // depend on the host's local timezone.
  const asIfUtcMs = Date.parse(`${localValue}:00Z`);
  if (Number.isNaN(asIfUtcMs)) return null;
  return new Date(asIfUtcMs - SRI_LANKA_OFFSET_MS).toISOString();
}

// UTC ISO string -> "2026-06-15T12:00" for a datetime-local input's
// defaultValue/value, displayed as Sri Lanka time regardless of the
// admin's own browser timezone.
export function utcIsoToSriLankaInputValue(iso: string | null): string {
  if (!iso) return "";
  const shiftedMs = new Date(iso).getTime() + SRI_LANKA_OFFSET_MS;
  return new Date(shiftedMs).toISOString().slice(0, 16);
}

// Fallback only, matching general.business_hours' seeded default -- real
// store hours now live in Settings (lib/data/settings.ts's
// GeneralSettings.businessHours). Computed against the real current time
// (never hardcoded "open"), same shift-then-read-UTC-components technique
// as utcIsoToSriLankaInputValue, so this is correct regardless of what
// timezone the server process itself runs in.
const OPEN_HOUR = 10;
const CLOSE_HOUR = 16;

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:00 ${period}`;
}

// openHour/closeHour default to the fallback constants above so a caller
// that hasn't fetched Settings still works unchanged -- callers that have
// fetched general.business_hours should go through
// getBusinessHoursStatusForWeek below instead, which picks the correct
// day's hours for them.
export function getBusinessHoursStatus(
  now: Date = new Date(),
  openHour: number = OPEN_HOUR,
  closeHour: number = CLOSE_HOUR,
): { isOpen: boolean; label: string } {
  const slHour = new Date(now.getTime() + SRI_LANKA_OFFSET_MS).getUTCHours();
  const isOpen = slHour >= openHour && slHour < closeHour;
  return { isOpen, label: isOpen ? "Open now" : `Opens at ${formatHourLabel(openHour)}` };
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// Settings-backed version of getBusinessHoursStatus -- picks TODAY's entry
// (Sri Lanka time) out of a full business_hours week and checks against
// it, so a per-day schedule (e.g. closed Sundays) is respected rather than
// assuming every day matches OPEN_HOUR/CLOSE_HOUR.
export function getBusinessHoursStatusForWeek(
  businessHours: Record<string, { open: string; close: string; closed: boolean }>,
  now: Date = new Date(),
): { isOpen: boolean; label: string } {
  const slDate = new Date(now.getTime() + SRI_LANKA_OFFSET_MS);
  const today = businessHours[DAY_KEYS[slDate.getUTCDay()]];
  if (!today || today.closed) return { isOpen: false, label: "Closed today" };
  const [openHour] = today.open.split(":").map(Number);
  const [closeHour] = today.close.split(":").map(Number);
  return getBusinessHoursStatus(now, openHour, closeHour);
}

// "Daily, 10:00 AM–4:00 PM" (or a day-varies fallback) from a
// GeneralSettings.businessHours week -- shared by every storefront surface
// that used to hardcode "Daily 10am-4pm" as its own text literal.
export function formatBusinessHoursSummary(
  businessHours: Record<string, { open: string; close: string; closed: boolean }>,
): string {
  const days = Object.values(businessHours);
  if (days.length === 0) return "";
  const [first, ...rest] = days;
  const allSame = rest.every(
    (d) => d.open === first.open && d.close === first.close && d.closed === first.closed,
  );
  if (!allSame) return "Hours vary by day";
  if (first.closed) return "Closed";
  return `Daily, ${to12Hour(first.open)}–${to12Hour(first.close)}`;
}

function to12Hour(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return minuteStr === "00" ? `${twelveHour} ${period}` : `${twelveHour}:${minuteStr} ${period}`;
}
