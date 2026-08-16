import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useKeyboardHeight } from '../src/hooks/useKeyboardHeight';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@cashmgr/ui';
import { AppError, formatCurrency } from '@cashmgr/core';
import type { BudgetWithProgress } from '@cashmgr/core';
import { useBudgetsService, useCurrenciesService } from '../src/contexts/services-context';

export default function EditBudgetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budgetsService = useBudgetsService();
  const currenciesService = useCurrenciesService();

  const [budget, setBudget] = React.useState<BudgetWithProgress | null>(null);
  const [amount, setAmount] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        const [primary] = await Promise.all([currenciesService.getPrimaryCurrency()]);
        if (primary) setCurrency(primary.id);

        // Find the budget in the current month's list — we load all and find by id
        // We get it via getBudgetsWithProgress using its stored month/year
        // First get a basic budget to know the month/year
        const adapter = (budgetsService as any).adapter;
        const raw = await adapter.getBudgetById(id);
        if (!raw) {
          Alert.alert('Error', 'Budget not found');
          router.back();
          return;
        }
        const all = await budgetsService.getBudgetsWithProgress(raw.month, raw.year);
        const found = all.find((b) => b.id === id);
        if (found) {
          setBudget(found);
          setAmount(String(found.amount));
        }
      } catch {
        Alert.alert('Error', 'Failed to load budget');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [id, budgetsService, currenciesService, router]);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }
    if (!id) return;

    setIsSubmitting(true);
    try {
      await budgetsService.updateBudget(id, { amount: parsed });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof AppError ? err.getUserMessage() : 'Failed to update budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthLabel = budget
    ? new Date(budget.year, budget.month - 1, 1).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const keyboardHeight = useKeyboardHeight();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flex: 1 },
    content: { padding: theme.spacing.md },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.components.interactiveRadius,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    summaryTitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
    summaryValue: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
      overflow: 'hidden',
      marginTop: theme.spacing.sm,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    periodText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    actions: {
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.components.interactiveRadius,
      alignItems: 'center',
    },
    submitButtonDisabled: { opacity: 0.6 },
    submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Budget' }} />
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </>
    );
  }

  const spentPercent = budget ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
  const progressColor =
    spentPercent >= 90 ? theme.colors.danger :
    spentPercent >= 70 ? theme.colors.warning :
    theme.colors.success;

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Budget', headerBackTitle: 'Budget' }} />
      <View style={[styles.container, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {budget && (
            <View style={styles.categoryHeader}>
              <View style={[styles.iconCircle, { backgroundColor: budget.categoryColor ?? theme.colors.surfaceMuted }]}>
                <Text style={{ fontSize: 18 }}>{budget.categoryIcon ?? '📦'}</Text>
              </View>
              <View>
                <Text style={styles.categoryName}>{budget.categoryName}</Text>
                <Text style={styles.periodText}>{monthLabel}</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>Budget Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
          />

          {budget && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Current progress</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Spent</Text>
                <Text style={styles.summaryValue}>{formatCurrency(budget.spent, currency)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Budget</Text>
                <Text style={styles.summaryValue}>{formatCurrency(budget.amount, currency)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={{
                    width: `${spentPercent}%`,
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: progressColor,
                  }}
                />
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
