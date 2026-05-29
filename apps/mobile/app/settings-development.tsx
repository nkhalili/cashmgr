import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import { AppError, ErrorHandler } from '@cashmgr/core';
import { seedMobileDatabase, clearMobileSeedData, hasMobileData } from '../src/database/mobile-seed';

export default function SettingsDevelopmentScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [isSeeding, setIsSeeding] = React.useState(false);
  const [hasData, setHasData] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checkHasData = React.useCallback(async () => {
    try {
      const result = await hasMobileData();
      setHasData(result);
    } catch (err) {
      ErrorHandler.handle(err, 'SettingsDevelopment.checkHasData');
    }
  }, []);

  React.useEffect(() => {
    void checkHasData();
  }, [checkHasData]);

  const handleLoadSampleData = React.useCallback(async () => {
    Alert.alert(
      'Load Sample Data',
      'This will add 4 accounts, 15 categories, and ~93 transactions to your database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Data',
          onPress: async () => {
            setIsSeeding(true);
            setError(null);
            try {
              await seedMobileDatabase();
              await checkHasData();
              Alert.alert('Success', 'Sample data loaded successfully!');
            } catch (err) {
              const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load sample data';
              setError(errorMessage);
              Alert.alert('Error', errorMessage);
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ]
    );
  }, [checkHasData]);

  const handleClearSampleData = React.useCallback(async () => {
    Alert.alert(
      'Clear Sample Data',
      'This will delete ALL accounts, categories, and transactions from your database. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            setIsSeeding(true);
            setError(null);
            try {
              await clearMobileSeedData();
              await checkHasData();
              Alert.alert('Success', 'All data cleared successfully!');
            } catch (err) {
              const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to clear data';
              setError(errorMessage);
              Alert.alert('Error', errorMessage);
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ]
    );
  }, [checkHasData]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Development', headerBackTitle: 'Settings' }} />

      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.description}>
          {hasData
            ? 'Load sample data to test features with realistic accounts, categories, and transactions.'
            : 'Your database is empty. Load sample data to get started quickly.'}
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <TouchableOpacity
            style={[styles.primaryButton, isSeeding && styles.buttonDisabled]}
            onPress={handleLoadSampleData}
            disabled={isSeeding}
          >
            <Text style={styles.primaryButtonText}>
              {isSeeding ? 'Loading...' : 'Load Sample Data'}
            </Text>
          </TouchableOpacity>
          {hasData && (
            <TouchableOpacity
              style={[styles.dangerButton, isSeeding && styles.buttonDisabled]}
              onPress={handleClearSampleData}
              disabled={isSeeding}
            >
              <Text style={styles.dangerButtonText}>
                {isSeeding ? 'Clearing...' : 'Clear All Data'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] => `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    description: { color: theme.colors.textSecondary, lineHeight: 20 },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#fcc',
    },
    errorText: { color: '#c00', fontWeight: fontWeight(500) },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
    },
    primaryButtonText: { color: '#ffffff', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
    dangerButton: {
      backgroundColor: '#fee',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#fcc',
    },
    dangerButtonText: { color: '#c00', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
    buttonDisabled: { opacity: 0.5 },
  });
