import type { RecurringFrequency } from '../models/RecurringTransaction';

export function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDayOfWeek(dateStr: string): number {
  const { year, month, day } = parseDate(dateStr);
  return new Date(year, month - 1, day).getDay(); // 0=Sun, 6=Sat
}

function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDate(dateStr);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return formatDateParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function addMonths(dateStr: string, months: number): string {
  const { year, month, day } = parseDate(dateStr);
  const d = new Date(year, month - 1 + months, 1);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(day, maxDay);
  return formatDateParts(d.getFullYear(), d.getMonth() + 1, clampedDay);
}

function lastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return formatDateParts(year, month, lastDay);
}

function diffDays(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  const da = new Date(pa.year, pa.month - 1, pa.day).getTime();
  const db = new Date(pb.year, pb.month - 1, pb.day).getTime();
  return Math.round((da - db) / 86400000);
}

function getNextOccurrence(
  frequency: RecurringFrequency,
  startDate: string,
  currentDate: string,
): string | null {
  switch (frequency) {
    case 'daily':
      return addDays(currentDate, 1);

    case 'weekdays': {
      let next = addDays(currentDate, 1);
      const dow = getDayOfWeek(next);
      if (dow === 0) next = addDays(next, 1); // Sun → Mon
      else if (dow === 6) next = addDays(next, 2); // Sat → Mon
      return next;
    }

    case 'weekends': {
      let next = addDays(currentDate, 1);
      const dow = getDayOfWeek(next);
      if (dow === 0) return next; // Sun
      if (dow === 6) return next; // Sat
      // Find next Sat
      return addDays(next, 6 - dow);
    }

    case 'weekly':
      return addDays(currentDate, 7);

    case 'biweekly':
      return addDays(currentDate, 14);

    case 'every4weeks':
      return addDays(currentDate, 28);

    case 'monthly':
    case 'every6months':
    case 'annually': {
      // Anchor from startDate to preserve original day (e.g. Jan 31 → Mar 31, not Mar 28)
      const step = frequency === 'monthly' ? 1 : frequency === 'every6months' ? 6 : 12;
      const { year: sy, month: sm } = parseDate(startDate);
      const { year: cy, month: cm } = parseDate(currentDate);
      const monthsFromStart = (cy - sy) * 12 + (cm - sm);
      return addMonths(startDate, monthsFromStart + step);
    }

    case 'last_day_of_month': {
      const { year, month } = parseDate(currentDate);
      let nextYear = year;
      let nextMonth = month + 1;
      if (nextMonth > 12) { nextMonth = 1; nextYear++; }
      return lastDayOfMonth(nextYear, nextMonth);
    }

    default:
      return null;
  }
}

function getFirstOccurrenceOnOrAfter(
  frequency: RecurringFrequency,
  startDate: string,
  fromDate: string,
): string | null {
  // For weekly/biweekly/every4weeks, compute via interval from startDate
  if (frequency === 'weekly' || frequency === 'biweekly' || frequency === 'every4weeks') {
    const interval = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 28;
    if (fromDate <= startDate) return startDate;
    const diff = diffDays(fromDate, startDate);
    const k = Math.ceil(diff / interval);
    return addDays(startDate, k * interval);
  }

  // For monthly/every6months/annually, walk from startDate in steps
  if (frequency === 'monthly' || frequency === 'every6months' || frequency === 'annually') {
    const step = frequency === 'monthly' ? 1 : frequency === 'every6months' ? 6 : 12;
    if (fromDate <= startDate) return startDate;
    const { year: sy, month: sm } = parseDate(startDate);
    const { year: fy, month: fm } = parseDate(fromDate);
    const totalMonthsDiff = (fy - sy) * 12 + (fm - sm);
    const k = Math.ceil(totalMonthsDiff / step);
    let candidate = addMonths(startDate, k * step);
    // Ensure we're >= fromDate (addMonths can clamp days)
    while (candidate < fromDate) {
      candidate = addMonths(candidate, step);
    }
    return candidate;
  }

  if (frequency === 'last_day_of_month') {
    if (fromDate <= startDate) return lastDayOfMonth(parseDate(startDate).year, parseDate(startDate).month);
    const { year, month } = parseDate(fromDate);
    // Try last day of fromDate's month
    const candidate = lastDayOfMonth(year, month);
    if (candidate >= fromDate) return candidate;
    // Otherwise use last day of next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return lastDayOfMonth(nextYear, nextMonth);
  }

  // For daily/weekdays/weekends, start from max(startDate, fromDate) and find first valid
  const base = fromDate > startDate ? fromDate : startDate;

  if (frequency === 'daily') return base;

  if (frequency === 'weekdays') {
    const dow = getDayOfWeek(base);
    if (dow >= 1 && dow <= 5) return base;
    if (dow === 6) return addDays(base, 2); // Sat → Mon
    return addDays(base, 1); // Sun → Mon
  }

  if (frequency === 'weekends') {
    const dow = getDayOfWeek(base);
    if (dow === 0 || dow === 6) return base;
    return addDays(base, 6 - dow); // next Sat
  }

  return null;
}

/**
 * Computes all occurrence dates for a recurring transaction that are due between
 * (lastGeneratedDate + 1 day) and today (inclusive), bounded by startDate and endDate.
 *
 * Returns dates in ascending chronological order.
 */
export function getDueOccurrences(
  frequency: RecurringFrequency,
  startDate: string,
  lastGeneratedDate: string | undefined,
  endDate: string | undefined,
  today: string,
): string[] {
  const fromDate = lastGeneratedDate ? addDays(lastGeneratedDate, 1) : startDate;
  const toDate = endDate && endDate < today ? endDate : today;

  if (fromDate > toDate) return [];

  const first = getFirstOccurrenceOnOrAfter(frequency, startDate, fromDate);
  if (!first || first > toDate) return [];

  const results: string[] = [];
  let current: string | null = first;

  while (current !== null && current <= toDate) {
    results.push(current);
    current = getNextOccurrence(frequency, startDate, current);
    if (current === null) break;
  }

  return results;
}
