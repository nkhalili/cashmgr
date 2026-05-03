import type {
  Currency,
  CreateCurrencyInput,
  UpdateCurrencyInput,
  DatabaseAdapter,
} from '@cashmgr/core';
import {
  CreateCurrencyInputSchema,
  UpdateCurrencyInputSchema,
  ErrorHandler,
  NotFoundError,
  ValidationError,
  validateCurrencyBusinessRules,
  fetchExchangeRate,
  ExchangeRateFetchError,
  roundExchangeRate,
} from '@cashmgr/core';

/**
 * F-030: CurrenciesService
 * Manages currencies, exchange rates, and primary currency settings
 *
 * Features:
 * - CRUD operations for currencies
 * - Fetch exchange rates from API
 * - Manage primary currency
 * - Validate business rules
 */
export class CurrenciesService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  /**
   * Get all currencies
   * @param activeOnly - If true, only return active currencies
   */
  async listCurrencies(activeOnly = false): Promise<Currency[]> {
    try {
      return await this.adapter.getCurrencies(activeOnly);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CurrenciesService.listCurrencies');
    }
  }

  /**
   * Get currency by ID
   */
  async getCurrencyById(id: string): Promise<Currency> {
    try {
      const currency = await this.adapter.getCurrencyById(id);
      if (!currency) {
        throw new NotFoundError('Currency', id);
      }
      return currency;
    } catch (error) {
      throw ErrorHandler.handle(error, 'CurrenciesService.getCurrencyById');
    }
  }

  /**
   * Get the primary currency
   */
  async getPrimaryCurrency(): Promise<Currency> {
    try {
      const currency = await this.adapter.getPrimaryCurrency();
      if (!currency) {
        throw new Error('No primary currency found. Please set a primary currency.');
      }
      return currency;
    } catch (error) {
      throw ErrorHandler.handle(error, 'CurrenciesService.getPrimaryCurrency');
    }
  }

  /**
   * Create a new currency
   */
  async createCurrency(input: CreateCurrencyInput): Promise<Currency> {
    try {
      // F-023: Validate input schema
      const validated = CreateCurrencyInputSchema.parse(input);

      // F-023: Business logic validation
      validateCurrencyBusinessRules(validated);

      // Round exchange rate to 6 decimal places
      const currencyInput = {
        ...validated,
        exchangeRate: roundExchangeRate(validated.exchangeRate),
      };

      // If creating a primary currency, ensure exchange rate is 1.0
      if (currencyInput.isPrimary) {
        currencyInput.exchangeRate = 1.0;

        // Unset existing primary currency
        const existingPrimary = await this.adapter.getPrimaryCurrency();
        if (existingPrimary) {
          await this.adapter.updateCurrency({
            id: existingPrimary.id,
            isPrimary: false,
          });
        }
      }

      // Create currency
      return await this.adapter.createCurrency(currencyInput);
    } catch (error) {
      // F-023: Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      // F-024: Use ErrorHandler for all other errors
      throw ErrorHandler.handle(error, 'CurrenciesService.createCurrency');
    }
  }

  /**
   * Update an existing currency
   */
  async updateCurrency(id: string, updates: Partial<UpdateCurrencyInput>): Promise<Currency> {
    try {
      // Verify currency exists
      const current = await this.adapter.getCurrencyById(id);
      if (!current) {
        throw new NotFoundError('Currency', id);
      }

      // Prepare update input
      const updateInput: UpdateCurrencyInput = { id };

      if (updates.name !== undefined) updateInput.name = updates.name;
      if (updates.symbol !== undefined) updateInput.symbol = updates.symbol;
      if (updates.isActive !== undefined) updateInput.isActive = updates.isActive;

      // Handle exchange rate update
      if (updates.exchangeRate !== undefined) {
        // Round to 6 decimal places
        updateInput.exchangeRate = roundExchangeRate(updates.exchangeRate);

        // Validate business rules
        validateCurrencyBusinessRules({
          isPrimary: current.isPrimary,
          exchangeRate: updateInput.exchangeRate,
        });
      }

      // Handle primary currency change
      if (updates.isPrimary !== undefined) {
        updateInput.isPrimary = updates.isPrimary;

        // If setting as primary, unset existing primary and set rate to 1.0
        if (updates.isPrimary) {
          updateInput.exchangeRate = 1.0;

          const existingPrimary = await this.adapter.getPrimaryCurrency();
          if (existingPrimary && existingPrimary.id !== id) {
            await this.adapter.updateCurrency({
              id: existingPrimary.id,
              isPrimary: false,
            });
          }
        }
      }

      // Validate with schema
      const validated = UpdateCurrencyInputSchema.parse(updateInput);

      // Update currency
      return await this.adapter.updateCurrency(validated);
    } catch (error) {
      // F-023: Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      // F-024: Use ErrorHandler for all other errors
      throw ErrorHandler.handle(error, 'CurrenciesService.updateCurrency');
    }
  }

  /**
   * Delete a currency
   * Cannot delete primary currency or currencies in use
   */
  async deleteCurrency(id: string): Promise<void> {
    try {
      // Verify currency exists
      const currency = await this.adapter.getCurrencyById(id);
      if (!currency) {
        throw new NotFoundError('Currency', id);
      }

      // Cannot delete primary currency
      if (currency.isPrimary) {
        throw new Error('Cannot delete the primary currency. Please set another currency as primary first.');
      }

      // TODO: Check if currency is in use by any accounts
      // For MVP, we allow deletion even if in use

      await this.adapter.deleteCurrency(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CurrenciesService.deleteCurrency');
    }
  }

  /**
   * Set a currency as primary
   * Automatically unsets the current primary currency and recalculates all exchange rates
   */
  async setPrimaryCurrency(id: string): Promise<Currency> {
    try {
      // Verify currency exists
      const newPrimary = await this.adapter.getCurrencyById(id);
      if (!newPrimary) {
        throw new NotFoundError('Currency', id);
      }

      // If already primary, nothing to do
      if (newPrimary.isPrimary) {
        return newPrimary;
      }

      // Get the exchange rate of new primary relative to old primary
      // This is the conversion factor: 1 old primary = X new primary
      const conversionFactor = newPrimary.exchangeRate;

      // Get all currencies to recalculate their rates
      const allCurrencies = await this.adapter.getCurrencies(false);

      // Recalculate exchange rates for all non-primary currencies
      // New rate = old rate / conversion factor
      // This converts from "1 old primary = X currency" to "1 new primary = Y currency"
      for (const currency of allCurrencies) {
        if (currency.id === id) {
          // New primary gets rate 1.0
          continue;
        }

        if (currency.isPrimary) {
          // Old primary gets rate = 1 / conversion factor
          // e.g., if 1 USD = 0.92 EUR, when EUR becomes primary: 1 EUR = 1/0.92 = 1.087 USD
          const newRate = roundExchangeRate(1 / conversionFactor);
          await this.adapter.updateCurrency({
            id: currency.id,
            isPrimary: false,
            exchangeRate: newRate,
          });
        } else {
          // Other currencies: new rate = old rate / conversion factor
          // e.g., if 1 USD = 1.36 CAD and 1 USD = 0.92 EUR
          // when EUR becomes primary: 1 EUR = 1.36/0.92 = 1.478 CAD
          const newRate = roundExchangeRate(currency.exchangeRate / conversionFactor);
          await this.adapter.updateCurrency({
            id: currency.id,
            exchangeRate: newRate,
          });
        }
      }

      // Set new primary with rate 1.0
      return await this.adapter.updateCurrency({
        id,
        isPrimary: true,
        exchangeRate: 1.0,
      });
    } catch (error) {
      throw ErrorHandler.handle(error, 'CurrenciesService.setPrimaryCurrency');
    }
  }

  /**
   * Fetch current exchange rate from API
   * @param targetCurrencyId - Currency to get rate for (relative to primary)
   * @returns Exchange rate from primary currency to target currency
   */
  async fetchCurrentRate(targetCurrencyId: string): Promise<number> {
    try {
      // Get primary currency
      const primary = await this.getPrimaryCurrency();

      // Fetch rate from API
      const rate = await fetchExchangeRate(primary.id, targetCurrencyId);

      // Round to 6 decimal places
      return roundExchangeRate(rate);
    } catch (error) {
      // Handle API-specific errors
      if (error instanceof ExchangeRateFetchError) {
        throw error; // Pass through with original message
      }

      // Handle all other errors
      throw ErrorHandler.handle(error, 'CurrenciesService.fetchCurrentRate');
    }
  }

  /**
   * Update currency exchange rate with latest from API
   * @param id - Currency ID to update
   * @returns Updated currency
   */
  async updateRateFromApi(id: string): Promise<Currency> {
    try {
      // Verify currency exists
      const currency = await this.adapter.getCurrencyById(id);
      if (!currency) {
        throw new NotFoundError('Currency', id);
      }

      // Cannot update rate for primary currency
      if (currency.isPrimary) {
        throw new Error('Cannot update exchange rate for primary currency. Rate is always 1.0.');
      }

      // Fetch latest rate
      const rate = await this.fetchCurrentRate(id);

      // Update currency with new rate
      return await this.updateCurrency(id, {
        exchangeRate: rate,
      });
    } catch (error) {
      throw ErrorHandler.handle(error, 'CurrenciesService.updateRateFromApi');
    }
  }
}
