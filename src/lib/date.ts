// All "day" values in the app are plain "YYYY-MM-DD" strings in the user's
// local time zone. Never use toISOString() for them: it converts to UTC and
// shifts the date around midnight and on daylight-saving changes.

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's (or the given moment's) date in the device's local time zone. */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

/** Adds whole days to a "YYYY-MM-DD" string (DST-safe: calculated in UTC). */
export function addDays(dateString: string, days: number): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(
    utc.getUTCDate()
  )}`;
}

/** Human-readable label for a "YYYY-MM-DD" string, e.g. "Wednesday 18 November". */
export function formatDateLabel(
  dateString: string,
  locale = "en-GB"
): string {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
