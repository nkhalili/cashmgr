import { BaseEntity } from '../types';
import { CreateCurrencyInputSchema, UpdateCurrencyInputSchema } from '../validation';
import { z } from 'zod';

/**
 * Currency Entity
 * F-030: Represents a currency (primary or sub-currency) with exchange rate
 */
export interface Currency extends BaseEntity {
  id: string; // Currency code (e.g., "USD", "EUR", "GBP")
  name: string; // Full name (e.g., "US Dollar", "Euro")
  symbol: string; // Currency symbol (e.g., "$", "€", "£")
  isPrimary: boolean; // True if this is the primary currency
  exchangeRate: number; // Exchange rate relative to primary currency
  lastUpdated: number; // Timestamp of last rate update
  isActive: boolean; // Whether this currency is currently active
}

/**
 * Create Currency Input
 * F-030: Type inferred from Zod schema for type safety
 */
export type CreateCurrencyInput = z.infer<typeof CreateCurrencyInputSchema>;

/**
 * Update Currency Input
 * F-030: Type inferred from Zod schema for type safety
 */
export type UpdateCurrencyInput = z.infer<typeof UpdateCurrencyInputSchema>;

/**
 * Exchange Rate Response
 * F-030: Response from exchange rate API
 */
export interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  date: string;
}
