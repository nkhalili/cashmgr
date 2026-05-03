import { describe, expect, it } from 'vitest';
import {
  navigateMonth,
  getMonthLabel,
  getMonthDateRange,
  getCurrentMonthYear,
} from '../filter-utils';

describe('navigateMonth', () => {
  it('should navigate to previous month within same year', () => {
    const result = navigateMonth(2024, 6, 'prev');

    expect(result).toEqual({ month: 5, year: 2024 });
  });

  it('should navigate to next month within same year', () => {
    const result = navigateMonth(2024, 6, 'next');

    expect(result).toEqual({ month: 7, year: 2024 });
  });

  it('should navigate from January to December of previous year', () => {
    const result = navigateMonth(2024, 1, 'prev');

    expect(result).toEqual({ month: 12, year: 2023 });
  });

  it('should navigate from December to January of next year', () => {
    const result = navigateMonth(2024, 12, 'next');

    expect(result).toEqual({ month: 1, year: 2025 });
  });

  it('should handle year transitions correctly', () => {
    // Test multiple year transitions
    let current = { year: 2024, month: 11 };

    // Nov -> Dec
    current = navigateMonth(current.year, current.month, 'next');
    expect(current).toEqual({ month: 12, year: 2024 });

    // Dec -> Jan (new year)
    current = navigateMonth(current.year, current.month, 'next');
    expect(current).toEqual({ month: 1, year: 2025 });

    // Jan -> Dec (previous year)
    current = navigateMonth(current.year, current.month, 'prev');
    expect(current).toEqual({ month: 12, year: 2024 });
  });
});

describe('getMonthLabel', () => {
  it('should format month label in long format', () => {
    expect(getMonthLabel(1, 2024, 'long')).toBe('January 2024');
    expect(getMonthLabel(6, 2024, 'long')).toBe('June 2024');
    expect(getMonthLabel(12, 2024, 'long')).toBe('December 2024');
  });

  it('should format month label in short format', () => {
    expect(getMonthLabel(1, 2024, 'short')).toBe('Jan 2024');
    expect(getMonthLabel(6, 2024, 'short')).toBe('Jun 2024');
    expect(getMonthLabel(12, 2024, 'short')).toBe('Dec 2024');
  });

  it('should default to long format', () => {
    expect(getMonthLabel(3, 2024)).toBe('March 2024');
  });

  it('should handle all 12 months correctly', () => {
    const longMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    longMonths.forEach((monthName, index) => {
      const month = index + 1;
      expect(getMonthLabel(month, 2024, 'long')).toBe(`${monthName} 2024`);
    });
  });
});

describe('getMonthDateRange', () => {
  it('should return correct date range for January (31 days)', () => {
    const result = getMonthDateRange(2024, 1);

    expect(result).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });
  });

  it('should return correct date range for February in leap year (29 days)', () => {
    const result = getMonthDateRange(2024, 2);

    expect(result).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
  });

  it('should return correct date range for February in non-leap year (28 days)', () => {
    const result = getMonthDateRange(2023, 2);

    expect(result).toEqual({
      startDate: '2023-02-01',
      endDate: '2023-02-28',
    });
  });

  it('should return correct date range for April (30 days)', () => {
    const result = getMonthDateRange(2024, 4);

    expect(result).toEqual({
      startDate: '2024-04-01',
      endDate: '2024-04-30',
    });
  });

  it('should pad month and day with zeros', () => {
    const result = getMonthDateRange(2024, 3);

    expect(result.startDate).toBe('2024-03-01');
    expect(result.endDate).toBe('2024-03-31');
  });

  it('should handle all months correctly', () => {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 2024 is leap year

    daysInMonth.forEach((days, index) => {
      const month = index + 1;
      const result = getMonthDateRange(2024, month);
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(days).padStart(2, '0');

      expect(result.startDate).toBe(`2024-${monthStr}-01`);
      expect(result.endDate).toBe(`2024-${monthStr}-${dayStr}`);
    });
  });
});

describe('getCurrentMonthYear', () => {
  it('should return current month and year', () => {
    const now = new Date();
    const result = getCurrentMonthYear();

    expect(result.month).toBe(now.getMonth() + 1);
    expect(result.year).toBe(now.getFullYear());
  });

  it('should return month between 1 and 12', () => {
    const result = getCurrentMonthYear();

    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });

  it('should return a valid year', () => {
    const result = getCurrentMonthYear();

    expect(result.year).toBeGreaterThan(2020);
    expect(result.year).toBeLessThan(2100);
  });
});
