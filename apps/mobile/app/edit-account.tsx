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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import {
  AccountType,
  AppError,
  CreateAccountInputSchema,
  formatCurrency,
} from '@cashmgr/core';
import { useAccountsService } from '../src/contexts/services-context';
import { useFormValidation } from '../src/hooks/useFormValidation';

const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: 'Cash on hand', value: 'cash' },
  { label: 'Bank', value: 'bank' },
  { label: 'Credit', value: 'credit' },
];

export default function EditAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountsService = useAccountsService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = React.useState('');
  const [accountType, setAccountType] = React.useState<AccountType>('cash');
  const [activeModal, setActiveModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Store original account data for read-only display
  const [currentBalance, setCurrentBalance] = React.useState(0);
  const [currency, setCurrency] = React.useState('USD');
  const [initialBalance, setInitialBalance] = React.useState(0);

  // Helper to get form values for validation
  // F-027: Only name and type can be edited, but we need full object for validation
  const getFormValues = React.useCallback(
    () => ({
      name: name.trim(),
      type: accountType,
      initialBalance: initialBalance,
      currency: currency,
    }),
    [name, accountType, initialBalance, currency]
  );

  // F-026: Client-side form validation
  const { errors, validateField, validateAll, isValid } = useFormValidation(
    CreateAccountInputSchema
  );

  // Load account data on mount
  React.useEffect(() => {
    const loadAccount = async () => {
      if (!id) {
        setError('Account ID is missing');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const accounts = await accountsService.listAccounts();
        const account = accounts.find((a) => a.id === id);

        if (!account) {
          setError('Account not found');
          setIsLoading(false);
          return;
        }

        setName(account.name);
        setAccountType(account.type);
        setCurrentBalance(account.balance);
        setCurrency(account.currency);
        setInitialBalance(account.initialBalance);
      } catch (err) {
        const errorMessage =
          err instanceof AppError ? err.getUserMessage() : 'Failed to load account';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void loadAccount();
  }, [id, accountsService]);

  const handleSubmit = React.useCallback(async () => {
    if (!id) return;

    const formValues = getFormValues();

    // F-026: Validate all fields before submission
    if (!validateAll(formValues)) {
      return; // Stop submission if validation fails
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // F-027: Only update name and type
      await accountsService.updateAccount(id, {
        name: formValues.name,
        type: formValues.type,
      });
      // Navigate back to accounts list
      router.back();
    } catch (err) {
      // F-024: Display user-friendly error message from AppError
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to update account';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [id, getFormValues, validateAll, accountsService, router]);

  const handleCancel = React.useCallback(() => {
    router.back();
  }, [router]);

  const getAccountTypeLabel = React.useCallback(() => {
    const option = ACCOUNT_TYPE_OPTIONS.find((o) => o.value === accountType);
    return option ? option.label : null;
  }, [accountType]);

  const handleSelectAccountType = React.useCallback((value: AccountType) => {
    setAccountType(value);
    setActiveModal(false);
  }, []);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Account',
            headerBackTitle: 'Accounts',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading account...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Account',
          headerBackTitle: 'Accounts',
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Account</Text>
            <Text style={styles.subtitle}>Update account details</Text>
          </View>

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
                onPress={() => setActiveModal(true)}
              >
                <Text style={styles.selectFieldText}>
                  {getAccountTypeLabel() || 'Select account type...'}
                </Text>
                <Text style={styles.selectFieldArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Read-only Current Balance Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Current balance</Text>
              <Text style={styles.infoValue}>{formatCurrency(currentBalance, currency)}</Text>
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                Note: Initial balance cannot be edited. Modify transactions to adjust your current
                balance.
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
              <Text style={styles.submitButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Type Selection Modal */}
      <Modal
        visible={activeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Account Type</Text>
            <Pressable onPress={() => setActiveModal(false)}>
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
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body.fontSize,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: 100, // Space for fixed bottom actions
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
    errorMessage: {
      color: '#c00',
      fontSize: theme.typography.caption.fontSize,
      marginTop: theme.spacing.xs,
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(500),
    },
    infoValue: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
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
