import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Input, ListItem, useTheme } from '@cashmgr/ui';
import { AppError, BudgetWithProgress, Category } from '@cashmgr/core';
import { useBudgetsService, useCategoriesService } from '../services/services-context';
import { useFormValidation } from '../hooks/useFormValidation';
import { CreateBudgetInputSchema } from '@cashmgr/core';

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return '#c00';
  if (percentage >= 75) return '#e67e00';
  return '#2a7a4f';
}

function ProgressBar({ percentage }: { percentage: number }) {
  const color = getProgressColor(percentage);
  const clamped = Math.min(percentage, 100);
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#e0e0e0', overflow: 'hidden' }}>
      <div style={{ width: `${clamped}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
    </div>
  );
}

export function Budgets() {
  const theme = useTheme();
  const budgetsService = useBudgetsService();
  const categoriesService = useCategoriesService();

  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());

  const [budgets, setBudgets] = React.useState<BudgetWithProgress[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Add modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [availableCategories, setAvailableCategories] = React.useState<Category[]>([]);
  const [addCategoryId, setAddCategoryId] = React.useState('');
  const [addAmount, setAddAmount] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit modal
  const [editingBudget, setEditingBudget] = React.useState<BudgetWithProgress | null>(null);
  const [editAmount, setEditAmount] = React.useState('');
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);

  const { errors: addErrors, validateField: validateAddField, validateAll: validateAdd, clearErrors: clearAddErrors } = useFormValidation(CreateBudgetInputSchema);
  const { errors: editErrors, validateField: validateEditField, validateAll: validateEditAll, clearErrors: clearEditErrors } = useFormValidation(CreateBudgetInputSchema);

  const monthLabel = React.useMemo(() => {
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [month, year]);

  const navigateMonth = React.useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (month === 1) { setMonth(12); setYear((y) => y - 1); }
      else { setMonth((m) => m - 1); }
    } else {
      if (month === 12) { setMonth(1); setYear((y) => y + 1); }
      else { setMonth((m) => m + 1); }
    }
  }, [month]);

  const loadBudgets = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await budgetsService.getBudgetsWithProgress(month, year);
      setBudgets(data);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to load budgets');
    } finally {
      setIsLoading(false);
    }
  }, [budgetsService, month, year]);

  React.useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  const handleOpenAdd = React.useCallback(async () => {
    try {
      const allCats = await categoriesService.listCategoriesByType('expense');
      const topLevel = allCats.filter((c: Category) => !c.parentId);
      const usedIds = new Set(budgets.map((b) => b.categoryId));
      setAvailableCategories(topLevel.filter((c: Category) => !usedIds.has(c.id)));
      setAddCategoryId('');
      setAddAmount('');
      clearAddErrors();
      setShowAddModal(true);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to load categories');
    }
  }, [categoriesService, budgets, clearAddErrors]);

  const getAddFormValues = React.useCallback(() => ({
    categoryId: addCategoryId,
    amount: parseFloat(addAmount) || 0,
    month,
    year,
  }), [addCategoryId, addAmount, month, year]);

  const handleAddBudget = React.useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const values = getAddFormValues();
    if (!validateAdd(values)) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await budgetsService.createBudget(values);
      setShowAddModal(false);
      await loadBudgets();
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  }, [getAddFormValues, validateAdd, budgetsService, loadBudgets]);

  const handleOpenEdit = React.useCallback((budget: BudgetWithProgress) => {
    setEditingBudget(budget);
    setEditAmount(String(budget.amount));
    clearEditErrors();
  }, [clearEditErrors]);

  const getEditFormValues = React.useCallback(() => ({
    categoryId: editingBudget?.categoryId ?? '',
    amount: parseFloat(editAmount) || 0,
    month,
    year,
  }), [editingBudget, editAmount, month, year]);

  const handleSaveEdit = React.useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingBudget) return;
    const values = getEditFormValues();
    if (!validateEditAll(values)) return;

    setIsEditSubmitting(true);
    setError(null);
    try {
      await budgetsService.updateBudget(editingBudget.id, { amount: values.amount });
      setEditingBudget(null);
      await loadBudgets();
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to update budget');
    } finally {
      setIsEditSubmitting(false);
    }
  }, [editingBudget, getEditFormValues, validateEditAll, budgetsService, loadBudgets]);

  const handleDelete = React.useCallback(async (budget: BudgetWithProgress) => {
    if (!window.confirm(`Delete the budget for "${budget.categoryName}"?\n\nThis will also stop it from being carried forward to future months. You can always create a new budget to resume tracking.`)) return;
    setError(null);
    try {
      await budgetsService.deleteBudget(budget.id);
      await loadBudgets();
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to delete budget');
    }
  }, [budgetsService, loadBudgets]);

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        <Link
          to="/settings"
          className="settings-breadcrumb-link"
          style={{ color: theme.colors.primary, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}
        >
          Settings
        </Link>
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.h1.fontSize }}>›</span>
        <h2 style={{ margin: 0, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}>
          Budgets
        </h2>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>
            Set spending limits per category and track your progress.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          Add budget
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: theme.spacing.md, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {/* Month navigator — follows ui-patterns.md Period Navigator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.components.interactiveRadius,
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        }}
      >
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', border: 'none', background: theme.colors.background, cursor: 'pointer', color: theme.colors.textPrimary, fontSize: 14, fontWeight: 600 }}
        >
          ‹
        </button>
        <span style={{ fontWeight: 600, fontSize: theme.typography.body.fontSize, color: theme.colors.textPrimary }}>
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => navigateMonth('next')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', border: 'none', background: theme.colors.background, cursor: 'pointer', color: theme.colors.textPrimary, fontSize: 14, fontWeight: 600 }}
        >
          ›
        </button>
      </div>

      {/* Budget list */}
      <Card title="Monthly budgets" subtitle="Spending limits and progress" tone="default">
        {isLoading ? (
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>Loading budgets...</p>
        ) : budgets.length === 0 ? (
          <EmptyState
            title="No budgets for this month"
            description="Add a budget to start tracking your spending limits."
            action={<Button variant="primary" onClick={handleOpenAdd}>Add first budget</Button>}
          />
        ) : (
          <div>
            {budgets.map((budget, index) => (
              <ListItem
                key={budget.id}
                showDivider={index !== budgets.length - 1}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                    {budget.categoryIcon && (
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: budget.categoryColor || theme.colors.surfaceMuted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {budget.categoryIcon}
                      </span>
                    )}
                    <span>{budget.categoryName}</span>
                  </div>
                }
                subtitle={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    <ProgressBar percentage={budget.percentage} />
                    <span style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
                      ${budget.spent.toFixed(2)} spent of ${budget.amount.toFixed(2)} — {budget.percentage.toFixed(0)}%
                    </span>
                  </div>
                }
                actions={
                  <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                    <Button type="button" variant="ghost" onClick={() => handleOpenEdit(budget)}>Edit</Button>
                    <Button type="button" variant="ghost" onClick={() => handleDelete(budget)}>Delete</Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Card>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowAddModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', margin: theme.spacing.lg }}>
            <Card title="Add budget" subtitle={`Set a spending limit for ${monthLabel}`} tone="default">
              <form onSubmit={handleAddBudget} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary, fontWeight: 500 }}>
                    Category
                  </label>
                  {availableCategories.length === 0 ? (
                    <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: theme.typography.caption.fontSize }}>
                      All expense categories already have budgets for this month.
                    </p>
                  ) : (
                    <select
                      value={addCategoryId}
                      onChange={(e) => {
                        setAddCategoryId(e.target.value);
                        if (addErrors.categoryId) validateAddField('categoryId', { ...getAddFormValues(), categoryId: e.target.value });
                      }}
                      style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.components.interactiveRadius, border: addErrors.categoryId ? '1px solid #c00' : '1px solid #ddd', fontFamily: theme.fontFamily, fontSize: theme.typography.body.fontSize }}
                    >
                      <option value="">Select a category…</option>
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  )}
                  {addErrors.categoryId && <p style={{ margin: '4px 0 0', fontSize: theme.typography.caption.fontSize, color: '#c00' }}>{addErrors.categoryId}</p>}
                </div>

                <Input
                  label="Budget amount"
                  placeholder="e.g., 500"
                  type="number"
                  value={addAmount}
                  onChange={(value) => {
                    setAddAmount(value);
                    if (addErrors.amount) validateAddField('amount', { ...getAddFormValues(), amount: parseFloat(value) || 0 });
                  }}
                  onBlur={() => validateAddField('amount', getAddFormValues())}
                  error={addErrors.amount}
                  required
                />

                <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary, padding: theme.spacing.sm, background: theme.colors.surfaceMuted, borderRadius: theme.components.interactiveRadius }}>
                  This amount becomes the default for this category every month going forward. You can adjust it for any individual month at any time.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || availableCategories.length === 0}>
                    {isSubmitting ? 'Creating…' : 'Create budget'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setEditingBudget(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', margin: theme.spacing.lg }}>
            <Card title="Edit budget" subtitle={`Update limit for ${editingBudget.categoryName}`} tone="default">
              <div style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md, background: theme.colors.surfaceMuted, borderRadius: theme.components.interactiveRadius }}>
                <ProgressBar percentage={editingBudget.percentage} />
                <p style={{ margin: '6px 0 0', fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
                  ${editingBudget.spent.toFixed(2)} spent so far — {editingBudget.percentage.toFixed(0)}% of current limit
                </p>
              </div>
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                <Input
                  label="New budget amount"
                  placeholder="e.g., 600"
                  type="number"
                  value={editAmount}
                  onChange={(value) => {
                    setEditAmount(value);
                    if (editErrors.amount) validateEditField('amount', { ...getEditFormValues(), amount: parseFloat(value) || 0 });
                  }}
                  onBlur={() => validateEditField('amount', getEditFormValues())}
                  error={editErrors.amount}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button type="button" variant="ghost" onClick={() => setEditingBudget(null)} disabled={isEditSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isEditSubmitting}>
                    {isEditSubmitting ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
