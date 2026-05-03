/**
 * Date utility functions
 */

export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * B-001: Get today's date as YYYY-MM-DD string in local timezone
 * Use this for transaction dates to avoid timezone issues
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * B-001: Format a Date object to YYYY-MM-DD string in local timezone
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * B-001: Get the first day of a month as YYYY-MM-DD string
 */
export function getMonthStartDateString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * B-001: Get the last day of a month as YYYY-MM-DD string
 */
export function getMonthEndDateString(year: number, month: number): string {
  // Get the last day by going to next month's day 0
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * B-001: Get the first day of a year as YYYY-MM-DD string
 */
export function getYearStartDateString(year: number): string {
  return `${year}-01-01`;
}

/**
 * B-001: Get the last day of a year as YYYY-MM-DD string
 */
export function getYearEndDateString(year: number): string {
  return `${year}-12-31`;
}

export function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getEndOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function getStartOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getEndOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/**
 * Format a date for display
 * B-001: Now accepts both timestamps (number) and date strings (YYYY-MM-DD)
 */
export function formatDate(dateInput: number | string, format: string = 'yyyy-MM-dd'): string {
  let date: Date;

  if (typeof dateInput === 'string') {
    // Parse YYYY-MM-DD string using local timezone
    const [year, month, day] = dateInput.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateInput);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}
