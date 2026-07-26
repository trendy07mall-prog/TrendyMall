const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

// Matches the shipping policy copy in app/shipping/page.tsx: standard
// delivery is 3-5 business days, Sundays excluded.
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) remaining -= 1;
  }
  return result;
}

export function getEstimatedDeliveryRange(
  from: Date = new Date(),
  minDays = 3,
  maxDays = 5,
): { start: Date; end: Date; label: string } {
  const start = addBusinessDays(from, minDays);
  const end = addBusinessDays(from, maxDays);
  const label = `Get it by ${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
  return { start, end, label };
}
