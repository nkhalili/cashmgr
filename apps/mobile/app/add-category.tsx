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
import { Category, AppError, CategoryType } from '@cashmgr/core';
import { useCategoriesService } from '../src/contexts/services-context';

const COLOR_PALETTE = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#795548',
];

const EMOJI_ICONS = [
  '\u{1F4B0}', '\u{1F4BC}', '\u{1F4C8}', '\u{1F381}', '\u{1F4B5}',
  '\u{1F6D2}', '\u{1F3E0}', '\u{1F4A1}', '\u{1F697}', '\u{1F37D}',
  '\u{1F3AE}', '\u{1F455}', '\u{1F48A}', '\u{1F4DA}', '\u{2708}',
  '\u{1F3AC}', '\u{2615}', '\u{1F3CB}', '\u{1F43E}', '\u{1F4B3}',
];

export default function AddCategoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const categoriesService = useCategoriesService();

  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = React.useState(EMOJI_ICONS[0]);
  const [parentId, setParentId] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [topLevelCategories, setTopLevelCategories] = React.useState<Category[]>([]);

  const categoryType: CategoryType = (type === 'income' ? 'income' : 'expense');

  React.useEffect(() => {
    const loadParentCategories = async () => {
      try {
        const categories = await categoriesService.listCategories(true);
        const topLevel = categories.filter(c => c.type === categoryType && !c.parentId);
        setTopLevelCategories(topLevel);
      } catch (err) {
        // Ignore errors loading parent categories
      }
    };
    void loadParentCategories();
  }, [categoriesService, categoryType]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsSubmitting(true);

    try {
      await categoriesService.createCategory({
        name: name.trim(),
        type: categoryType,
        color,
        icon,
        parentId: parentId || undefined,
      });
      router.back();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to create category';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
    },
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
    pickerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: theme.components.interactiveRadius,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconButtonSelected: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    iconText: {
      fontSize: 22,
    },
    colorButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'white',
    },
    colorButtonSelected: {
      borderWidth: 3,
      borderColor: '#333',
    },
    select: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.components.interactiveRadius,
      padding: theme.spacing.md,
    },
    selectText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    selectPlaceholder: {
      color: theme.colors.textMuted,
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
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: `Add ${categoryType === 'income' ? 'Income' : 'Expense'} Category`,
          headerBackTitle: 'Categories',
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Category Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Groceries, Salary"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.label}>Icon</Text>
          <View style={styles.pickerContainer}>
            {EMOJI_ICONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.iconButton, icon === emoji && styles.iconButtonSelected]}
                onPress={() => setIcon(emoji)}
              >
                <Text style={styles.iconText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Color</Text>
          <View style={styles.pickerContainer}>
            {COLOR_PALETTE.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorButton,
                  { backgroundColor: c },
                  color === c && styles.colorButtonSelected,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {topLevelCategories.length > 0 && (
            <>
              <Text style={styles.label}>Parent Category (optional)</Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => {
                  Alert.alert(
                    'Select Parent',
                    'Choose a parent category',
                    [
                      { text: 'No parent', onPress: () => setParentId('') },
                      ...topLevelCategories.map((cat) => ({
                        text: `${cat.icon} ${cat.name}`,
                        onPress: () => setParentId(cat.id),
                      })),
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={[styles.selectText, !parentId && styles.selectPlaceholder]}>
                  {parentId
                    ? `${topLevelCategories.find(c => c.id === parentId)?.icon} ${topLevelCategories.find(c => c.id === parentId)?.name}`
                    : 'No parent (top-level category)'}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
              <Text style={styles.submitButtonText}>Create category</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
