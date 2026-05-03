/**
 * Date Validation Utilities
 *
 * Shared validation logic for date inputs across web and mobile platforms.
 * Supports multiple date formats and auto-correction to YYYY-MM-DD format.
 */

export interface DateValidationResult {
  isValid: boolean;
  correctedValue: string;
  originalFormat?: 'iso' | 'us' | 'eu';
}

/**
 * Validates a date and checks if it's a real calendar date
 * Handles leap years, month lengths, etc.
 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  // Basic range checks
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Use Date object to verify the date is actually valid
  // (e.g., February 30 would fail this check)
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Formats a date to YYYY-MM-DD string
 */
function formatToISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Validates and auto-corrects a date string to YYYY-MM-DD format
 *
 * Supported formats:
 * - YYYY-MM-DD (ISO 8601)
 * - MM/DD/YYYY (US format)
 * - DD.MM.YYYY (European format)
 *
 * @param input - Date string in any supported format
 * @returns Corrected date in YYYY-MM-DD format, or original input if invalid
 *
 * @example
 * validateAndCorrectDate('2024-1-5')   // Returns '2024-01-05'
 * validateAndCorrectDate('1/5/2024')   // Returns '2024-01-05'
 * validateAndCorrectDate('5.1.2024')   // Returns '2024-01-05'
 * validateAndCorrectDate('invalid')    // Returns 'invalid'
 */
export function validateAndCorrectDate(input: string): string {
  if (!input) return '';

  // Try to parse as YYYY-MM-DD (ISO 8601)
  const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isValidCalendarDate(year, month, day)) {
      return formatToISO(year, month, day);
    }
  }

  // Try to parse as MM/DD/YYYY or M/D/YYYY (US format)
  const usMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, monthStr, dayStr, yearStr] = usMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isValidCalendarDate(year, month, day)) {
      return formatToISO(year, month, day);
    }
  }

  // Try to parse as DD.MM.YYYY or D.M.YYYY (European format)
  const euMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) {
    const [, dayStr, monthStr, yearStr] = euMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isValidCalendarDate(year, month, day)) {
      return formatToISO(year, month, day);
    }
  }

  // Return original if can't parse
  return input;
}

/**
 * Validates a date string and returns detailed validation result
 *
 * @param input - Date string in any supported format
 * @returns Validation result with corrected value and format info
 *
 * @example
 * validateDate('2024-01-05')  // { isValid: true, correctedValue: '2024-01-05', originalFormat: 'iso' }
 * validateDate('1/5/2024')    // { isValid: true, correctedValue: '2024-01-05', originalFormat: 'us' }
 * validateDate('invalid')     // { isValid: false, correctedValue: 'invalid' }
 */
export function validateDate(input: string): DateValidationResult {
  if (!input) {
    return { isValid: false, correctedValue: '' };
  }

  // Check ISO format
  const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isValidCalendarDate(year, month, day)) {
      return {
        isValid: true,
        correctedValue: formatToISO(year, month, day),
        originalFormat: 'iso',
      };
    }
  }

  // Check US format
  const usMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, monthStr, dayStr, yearStr] = usMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isValidCalendarDate(year, month, day)) {
      return {
        isValid: true,
        correctedValue: formatToISO(year, month, day),
        originalFormat: 'us',
      };
    }
  }

  // Check EU format
  const euMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) {
    const [, dayStr, monthStr, yearStr] = euMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isValidCalendarDate(year, month, day)) {
      return {
        isValid: true,
        correctedValue: formatToISO(year, month, day),
        originalFormat: 'eu',
      };
    }
  }

  // Invalid date
  return { isValid: false, correctedValue: input };
}

/**
 * Checks if a date string is in valid YYYY-MM-DD format
 *
 * @param date - Date string to check
 * @returns True if valid ISO format, false otherwise
 */
export function isValidISODate(date: string): boolean {
  if (!date) return false;

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  return isValidCalendarDate(year, month, day);
}
