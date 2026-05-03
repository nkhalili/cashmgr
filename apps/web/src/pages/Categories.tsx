import React from 'react';
import { Button, Card, EmptyState, Input, ListItem, Tabs, useTheme } from '@cashmgr/ui';
import { Category, AppError, CategoryType } from '@cashmgr/core';
import { useCategoriesService } from '../services/services-context';
import { useFormValidation } from '../hooks/useFormValidation';
import { CreateCategoryInputSchema } from '@cashmgr/core';

// F-003: Category tabs (removed Transfers)
const CATEGORY_TABS = [
  { key: 'expense', label: 'Expenses' },
  { key: 'income', label: 'Income' },
];

// F-003: Preset color palette
const COLOR_PALETTE = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#795548',
];

// F-003: Preset emoji icons
const EMOJI_ICONS = [
  '\u{1F4B0}', '\u{1F4BC}', '\u{1F4C8}', '\u{1F381}', '\u{1F4B5}',
  '\u{1F6D2}', '\u{1F3E0}', '\u{1F4A1}', '\u{1F697}', '\u{1F37D}',
  '\u{1F3AE}', '\u{1F455}', '\u{1F48A}', '\u{1F4DA}', '\u{2708}',
  '\u{1F3AC}', '\u{2615}', '\u{1F3CB}', '\u{1F43E}', '\u{1F4B3}',
];

