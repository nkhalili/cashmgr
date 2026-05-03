import { describe, expect, it } from 'vitest';
import {
  CurrencySymbolSchema,
  CurrencyNameSchema,
  ExchangeRateSchema,
  CreateCurrencyInputSchema,
  UpdateCurrencyInputSchema,
  validateCurrencyBusinessRules,
} from '../schemas';

/**
 * F-030: Unit tests for currency validation schemas
 */

describe('CurrencySymbolSchema', () => {
  it('validates valid currency symbols', () => {
    expect(CurrencySymbolSchema.parse('$')).toBe('$');
    expect(CurrencySymbolSchema.parse('€')).toBe('€');
    expect(CurrencySymbolSchema.parse('£')).toBe('£');
    expect(CurrencySymbolSchema.parse('¥')).toBe('¥');
    expect(CurrencySymbolSchema.parse('₹')).toBe('₹');
  });

  it('trims whitespace', () => {
    expect(CurrencySymbolSchema.parse('  $  ')).toBe('$');
  });

  it('rejects empty strings', () => {
    expect(() => CurrencySymbolSchema.parse('')).toThrow();
  });

  it('rejects strings longer than 3 characters', () => {
    expect(() => CurrencySymbolSchema.parse('USD$')).toThrow();
  });
});

describe('CurrencyNameSchema', () => {
  it('validates valid currency names', () => {
    expect(CurrencyNameSchema.parse('US Dollar')).toBe('US Dollar');
    expect(CurrencyNameSchema.parse('Euro')).toBe('Euro');
    expect(CurrencyNameSchema.parse('British Pound Sterling')).toBe('British Pound Sterling');
  });

  it('trims whitespace', () => {
    expect(CurrencyNameSchema.parse('  US Dollar  ')).toBe('US Dollar');
  });

  it('rejects empty strings', () => {
    expect(() => CurrencyNameSchema.parse('')).toThrow();
  });

  it('rejects strings longer than 50 characters', () => {
    const longName = 'A'.repeat(51);
    expect(() => CurrencyNameSchema.parse(longName)).toThrow();
  });
});

describe('ExchangeRateSchema', () => {
  it('validates positive exchange rates', () => {
    expect(ExchangeRateSchema.parse(1.0)).toBe(1.0);
    expect(ExchangeRateSchema.parse(0.85)).toBe(0.85);
    expect(ExchangeRateSchema.parse(110.5)).toBe(110.5);
  });

  it('validates rates with up to 6 decimal places', () => {
    expect(ExchangeRateSchema.parse(0.123456)).toBe(0.123456);
    expect(ExchangeRateSchema.parse(1.234567)).toBe(1.234567); // Will be rounded
  });

  it('rejects zero', () => {
    expect(() => ExchangeRateSchema.parse(0)).toThrow();
  });

  it('rejects negative numbers', () => {
    expect(() => ExchangeRateSchema.parse(-1.0)).toThrow();
  });

  it('rejects rates with more than 6 decimal places', () => {
    expect(() => ExchangeRateSchema.parse(0.1234567)).toThrow();
  });

  it('rejects Infinity', () => {
    expect(() => ExchangeRateSchema.parse(Infinity)).toThrow();
  });

  it('rejects NaN', () => {
    expect(() => ExchangeRateSchema.parse(NaN)).toThrow();
  });
});

