/**
 * Tests for Date Validation Utilities
 *
 * Verifies date parsing, validation, and auto-correction across multiple formats.
 */

import { describe, it, expect } from 'vitest';
import {
  validateAndCorrectDate,
  validateDate,
  isValidISODate,
} from '../date-validation';

describe('validateAndCorrectDate', () => {
  describe('ISO 8601 format (YYYY-MM-DD)', () => {
    it('should accept valid ISO dates', () => {
      expect(validateAndCorrectDate('2024-01-15')).toBe('2024-01-15');
      expect(validateAndCorrectDate('2024-12-31')).toBe('2024-12-31');
      expect(validateAndCorrectDate('2024-02-29')).toBe('2024-02-29'); // Leap year
    });

    it('should pad single-digit months and days', () => {
      expect(validateAndCorrectDate('2024-1-5')).toBe('2024-01-05');
      expect(validateAndCorrectDate('2024-01-5')).toBe('2024-01-05');
      expect(validateAndCorrectDate('2024-1-05')).toBe('2024-01-05');
    });

    it('should reject invalid months', () => {
      expect(validateAndCorrectDate('2024-00-15')).toBe('2024-00-15');
      expect(validateAndCorrectDate('2024-13-15')).toBe('2024-13-15');
    });

    it('should reject invalid days', () => {
      expect(validateAndCorrectDate('2024-01-00')).toBe('2024-01-00');
      expect(validateAndCorrectDate('2024-01-32')).toBe('2024-01-32');
    });

    it('should reject invalid dates (e.g., February 30)', () => {
      expect(validateAndCorrectDate('2024-02-30')).toBe('2024-02-30');
      expect(validateAndCorrectDate('2024-04-31')).toBe('2024-04-31'); // April has 30 days
      expect(validateAndCorrectDate('2023-02-29')).toBe('2023-02-29'); // Not a leap year
    });
  });

  describe('US format (MM/DD/YYYY)', () => {
    it('should parse valid US dates', () => {
      expect(validateAndCorrectDate('01/15/2024')).toBe('2024-01-15');
      expect(validateAndCorrectDate('12/31/2024')).toBe('2024-12-31');
      expect(validateAndCorrectDate('02/29/2024')).toBe('2024-02-29'); // Leap year
    });

    it('should handle single-digit months and days', () => {
      expect(validateAndCorrectDate('1/5/2024')).toBe('2024-01-05');
      expect(validateAndCorrectDate('01/5/2024')).toBe('2024-01-05');
      expect(validateAndCorrectDate('1/05/2024')).toBe('2024-01-05');
    });

    it('should reject invalid US dates', () => {
      expect(validateAndCorrectDate('00/15/2024')).toBe('00/15/2024');
      expect(validateAndCorrectDate('13/15/2024')).toBe('13/15/2024');
      expect(validateAndCorrectDate('02/30/2024')).toBe('02/30/2024');
    });
  });

  describe('European format (DD.MM.YYYY)', () => {
    it('should parse valid European dates', () => {
      expect(validateAndCorrectDate('15.01.2024')).toBe('2024-01-15');
      expect(validateAndCorrectDate('31.12.2024')).toBe('2024-12-31');
      expect(validateAndCorrectDate('29.02.2024')).toBe('2024-02-29'); // Leap year
    });

    it('should handle single-digit days and months', () => {
      expect(validateAndCorrectDate('5.1.2024')).toBe('2024-01-05');
      expect(validateAndCorrectDate('05.1.2024')).toBe('2024-01-05');
      expect(validateAndCorrectDate('5.01.2024')).toBe('2024-01-05');
    });

    it('should reject invalid European dates', () => {
      expect(validateAndCorrectDate('15.00.2024')).toBe('15.00.2024');
      expect(validateAndCorrectDate('15.13.2024')).toBe('15.13.2024');
      expect(validateAndCorrectDate('30.02.2024')).toBe('30.02.2024');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for empty input', () => {
      expect(validateAndCorrectDate('')).toBe('');
    });

    it('should handle leap years correctly', () => {
      expect(validateAndCorrectDate('2024-02-29')).toBe('2024-02-29'); // Leap year
      expect(validateAndCorrectDate('2023-02-29')).toBe('2023-02-29'); // Not a leap year - invalid
      expect(validateAndCorrectDate('2000-02-29')).toBe('2000-02-29'); // Leap year (divisible by 400)
      expect(validateAndCorrectDate('1900-02-29')).toBe('1900-02-29'); // Not a leap year (divisible by 100 but not 400)
    });

    it('should return original for completely invalid input', () => {
      expect(validateAndCorrectDate('invalid')).toBe('invalid');
      expect(validateAndCorrectDate('not a date')).toBe('not a date');
      expect(validateAndCorrectDate('12-34-5678')).toBe('12-34-5678');
    });

    it('should handle boundary dates', () => {
      expect(validateAndCorrectDate('2024-01-01')).toBe('2024-01-01');
      expect(validateAndCorrectDate('2024-12-31')).toBe('2024-12-31');
      expect(validateAndCorrectDate('1/1/2024')).toBe('2024-01-01');
      expect(validateAndCorrectDate('12/31/2024')).toBe('2024-12-31');
    });
  });
});

