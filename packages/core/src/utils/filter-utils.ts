/**
 * Filter utility functions
 * Shared utilities for handling date filters, month navigation, etc.
 */

/**
 * Month and year result from navigation
 */
export interface MonthYear {
  month: number; // 1-12
  year: number;
}

/**
 * Navigate to the previous or next month
 * Handles year transitions automatically
 *
 * @param currentYear - Current year
 * @param currentMonth - Current month (1-12)
 * @param direction - Direction to navigate ('prev' or 'next')
 * @returns New month and year
 *
 * @example
 * // Navigate from December 2024 to January 2025
 * navigateMonth(2024, 12, 'next');
 * // Returns: { month: 1, year: 2025 }
 *
 * @example
 * // Navigate from January 2024 to December 2023
 * navigateMonth(2024, 1, 'prev');
 * // Returns: { month: 12, year: 2023 }
 */
export function navigateMonth(
  currentYear: number,
  currentMonth: number,
  direction: 'prev' | 'next',
): MonthYear {
  if (direction === 'prev') {
    if (currentMonth === 1) {
      return { month: 12, year: currentYear - 1 };
    }
    return { month: currentMonth - 1, year: currentYear };
  } else {
    if (currentMonth === 12) {
      return { month: 1, year: currentYear + 1 };
    }
    return { month: currentMonth + 1, year: currentYear };
  }
}

/**
 * Get a formatted month label for display
 * @param month - Month number (1-12)
 * @param year - Year
 * @param format - Format style ('long' or 'short')
 * @returns Formatted month label (e.g., "January 2024" or "Jan 2024")
 *
 * @example
 * getMonthLabel(1, 2024, 'long');
 * // Returns: "January 2024"
 *
 * @example
 * getMonthLabel(1, 2024, 'short');
 * // Returns: "Jan 2024"
 */
export function getMonthLabel(month: number, year: number, format: 'long' | 'short' = 'long'): string {
  const monthNames = {
    long: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };

  const monthName = monthNames[format][month - 1];
  return `${monthName} ${year}`;
}

/**
 * Get the first and last day of a month in YYYY-MM-DD format
 * Useful for creating date range filters
 *
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Object with startDate and endDate strings
 *
 * @example
 * getMonthDateRange(2024, 1);
 * // Returns: { startDate: '2024-01-01', endDate: '2024-01-31' }
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const lastDay = new Date(year, month, 0).getDate();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate };
}

/**
 * Get current month and year
 * @returns Current month (1-12) and year
 *
 * @example
 * getCurrentMonthYear();
 * // Returns: { month: 2, year: 2026 } (if current date is Feb 2026)
 */
export function getCurrentMonthYear(): MonthYear {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // getMonth() returns 0-11
    year: now.getFullYear(),
  };
}
