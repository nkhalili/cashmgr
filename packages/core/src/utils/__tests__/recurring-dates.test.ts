import { describe, it, expect } from 'vitest';
import { getDueOccurrences } from '../recurring-dates';

describe('getDueOccurrences', () => {
  describe('daily', () => {
    it('generates every day between range', () => {
      const result = getDueOccurrences('daily', '2026-01-01', undefined, undefined, '2026-01-05');
      expect(result).toEqual(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05']);
    });

    it('resumes from day after lastGeneratedDate', () => {
      const result = getDueOccurrences('daily', '2026-01-01', '2026-01-03', undefined, '2026-01-05');
      expect(result).toEqual(['2026-01-04', '2026-01-05']);
    });

    it('returns empty when fully caught up', () => {
      const result = getDueOccurrences('daily', '2026-01-01', '2026-01-05', undefined, '2026-01-05');
      expect(result).toEqual([]);
    });

    it('respects endDate', () => {
      const result = getDueOccurrences('daily', '2026-01-01', undefined, '2026-01-03', '2026-01-10');
      expect(result).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    });
  });

  describe('weekdays', () => {
    it('skips weekends (2026-01-03 is Saturday, 2026-01-04 is Sunday)', () => {
      // 2026-01-01 Thu, 2026-01-02 Fri, 2026-01-05 Mon
      const result = getDueOccurrences('weekdays', '2026-01-01', undefined, undefined, '2026-01-05');
      expect(result).toEqual(['2026-01-01', '2026-01-02', '2026-01-05']);
    });

    it('starts on first weekday on or after startDate when startDate is Saturday', () => {
      const result = getDueOccurrences('weekdays', '2026-01-03', undefined, undefined, '2026-01-07');
      // 2026-01-03 Sat → first weekday is 2026-01-05 Mon
      expect(result[0]).toBe('2026-01-05');
    });
  });

  describe('weekends', () => {
    it('generates only Saturdays and Sundays', () => {
      const result = getDueOccurrences('weekends', '2026-01-01', undefined, undefined, '2026-01-11');
      // 2026-01-03 Sat, 2026-01-04 Sun, 2026-01-10 Sat, 2026-01-11 Sun
      expect(result).toEqual(['2026-01-03', '2026-01-04', '2026-01-10', '2026-01-11']);
    });
  });

  describe('weekly', () => {
    it('generates every 7 days from startDate', () => {
      const result = getDueOccurrences('weekly', '2026-01-05', undefined, undefined, '2026-01-26');
      expect(result).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
    });

    it('computes correct first occurrence when fromDate is mid-period', () => {
      // startDate=2026-01-05, lastGeneratedDate=2026-01-05, next should be 2026-01-12
      const result = getDueOccurrences('weekly', '2026-01-05', '2026-01-05', undefined, '2026-01-20');
      expect(result).toEqual(['2026-01-12', '2026-01-19']);
    });
  });

  describe('biweekly', () => {
    it('generates every 14 days', () => {
      const result = getDueOccurrences('biweekly', '2026-01-01', undefined, undefined, '2026-02-01');
      expect(result).toEqual(['2026-01-01', '2026-01-15', '2026-01-29']);
    });
  });

  describe('every4weeks', () => {
    it('generates every 28 days', () => {
      const result = getDueOccurrences('every4weeks', '2026-01-01', undefined, undefined, '2026-03-01');
      expect(result).toEqual(['2026-01-01', '2026-01-29', '2026-02-26']);
    });
  });

  describe('monthly', () => {
    it('generates on the same day each month', () => {
      const result = getDueOccurrences('monthly', '2026-01-15', undefined, undefined, '2026-04-15');
      expect(result).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
    });

    it('clamps to last day of month when startDate day does not exist', () => {
      // startDate Jan 31 → Feb clamps to Feb 28
      const result = getDueOccurrences('monthly', '2026-01-31', undefined, undefined, '2026-03-31');
      expect(result).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    });

    it('resumes correctly mid-schedule', () => {
      // lastGenerated=2026-01-15, today=2026-03-20 → Feb and Mar
      const result = getDueOccurrences('monthly', '2026-01-15', '2026-01-15', undefined, '2026-03-20');
      expect(result).toEqual(['2026-02-15', '2026-03-15']);
    });
  });

  describe('last_day_of_month', () => {
    it('generates last day of each month', () => {
      const result = getDueOccurrences('last_day_of_month', '2026-01-01', undefined, undefined, '2026-04-30');
      expect(result).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    });
  });

  describe('every6months', () => {
    it('generates every 6 months', () => {
      const result = getDueOccurrences('every6months', '2026-01-15', undefined, undefined, '2027-01-15');
      expect(result).toEqual(['2026-01-15', '2026-07-15', '2027-01-15']);
    });
  });

  describe('annually', () => {
    it('generates on same date each year', () => {
      const result = getDueOccurrences('annually', '2024-03-10', undefined, undefined, '2026-03-10');
      expect(result).toEqual(['2024-03-10', '2025-03-10', '2026-03-10']);
    });

    it('resumes correctly', () => {
      const result = getDueOccurrences('annually', '2024-03-10', '2024-03-10', undefined, '2026-04-01');
      expect(result).toEqual(['2025-03-10', '2026-03-10']);
    });
  });

  describe('edge cases', () => {
    it('returns empty when fromDate is after today', () => {
      const result = getDueOccurrences('daily', '2026-06-01', '2026-06-10', undefined, '2026-06-09');
      expect(result).toEqual([]);
    });

    it('returns empty when startDate is in the future relative to today', () => {
      const result = getDueOccurrences('monthly', '2027-01-01', undefined, undefined, '2026-06-10');
      expect(result).toEqual([]);
    });
  });
});
