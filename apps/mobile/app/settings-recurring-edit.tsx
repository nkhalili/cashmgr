import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  AppError,
  TransactionType,
  RecurringFrequency,
  RECURRING_FREQUENCY_LABELS,
  RECURRING_FREQUENCIES,
} from '@cashmgr/core';
import {
  useRecurringTransactionsService,
  useAccountsService,
  useCategoriesService,
} from '../src/contexts/services-context';
import { DateInput } from '../src/components/DateInput';

const fontWeight = (weight: number): TextStyle['fontWeight'] =>
  `${weight}` as TextStyle['fontWeight'];

export default function SettingsRecurringEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recurringService = useRecurringTransactionsService();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeModal, setActiveModal] = React.useState<'account' | 'toAccount' | 'category' | 'frequency' | null>(null);

  const [type, setType] = React.useState<TransactionType>('expense');
  const [amount, setAmount] = React.useState('');
  const [frequency, setFrequency] = React.useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [endDateError, setEndDateError] = React.useState<string | null>(null);
  const [accountId, setAccountId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [toAccountId, setToAccountId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  const filteredCategories = React.useMemo(() => {
    if (type === 'transfer') return [];
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  const flattenedCategories = React.useMemo(() => {
    const result: { id: string; label: string; isChild: boolean }[] = [];
    for (const parent of filteredCategories.filter(c => !c.parentId)) {
      result.push({ id: parent.id, label: `${parent.icon ? parent.icon + ' ' : ''}${parent.name}`, isChild: false });
      for (const child of filteredCategories.filter(c => c.parentId === parent.id)) {
        result.push({ id: child.id, label: `  ${child.icon ? child.icon + ' ' : ''}${child.name}`, isChild: true });
      }
    }
    return result;
  }, [filteredCategories]);

  const destinationAccounts = React.useMemo(() =>
    accounts.filter(a => a.id !== accountId),
    [accounts, accountId]
  );

  const getAccountLabel = () => {
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.name} (${account.currency})` : 'Select account...';
  };

  const getToAccountLabel = () => {
    const account = accounts.find(a => a.id === toAccountId);
    return account ? `${account.name} (${account.currency})` : 'Select destination account...';
  };

  const getCategoryLabel = () => {
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.icon ? category.icon + ' ' : ''}${category.name}` : 'Select category...';
  };

  React.useEffect(() => {
    if (!id) return;
    Promise.all([
      recurringService.getRecurringTransactionById(id),
      accountsService.listAccounts(),
      categoriesService.listCategories(true),
    ])
      .then(([rt, accountsData, categoriesData]) => {
        setType(rt.type);
        setAmount(String(rt.amount));
        setFrequency(rt.frequency);
        setStartDate(rt.startDate);
        setEndDate(rt.endDate ?? '');
        setAccountId(rt.accountId);
        setCategoryId(rt.categoryId ?? '');
        setToAccountId(rt.toAccountId ?? '');
        setNotes(rt.notes ?? '');
        setIsActive(rt.isActive);
        setAccounts(accountsData);
        setCategories(categoriesData);
      })
      .catch((err) => {
        setError(err instanceof AppError ? err.getUserMessage() : 'Failed to load');
      })
      .finally(() => setIsLoading(false));
  }, [id, recurringService, accountsService, categoriesService]);

  const handleSave = React.useCallback(async () => {
    if (!id) return;
    if (endDate && endDate <= startDate) {
      setEndDateError('End date must be after start date');
      return;
    }
    setEndDateError(null);
    setIsSubmitting(true);
    setError(null);
    try {
      await recurringService.updateRecurringTransaction(id, {
        amount: Number(amount),
        frequency,
        startDate,
        endDate: endDate || null,
        accountId,
        categoryId: type === 'transfer' ? null : (categoryId || null),
        toAccountId: type === 'transfer' ? (toAccountId || null) : null,
        notes: notes || null,
        isActive,
      });
      router.back();
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  }, [id, type, amount, frequency, startDate, endDate, accountId, categoryId, toAccountId, notes, isActive, recurringService, router]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Recurring', headerBackTitle: 'Recurring' }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.hint}>Changes affect future occurrences only. Past transactions are kept.</Text>

          <View style={styles.form}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeReadOnly}>
                <Text style={styles.typeReadOnlyText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Frequency</Text>
              <TouchableOpacity style={styles.selectField} onPress={() => setActiveModal('frequency')}>
                <Text style={styles.selectFieldText}>{RECURRING_FREQUENCY_LABELS[frequency]}</Text>
                <Text style={styles.selectArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{type === 'transfer' ? 'From Account' : 'Account'}</Text>
              <TouchableOpacity style={styles.selectField} onPress={() => setActiveModal('account')}>
                <Text style={[styles.selectFieldText, !accountId && { color: theme.colors.textSecondary }]}>
                  {getAccountLabel()}
                </Text>
                <Text style={styles.selectArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {type === 'transfer' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>To Account</Text>
                <TouchableOpacity style={styles.selectField} onPress={() => setActiveModal('toAccount')}>
                  <Text style={[styles.selectFieldText, !toAccountId && { color: theme.colors.textSecondary }]}>
                    {getToAccountLabel()}
                  </Text>
                  <Text style={styles.selectArrow}>›</Text>
                </TouchableOpacity>
              </View>
            )}

            {type !== 'transfer' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity style={styles.selectField} onPress={() => setActiveModal('category')}>
                  <Text style={[styles.selectFieldText, !categoryId && { color: theme.colors.textSecondary }]}>
                    {getCategoryLabel()}
                  </Text>
                  <Text style={styles.selectArrow}>›</Text>
                </TouchableOpacity>
              </View>
            )}

            <DateInput label="Start date" value={startDate} onChange={setStartDate} />
            <DateInput
              label="End date (optional)"
              value={endDate}
              onChange={(v) => { setEndDate(v); if (endDateError) setEndDateError(null); }}
              error={endDateError ?? undefined}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Additional details..."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIsActive((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Active</Text>
                <Text style={styles.toggleHint}>
                  {isActive ? 'Generating transactions on schedule' : 'Paused — no new transactions will be created'}
                </Text>
              </View>
              <View style={[styles.toggleTrack, { backgroundColor: isActive ? theme.colors.primary : theme.colors.border }]}>
                <View style={[styles.toggleThumb, { alignSelf: isActive ? 'flex-end' : 'flex-start' }]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={activeModal === 'account'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{type === 'transfer' ? 'Select From Account' : 'Select Account'}</Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView>
            {accounts.map((account) => (
              <Pressable
                key={account.id}
                style={styles.modalOption}
                onPress={() => { setAccountId(account.id); setActiveModal(null); }}
              >
                <Text style={styles.modalOptionText}>{account.name} ({account.currency})</Text>
                {accountId === account.id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

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
          <ScrollView>
            {destinationAccounts.map((account) => (
              <Pressable
                key={account.id}
                style={styles.modalOption}
                onPress={() => { setToAccountId(account.id); setActiveModal(null); }}
              >
                <Text style={styles.modalOptionText}>{account.name} ({account.currency})</Text>
                {toAccountId === account.id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

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
          <ScrollView>
            {flattenedCategories.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.modalOption, item.isChild && styles.modalOptionIndented]}
                onPress={() => { setCategoryId(item.id); setActiveModal(null); }}
              >
                <Text style={styles.modalOptionText}>{item.label}</Text>
                {categoryId === item.id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={activeModal === 'frequency'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Frequency</Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView>
            {RECURRING_FREQUENCIES.map((freq) => (
              <Pressable
                key={freq}
                style={styles.modalOption}
                onPress={() => { setFrequency(freq); setActiveModal(null); }}
              >
                <Text style={styles.modalOptionText}>{RECURRING_FREQUENCY_LABELS[freq]}</Text>
                {frequency === freq && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg },
    errorBanner: {
      backgroundColor: '#fee', padding: theme.spacing.md,
      borderRadius: theme.radii.md, borderWidth: 1, borderColor: '#fcc',
      marginBottom: theme.spacing.md,
    },
    errorText: { color: '#c00' },
    hint: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    form: { gap: theme.spacing.md },
    fieldContainer: { gap: theme.spacing.xs },
    label: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(500),
    },
    input: {
      height: 48, borderWidth: 1, borderColor: theme.colors.border,
      borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body.fontSize, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    textArea: { height: 80, paddingTop: theme.spacing.sm, textAlignVertical: 'top' },
    selectField: {
      height: 48, borderWidth: 1, borderColor: theme.colors.border,
      borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between',
    },
    selectFieldText: { fontSize: theme.typography.body.fontSize, color: theme.colors.textPrimary },
    selectArrow: { fontSize: 20, color: theme.colors.textSecondary },
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl },
    button: {
      flex: 1, height: 48, borderRadius: theme.radii.md,
      justifyContent: 'center', alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    },
    cancelText: { color: theme.colors.textPrimary, fontWeight: fontWeight(600) },
    saveButton: { backgroundColor: theme.colors.primary },
    saveText: { color: '#fff', fontWeight: fontWeight(600) },
    buttonDisabled: { opacity: 0.5 },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
    },
    toggleHint: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    toggleTrack: {
      width: 44,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      paddingHorizontal: 3,
      marginLeft: theme.spacing.md,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#fff',
    },
    modalContainer: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    modalClose: { fontSize: theme.typography.body.fontSize, color: theme.colors.primary, fontWeight: fontWeight(600) },
    modalOption: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    modalOptionText: { fontSize: theme.typography.body.fontSize, color: theme.colors.textPrimary },
    modalOptionIndented: { paddingLeft: theme.spacing.xl },
    check: { fontSize: 18, color: theme.colors.primary, fontWeight: fontWeight(600) },
    typeReadOnly: {
      height: 48, borderWidth: 1, borderColor: theme.colors.border,
      borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: 'center',
    },
    typeReadOnlyText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
      fontWeight: fontWeight(500),
      textTransform: 'capitalize',
    },
  });