describe('CreateCurrencyInputSchema', () => {
  it('validates complete currency input', () => {
    const input = {
      id: 'USD',
      name: 'US Dollar',
      symbol: '$',
      exchangeRate: 1.0,
      isPrimary: true,
    };

    const result = CreateCurrencyInputSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('applies default values for optional fields', () => {
    const input = {
      id: 'EUR',
      name: 'Euro',
      symbol: '€',
    };

    const result = CreateCurrencyInputSchema.parse(input);
    expect(result.exchangeRate).toBe(1.0);
    expect(result.isPrimary).toBe(false);
  });

  it('validates currency ID format', () => {
    const input = {
      id: 'USD',
      name: 'US Dollar',
      symbol: '$',
    };

    expect(() => CreateCurrencyInputSchema.parse({ ...input, id: 'US' })).toThrow(); // Too short
    expect(() => CreateCurrencyInputSchema.parse({ ...input, id: 'USDD' })).toThrow(); // Too long
    expect(() => CreateCurrencyInputSchema.parse({ ...input, id: 'usd' })).toThrow(); // Lowercase
    expect(() => CreateCurrencyInputSchema.parse({ ...input, id: 'US1' })).toThrow(); // Contains number
  });

  it('rejects extra properties', () => {
    const input = {
      id: 'USD',
      name: 'US Dollar',
      symbol: '$',
      extraField: 'should fail',
    };

    expect(() => CreateCurrencyInputSchema.parse(input)).toThrow();
  });

  it('validates all required fields', () => {
    expect(() =>
      CreateCurrencyInputSchema.parse({
        name: 'US Dollar',
        symbol: '$',
      })
    ).toThrow(); // Missing id

    expect(() =>
      CreateCurrencyInputSchema.parse({
        id: 'USD',
        symbol: '$',
      })
    ).toThrow(); // Missing name

    expect(() =>
      CreateCurrencyInputSchema.parse({
        id: 'USD',
        name: 'US Dollar',
      })
    ).toThrow(); // Missing symbol
  });
});

describe('UpdateCurrencyInputSchema', () => {
  it('validates update with all fields', () => {
    const input = {
      id: 'EUR',
      name: 'Euro',
      symbol: '€',
      exchangeRate: 0.85,
      isPrimary: false,
      isActive: true,
    };

    const result = UpdateCurrencyInputSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('validates partial updates', () => {
    expect(() =>
      UpdateCurrencyInputSchema.parse({
        id: 'EUR',
        exchangeRate: 0.90,
      })
    ).not.toThrow();

    expect(() =>
      UpdateCurrencyInputSchema.parse({
        id: 'EUR',
        name: 'European Euro',
      })
    ).not.toThrow();

    expect(() =>
      UpdateCurrencyInputSchema.parse({
        id: 'EUR',
        isActive: false,
      })
    ).not.toThrow();
  });

  it('requires at least one field besides id', () => {
    expect(() =>
      UpdateCurrencyInputSchema.parse({
        id: 'EUR',
      })
    ).toThrow('At least one field must be provided for update');
  });

  it('requires id field', () => {
    expect(() =>
      UpdateCurrencyInputSchema.parse({
        name: 'Euro',
      })
    ).toThrow();
  });

  it('rejects extra properties', () => {
    const input = {
      id: 'EUR',
      name: 'Euro',
      extraField: 'should fail',
    };

    expect(() => UpdateCurrencyInputSchema.parse(input)).toThrow();
  });
});

describe('validateCurrencyBusinessRules', () => {
  it('allows primary currency with exchange rate 1.0', () => {
    expect(() =>
      validateCurrencyBusinessRules({
        isPrimary: true,
        exchangeRate: 1.0,
      })
    ).not.toThrow();
  });

  it('allows non-primary currency with any exchange rate', () => {
    expect(() =>
      validateCurrencyBusinessRules({
        isPrimary: false,
        exchangeRate: 0.85,
      })
    ).not.toThrow();
  });

  it('allows primary currency without exchange rate specified', () => {
    expect(() =>
      validateCurrencyBusinessRules({
        isPrimary: true,
      })
    ).not.toThrow();
  });

  it('rejects primary currency with exchange rate other than 1.0', () => {
    expect(() =>
      validateCurrencyBusinessRules({
        isPrimary: true,
        exchangeRate: 0.85,
      })
    ).toThrow('Primary currency must have exchange rate of 1.0');

    expect(() =>
      validateCurrencyBusinessRules({
        isPrimary: true,
        exchangeRate: 2.0,
      })
    ).toThrow('Primary currency must have exchange rate of 1.0');
  });
});
