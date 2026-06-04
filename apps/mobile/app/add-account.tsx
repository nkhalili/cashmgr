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
import { useRouter, Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import {
  AccountType,
  AppError,
  ErrorHandler,
  CreateAccountInputSchema,
  DEFAULT_CURRENCY,
  Currency,
} from '@cashmgr/core';
import { useAccountsService, useCurrenciesService } from '../src/contexts/services-context';
import { useFormValidation } from '../src/hooks/useFormValidation';

const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: 'Cash on hand', value: 'cash' },
  { label: 'Bank', value: 'bank' },
  { label: 'Credit', value: 'credit' },
];

type ModalType = 'accountType' | 'currency' | null;

export default function AddAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const accountsService = useAccountsService();
  const currenciesService = useCurrenciesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = React.useState('');
  const [accountType, setAccountType] = React.useState<AccountType>('cash');
  const [initialBalance, setInitialBalance] = React.useState('');
  const [owesBalance, setOwesBalance] = React.useState(false);
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = React.useState(DEFAULT_CURRENCY);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeModal, setActiveModal] = React.useState<ModalType>(null);

  // Helper to get current form values for validation
  const getFormValues = React.useCallback(() => {
    const raw = initialBalance.trim() ? Math.abs(Number(initialBalance)) : 0;
    const parsed = Number.isFinite(raw) ? raw : 0;
    return {
      name: name.trim(),
      type: accountType,
      initialBalance: accountType === 'credit' && owesBalance ? -parsed : parsed,
      currency: selectedCurrency,
    };
  }, [name, accountType, initialBalance, owesBalance, selectedCurrency]);

  // F-026: Client-side form validation
  const { errors, validateField, validateAll, isValid } = useFormValidation(
    CreateAccountInputSchema
  );

  // Load currencies on mount
  React.useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const data = await currenciesService.listCurrencies(true); // activeOnly
        setCurrencies(data);
        // Set default to primary currency if available
        const primary = data.find((c) => c.isPrimary);
        if (primary) {
          setSelectedCurrency(primary.id);
        }
      } catch (err) {
        // Currencies are not critical for account creation, use default if load fails
        ErrorHandler.handle(err, 'AddAccount.loadCurrencies');
      }
    };

    void loadCurrencies();
  }, [currenciesService]);

  const handleSubmit = React.useCallback(async () => {
    const formValues = getFormValues();

    // F-026: Validate all fields before submission
    if (!validateAll(formValues)) {
      return; // Stop submission if validation fails
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await accountsService.createAccount(formValues);
      // Navigate back to accounts list
      router.back();
    } catch (err) {
      // F-024: Display user-friendly error message from AppError
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [getFormValues, validateAll, accountsService, router]);

  const handleCancel = React.useCallback(() => {
    router.back();
  }, [router]);

  // Helper functions to get display labels
  const getAccountTypeLabel = React.useCallback(() => {
    const option = ACCOUNT_TYPE_OPTIONS.find((o) => o.value === accountType);
    return option ? option.label : null;
  }, [accountType]);

  const getCurrencyLabel = React.useCallback(() => {
    const currency = currencies.find((c) => c.id === selectedCurrency);
    return currency
      ? `${currency.name} (${currency.symbol})${currency.isPrimary ? ' - Primary' : ''}`
      : null;
  }, [currencies, selectedCurrency]);

  // Handle selection from modals
  const handleSelectAccountType = React.useCallback((value: AccountType) => {
    setAccountType(value);
    if (value !== 'credit') setOwesBalance(false);
    setActiveModal(null);
  }, []);

  const handleSelectCurrency = React.useCallback((value: string) => {
    setSelectedCurrency(value);
    setActiveModal(null);
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Account',
          headerBackTitle: 'Accounts',
        }}
      />
      <View style={[styles.container, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        <ScrollView ref={scrollViewRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Account Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Account name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="e.g. Household checking"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={(value) => {
                setName(value);
                // F-026: Validate on change if field already has error (clear error immediately)
                if (errors.name) {
                  validateField('name', {
                    ...getFormValues(),
                    name: value.trim(),
                  });
                }
              }}
              onBlur={() => {
                // F-026: Validate on blur (show error first time)
                validateField('name', getFormValues());
              }}
            />
            {errors.name && <Text style={styles.errorMessage}>{errors.name}</Text>}
          </View>

          {/* Account Type - Modal Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Account type</Text>
            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setActiveModal('accountType')}
            >
              <Text style={styles.selectFieldText}>
                {getAccountTypeLabel() || 'Select account type...'}
              </Text>
              <Text style={styles.selectFieldArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Currency - Modal Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Currency</Text>
            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setActiveModal('currency')}
            >
              <Text style={styles.selectFieldText}>
                {getCurrencyLabel() || 'Select currency...'}
              </Text>
              <Text style={styles.selectFieldArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Initial Balance */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Initial balance</Text>
            <TextInput
              style={[styles.input, errors.initialBalance && styles.inputError]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              value={initialBalance}
              onChangeText={(value) => {
                setInitialBalance(value);
                // F-026: Validate on change if field already has error (clear error immediately)
                if (errors.initialBalance) {
                  const parsed = value.trim() ? Number(value) : 0;
                  validateField('initialBalance', {
                    ...getFormValues(),
                    initialBalance: Number.isFinite(parsed) ? parsed : 0,
                  });
                }
              }}
              onBlur={() => {
                // F-026: Validate on blur (show error first time)
                validateField('initialBalance', getFormValues());
              }}
              onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)}
              keyboardType="decimal-pad"
            />
            {accountType === 'credit' && (
              <>
                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setOwesBalance((prev) => !prev)}
                >
                  <View style={[styles.checkbox, owesBalance && styles.checkboxChecked]}>
                    {owesBalance && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>I currently owe this balance</Text>
                </Pressable>
                <Text style={styles.hintText}>
                  Enter your current balance. Check the box if it is an amount you owe — it will be recorded as a negative balance.
                </Text>
              </>
            )}
            {errors.initialBalance && (
              <Text style={styles.errorMessage}>{errors.initialBalance}</Text>
            )}
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
            style={[styles.button, styles.submitButton, (!isValid || isSubmitting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Save account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>

      {/* Account Type Selection Modal */}
      <Modal
        visible={activeModal === 'accountType'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Account Type</Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={styles.modalOption}
                onPress={() => handleSelectAccountType(option.value)}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
                {accountType === option.value && <Text style={styles.modalOptionCheck}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={activeModal === 'currency'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {currencies.map((currency) => (
              <Pressable
                key={currency.id}
                style={styles.modalOption}
                onPress={() => handleSelectCurrency(currency.id)}
              >
                <Text style={styles.modalOptionText}>
                  {currency.name} ({currency.symbol}){currency.isPrimary ? ' - Primary' : ''}
                </Text>
                {selectedCurrency === currency.id && <Text style={styles.modalOptionCheck}>✓</Text>}
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
    selectFieldArrow: {
      fontSize: 20,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxMark: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: fontWeight(700),
    },
    checkboxLabel: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    },
    hintText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    errorMessage: {
      color: '#c00',
      fontSize: theme.typography.caption.fontSize,
      marginTop: theme.spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
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
    modalOptionText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    },
    modalOptionCheck: {
      fontSize: 18,
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
  });
