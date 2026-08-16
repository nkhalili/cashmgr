import { BudgetsService } from '../budgets-service';

const makeBudget = (overrides = {}) => ({
  id: 'bud-1',
  categoryId: 'cat-1',
  amount: 500,
  month: 5,
  year: 2026,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

const makeCategory = (overrides = {}) => ({
  id: 'cat-1',
  name: 'Food',
  type: 'expense' as const,
  isActive: true,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

const makeAdapter = (overrides = {}) => ({
  getBudgetById: jest.fn(),
  getBudgets: jest.fn(),
  getBudgetsWithProgress: jest.fn(),
  getBudgetDefaults: jest.fn().mockResolvedValue([]),
  createBudget: jest.fn(),
  updateBudget: jest.fn(),
  deleteBudget: jest.fn(),
  getCategoryById: jest.fn(),
  ...overrides,
});

describe('BudgetsService', () => {
  describe('getBudgetById', () => {
    it('returns the budget from the adapter', async () => {
      const budget = makeBudget();
      const adapter = makeAdapter({ getBudgetById: jest.fn().mockResolvedValue(budget) });
      const service = new BudgetsService(adapter as any);

      const result = await service.getBudgetById('bud-1');
      expect(result).toEqual(budget);
      expect(adapter.getBudgetById).toHaveBeenCalledWith('bud-1');
    });

    it('returns null when not found', async () => {
      const adapter = makeAdapter({ getBudgetById: jest.fn().mockResolvedValue(null) });
      const service = new BudgetsService(adapter as any);
      expect(await service.getBudgetById('x')).toBeNull();
    });
  });

  describe('listBudgets', () => {
    it('returns budgets for the given period', async () => {
      const budgets = [makeBudget()];
      const adapter = makeAdapter({ getBudgets: jest.fn().mockResolvedValue(budgets) });
      const service = new BudgetsService(adapter as any);

      const result = await service.listBudgets(5, 2026);
      expect(result).toEqual(budgets);
      expect(adapter.getBudgets).toHaveBeenCalledWith(5, 2026);
    });
  });

  describe('getBudgetsWithProgress', () => {
    it('delegates to adapter with month and year', async () => {
      const progress = [{ ...makeBudget(), categoryName: 'Food', spent: 100, remaining: 400, percentage: 20 }];
      const adapter = makeAdapter({ getBudgetsWithProgress: jest.fn().mockResolvedValue(progress) });
      const service = new BudgetsService(adapter as any);

      const result = await service.getBudgetsWithProgress(5, 2026);
      expect(result).toEqual(progress);
      expect(adapter.getBudgetsWithProgress).toHaveBeenCalledWith(5, 2026);
    });
  });

  describe('createBudget', () => {
    it('validates input, checks category exists, prevents duplicates, and creates', async () => {
      const budget = makeBudget();
      const adapter = makeAdapter({
        getCategoryById: jest.fn().mockResolvedValue(makeCategory()),
        getBudgets: jest.fn().mockResolvedValue([]),
        createBudget: jest.fn().mockResolvedValue(budget),
      });
      const service = new BudgetsService(adapter as any);

      const result = await service.createBudget({ categoryId: 'cat-1', amount: 500, month: 5, year: 2026 });
      expect(result).toEqual(budget);
      expect(adapter.getCategoryById).toHaveBeenCalledWith('cat-1');
      expect(adapter.getBudgets).toHaveBeenCalledWith(5, 2026);
      expect(adapter.createBudget).toHaveBeenCalled();
    });

    it('throws when category does not exist', async () => {
      const adapter = makeAdapter({ getCategoryById: jest.fn().mockResolvedValue(null) });
      const service = new BudgetsService(adapter as any);

      await expect(
        service.createBudget({ categoryId: 'cat-1', amount: 500, month: 5, year: 2026 })
      ).rejects.toThrow();
    });

    it('throws when a budget already exists for the category and period', async () => {
      const adapter = makeAdapter({
        getCategoryById: jest.fn().mockResolvedValue(makeCategory()),
        getBudgets: jest.fn().mockResolvedValue([makeBudget()]),
      });
      const service = new BudgetsService(adapter as any);

      await expect(
        service.createBudget({ categoryId: 'cat-1', amount: 600, month: 5, year: 2026 })
      ).rejects.toThrow(/already exists/);
    });

    it('throws ValidationError for invalid amount', async () => {
      const adapter = makeAdapter({
        getCategoryById: jest.fn().mockResolvedValue(makeCategory()),
      });
      const service = new BudgetsService(adapter as any);

      await expect(
        service.createBudget({ categoryId: 'cat-1', amount: -50, month: 5, year: 2026 })
      ).rejects.toThrow();
    });

    it('throws ValidationError for invalid month', async () => {
      const adapter = makeAdapter({
        getCategoryById: jest.fn().mockResolvedValue(makeCategory()),
      });
      const service = new BudgetsService(adapter as any);

      await expect(
        service.createBudget({ categoryId: 'cat-1', amount: 100, month: 13, year: 2026 })
      ).rejects.toThrow();
    });
  });

  describe('updateBudget', () => {
    it('updates the budget amount', async () => {
      const updated = makeBudget({ amount: 750 });
      const adapter = makeAdapter({
        getBudgetById: jest.fn().mockResolvedValue(makeBudget()),
        updateBudget: jest.fn().mockResolvedValue(updated),
      });
      const service = new BudgetsService(adapter as any);

      const result = await service.updateBudget('bud-1', { amount: 750 });
      expect(result.amount).toBe(750);
      expect(adapter.updateBudget).toHaveBeenCalledWith({ id: 'bud-1', amount: 750 });
    });

    it('throws NotFoundError when budget does not exist', async () => {
      const adapter = makeAdapter({ getBudgetById: jest.fn().mockResolvedValue(null) });
      const service = new BudgetsService(adapter as any);

      await expect(service.updateBudget('no-such', { amount: 100 })).rejects.toThrow();
    });
  });

  describe('deleteBudget', () => {
    it('deletes the budget', async () => {
      const adapter = makeAdapter({
        getBudgetById: jest.fn().mockResolvedValue(makeBudget()),
        deleteBudget: jest.fn().mockResolvedValue(undefined),
      });
      const service = new BudgetsService(adapter as any);

      await service.deleteBudget('bud-1');
      expect(adapter.deleteBudget).toHaveBeenCalledWith('bud-1');
    });

    it('throws NotFoundError when budget does not exist', async () => {
      const adapter = makeAdapter({ getBudgetById: jest.fn().mockResolvedValue(null) });
      const service = new BudgetsService(adapter as any);

      await expect(service.deleteBudget('no-such')).rejects.toThrow();
    });
  });
});
