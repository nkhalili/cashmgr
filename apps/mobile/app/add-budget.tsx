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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@cashmgr/ui';
import { Category, AppError } from '@cashmgr/core';
import { useBudgetsService, useCategoriesService } from '../src/contexts/services-context';

export default function AddBudgetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { month: monthParam, year: yearParam } = useLocalSearchParams<{ month?: string; year?: string }>();
  const budgetsService = useBudgetsService();
  const categoriesService = useCategoriesService();

  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  const [amount, setAmount] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  const [expenseCategories, setExpenseCategories] = React.useState<Category[]>([]);
  const [existingCategoryIds, setExistingCategoryIds] = React.useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [cats, existing] = await Promise.all([
          categoriesService.listCategories(true),
          budgetsService.listBudgets(month, year),
        ]);
        const topLevelExpense = cats.filter((c) => c.type === 'expense' && !c.parentId);
        setExpenseCategories(topLevelExpense);
        setExistingCategoryIds(new Set(existing.map((b) => b.categoryId)));
      } catch {
        // ignore
      }
    };
    void load();
  }, [budgetsService, categoriesService, month, year]);

  const availableCategories = expenseCategories.filter(
    (c) => !existingCategoryIds.has(c.id)
  );

  const handleSelectCategory = () => {
    if (availableCategories.length === 0) {
      Alert.alert('No categories available', 'All expense categories already have budgets for this month.');
      return;
    }
    Alert.alert(
      'Select Category',
      'Choose an expense category',
      [
        ...availableCategories.map((cat) => ({
          text: `${cat.icon ?? ''} ${cat.name}`.trim(),
          onPress: () => setSelectedCategory(cat),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await budgetsService.createBudget({
        categoryId: selectedCategory.id,
        amount: parsed,
        month,
        year,
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof AppError ? err.getUserMessage() : 'Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
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
    select: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.components.interactiveRadius,
      padding: theme.spacing.md,
    },
    selectText: { fontSize: 16, color: theme.colors.textPrimary },
    selectPlaceholder: { color: theme.colors.textMuted },
    periodBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      padding: theme.spacing.sm,
      marginTop: theme.spacing.md,
      alignItems: 'center',
    },
    periodText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    actions: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.components.interactiveRadius,
      alignItems: 'center',
    },
    submitButtonDisabled: { opacity: 0.6 },
    submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    hint: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
    },
    hintText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Add Budget', headerBackTitle: 'Budget' }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.periodBadge}>
            <Text style={styles.periodText}>{monthLabel}</Text>
          </View>

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity style={styles.select} onPress={handleSelectCategory}>
            <Text style={[styles.selectText, !selectedCategory && styles.selectPlaceholder]}>
              {selectedCategory
                ? `${selectedCategory.icon ?? ''} ${selectedCategory.name}`.trim()
                : 'Select expense category'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Budget Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
          />
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              This amount will be used as the default for this category every month going forward. You can always adjust it for any individual month.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create budget</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
