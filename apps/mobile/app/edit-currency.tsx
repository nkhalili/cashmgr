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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import { AppError, CreateCurrencyInputSchema, Currency } from '@cashmgr/core';
import { useCurrenciesService } from '../src/contexts/services-context';
import { useFormValidation } from '../src/hooks/useFormValidation';

export default function EditCurrencyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currenciesService = useCurrenciesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [currencyName, setCurrencyName] = React.useState('');
  const [currencySymbol, setCurrencySymbol] = React.useState('');
  const [exchangeRate, setExchangeRate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetchingRate, setIsFetchingRate] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rateSource, setRateSource] = React.useState<'manual' | 'fetched'>('manual');

  // Store currency data
  const [currency, setCurrency] = React.useState<Currency | null>(null);
  const [primaryCurrency, setPrimaryCurrency] = React.useState<Currency | null>(null);

  // Helper to get form values for validation
  const getFormValues = React.useCallback(
    () => ({
      id: currency?.id || '',
      name: currencyName.trim(),
      symbol: currencySymbol.trim(),
      exchangeRate: exchangeRate.trim() ? Number(exchangeRate) : currency?.exchangeRate || 1.0,
      isPrimary: currency?.isPrimary || false,
    }),
    [currency, currencyName, currencySymbol, exchangeRate]
  );

  // F-026: Client-side form validation
  const { errors, validateField, validateAll, isValid } = useFormValidation(
    CreateCurrencyInputSchema
  );

  // Load currency data on mount
  React.useEffect(() => {
    const loadCurrency = async () => {
      if (!id) {
        setError('Currency ID is missing');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const currencies = await currenciesService.listCurrencies(true);
        const curr = currencies.find((c) => c.id === id);

        if (!curr) {
          setError('Currency not found');
          setIsLoading(false);
          return;
        }

        setCurrency(curr);
        setCurrencyName(curr.name);
        setCurrencySymbol(curr.symbol);
        setExchangeRate(curr.exchangeRate.toString());

        // Find primary currency for label
        const primary = currencies.find((c) => c.isPrimary);
        setPrimaryCurrency(primary || null);
      } catch (err) {
        const errorMessage =
          err instanceof AppError ? err.getUserMessage() : 'Failed to load currency';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCurrency();
  }, [id, currenciesService]);

  const handleFetchRate = React.useCallback(async () => {
    if (!currency) return;

    setIsFetchingRate(true);
    setError(null);

    try {
      const rate = await currenciesService.fetchCurrentRate(currency.id);
      setExchangeRate(rate.toString());
      setRateSource('fetched');
    } catch (err) {
      const errorMessage =
        err instanceof AppError
          ? err.getUserMessage()
          : 'Failed to fetch exchange rate. Please enter manually.';
      setError(errorMessage);
    } finally {
      setIsFetchingRate(false);
    }
  }, [currency, currenciesService]);

  const handleSubmit = React.useCallback(async () => {
    if (!currency) return;

    const formValues = getFormValues();

    // F-026: Validate all fields before submission
    if (!validateAll(formValues)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await currenciesService.updateCurrency(currency.id, {
        name: formValues.name,
        symbol: formValues.symbol,
        exchangeRate: formValues.exchangeRate,
      });
      router.back();
    } catch (err) {
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to update currency';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [currency, getFormValues, validateAll, currenciesService, router]);

  const handleCancel = React.useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Currency',
            headerBackTitle: 'Settings',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading currency...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Currency',
          headerBackTitle: 'Settings',
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Currency</Text>
            <Text style={styles.subtitle}>Update {currency?.id} details</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
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

            {/* Exchange Rate - only editable for non-primary currencies */}
            {!currency?.isPrimary ? (
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
                  style={[styles.fetchButton, isFetchingRate && styles.fetchButtonDisabled]}
                  onPress={handleFetchRate}
                  disabled={isFetchingRate}
                >
                  {isFetchingRate ? (
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                  ) : (
                    <Text style={styles.fetchButtonText}>Fetch latest rate</Text>
                  )}
                </TouchableOpacity>

                {rateSource === 'fetched' && (
                  <View style={styles.successBadge}>
                    <Text style={styles.successBadgeText}>✓ Rate fetched from API</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noteCard}>
                <Text style={styles.noteText}>
                  Note: Primary currency exchange rate is always 1.0 and cannot be edited.
                </Text>
              </View>
            )}
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
              <Text style={styles.submitButtonText}>Save changes</Text>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
    },
    content: {
      padding: 16,
      paddingBottom: 100,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: fontWeight(700),
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: 12,
      marginBottom: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#fcc',
    },
    errorText: {
      color: '#c00',
      fontWeight: fontWeight(500),
    },
    form: {
      gap: 24,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(500),
      marginBottom: 4,
    },
    required: {
      color: '#c00',
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    inputError: {
      borderColor: '#c00',
    },
    errorMessage: {
      color: '#c00',
      fontSize: 12,
      marginTop: 4,
    },
    fetchButton: {
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    fetchButtonDisabled: {
      opacity: 0.5,
    },
    fetchButtonText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(500),
    },
    successBadge: {
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    successBadgeText: {
      fontSize: 12,
      color: '#155724',
    },
    noteCard: {
      backgroundColor: theme.colors.surfaceMuted || theme.colors.surface,
      borderRadius: 8,
      padding: 12,
    },
    noteText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    actions: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    button: {
      flex: 1,
      height: 48,
      borderRadius: 8,
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
      fontSize: 16,
      fontWeight: fontWeight(600),
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: fontWeight(600),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
