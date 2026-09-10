/** Date/time formatting. Everything the dashboard shows is Sydney-local. */

const SYDNEY = "Australia/Sydney";

/** "Mon" */
export function weekdayShort(isoDate: string): string {
  return new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: SYDNEY }).format(
    parseISODate(isoDate),
  );
}

/** "14 Sep" */
export function dayMonth(isoDate: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: SYDNEY,
  }).format(parseISODate(isoDate));
}

/** "Sat 18 Oct 2026" */
export function fullDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: SYDNEY,
  }).format(parseISODate(isoDate));
}

/** "12:03 pm, 10 Sep" */
export function timestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    hour12: true,
    timeZone: SYDNEY,
  }).format(new Date(iso));
}

/** Whole hours between `iso` and now (>= 0). */
export function hoursSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 3_600_000));
}

export function relativeAge(iso: string): string {
  const h = hoursSince(iso);
  if (h < 1) return "less than an hour ago";
  if (h === 1) return "1 hour ago";
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

// Treat a bare ISO date as midday Sydney so weekday/day formatting can't slip
// across a date boundary due to the running machine's timezone.
function parseISODate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+10:00`);
}