describe('validateDate', () => {
  it('should return validation result with ISO format', () => {
    const result = validateDate('2024-01-15');
    expect(result.isValid).toBe(true);
    expect(result.correctedValue).toBe('2024-01-15');
    expect(result.originalFormat).toBe('iso');
  });

  it('should return validation result with US format', () => {
    const result = validateDate('1/15/2024');
    expect(result.isValid).toBe(true);
    expect(result.correctedValue).toBe('2024-01-15');
    expect(result.originalFormat).toBe('us');
  });

  it('should return validation result with EU format', () => {
    const result = validateDate('15.1.2024');
    expect(result.isValid).toBe(true);
    expect(result.correctedValue).toBe('2024-01-15');
    expect(result.originalFormat).toBe('eu');
  });

  it('should return invalid for bad dates', () => {
    const result = validateDate('invalid');
    expect(result.isValid).toBe(false);
    expect(result.correctedValue).toBe('invalid');
    expect(result.originalFormat).toBeUndefined();
  });

  it('should return invalid for empty input', () => {
    const result = validateDate('');
    expect(result.isValid).toBe(false);
    expect(result.correctedValue).toBe('');
    expect(result.originalFormat).toBeUndefined();
  });

  it('should detect and correct date format', () => {
    const isoResult = validateDate('2024-1-5');
    expect(isoResult.isValid).toBe(true);
    expect(isoResult.correctedValue).toBe('2024-01-05');

    const usResult = validateDate('1/5/2024');
    expect(usResult.isValid).toBe(true);
    expect(usResult.correctedValue).toBe('2024-01-05');

    const euResult = validateDate('5.1.2024');
    expect(euResult.isValid).toBe(true);
    expect(euResult.correctedValue).toBe('2024-01-05');
  });
});

describe('isValidISODate', () => {
  it('should accept valid ISO dates', () => {
    expect(isValidISODate('2024-01-15')).toBe(true);
    expect(isValidISODate('2024-12-31')).toBe(true);
    expect(isValidISODate('2024-02-29')).toBe(true); // Leap year
  });

  it('should reject dates not in ISO format', () => {
    expect(isValidISODate('2024-1-5')).toBe(false); // Not padded
    expect(isValidISODate('1/5/2024')).toBe(false); // US format
    expect(isValidISODate('5.1.2024')).toBe(false); // EU format
  });

  it('should reject invalid dates', () => {
    expect(isValidISODate('2024-00-15')).toBe(false);
    expect(isValidISODate('2024-13-15')).toBe(false);
    expect(isValidISODate('2024-02-30')).toBe(false);
    expect(isValidISODate('2023-02-29')).toBe(false); // Not a leap year
  });

  it('should reject empty or invalid input', () => {
    expect(isValidISODate('')).toBe(false);
    expect(isValidISODate('invalid')).toBe(false);
    expect(isValidISODate('not a date')).toBe(false);
  });

  it('should handle boundary cases', () => {
    expect(isValidISODate('2024-01-01')).toBe(true);
    expect(isValidISODate('2024-12-31')).toBe(true);
    expect(isValidISODate('2024-01-00')).toBe(false);
    expect(isValidISODate('2024-01-32')).toBe(false);
  });
});

describe('month length validation', () => {
  it('should validate 31-day months', () => {
    const months31 = ['01', '03', '05', '07', '08', '10', '12'];
    months31.forEach((month) => {
      expect(validateAndCorrectDate(`2024-${month}-31`)).toBe(`2024-${month}-31`);
    });
  });

  it('should validate 30-day months', () => {
    const months30 = ['04', '06', '09', '11'];
    months30.forEach((month) => {
      expect(validateAndCorrectDate(`2024-${month}-30`)).toBe(`2024-${month}-30`);
      expect(validateAndCorrectDate(`2024-${month}-31`)).toBe(`2024-${month}-31`); // Invalid - should return original
    });
  });

  it('should validate February in leap and non-leap years', () => {
    // Leap year
    expect(validateAndCorrectDate('2024-02-29')).toBe('2024-02-29');
    expect(validateAndCorrectDate('2024-02-30')).toBe('2024-02-30'); // Invalid

    // Non-leap year
    expect(validateAndCorrectDate('2023-02-28')).toBe('2023-02-28');
    expect(validateAndCorrectDate('2023-02-29')).toBe('2023-02-29'); // Invalid
  });
});