export function Categories() {
  const theme = useTheme();
  const categoriesService = useCategoriesService();

  // State
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>('expense');

  // Add modal state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState('');
  const [categoryColor, setCategoryColor] = React.useState(COLOR_PALETTE[0]);
  const [categoryIcon, setCategoryIcon] = React.useState(EMOJI_ICONS[0]);
  const [categoryParentId, setCategoryParentId] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit modal state
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editColor, setEditColor] = React.useState('');
  const [editIcon, setEditIcon] = React.useState('');
  const [editParentId, setEditParentId] = React.useState<string>('');
  const [editOriginalParentId, setEditOriginalParentId] = React.useState<string>('');
  const [editHasChildren, setEditHasChildren] = React.useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);

  // Form validation
  const getAddFormValues = React.useCallback(() => ({
    name: categoryName.trim(),
    type: activeTab as CategoryType,
    color: categoryColor,
    icon: categoryIcon,
    parentId: categoryParentId || undefined,
  }), [categoryName, activeTab, categoryColor, categoryIcon, categoryParentId]);

  const { errors, validateField, validateAll, clearErrors, isValid } = useFormValidation(
    CreateCategoryInputSchema
  );

  const getEditFormValues = React.useCallback(() => ({
    name: editName.trim(),
    type: editingCategory?.type || 'expense',
    color: editColor,
    icon: editIcon,
    parentId: editParentId || undefined,
  }), [editingCategory, editName, editColor, editIcon, editParentId]);

  const {
    errors: editErrors,
    validateField: validateEditField,
    validateAll: validateEditAll,
    clearErrors: clearEditErrors,
    isValid: isEditValid,
  } = useFormValidation(CreateCategoryInputSchema);

  // Load categories
  const loadCategories = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await categoriesService.listCategories(true);
      setCategories(data);
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load categories';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [categoriesService]);

  React.useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Filter categories by type and organize with subcategories
  const filteredCategories = React.useMemo(() => {
    const typeCategories = categories.filter(c => c.type === activeTab);
    const topLevel = typeCategories.filter(c => !c.parentId);
    const result: { category: Category; subcategories: Category[] }[] = [];

    for (const parent of topLevel) {
      const subs = typeCategories.filter(c => c.parentId === parent.id);
      result.push({ category: parent, subcategories: subs });
    }

    return result;
  }, [categories, activeTab]);

  // Get top-level categories for parent selector
  const topLevelCategories = React.useMemo(() => {
    return categories.filter(c => c.type === activeTab && !c.parentId);
  }, [categories, activeTab]);

  // Handle add category
  const handleAddCategory = React.useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const formValues = getAddFormValues();

    if (!validateAll(formValues)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await categoriesService.createCategory(formValues);
      setShowAddModal(false);
      setCategoryName('');
      setCategoryColor(COLOR_PALETTE[0]);
      setCategoryIcon(EMOJI_ICONS[0]);
      setCategoryParentId('');
      clearErrors();
      await loadCategories();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to create category';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [getAddFormValues, validateAll, categoriesService, clearErrors, loadCategories]);

  // Handle edit category
  const handleOpenEdit = React.useCallback(async (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditColor(category.color || COLOR_PALETTE[0]);
    setEditIcon(category.icon || EMOJI_ICONS[0]);
    setEditParentId(category.parentId || '');
    setEditOriginalParentId(category.parentId || '');
    clearEditErrors();

    // Check if this category has subcategories (cannot become a subcategory if so)
    const hasChildren = await categoriesService.hasSubcategories(category.id);
    setEditHasChildren(hasChildren);
  }, [clearEditErrors, categoriesService]);

  const handleSaveEdit = React.useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!editingCategory) return;

    const formValues = getEditFormValues();

    if (!validateEditAll(formValues)) {
      return;
    }

    setIsEditSubmitting(true);
    setError(null);

    try {
      const updates: { name: string; color: string; icon: string; parentId?: string | null } = {
        name: formValues.name,
        color: formValues.color,
        icon: formValues.icon,
      };

      // Only include parentId if it was changed
      if (editParentId !== editOriginalParentId) {
        updates.parentId = editParentId || null;
      }

      await categoriesService.updateCategory(editingCategory.id, updates);
      setEditingCategory(null);
      clearEditErrors();
      await loadCategories();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to update category';
      setError(errorMessage);
    } finally {
      setIsEditSubmitting(false);
    }
  }, [editingCategory, getEditFormValues, validateEditAll, categoriesService, clearEditErrors, loadCategories, editParentId, editOriginalParentId]);

  const handleCancelEdit = React.useCallback(() => {
    setEditingCategory(null);
    clearEditErrors();
  }, [clearEditErrors]);

  // Handle delete category
  const handleDelete = React.useCallback(async (category: Category) => {
    const hasSubcats = await categoriesService.hasSubcategories(category.id);
    const message = hasSubcats
      ? `Delete "${category.name}" and all its subcategories? This cannot be undone.`
      : `Delete "${category.name}"? This cannot be undone.`;

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setError(null);

    try {
      await categoriesService.deleteCategory(category.id);
      await loadCategories();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to delete category';
      setError(errorMessage);
    }
  }, [categoriesService, loadCategories]);

  // Handle use template
  const handleUseTemplate = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await categoriesService.createDefaultCategories();
      await loadCategories();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to create default categories';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [categoriesService, loadCategories]);

  // Tab items with counts
  const tabItems = React.useMemo(() => {
    return CATEGORY_TABS.map(tab => ({
      ...tab,
      badgeLabel: categories.filter(c => c.type === tab.key).length.toString(),
    }));
  }, [categories]);

  const isEmpty = filteredCategories.length === 0;

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'space-between' }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: theme.typography.h1.fontSize,
              fontWeight: theme.typography.h1.fontWeight,
            }}
          >
            Categories
          </h2>
          <p style={{ marginTop: theme.spacing.xs, color: theme.colors.textSecondary }}>
            Organize transactions by type for better tracking.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          Add category
        </Button>
      </div>

      {error && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: theme.components.interactiveRadius,
            color: '#c00',
          }}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />

      <Card
        title={`${activeTab === 'expense' ? 'Expense' : 'Income'} Categories`}
        subtitle="Organize your transactions"
        tone="default"
      >
        {isLoading ? (
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>Loading categories...</p>
        ) : isEmpty ? (
          <EmptyState
            title={`No ${activeTab} categories yet`}
            description="Create categories to organize your transactions, or use the template to get started quickly."
            action={<Button variant="primary" onClick={() => setShowAddModal(true)}>Create first category</Button>}
            secondaryAction={<Button variant="ghost" onClick={handleUseTemplate}>Use template</Button>}
          />
        ) : (
          <div>
            {filteredCategories.map(({ category, subcategories }, index) => (
              <div key={category.id}>
                <ListItem
                  title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: category.color || theme.colors.surfaceMuted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                        }}
                      >
                        {category.icon || ''}
                      </span>
                      {category.name}
                    </span>
                  }
                  subtitle={subcategories.length > 0 ? `${subcategories.length} subcategories` : undefined}
                  showDivider={index !== filteredCategories.length - 1 || subcategories.length > 0}
                  actions={
                    <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                      <Button type="button" variant="ghost" onClick={() => handleOpenEdit(category)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => handleDelete(category)}>
                        Delete
                      </Button>
                    </div>
                  }
                />
                {subcategories.map((sub, subIndex) => (
                  <ListItem
                    key={sub.id}
                    title={
                      <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginLeft: theme.spacing.lg }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: sub.color || theme.colors.surfaceMuted,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                          }}
                        >
                          {sub.icon || ''}
                        </span>
                        {sub.name}
                      </span>
                    }
                    showDivider={subIndex !== subcategories.length - 1 || index !== filteredCategories.length - 1}
                    actions={
                      <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                        <Button type="button" variant="ghost" onClick={() => handleOpenEdit(sub)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => handleDelete(sub)}>
                          Delete
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Category Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 500,
              width: '100%',
              margin: theme.spacing.lg,
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <Card
              title={`Add ${activeTab === 'expense' ? 'Expense' : 'Income'} Category`}
              subtitle="Create a new category to organize transactions"
              tone="default"
            >
              <form
                onSubmit={handleAddCategory}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                }}
              >
                <Input
                  label="Category Name"
                  placeholder="e.g., Groceries, Salary"
                  value={categoryName}
                  onChange={(value) => {
                    setCategoryName(value);
                    if (errors.name) {
                      validateField('name', { ...getAddFormValues(), name: value.trim() });
                    }
                  }}
                  onBlur={() => validateField('name', getAddFormValues())}
                  error={errors.name}
                  required
                />

                {/* Icon Picker */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: theme.spacing.xs,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Icon
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    {EMOJI_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setCategoryIcon(icon)}
                        style={{
                          width: 40,
                          height: 40,
                          border: categoryIcon === icon ? `2px solid ${theme.colors.primary}` : '1px solid #ddd',
                          borderRadius: theme.components.interactiveRadius,
                          background: categoryIcon === icon ? theme.colors.surfaceMuted : 'white',
                          cursor: 'pointer',
                          fontSize: 20,
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: theme.spacing.xs,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Color
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryColor(color)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: categoryColor === color ? '3px solid #333' : '2px solid white',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          backgroundColor: color,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Parent Category Selector */}
                {topLevelCategories.length > 0 && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: theme.spacing.xs,
                        fontFamily: theme.fontFamily,
                        fontSize: theme.typography.caption.fontSize,
                        color: theme.colors.textSecondary,
                        fontWeight: 500,
                      }}
                    >
                      Parent Category (optional)
                    </label>
                    <select
                      value={categoryParentId}
                      onChange={(e) => setCategoryParentId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: theme.spacing.sm,
                        borderRadius: theme.components.interactiveRadius,
                        border: '1px solid #ddd',
                        fontFamily: theme.fontFamily,
                        fontSize: theme.typography.body.fontSize,
                      }}
                    >
                      <option value="">No parent (top-level category)</option>
                      {topLevelCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !isValid}>
                    {isSubmitting ? 'Creating...' : 'Create category'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 500,
              width: '100%',
              margin: theme.spacing.lg,
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <Card
              title="Edit Category"
              subtitle={`Update ${editingCategory.name}`}
              tone="default"
            >
              <form
                onSubmit={handleSaveEdit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                }}
              >
                <Input
                  label="Category Name"
                  placeholder="e.g., Groceries, Salary"
                  value={editName}
                  onChange={(value) => {
                    setEditName(value);
                    if (editErrors.name) {
                      validateEditField('name', { ...getEditFormValues(), name: value.trim() });
                    }
                  }}
                  onBlur={() => validateEditField('name', getEditFormValues())}
                  error={editErrors.name}
                  required
                />

                {/* Icon Picker */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: theme.spacing.xs,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Icon
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    {EMOJI_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setEditIcon(icon)}
                        style={{
                          width: 40,
                          height: 40,
                          border: editIcon === icon ? `2px solid ${theme.colors.primary}` : '1px solid #ddd',
                          borderRadius: theme.components.interactiveRadius,
                          background: editIcon === icon ? theme.colors.surfaceMuted : 'white',
                          cursor: 'pointer',
                          fontSize: 20,
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: theme.spacing.xs,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Color
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: editColor === color ? '3px solid #333' : '2px solid white',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          backgroundColor: color,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Parent Category Selector (only for categories without children) */}
                {!editHasChildren && topLevelCategories.filter(c => c.id !== editingCategory.id).length > 0 && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: theme.spacing.xs,
                        fontFamily: theme.fontFamily,
                        fontSize: theme.typography.caption.fontSize,
                        color: theme.colors.textSecondary,
                        fontWeight: 500,
                      }}
                    >
                      Parent Category (optional)
                    </label>
                    <select
                      value={editParentId}
                      onChange={(e) => setEditParentId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: theme.spacing.sm,
                        borderRadius: theme.components.interactiveRadius,
                        border: '1px solid #ddd',
                        fontFamily: theme.fontFamily,
                        fontSize: theme.typography.body.fontSize,
                      }}
                    >
                      <option value="">No parent (top-level category)</option>
                      {topLevelCategories.filter(c => c.id !== editingCategory.id).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editHasChildren && (
                  <div
                    style={{
                      padding: theme.spacing.sm,
                      background: theme.colors.surfaceMuted,
                      borderRadius: theme.components.interactiveRadius,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    This category has subcategories and cannot become a subcategory itself.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isEditSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isEditSubmitting || !isEditValid}>
                    {isEditSubmitting ? 'Saving...' : 'Save changes'}
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
