import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextStyle,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import { AppError, ErrorHandler, CreateCurrencyInputSchema, Currency } from '@cashmgr/core';
import { useCurrenciesService } from '../src/contexts/services-context';
import { useFormValidation } from '../src/hooks/useFormValidation';

const COMMON_CURRENCIES = [
  { id: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 'EUR', name: 'Euro', symbol: '€' },
  { id: 'GBP', name: 'British Pound', symbol: '£' },
  { id: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { id: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { id: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { id: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { id: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { id: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

export default function AddCurrencyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currenciesService = useCurrenciesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [currencyId, setCurrencyId] = React.useState('');
  const [currencyName, setCurrencyName] = React.useState('');
  const [currencySymbol, setCurrencySymbol] = React.useState('');
  const [exchangeRate, setExchangeRate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetchingRate, setIsFetchingRate] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rateSource, setRateSource] = React.useState<'manual' | 'fetched'>('manual');
  const [primaryCurrency, setPrimaryCurrency] = React.useState<Currency | null>(null);

  // Helper to get current form values for validation
  const getFormValues = React.useCallback(
    () => ({
      id: currencyId.trim(),
      name: currencyName.trim(),
      symbol: currencySymbol.trim(),
      exchangeRate: exchangeRate.trim() ? Number(exchangeRate) : 1.0,
      isPrimary: false,
    }),
    [currencyId, currencyName, currencySymbol, exchangeRate]
  );

  // F-026: Client-side form validation
  const { errors, validateField, validateAll, clearErrors, isValid } = useFormValidation(
    CreateCurrencyInputSchema
  );

  // Load primary currency on mount
  React.useEffect(() => {
    const loadPrimaryCurrency = async () => {
      try {
        const currencies = await currenciesService.listCurrencies(true);
        const primary = currencies.find((c) => c.isPrimary);
        setPrimaryCurrency(primary || null);
      } catch (err) {
        // Primary currency is not critical for form, ignore error
        ErrorHandler.handle(err, 'AddCurrency.loadPrimaryCurrency');
      }
    };

    void loadPrimaryCurrency();
  }, [currenciesService]);

  const handleSelectCurrency = React.useCallback(
    (curr: typeof COMMON_CURRENCIES[0]) => {
      setCurrencyId(curr.id);
      setCurrencyName(curr.name);
      setCurrencySymbol(curr.symbol);
      clearErrors();
    },
    [clearErrors]
  );

  const handleFetchRate = React.useCallback(async () => {
    if (!currencyId.trim()) {
      setError('Please select a currency first');
      return;
    }

    setIsFetchingRate(true);
    setError(null);

    try {
      const rate = await currenciesService.fetchCurrentRate(currencyId);
      setExchangeRate(rate.toString());
      setRateSource('fetched');
    } catch (err) {
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to fetch exchange rate. Please enter manually.';
      setError(errorMessage);
    } finally {
      setIsFetchingRate(false);
    }
  }, [currencyId, currenciesService]);

  const handleSubmit = React.useCallback(async () => {
    const formValues = getFormValues();

    // F-026: Validate all fields before submission
    if (!validateAll(formValues)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await currenciesService.createCurrency(formValues);
      router.back();
    } catch (err) {
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to add currency';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [getFormValues, validateAll, currenciesService, router]);

  const handleCancel = React.useCallback(() => {
    router.back();
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Currency',
          headerBackTitle: 'Settings',
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Currency</Text>
            <Text style={styles.subtitle}>Add a new currency with exchange rate</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Quick Select */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Quick Select</Text>
              <View style={styles.quickSelectContainer}>
                {COMMON_CURRENCIES.map((curr) => (
                  <TouchableOpacity
                    key={curr.id}
                    style={[
                      styles.quickSelectButton,
                      currencyId === curr.id && styles.quickSelectButtonActive,
                    ]}
                    onPress={() => handleSelectCurrency(curr)}
                  >
                    <Text
                      style={[
                        styles.quickSelectButtonText,
                        currencyId === curr.id && styles.quickSelectButtonTextActive,
                      ]}
                    >
                      {curr.id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Currency Code */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Currency Code (ISO 4217) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.id && styles.inputError]}
                placeholder="e.g., EUR, GBP, JPY"
                placeholderTextColor={theme.colors.textSecondary}
                value={currencyId}
                onChangeText={(value) => {
                  const upperValue = value.toUpperCase();
                  setCurrencyId(upperValue);
                  if (errors.id) {
                    validateField('id', {
                      ...getFormValues(),
                      id: upperValue.trim(),
                    });
                  }
                }}
                onBlur={() => validateField('id', getFormValues())}
                autoCapitalize="characters"
                maxLength={3}
              />
              {errors.id && <Text style={styles.errorMessage}>{errors.id}</Text>}
            </View>

            {/* Currency Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Currency Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g., Euro, British Pound"
                placeholderTextColor={theme.colors.textSecondary}
                value={currencyName}
                onChangeText={(value) => {
                  setCurrencyName(value);
                  if (errors.name) {
                    validateField('name', {
                      ...getFormValues(),
                      name: value.trim(),
                    });
                  }
                }}
                onBlur={() => validateField('name', getFormValues())}
              />
              {errors.name && <Text style={styles.errorMessage}>{errors.name}</Text>}
            </View>

            {/* Currency Symbol */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Currency Symbol <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.symbol && styles.inputError]}
                placeholder="e.g., €, £, ¥"
                placeholderTextColor={theme.colors.textSecondary}
                value={currencySymbol}
                onChangeText={(value) => {
                  setCurrencySymbol(value);
                  if (errors.symbol) {
                    validateField('symbol', {
                      ...getFormValues(),
                      symbol: value.trim(),
                    });
                  }
                }}
                onBlur={() => validateField('symbol', getFormValues())}
              />
              {errors.symbol && <Text style={styles.errorMessage}>{errors.symbol}</Text>}
            </View>

            {/* Exchange Rate */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Exchange Rate (1 {primaryCurrency?.id || 'Primary'} =)
              </Text>
              <TextInput
                style={[styles.input, errors.exchangeRate && styles.inputError]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={exchangeRate}
                onChangeText={(value) => {
                  setExchangeRate(value);
                  setRateSource('manual');
                  if (errors.exchangeRate) {
                    const parsed = value.trim() ? Number(value) : 1.0;
                    validateField('exchangeRate', {
                      ...getFormValues(),
                      exchangeRate: Number.isFinite(parsed) ? parsed : 1.0,
                    });
                  }
                }}
                onBlur={() => validateField('exchangeRate', getFormValues())}
                keyboardType="decimal-pad"
              />
              {errors.exchangeRate && (
                <Text style={styles.errorMessage}>{errors.exchangeRate}</Text>
              )}

              {/* Fetch Rate Button */}
              <TouchableOpacity
                style={[
                  styles.fetchButton,
                  (isFetchingRate || !currencyId.trim()) && styles.fetchButtonDisabled,
                ]}
                onPress={handleFetchRate}
                disabled={isFetchingRate || !currencyId.trim()}
              >
                {isFetchingRate ? (
                  <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                ) : (
                  <Text style={styles.fetchButtonText}>Fetch current rate</Text>
                )}
              </TouchableOpacity>

              {rateSource === 'fetched' && (
                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>✓ Rate fetched from API</Text>
                </View>
              )}
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                Note: You can fetch the latest exchange rate from the internet or enter it manually.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Actions */}
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
              <Text style={styles.submitButtonText}>Add currency</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    content: {
      padding: theme.spacing.lg,
      paddingBottom: 100,
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
    form: {
      gap: theme.spacing.lg,
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
    inputError: {
      borderColor: '#c00',
    },
    errorMessage: {
      color: '#c00',
      fontSize: theme.typography.caption.fontSize,
      marginTop: theme.spacing.xs,
    },
    quickSelectContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    quickSelectButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    quickSelectButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    quickSelectButtonText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
      fontWeight: fontWeight(600),
    },
    quickSelectButtonTextActive: {
      color: '#ffffff',
    },
    fetchButton: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    fetchButtonDisabled: {
      opacity: 0.5,
    },
    fetchButtonText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(500),
    },
    successBadge: {
      marginTop: theme.spacing.xs,
      alignSelf: 'flex-start',
    },
    successBadgeText: {
      fontSize: theme.typography.caption.fontSize,
      color: '#155724',
    },
    noteCard: {
      backgroundColor: theme.colors.surfaceMuted || theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
    },
    noteText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    actions: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
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
  });
