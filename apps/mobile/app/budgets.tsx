import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@cashmgr/ui';
import { BudgetWithProgress, AppError, formatCurrency } from '@cashmgr/core';
import { useBudgetsService, useCurrenciesService } from '../src/contexts/services-context';

function ProgressBar({ percentage, theme }: { percentage: number; theme: ReturnType<typeof useTheme> }) {
  const clamped = Math.min(percentage, 100);
  const color =
    clamped >= 90 ? theme.colors.danger :
    clamped >= 70 ? theme.colors.warning :
    theme.colors.success;

  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${clamped}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

export default function BudgetsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const budgetsService = useBudgetsService();
  const currenciesService = useCurrenciesService();

  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const [budgets, setBudgets] = React.useState<BudgetWithProgress[]>([]);
  const [currency, setCurrency] = React.useState('USD');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadBudgets = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, primary] = await Promise.all([
        budgetsService.getBudgetsWithProgress(month, year),
        currenciesService.getPrimaryCurrency(),
      ]);
      setBudgets(data);
      if (primary) setCurrency(primary.id);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to load budgets');
    } finally {
      setIsLoading(false);
    }
  }, [budgetsService, currenciesService, month, year]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await budgetsService.getBudgetsWithProgress(month, year);
      setBudgets(data);
    } catch {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  }, [budgetsService, month, year]);

  useFocusEffect(
    React.useCallback(() => {
      void loadBudgets();
    }, [loadBudgets])
  );

  const navigateMonth = (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const handleDelete = (budget: BudgetWithProgress) => {
    Alert.alert(
      'Delete Budget',
      `Delete the budget for "${budget.categoryName}"?\n\nThis will also stop it from being carried forward to future months. You can always create a new budget to resume tracking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetsService.deleteBudget(budget.id);
              await loadBudgets();
            } catch {
              Alert.alert('Error', 'Failed to delete budget');
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    monthLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    navButton: {
      padding: theme.spacing.xs,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    iconText: { fontSize: 18 },
    categoryName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    moreButton: {
      padding: theme.spacing.xs,
    },
    amountsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    spentText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    budgetText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    percentageText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
      textAlign: 'right',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      margin: theme.spacing.md,
      borderRadius: theme.components.interactiveRadius,
      alignItems: 'center',
    },
    addButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      margin: theme.spacing.md,
      borderRadius: theme.components.interactiveRadius,
    },
    errorText: { color: '#c00', fontWeight: '500' },
  });

  const renderItem = ({ item }: { item: BudgetWithProgress }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/edit-budget?id=${item.id}`)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: item.categoryColor ?? theme.colors.surfaceMuted }]}>
          <Text style={styles.iconText}>{item.categoryIcon ?? '📦'}</Text>
        </View>
        <Text style={styles.categoryName}>{item.categoryName}</Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() =>
            Alert.alert('Budget Actions', `"${item.categoryName}"`, [
              { text: 'Edit', onPress: () => router.push(`/edit-budget?id=${item.id}`) },
              { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.amountsRow}>
        <Text style={styles.spentText}>Spent: {formatCurrency(item.spent, currency)}</Text>
        <Text style={styles.budgetText}>Budget: {formatCurrency(item.amount, currency)}</Text>
      </View>

      <ProgressBar percentage={item.percentage} theme={theme} />

      <Text style={styles.percentageText}>
        {item.percentage.toFixed(0)}% used · {item.remaining >= 0
          ? `${formatCurrency(item.remaining, currency)} remaining`
          : `${formatCurrency(Math.abs(item.remaining), currency)} over budget`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Budgets', headerBackTitle: 'Settings' }} />

      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(-1)}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(1)}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptyText, { marginTop: theme.spacing.md }]}>Loading budgets...</Text>
        </View>
      ) : budgets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No budgets yet</Text>
          <Text style={styles.emptyText}>
            Set spending limits for your expense categories to track your monthly budget.
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { width: '100%' }]}
            onPress={() => router.push(`/add-budget?month=${month}&year=${year}`)}
          >
            <Text style={styles.addButtonText}>Create first budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            style={{ flex: 1 }}
            data={budgets}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push(`/add-budget?month=${month}&year=${year}`)}
          >
            <Text style={styles.addButtonText}>Add budget</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
