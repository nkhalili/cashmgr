import { Currency } from '../models/Currency';

/**
 * F-030: Currency Utility Functions
 * Helper functions for currency conversion and formatting
 */

/**
 * Convert an amount from one currency to another
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency (or null for primary)
 * @param toCurrency - Target currency (or null for primary)
 * @param currencies - Map of currency ID to Currency object
 * @returns Converted amount in target currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency | null,
  toCurrency: Currency | null,
  currencies: Map<string, Currency>
): number {
  // If both are null or same, no conversion needed
  if (
    (fromCurrency === null && toCurrency === null) ||
    (fromCurrency && toCurrency && fromCurrency.id === toCurrency.id)
  ) {
    return amount;
  }

  // Get primary currency
  const primary = Array.from(currencies.values()).find((c) => c.isPrimary);
  if (!primary) {
    throw new Error('No primary currency found');
  }

  // Convert to primary currency first
  let amountInPrimary: number;
  if (fromCurrency === null || fromCurrency.isPrimary) {
    amountInPrimary = amount;
  } else {
    amountInPrimary = amount / fromCurrency.exchangeRate;
  }

  // Then convert to target currency
  if (toCurrency === null || toCurrency.isPrimary) {
    return amountInPrimary;
  } else {
    return amountInPrimary * toCurrency.exchangeRate;
  }
}

/**
 * Convert amount to primary currency
 * @param amount - Amount in source currency
 * @param currency - Source currency
 * @returns Amount in primary currency
 */
export function convertToPrimary(amount: number, currency: Currency): number {
  if (currency.isPrimary) {
    return amount;
  }
  return amount / currency.exchangeRate;
}

/**
 * Convert amount from primary currency to target currency
 * @param amount - Amount in primary currency
 * @param currency - Target currency
 * @returns Amount in target currency
 */
export function convertFromPrimary(amount: number, currency: Currency): number {
  if (currency.isPrimary) {
    return amount;
  }
  return amount * currency.exchangeRate;
}

/**
 * Format currency with symbol
 * @param amount - Amount to format
 * @param currency - Currency object with symbol
 * @returns Formatted string with currency symbol
 */
export function formatCurrencyWithSymbol(amount: number, currency: Currency): string {
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // For most currencies, symbol comes before amount
  // Special cases like JPY don't use decimal places
  if (currency.id === 'JPY') {
    return `${currency.symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }

  return `${currency.symbol}${formattedAmount}`;
}

/**
 * Get currency by ID from a list
 * @param currencies - Array of currencies
 * @param id - Currency ID to find
 * @returns Currency object or null if not found
 */
export function getCurrencyById(currencies: Currency[], id: string): Currency | null {
  return currencies.find((c) => c.id === id) ?? null;
}

/**
 * Get primary currency from a list
 * @param currencies - Array of currencies
 * @returns Primary currency or null if not found
 */
export function getPrimaryCurrency(currencies: Currency[]): Currency | null {
  return currencies.find((c) => c.isPrimary) ?? null;
}

/**
 * Get active currencies from a list
 * @param currencies - Array of currencies
 * @returns Array of active currencies
 */
export function getActiveCurrencies(currencies: Currency[]): Currency[] {
  return currencies.filter((c) => c.isActive);
}

/**
 * Check if a currency can be deleted
 * @param currency - Currency to check
 * @returns true if currency can be deleted
 */
export function canDeleteCurrency(currency: Currency): boolean {
  // Cannot delete primary currency
  return !currency.isPrimary;
}

/**
 * Validate exchange rate value
 * @param rate - Exchange rate to validate
 * @returns true if valid
 */
export function isValidExchangeRate(rate: number): boolean {
  return rate > 0 && Number.isFinite(rate);
}

/**
 * Round exchange rate to 6 decimal places
 * @param rate - Exchange rate to round
 * @returns Rounded exchange rate
 */
export function roundExchangeRate(rate: number): number {
  return Math.round(rate * 1000000) / 1000000;
}

/**
 * Calculate exchange rate between two currencies
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns Exchange rate from source to target
 */
export function calculateExchangeRate(fromCurrency: Currency, toCurrency: Currency): number {
  // If one is primary, it's simple
  if (fromCurrency.isPrimary) {
    return toCurrency.exchangeRate;
  }
  if (toCurrency.isPrimary) {
    return 1 / fromCurrency.exchangeRate;
  }

  // Both are sub-currencies, convert through primary
  return toCurrency.exchangeRate / fromCurrency.exchangeRate;
}
