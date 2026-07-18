import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  TextStyle,
} from 'react-native';
import { useKeyboardHeight } from '../src/hooks/useKeyboardHeight';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  TransactionType,
  AppError,
  CreateTransactionInputSchema,
  DEFAULT_CURRENCY,
  getTodayDateString,
  ACCOUNT_TYPE_GROUPS,
} from '@cashmgr/core';
import {
  useAccountsService,
  useCategoriesService,
  useTransactionsService,
} from '../src/contexts/services-context';
import { useFormValidation } from '../src/hooks/useFormValidation';
import { DateInput } from '../src/components/DateInput';

const TRANSACTION_TYPES: { label: string; value: TransactionType }[] = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
];

type ModalType = 'account' | 'toAccount' | 'category' | null;

export default function EditTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();
  const transactionsService = useTransactionsService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const keyboardHeight = useKeyboardHeight();
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Form state
  const [type, setType] = React.useState<TransactionType>('expense');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [toAccountId, setToAccountId] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Data state
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // UI state
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [activeModal, setActiveModal] = React.useState<ModalType>(null);

  // Form validation
  const { errors, validateField, validateAll, clearErrors, isValid } = useFormValidation(
    CreateTransactionInputSchema
  );

  // Helper to get form values for validation
  const getFormValues = React.useCallback(
    () => ({
      type,
      amount: amount.trim() ? Number(amount) : 0,
      currency: accounts.find((a) => a.id === accountId)?.currency || DEFAULT_CURRENCY,
      date: date || getTodayDateString(), // B-001: Use date string directly (YYYY-MM-DD)
      accountId,
      categoryId: type === 'transfer' ? undefined : categoryId, // No category for transfers
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      notes: notes.trim() || undefined,
    }),
    [type, amount, date, accountId, categoryId, toAccountId, notes, accounts]
  );

  // Load accounts, categories, and existing transaction
  React.useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError('Transaction ID is missing');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [accountsData, categoriesData, transaction] = await Promise.all([
          accountsService.listAccounts(),
          categoriesService.listCategories(true),
          transactionsService.getTransactionById(id),
        ]);
        setAccounts(accountsData);
        setCategories(categoriesData);

        // Pre-populate form with existing data
        setType(transaction.type);
        setAmount(String(transaction.amount));
        setDate(transaction.date); // B-001: Date is already YYYY-MM-DD string
        setAccountId(transaction.accountId);
        setCategoryId(transaction.categoryId || '');
        setToAccountId(transaction.toAccountId || '');
        setNotes(transaction.notes || '');
      } catch (err) {
        const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [id, accountsService, categoriesService, transactionsService]);

  // Filter categories by transaction type
  const filteredCategories = React.useMemo(() => {
    if (type === 'transfer') {
      return categories;
    }
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Flatten categories for modal display (parent categories with their subcategories)
  const flattenedCategories = React.useMemo(() => {
    const result: { id: string; label: string; isSubcategory: boolean }[] = [];
    const parentCategories = filteredCategories.filter((c) => !c.parentId);

    for (const category of parentCategories) {
      result.push({
        id: category.id,
        label: `${category.icon ? `${category.icon} ` : ''}${category.name}`,
        isSubcategory: false,
      });
      const subcategories = filteredCategories.filter((sub) => sub.parentId === category.id);
      for (const sub of subcategories) {
        result.push({
          id: sub.id,
          label: `${sub.icon ? `${sub.icon} ` : ''}${sub.name}`,
          isSubcategory: true,
        });
      }
    }
    return result;
  }, [filteredCategories]);

  // Reset category when type changes if current category doesn't match
  React.useEffect(() => {
    if (type !== 'transfer' && categoryId) {
      const currentCategory = categories.find((c) => c.id === categoryId);
      if (currentCategory && currentCategory.type !== type) {
        setCategoryId('');
      }
    }
  }, [type, categoryId, categories]);

  // Filter accounts for transfer destination (exclude source account)
  const destinationAccounts = React.useMemo(() => {
    return accounts.filter((a) => a.id !== accountId);
  }, [accounts, accountId]);

  // Group accounts by type (Cash / Bank Accounts / Credit Cards) for the account pickers
  const groupAccounts = React.useCallback((list: Account[]) => {
    return ACCOUNT_TYPE_GROUPS
      .map((group) => ({ ...group, accounts: list.filter((a) => a.type === group.type) }))
      .filter((group) => group.accounts.length > 0);
  }, []);
  const accountGroups = React.useMemo(() => groupAccounts(accounts), [accounts, groupAccounts]);
  const destinationAccountGroups = React.useMemo(
    () => groupAccounts(destinationAccounts),
    [destinationAccounts, groupAccounts]
  );

  // Reset destination account when source account changes
  React.useEffect(() => {
    if (toAccountId && toAccountId === accountId) {
      setToAccountId('');
    }
  }, [accountId, toAccountId]);

  // Helper functions to get display labels
  const getAccountLabel = React.useCallback(() => {
    const account = accounts.find((a) => a.id === accountId);
    return account ? `${account.name} (${account.currency})` : null;
  }, [accounts, accountId]);

  const getToAccountLabel = React.useCallback(() => {
    const account = accounts.find((a) => a.id === toAccountId);
    return account ? `${account.name} (${account.currency})` : null;
  }, [accounts, toAccountId]);

  const getCategoryLabel = React.useCallback(() => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? `${category.icon ? `${category.icon} ` : ''}${category.name}` : null;
  }, [categories, categoryId]);

  // Handle form submission
  const handleSubmit = React.useCallback(async () => {
    if (!id) return;

    const formValues = getFormValues();

    if (!validateAll(formValues)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await transactionsService.updateTransaction(id, {
        type: formValues.type,
        amount: formValues.amount,
        currency: formValues.currency,
        date: formValues.date,
        accountId: formValues.accountId,
        categoryId: formValues.categoryId,
        toAccountId: formValues.toAccountId,
        notes: formValues.notes,
      });
      setSuccess('Transaction updated successfully!');

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof AppError
        ? err.getUserMessage()
        : 'Failed to update transaction';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [id, getFormValues, validateAll, transactionsService, router]);

  // Handle type change
  const handleTypeChange = React.useCallback(
    (newType: TransactionType) => {
      setType(newType);
      clearErrors();
    },
    [clearErrors]
  );

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    router.back();
  }, [router]);

  // Handle selection from modals
  const handleSelectAccount = React.useCallback((id: string) => {
    setAccountId(id);
    setActiveModal(null);
  }, []);

  const handleSelectToAccount = React.useCallback((id: string) => {
    setToAccountId(id);
    setActiveModal(null);
  }, []);

  const handleSelectCategory = React.useCallback((id: string) => {
    setCategoryId(id);
    setActiveModal(null);
  }, []);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Transaction', headerBackTitle: 'Back' }} />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Transaction', headerBackTitle: 'Back' }} />
      <View style={[styles.container, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        <ScrollView ref={scrollViewRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Transaction Type Tabs */}
            <View style={styles.typeTabs}>
              {TRANSACTION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeTab, type === t.value && styles.typeTabActive]}
                  onPress={() => handleTypeChange(t.value)}
                >
                  <Text style={[styles.typeTabText, type === t.value && styles.typeTabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Amount <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.amount && styles.inputError]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={amount}
                onChangeText={(value) => {
                  setAmount(value);
                  if (errors.amount) {
                    validateField('amount', { ...getFormValues(), amount: Number(value) || 0 });
                  }
                }}
                onBlur={() => validateField('amount', getFormValues())}
                keyboardType="decimal-pad"
              />
              {errors.amount && <Text style={styles.errorMessage}>{errors.amount}</Text>}
            </View>

            {/* Date */}
            <DateInput
              label="Date"
              value={date}
              onChange={setDate}
            />

            {/* Account - Modal Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                {type === 'transfer' ? 'From Account' : 'Account'}{' '}
                <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.selectField, errors.accountId && styles.inputError]}
                onPress={() => setActiveModal('account')}
              >
                <Text
                  style={[styles.selectFieldText, !accountId && styles.selectFieldPlaceholder]}
                >
                  {getAccountLabel() || 'Select account...'}
                </Text>
                <Text style={styles.selectFieldArrow}>›</Text>
              </TouchableOpacity>
              {errors.accountId && <Text style={styles.errorMessage}>{errors.accountId}</Text>}
            </View>

            {/* To Account - Modal Selector (for transfers) */}
            {type === 'transfer' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  To Account <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.selectField, errors.toAccountId && styles.inputError]}
                  onPress={() => setActiveModal('toAccount')}
                >
                  <Text
                    style={[
                      styles.selectFieldText,
                      !toAccountId && styles.selectFieldPlaceholder,
                    ]}
                  >
                    {getToAccountLabel() || 'Select destination account...'}
                  </Text>
                  <Text style={styles.selectFieldArrow}>›</Text>
                </TouchableOpacity>
                {errors.toAccountId && <Text style={styles.errorMessage}>{errors.toAccountId}</Text>}
              </View>
            )}

            {/* Category - Modal Selector (hidden for transfers) */}
            {type !== 'transfer' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Category <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.selectField, errors.categoryId && styles.inputError]}
                  onPress={() => setActiveModal('category')}
                >
                  <Text
                    style={[styles.selectFieldText, !categoryId && styles.selectFieldPlaceholder]}
                  >
                    {getCategoryLabel() || 'Select category...'}
                  </Text>
                  <Text style={styles.selectFieldArrow}>›</Text>
                </TouchableOpacity>
                {errors.categoryId && <Text style={styles.errorMessage}>{errors.categoryId}</Text>}
              </View>
            )}

            {/* Notes */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details..."
                placeholderTextColor={theme.colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!isValid || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Update transaction</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Account Selection Modal */}
      <Modal
        visible={activeModal === 'account'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {type === 'transfer' ? 'Select From Account' : 'Select Account'}
            </Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {accountGroups.map((group) => (
              <React.Fragment key={group.type}>
                <Text style={styles.modalSectionHeader}>{group.label}</Text>
                {group.accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    style={styles.modalOption}
                    onPress={() => handleSelectAccount(account.id)}
                  >
                    <Text style={styles.modalOptionText}>
                      {account.name} ({account.currency})
                    </Text>
                    {accountId === account.id && <Text style={styles.modalOptionCheck}>✓</Text>}
                  </Pressable>
                ))}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* To Account Selection Modal */}
      <Modal
        visible={activeModal === 'toAccount'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Destination Account</Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {destinationAccountGroups.map((group) => (
              <React.Fragment key={group.type}>
                <Text style={styles.modalSectionHeader}>{group.label}</Text>
                {group.accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    style={styles.modalOption}
                    onPress={() => handleSelectToAccount(account.id)}
                  >
                    <Text style={styles.modalOptionText}>
                      {account.name} ({account.currency})
                    </Text>
                    {toAccountId === account.id && <Text style={styles.modalOptionCheck}>✓</Text>}
                  </Pressable>
                ))}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={activeModal === 'category'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {flattenedCategories.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.modalOption, item.isSubcategory && styles.modalOptionIndented]}
                onPress={() => handleSelectCategory(item.id)}
              >
                <Text style={styles.modalOptionText}>{item.label}</Text>
                {categoryId === item.id && <Text style={styles.modalOptionCheck}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] =>
  `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: theme.spacing.md,
      color: theme.colors.textSecondary,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
    },
    header: {
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.h1.fontSize,
      fontWeight: fontWeight(theme.typography.h1.fontWeight),
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#fcc',
    },
    errorText: {
      color: '#c00',
      fontWeight: fontWeight(500),
    },
    successBanner: {
      backgroundColor: '#efe',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#cfc',
    },
    successText: {
      color: '#070',
      fontWeight: fontWeight(500),
    },
    form: {
      gap: theme.spacing.lg,
    },
    typeTabs: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    typeTab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    typeTabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    typeTabText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    typeTabTextActive: {
      color: '#ffffff',
    },
    fieldContainer: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(500),
      marginBottom: theme.spacing.xs,
    },
    required: {
      color: '#c00',
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    textArea: {
      height: 80,
      paddingTop: theme.spacing.sm,
      textAlignVertical: 'top',
    },
    inputError: {
      borderColor: '#c00',
    },
    selectField: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    selectFieldText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    selectFieldPlaceholder: {
      color: theme.colors.textSecondary,
    },
    selectFieldArrow: {
      fontSize: 20,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
    },
    errorMessage: {
      color: '#c00',
      fontSize: theme.typography.caption.fontSize,
      marginTop: theme.spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    button: {
      flex: 1,
      height: 48,
      borderRadius: theme.radii.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    modalClose: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
    modalContent: {
      flex: 1,
    },
    modalOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalOptionIndented: {
      paddingLeft: theme.spacing.xl,
    },
    modalOptionText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    },
    modalOptionCheck: {
      fontSize: 18,
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
    modalSectionHeader: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
  });
