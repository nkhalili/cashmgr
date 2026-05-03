import { describe, expect, it } from 'vitest';
import { Currency } from '../../models/Currency';
import {
  convertCurrency,
  convertToPrimary,
  convertFromPrimary,
  formatCurrencyWithSymbol,
  getCurrencyById,
  getPrimaryCurrency,
  getActiveCurrencies,
  canDeleteCurrency,
  isValidExchangeRate,
  roundExchangeRate,
  calculateExchangeRate,
} from '../currency-utils';

/**
 * F-030: Unit tests for currency utility functions
 */

// Test fixtures
const USD: Currency = {
  id: 'USD',
  name: 'US Dollar',
  symbol: '$',
  isPrimary: true,
  exchangeRate: 1.0,
  lastUpdated: Date.now(),
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const EUR: Currency = {
  id: 'EUR',
  name: 'Euro',
  symbol: '€',
  isPrimary: false,
  exchangeRate: 0.85, // 1 USD = 0.85 EUR
  lastUpdated: Date.now(),
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const GBP: Currency = {
  id: 'GBP',
  name: 'British Pound',
  symbol: '£',
  isPrimary: false,
  exchangeRate: 0.73, // 1 USD = 0.73 GBP
  lastUpdated: Date.now(),
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const JPY: Currency = {
  id: 'JPY',
  name: 'Japanese Yen',
  symbol: '¥',
  isPrimary: false,
  exchangeRate: 110.0, // 1 USD = 110 JPY
  lastUpdated: Date.now(),
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const INACTIVE: Currency = {
  ...EUR,
  id: 'INR',
  name: 'Indian Rupee',
  symbol: '₹',
  isActive: false,
};

describe('convertCurrency', () => {
  const currencies = new Map([
    ['USD', USD],
    ['EUR', EUR],
    ['GBP', GBP],
    ['JPY', JPY],
  ]);

  it('converts from primary to sub-currency', () => {
    const result = convertCurrency(100, USD, EUR, currencies);
    expect(result).toBe(85); // 100 * 0.85
  });

  it('converts from sub-currency to primary', () => {
    const result = convertCurrency(85, EUR, USD, currencies);
    expect(result).toBe(100); // 85 / 0.85
  });

  it('converts between two sub-currencies', () => {
    const result = convertCurrency(85, EUR, GBP, currencies);
    // EUR to USD: 85 / 0.85 = 100 USD
    // USD to GBP: 100 * 0.73 = 73 GBP
    expect(result).toBeCloseTo(73, 2);
  });

  it('returns same amount when currencies are the same', () => {
    const result = convertCurrency(100, EUR, EUR, currencies);
    expect(result).toBe(100);
  });

  it('returns same amount when both currencies are null', () => {
    const result = convertCurrency(100, null, null, currencies);
    expect(result).toBe(100);
  });

  it('throws error when no primary currency exists', () => {
    const noPrimary = new Map([
      ['EUR', { ...EUR, isPrimary: false }],
      ['GBP', { ...GBP, isPrimary: false }],
    ]);

    expect(() => convertCurrency(100, EUR, GBP, noPrimary)).toThrow(
      'No primary currency found'
    );
  });
});

describe('convertToPrimary', () => {
  it('returns same amount for primary currency', () => {
    const result = convertToPrimary(100, USD);
    expect(result).toBe(100);
  });

  it('converts sub-currency to primary', () => {
    const result = convertToPrimary(85, EUR);
    expect(result).toBe(100); // 85 / 0.85
  });
});

describe('convertFromPrimary', () => {
  it('returns same amount for primary currency', () => {
    const result = convertFromPrimary(100, USD);
    expect(result).toBe(100);
  });

  it('converts primary to sub-currency', () => {
    const result = convertFromPrimary(100, EUR);
    expect(result).toBe(85); // 100 * 0.85
  });
});

describe('formatCurrencyWithSymbol', () => {
  it('formats USD with symbol and 2 decimal places', () => {
    const result = formatCurrencyWithSymbol(1234.56, USD);
    expect(result).toBe('$1,234.56');
  });

  it('formats EUR with symbol and 2 decimal places', () => {
    const result = formatCurrencyWithSymbol(1234.56, EUR);
    expect(result).toBe('€1,234.56');
  });

  it('formats JPY without decimal places', () => {
    const result = formatCurrencyWithSymbol(1234.56, JPY);
    expect(result).toBe('¥1,235'); // Rounded to nearest integer
  });

  it('formats zero correctly', () => {
    const result = formatCurrencyWithSymbol(0, USD);
    expect(result).toBe('$0.00');
  });

  it('formats negative amounts correctly', () => {
    const result = formatCurrencyWithSymbol(-100.5, USD);
    expect(result).toBe('$-100.50');
  });
});

describe('getCurrencyById', () => {
  const currencies = [USD, EUR, GBP];

  it('finds currency by ID', () => {
    const result = getCurrencyById(currencies, 'EUR');
    expect(result).toEqual(EUR);
  });

  it('returns null when currency not found', () => {
    const result = getCurrencyById(currencies, 'JPY');
    expect(result).toBeNull();
  });
});

describe('getPrimaryCurrency', () => {
  it('finds primary currency from list', () => {
    const currencies = [EUR, USD, GBP];
    const result = getPrimaryCurrency(currencies);
    expect(result).toEqual(USD);
  });

  it('returns null when no primary currency exists', () => {
    const currencies = [{ ...EUR, isPrimary: false }, { ...GBP, isPrimary: false }];
    const result = getPrimaryCurrency(currencies);
    expect(result).toBeNull();
  });
});

describe('getActiveCurrencies', () => {
  it('filters only active currencies', () => {
    const currencies = [USD, EUR, INACTIVE, GBP];
    const result = getActiveCurrencies(currencies);
    expect(result).toEqual([USD, EUR, GBP]);
  });

  it('returns empty array when no active currencies', () => {
    const currencies = [INACTIVE];
    const result = getActiveCurrencies(currencies);
    expect(result).toEqual([]);
  });
});

describe('canDeleteCurrency', () => {
  it('returns false for primary currency', () => {
    expect(canDeleteCurrency(USD)).toBe(false);
  });

  it('returns true for non-primary currency', () => {
    expect(canDeleteCurrency(EUR)).toBe(true);
  });
});

describe('isValidExchangeRate', () => {
  it('returns true for positive finite numbers', () => {
    expect(isValidExchangeRate(1.0)).toBe(true);
    expect(isValidExchangeRate(0.85)).toBe(true);
    expect(isValidExchangeRate(110.5)).toBe(true);
  });

  it('returns false for zero', () => {
    expect(isValidExchangeRate(0)).toBe(false);
  });

  it('returns false for negative numbers', () => {
    expect(isValidExchangeRate(-1.0)).toBe(false);
  });

  it('returns false for Infinity', () => {
    expect(isValidExchangeRate(Infinity)).toBe(false);
    expect(isValidExchangeRate(-Infinity)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isValidExchangeRate(NaN)).toBe(false);
  });
});

describe('roundExchangeRate', () => {
  it('rounds to 6 decimal places', () => {
    expect(roundExchangeRate(0.123456789)).toBe(0.123457);
    expect(roundExchangeRate(1.111111111)).toBe(1.111111);
  });

  it('preserves rates with fewer decimals', () => {
    expect(roundExchangeRate(1.5)).toBe(1.5);
    expect(roundExchangeRate(0.85)).toBe(0.85);
  });
});

describe('calculateExchangeRate', () => {
  it('calculates rate from primary to sub-currency', () => {
    const rate = calculateExchangeRate(USD, EUR);
    expect(rate).toBe(0.85);
  });

  it('calculates rate from sub-currency to primary', () => {
    const rate = calculateExchangeRate(EUR, USD);
    expect(rate).toBeCloseTo(1.176, 3); // 1 / 0.85
  });

  it('calculates rate between two sub-currencies', () => {
    const rate = calculateExchangeRate(EUR, GBP);
    // EUR to USD: 1 / 0.85 = 1.176 USD per EUR
    // USD to GBP: 1.176 * 0.73 = 0.859 GBP per EUR
    expect(rate).toBeCloseTo(0.859, 3);
  });

  it('calculates inverse correctly', () => {
    const eurToGbp = calculateExchangeRate(EUR, GBP);
    const gbpToEur = calculateExchangeRate(GBP, EUR);
    expect(eurToGbp * gbpToEur).toBeCloseTo(1.0, 5); // Should be reciprocals
  });
});
