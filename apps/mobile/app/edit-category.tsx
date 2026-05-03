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

export default function EditCategoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoriesService = useCategoriesService();

  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState<Category | null>(null);
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = React.useState(EMOJI_ICONS[0]);
  const [parentId, setParentId] = React.useState<string>('');
  const [originalParentId, setOriginalParentId] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [topLevelCategories, setTopLevelCategories] = React.useState<Category[]>([]);
  const [hasChildren, setHasChildren] = React.useState(false);

  React.useEffect(() => {
    const loadCategory = async () => {
      if (!id) {
        Alert.alert('Error', 'Category not found');
        router.back();
        return;
      }

      try {
        const cat = await categoriesService.getCategoryById(id);
        if (!cat) {
          Alert.alert('Error', 'Category not found');
          router.back();
          return;
        }

        setCategory(cat);
        setName(cat.name);
        setColor(cat.color || COLOR_PALETTE[0]);
        setIcon(cat.icon || EMOJI_ICONS[0]);
        setParentId(cat.parentId || '');
        setOriginalParentId(cat.parentId || '');

        // Check if this category has subcategories (cannot become a subcategory if so)
        const categoryHasChildren = await categoriesService.hasSubcategories(id);
        setHasChildren(categoryHasChildren);

        // Load parent categories for the selector (only top-level of same type)
        const categories = await categoriesService.listCategories(true);
        const topLevel = categories.filter(
          c => c.type === cat.type && !c.parentId && c.id !== id
        );
        setTopLevelCategories(topLevel);
      } catch (err) {
        const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load category';
        Alert.alert('Error', errorMessage);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    void loadCategory();
  }, [id, categoriesService, router]);

  const handleSubmit = async () => {
    if (!category) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates: { name: string; color: string; icon: string; parentId?: string | null } = {
        name: name.trim(),
        color,
        icon,
      };

      // Only include parentId if it was changed
      if (parentId !== originalParentId) {
        updates.parentId = parentId || null;
      }

      await categoriesService.updateCategory(category.id, updates);
      router.back();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to update category';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!category) return;

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoriesService.deleteCategory(category.id);
              router.back();
            } catch (err) {
              const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to delete category';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
      gap: theme.spacing.sm,
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
    deleteButton: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.components.interactiveRadius,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.danger,
    },
    deleteButtonText: {
      color: theme.colors.danger,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Category' }} />
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </>
    );
  }

  if (!category) {
    return null;
  }

  const categoryTypeLabel = category.type === 'income' ? 'Income' : 'Expense';

  return (
    <>
      <Stack.Screen
        options={{
          title: `Edit ${categoryTypeLabel} Category`,
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

          {topLevelCategories.length > 0 && !hasChildren && (
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
              <Text style={styles.submitButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete category</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
