/**
 * Tests for CurrenciesService
 *
 * Verifies CRUD operations, primary currency management, exchange rates,
 * and validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CurrenciesService } from '../currencies-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import { NotFoundError } from '@cashmgr/core';

describe('CurrenciesService', () => {
  let service: CurrenciesService;
  let adapter: MockDatabaseAdapter;

  beforeEach(() => {
    adapter = new MockDatabaseAdapter();
    service = new CurrenciesService(adapter);
  });

  describe('listCurrencies', () => {
    it('should return empty array when no currencies exist', async () => {
      const currencies = await service.listCurrencies();
      expect(currencies).toEqual([]);
    });

    it('should return all currencies', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      const currencies = await service.listCurrencies();
      expect(currencies).toHaveLength(2);
    });

    it('should filter inactive currencies when activeOnly=true', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });
      const inactiveEur = await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });
      await adapter.updateCurrency({ id: inactiveEur.id, isActive: false });

      const currencies = await service.listCurrencies(true);
      expect(currencies).toHaveLength(1);
      expect(currencies[0].id).toBe('USD');
    });
  });

  describe('getCurrencyById', () => {
    it('should return currency when found', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const currency = await service.getCurrencyById('USD');
      expect(currency.id).toBe('USD');
      expect(currency.name).toBe('US Dollar');
    });

    it('should throw NotFoundError when currency does not exist', async () => {
      await expect(service.getCurrencyById('XXX')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPrimaryCurrency', () => {
    it('should return primary currency', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const primary = await service.getPrimaryCurrency();
      expect(primary.id).toBe('USD');
      expect(primary.isPrimary).toBe(true);
    });

    it('should throw error when no primary currency exists', async () => {
      await expect(service.getPrimaryCurrency()).rejects.toThrow('No primary currency found');
    });
  });

  describe('createCurrency', () => {
    it('should create currency with valid input', async () => {
      const currency = await service.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      expect(currency.id).toBe('EUR');
      expect(currency.name).toBe('Euro');
      expect(currency.symbol).toBe('€');
      expect(currency.exchangeRate).toBe(0.92);
      expect(currency.isPrimary).toBe(false);
      expect(currency.isActive).toBe(true);
    });

    it('should create primary currency with exchange rate 1.0', async () => {
      const currency = await service.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      expect(currency.exchangeRate).toBe(1.0);
      expect(currency.isPrimary).toBe(true);
    });

    it('should unset existing primary when creating new primary', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      await service.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const usd = await adapter.getCurrencyById('USD');
      expect(usd?.isPrimary).toBe(false);

      const eur = await adapter.getCurrencyById('EUR');
      expect(eur?.isPrimary).toBe(true);
    });

    it('should accept valid exchange rate with 6 decimal places', async () => {
      const currency = await service.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.123456, // Valid 6 decimal places
        isPrimary: false,
      });

      expect(currency.exchangeRate).toBe(0.123456);
    });

    it('should reject negative exchange rate', async () => {
      await expect(
        service.createCurrency({
          id: 'EUR',
          name: 'Euro',
          symbol: '€',
          exchangeRate: -0.5,
          isPrimary: false,
        })
      ).rejects.toThrow();
    });

    it('should reject zero exchange rate for non-primary', async () => {
      await expect(
        service.createCurrency({
          id: 'EUR',
          name: 'Euro',
          symbol: '€',
          exchangeRate: 0,
          isPrimary: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('updateCurrency', () => {
    it('should update currency name', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const updated = await service.updateCurrency('USD', { name: 'United States Dollar' });
      expect(updated.name).toBe('United States Dollar');
    });

    it('should update currency symbol', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const updated = await service.updateCurrency('USD', { symbol: 'USD' });
      expect(updated.symbol).toBe('USD');
    });

    it('should update exchange rate', async () => {
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      const updated = await service.updateCurrency('EUR', { exchangeRate: 0.95 });
      expect(updated.exchangeRate).toBe(0.95);
    });

    it('should round updated exchange rate to 6 decimal places', async () => {
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      const updated = await service.updateCurrency('EUR', { exchangeRate: 0.987654321 });
      expect(updated.exchangeRate).toBe(0.987654);
    });

    it('should set currency as primary and update exchange rate to 1.0', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      const updated = await service.updateCurrency('EUR', { isPrimary: true });

      expect(updated.isPrimary).toBe(true);
      expect(updated.exchangeRate).toBe(1.0);

      const usd = await adapter.getCurrencyById('USD');
      expect(usd?.isPrimary).toBe(false);
    });

    it('should deactivate currency', async () => {
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      const updated = await service.updateCurrency('EUR', { isActive: false });
      expect(updated.isActive).toBe(false);
    });

    it('should throw NotFoundError for non-existent currency', async () => {
      await expect(
        service.updateCurrency('XXX', { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteCurrency', () => {
    it('should delete non-primary currency', async () => {
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      await service.deleteCurrency('EUR');

      const currency = await adapter.getCurrencyById('EUR');
      expect(currency).toBeNull();
    });

    it('should throw error when deleting primary currency', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      await expect(service.deleteCurrency('USD')).rejects.toThrow(
        'Cannot delete the primary currency'
      );
    });

    it('should throw NotFoundError for non-existent currency', async () => {
      await expect(service.deleteCurrency('XXX')).rejects.toThrow(NotFoundError);
    });

    it('should not affect other currencies', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });
      await adapter.createCurrency({
        id: 'GBP',
        name: 'British Pound',
        symbol: '£',
        exchangeRate: 0.79,
        isPrimary: false,
      });

      await service.deleteCurrency('EUR');

      const remaining = await adapter.getCurrencies();
      expect(remaining).toHaveLength(2);
      expect(remaining.map(c => c.id)).toEqual(['USD', 'GBP']);
    });
  });

  describe('setPrimaryCurrency', () => {
    it('should set new primary and recalculate all exchange rates', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });
      await adapter.createCurrency({
        id: 'GBP',
        name: 'British Pound',
        symbol: '£',
        exchangeRate: 0.79,
        isPrimary: false,
      });

      // Set EUR as primary
      await service.setPrimaryCurrency('EUR');

      const eur = await adapter.getCurrencyById('EUR');
      expect(eur?.isPrimary).toBe(true);
      expect(eur?.exchangeRate).toBe(1.0);

      // Old primary (USD) rate should be recalculated
      // 1 / 0.92 = 1.086957
      const usd = await adapter.getCurrencyById('USD');
      expect(usd?.isPrimary).toBe(false);
      expect(usd?.exchangeRate).toBeCloseTo(1.086957, 5);

      // Other currency (GBP) rate should be recalculated
      // 0.79 / 0.92 = 0.858696
      const gbp = await adapter.getCurrencyById('GBP');
      expect(gbp?.exchangeRate).toBeCloseTo(0.858696, 5);
    });

    it('should handle setting already primary currency', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const result = await service.setPrimaryCurrency('USD');

      expect(result.isPrimary).toBe(true);
      expect(result.exchangeRate).toBe(1.0);
    });

    it('should throw NotFoundError for non-existent currency', async () => {
      await expect(service.setPrimaryCurrency('XXX')).rejects.toThrow(NotFoundError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full currency lifecycle', async () => {
      // Create primary currency
      const usd = await service.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });
      expect(usd.isPrimary).toBe(true);

      // Create secondary currency
      await service.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      // List currencies
      const currencies = await service.listCurrencies();
      expect(currencies).toHaveLength(2);

      // Update exchange rate
      const updatedEur = await service.updateCurrency('EUR', { exchangeRate: 0.95 });
      expect(updatedEur.exchangeRate).toBe(0.95);

      // Change primary currency
      await service.setPrimaryCurrency('EUR');
      const newPrimary = await service.getPrimaryCurrency();
      expect(newPrimary.id).toBe('EUR');

      // Delete old primary (now secondary)
      await service.deleteCurrency('USD');
      const remaining = await service.listCurrencies();
      expect(remaining).toHaveLength(1);
    });

    it('should maintain consistency when switching primary currencies', async () => {
      // Create USD as primary (rate = 1.0)
      await service.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      // Create EUR with rate 0.92 (1 USD = 0.92 EUR)
      await service.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92,
        isPrimary: false,
      });

      // Switch to EUR as primary
      await service.setPrimaryCurrency('EUR');

      // EUR should now be 1.0
      const eur = await adapter.getCurrencyById('EUR');
      expect(eur?.exchangeRate).toBe(1.0);

      // USD should be 1/0.92 ≈ 1.087
      const usd = await adapter.getCurrencyById('USD');
      expect(usd?.exchangeRate).toBeCloseTo(1.087, 3);

      // Switch back to USD as primary
      await service.setPrimaryCurrency('USD');

      // USD should be 1.0 again
      const usdAgain = await adapter.getCurrencyById('USD');
      expect(usdAgain?.exchangeRate).toBe(1.0);

      // EUR should be close to original 0.92
      const eurAgain = await adapter.getCurrencyById('EUR');
      expect(eurAgain?.exchangeRate).toBeCloseTo(0.92, 2);
    });
  });
});
