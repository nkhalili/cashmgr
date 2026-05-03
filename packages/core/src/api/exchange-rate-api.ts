/**
 * F-030: Exchange Rate API Integration
 * Fetches real-time exchange rates from ExchangeRate-API.io
 *
 * Free Tier: 1,500 requests/month
 * Documentation: https://www.exchangerate-api.com/docs/overview
 */

import { ExchangeRateResponse } from '../models/Currency';

const API_BASE = 'https://api.exchangerate-api.com/v4/latest';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Error thrown when exchange rate fetch fails
 */
export class ExchangeRateFetchError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ExchangeRateFetchError';
  }
}

/**
 * Fetch exchange rates for a base currency
 * @param baseCurrency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @returns Exchange rate data with all available currencies
 * @throws ExchangeRateFetchError if the request fails
 */
export async function fetchExchangeRates(
  baseCurrency: string
): Promise<ExchangeRateResponse> {
  const url = `${API_BASE}/${baseCurrency}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new ExchangeRateFetchError(
          `Currency code "${baseCurrency}" not found. Please check the currency code.`
        );
      }

      if (response.status === 429) {
        throw new ExchangeRateFetchError(
          'Rate limit exceeded. Please try again later.'
        );
      }

      throw new ExchangeRateFetchError(
        `Failed to fetch exchange rates: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as unknown;

    // Validate response structure
    if (
      !data ||
      typeof data !== 'object' ||
      !('base' in data) ||
      !('rates' in data) ||
      typeof (data as { rates: unknown }).rates !== 'object'
    ) {
      throw new ExchangeRateFetchError(
        'Invalid response format from exchange rate API'
      );
    }

    const typedData = data as { base: string; rates: Record<string, number>; date?: string };

    return {
      base: typedData.base,
      rates: typedData.rates,
      date: typedData.date || new Date().toISOString().split('T')[0],
    };
  } catch (error) {
    // Handle AbortController timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ExchangeRateFetchError(
        'Request timeout. Please check your internet connection and try again.'
      );
    }

    // Re-throw ExchangeRateFetchError as-is
    if (error instanceof ExchangeRateFetchError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ExchangeRateFetchError(
        'Network error. Please check your internet connection.',
        error
      );
    }

    // Handle all other errors
    throw new ExchangeRateFetchError(
      'Unable to fetch exchange rates. Please try again later.',
      error
    );
  }
}

/**
 * Fetch exchange rate between two currencies
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate from source to target currency
 * @throws ExchangeRateFetchError if the request fails or currency not found
 */
export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const data = await fetchExchangeRates(fromCurrency);

  const rate = data.rates[toCurrency];

  if (rate === undefined) {
    throw new ExchangeRateFetchError(
      `Exchange rate not found for currency "${toCurrency}"`
    );
  }

  return rate;
}

/**
 * Check if exchange rate API is available
 * @returns true if API is reachable, false otherwise
 */
export async function isExchangeRateApiAvailable(): Promise<boolean> {
  try {
    await fetchExchangeRates('USD');
    return true;
  } catch {
    return false;
  }
}
