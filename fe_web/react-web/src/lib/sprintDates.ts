/** Helpers for sprint dates, which the backend sends as plain 'YYYY-MM-DD' strings (or null). */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Parse 'YYYY-MM-DD' as a LOCAL date (new Date('YYYY-MM-DD') is UTC and can shift a day). */
export function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = ISO_DATE.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Local date → 'YYYY-MM-DD'. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' shifted by `days` (local calendar). */
export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value) ?? new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** "13 Oct" (adds the year when it differs from the current year). */
export function formatShortDate(value?: string | null, now: Date = new Date()): string {
  const date = parseIsoDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** "13 Oct – 27 Oct", "Starts 13 Oct", "Ends 27 Oct" or '' when no dates are set. */
export function formatSprintDateRange(startDate?: string | null, endDate?: string | null): string {
  const start = formatShortDate(startDate);
  const end = formatShortDate(endDate);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return '';
}

/** Whole days between two 'YYYY-MM-DD' dates, or null when either is missing. */
export function daysBetween(startDate?: string | null, endDate?: string | null): number | null {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
