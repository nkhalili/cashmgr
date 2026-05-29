import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import { Currency, AppError } from '@cashmgr/core';
import { useCurrenciesService } from '../src/contexts/services-context';

export default function SettingsCurrenciesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currenciesService = useCurrenciesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadCurrencies = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await currenciesService.listCurrencies(true);
      setCurrencies(data);
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load currencies';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currenciesService]);

  React.useEffect(() => {
    void loadCurrencies();
  }, [loadCurrencies]);

  useFocusEffect(
    React.useCallback(() => {
      void loadCurrencies();
    }, [loadCurrencies])
  );

  const handleDelete = React.useCallback(
    async (currency: Currency) => {
      Alert.alert(
        'Delete Currency',
        `Are you sure you want to delete "${currency.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await currenciesService.deleteCurrency(currency.id);
                await loadCurrencies();
              } catch (err) {
                const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to delete currency';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    },
    [currenciesService, loadCurrencies]
  );

  const handleSetPrimary = React.useCallback(
    async (currency: Currency) => {
      Alert.alert(
        'Set Primary Currency',
        `Set "${currency.name}" as your primary currency? All exchange rates will be recalculated.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Primary',
            onPress: async () => {
              try {
                await currenciesService.setPrimaryCurrency(currency.id);
                await loadCurrencies();
              } catch (err) {
                const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to set primary currency';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    },
    [currenciesService, loadCurrencies]
  );

  const handleLongPress = React.useCallback(
    (currency: Currency) => {
      const options: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [
        { text: 'Edit', onPress: () => router.push(`/edit-currency?id=${currency.id}`) },
      ];

      if (!currency.isPrimary) {
        options.push({ text: 'Set as Primary', onPress: () => handleSetPrimary(currency) });
        options.push({ text: 'Delete', style: 'destructive', onPress: () => handleDelete(currency) });
      }

      options.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Currency Actions', `What would you like to do with "${currency.name}"?`, options);
    },
    [router, handleSetPrimary, handleDelete]
  );

  const primaryCurrency = currencies.find((c) => c.isPrimary);
  const subCurrencies = currencies.filter((c) => !c.isPrimary);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Currencies', headerBackTitle: 'Settings' }} />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-currency')}>
        <Text style={styles.addButtonText}>Add Currency</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading currencies...</Text>
          </View>
        ) : (
          <>
            {primaryCurrency && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Primary Currency</Text>
                <View style={styles.currencyItem}>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyName}>{primaryCurrency.name} ({primaryCurrency.id})</Text>
                    <Text style={styles.currencySubtitle}>Base currency for all conversions</Text>
                  </View>
                  <View style={styles.currencyRight}>
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                    <Text style={styles.currencySymbol}>{primaryCurrency.symbol}</Text>
                    <TouchableOpacity
                      style={styles.moreButton}
                      onPress={() => handleLongPress(primaryCurrency)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.moreButtonText}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {subCurrencies.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sub Currencies</Text>
                {subCurrencies.map((currency) => (
                  <View key={currency.id} style={styles.currencyItem}>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyName}>{currency.name} ({currency.id})</Text>
                      <Text style={styles.currencySubtitle}>
                        1 {primaryCurrency?.id} = {currency.exchangeRate} {currency.id}
                      </Text>
                    </View>
                    <View style={styles.currencyRight}>
                      <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => handleLongPress(currency)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.moreButtonText}>⋯</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!primaryCurrency && subCurrencies.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No currencies configured</Text>
                <Text style={styles.emptyText}>
                  Add a primary currency to get started with multi-currency support.
                </Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/add-currency')}>
                  <Text style={styles.emptyButtonText}>Add currency</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Tip: Tap the "⋯" button on any currency to edit, delete, or set as primary.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] => `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingTop: 0 },
    addButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      margin: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    addButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      margin: theme.spacing.lg,
      marginBottom: 0,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#fcc',
    },
    errorText: { color: '#c00', fontWeight: fontWeight(500) },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    loadingText: { color: theme.colors.textSecondary, fontSize: theme.typography.body.fontSize },
    section: { gap: theme.spacing.xs },
    sectionTitle: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    currencyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    currencyInfo: { flex: 1, gap: theme.spacing.xs },
    currencyName: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    currencySubtitle: { fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary },
    currencyRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    currencySymbol: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    primaryBadge: {
      backgroundColor: theme.colors.primarySoft,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
    },
    primaryBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
    },
    moreButton: { padding: theme.spacing.xs, marginLeft: theme.spacing.xs },
    moreButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(700),
      lineHeight: 24,
    },
    emptyState: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: theme.spacing.md },
    emptyTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    emptyText: { fontSize: theme.typography.body.fontSize, color: theme.colors.textSecondary, textAlign: 'center' },
    emptyButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.sm,
    },
    emptyButtonText: { color: '#ffffff', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
    noteCard: {
      backgroundColor: theme.colors.surfaceMuted || theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    noteText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      textAlign: 'center',
    },
  });
