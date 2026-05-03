import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CurrenciesRepository } from '../currencies-repository';
import { createTestDatabase, InMemorySqliteDatabase } from './test-utils';

describe('CurrenciesRepository', () => {
  let repository: CurrenciesRepository;
  let db: InMemorySqliteDatabase;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new CurrenciesRepository(db);
  });

  afterEach(async () => {
    await db.close();
    vi.useRealTimers();
  });

  describe('create', () => {
    it('creates a currency with defaults', async () => {
      vi.useFakeTimers();
      const createdAt = new Date('2024-01-15T10:00:00Z');
      vi.setSystemTime(createdAt);

      const currency = await repository.create({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
      });

      expect(currency.id).toBe('USD');
      expect(currency.name).toBe('US Dollar');
      expect(currency.symbol).toBe('$');
      expect(currency.isPrimary).toBeUndefined(); // Not provided in input
      expect(currency.exchangeRate).toBe(1.0);
      expect(currency.isActive).toBe(true);
      expect(currency.lastUpdated).toBe(createdAt.getTime());
      expect(currency.createdAt).toBe(createdAt.getTime());
      expect(currency.updatedAt).toBe(createdAt.getTime());
    });

    it('creates a primary currency', async () => {
      const currency = await repository.create({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        isPrimary: true,
      });

      expect(currency.isPrimary).toBe(true);
    });

    it('creates a currency with exchange rate', async () => {
      const currency = await repository.create({
        id: 'GBP',
        name: 'British Pound',
        symbol: '£',
        exchangeRate: 0.79,
      });

      expect(currency.exchangeRate).toBe(0.79);
    });
  });

  describe('findById', () => {
    it('returns the currency when found', async () => {
      await repository.create({
        id: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'CA$',
      });

      const found = await repository.findById('CAD');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('CAD');
      expect(found?.name).toBe('Canadian Dollar');
      expect(found?.symbol).toBe('CA$');
      expect(found?.isPrimary).toBe(false); // DB returns false for 0
      expect(found?.isActive).toBe(true);
    });

    it('returns null when not found', async () => {
      const found = await repository.findById('NONEXISTENT');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all currencies ordered by primary first, then name', async () => {
      await repository.create({ id: 'EUR', name: 'Euro', symbol: '€' });
      await repository.create({ id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true });
      await repository.create({ id: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' });

      const currencies = await repository.findAll();
      expect(currencies).toHaveLength(3);
      expect(currencies[0].id).toBe('USD'); // Primary first
      expect(currencies[1].id).toBe('CAD'); // Then alphabetical
      expect(currencies[2].id).toBe('EUR');
    });

    it('filters by active status', async () => {
      await repository.create({ id: 'USD', name: 'US Dollar', symbol: '$' });
      const inactive = await repository.create({ id: 'OLD', name: 'Old Currency', symbol: 'O' });
      await repository.update({ id: inactive.id, isActive: false });

      const allCurrencies = await repository.findAll(false);
      expect(allCurrencies).toHaveLength(2);

      const activeOnly = await repository.findAll(true);
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].id).toBe('USD');
    });
  });

  describe('findPrimary', () => {
    it('returns the primary currency', async () => {
      await repository.create({ id: 'EUR', name: 'Euro', symbol: '€' });
      await repository.create({ id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true });

      const primary = await repository.findPrimary();
      expect(primary).not.toBeNull();
      expect(primary?.id).toBe('USD');
    });

    it('returns null when no primary exists', async () => {
      await repository.create({ id: 'EUR', name: 'Euro', symbol: '€' });

      const primary = await repository.findPrimary();
      expect(primary).toBeNull();
    });
  });

  describe('update', () => {
    it('updates specified fields', async () => {
      await repository.create({ id: 'USD', name: 'US Dollar', symbol: '$' });

      vi.useFakeTimers();
      const updatedAt = new Date('2024-02-01T12:00:00Z');
      vi.setSystemTime(updatedAt);

      const updated = await repository.update({
        id: 'USD',
        name: 'United States Dollar',
        symbol: 'US$',
      });

      expect(updated.name).toBe('United States Dollar');
      expect(updated.symbol).toBe('US$');
      expect(updated.updatedAt).toBe(updatedAt.getTime());
    });

    it('updates exchange rate and lastUpdated', async () => {
      await repository.create({ id: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 1.0 });

      vi.useFakeTimers();
      const updatedAt = new Date('2024-02-01T12:00:00Z');
      vi.setSystemTime(updatedAt);

      const updated = await repository.update({
        id: 'EUR',
        exchangeRate: 1.10,
      });

      expect(updated.exchangeRate).toBe(1.10);
      expect(updated.lastUpdated).toBe(updatedAt.getTime());
    });

    it('can set isPrimary', async () => {
      await repository.create({ id: 'EUR', name: 'Euro', symbol: '€' });

      const updated = await repository.update({
        id: 'EUR',
        isPrimary: true,
      });

      expect(updated.isPrimary).toBe(true);
    });

    it('can deactivate a currency', async () => {
      await repository.create({ id: 'OLD', name: 'Old Currency', symbol: 'O' });

      const updated = await repository.update({
        id: 'OLD',
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
    });

    it('throws when no fields provided', async () => {
      await repository.create({ id: 'USD', name: 'US Dollar', symbol: '$' });

      await expect(repository.update({ id: 'USD' })).rejects.toThrow(
        'No fields provided for update'
      );
    });

    it('throws when currency not found', async () => {
      await expect(
        repository.update({ id: 'NONEXISTENT', name: 'Updated' })
      ).rejects.toThrow('Currency not found for id: NONEXISTENT');
    });
  });

  describe('delete', () => {
    it('deletes the currency', async () => {
      await repository.create({ id: 'OLD', name: 'Old Currency', symbol: 'O' });

      await repository.delete('OLD');

      const found = await repository.findById('OLD');
      expect(found).toBeNull();
    });

    it('throws when currency not found', async () => {
      await expect(repository.delete('NONEXISTENT')).rejects.toThrow(
        'Currency not found for id: NONEXISTENT'
      );
    });
  });

  describe('setPrimary', () => {
    it('sets the specified currency as primary and unsets others', async () => {
      await repository.create({ id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true });
      await repository.create({ id: 'EUR', name: 'Euro', symbol: '€' });

      await repository.setPrimary('EUR');

      const usd = await repository.findById('USD');
      const eur = await repository.findById('EUR');

      expect(usd?.isPrimary).toBe(false);
      expect(eur?.isPrimary).toBe(true);
    });

    it('sets exchange rate to 1.0 for new primary', async () => {
      await repository.create({ id: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 1.10 });

      await repository.setPrimary('EUR');

      const eur = await repository.findById('EUR');
      expect(eur?.exchangeRate).toBe(1.0);
    });

    it('throws when currency not found', async () => {
      await expect(repository.setPrimary('NONEXISTENT')).rejects.toThrow(
        'Currency not found for id: NONEXISTENT'
      );
    });

    it('rolls back on error', async () => {
      await repository.create({ id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true });

      // Try to set nonexistent currency as primary
      await expect(repository.setPrimary('NONEXISTENT')).rejects.toThrow();

      // Original primary should still be set
      const usd = await repository.findById('USD');
      expect(usd?.isPrimary).toBe(true);
    });
  });
});
