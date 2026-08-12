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

// Real store hours, "Daily, 10 AM - 4 PM" Sri Lanka time -- computed
// against the real current time (never hardcoded "open"), same
// shift-then-read-UTC-components technique as utcIsoToSriLankaInputValue,
// so this is correct regardless of what timezone the server process itself
// runs in.
const OPEN_HOUR = 10;
const CLOSE_HOUR = 16;

export function getBusinessHoursStatus(now: Date = new Date()): { isOpen: boolean; label: string } {
  const slHour = new Date(now.getTime() + SRI_LANKA_OFFSET_MS).getUTCHours();
  const isOpen = slHour >= OPEN_HOUR && slHour < CLOSE_HOUR;
  return { isOpen, label: isOpen ? "Open now" : "Opens at 10:00 AM" };
}
