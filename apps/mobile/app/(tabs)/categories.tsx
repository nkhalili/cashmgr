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
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@cashmgr/ui';
import { Category, AppError, CategoryType } from '@cashmgr/core';
import { useCategoriesService } from '../../src/contexts/services-context';
import { useSafeRouter } from '../../src/hooks/useSafeRouter';

export default function CategoriesScreen() {
  const theme = useTheme();
  const router = useSafeRouter();
  const categoriesService = useCategoriesService();

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<CategoryType>('expense');

  const loadCategories = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await categoriesService.listCategories(true);
      setCategories(data);
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load categories';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [categoriesService]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await categoriesService.listCategories(true);
      setCategories(data);
    } catch (err) {
      // Silent fail on refresh
    } finally {
      setIsRefreshing(false);
    }
  }, [categoriesService]);

  useFocusEffect(
    React.useCallback(() => {
      void loadCategories();
    }, [loadCategories])
  );

  const filteredCategories = React.useMemo(() => {
    const typeCategories = categories.filter(c => c.type === activeTab);
    const topLevel = typeCategories.filter(c => !c.parentId);
    const result: { category: Category; subcategories: Category[] }[] = [];

    for (const parent of topLevel) {
      const subs = typeCategories.filter(c => c.parentId === parent.id);
      result.push({ category: parent, subcategories: subs });
    }

    return result;
  }, [categories, activeTab]);

  const handleCategoryPress = (category: Category) => {
    Alert.alert(
      'Category Actions',
      `What would you like to do with "${category.name}"?`,
      [
        {
          text: 'Edit',
          onPress: () => router.push(`/edit-category?id=${category.id}`),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(category),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDelete = async (category: Category) => {
    const hasSubcats = await categoriesService.hasSubcategories(category.id);
    const message = hasSubcats
      ? `Delete "${category.name}" and all its subcategories?`
      : `Delete "${category.name}"?`;

    Alert.alert('Confirm Delete', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await categoriesService.deleteCategory(category.id);
            await loadCategories();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete category');
          }
        },
      },
    ]);
  };

  const handleUseTemplate = async () => {
    try {
      await categoriesService.createDefaultCategories();
      await loadCategories();
    } catch (err) {
      Alert.alert('Error', 'Failed to create default categories');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabs: {
      flexDirection: 'row',
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.components.interactiveRadius,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    activeTabText: {
      color: 'white',
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.md,
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
    categoryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    subcategoryCard: {
      backgroundColor: theme.colors.surfaceMuted,
      marginLeft: theme.spacing.lg,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    icon: {
      fontSize: 20,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    subcategoryCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    moreButton: {
      padding: theme.spacing.xs,
    },
    moreButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
      fontWeight: '700',
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
    templateButton: {
      backgroundColor: theme.colors.surfaceMuted,
      padding: theme.spacing.md,
      margin: theme.spacing.md,
      marginTop: 0,
      borderRadius: theme.components.interactiveRadius,
      alignItems: 'center',
    },
    templateButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '500',
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      margin: theme.spacing.md,
      borderRadius: theme.components.interactiveRadius,
    },
    errorText: {
      color: '#c00',
      fontWeight: '500',
    },
  });

  const renderItem = ({ item }: { item: { category: Category; subcategories: Category[] } }) => (
    <View>
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(item.category)}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.category.color || theme.colors.surfaceMuted }]}>
          <Text style={styles.icon}>{item.category.icon || ''}</Text>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.category.name}</Text>
          {item.subcategories.length > 0 && (
            <Text style={styles.subcategoryCount}>{item.subcategories.length} subcategories</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleCategoryPress(item.category)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.moreButtonText}>...</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      {item.subcategories.map((sub) => (
        <TouchableOpacity
          key={sub.id}
          style={[styles.categoryCard, styles.subcategoryCard]}
          onPress={() => handleCategoryPress(sub)}
        >
          <View style={[styles.iconContainer, { backgroundColor: sub.color || theme.colors.surfaceMuted, width: 32, height: 32 }]}>
            <Text style={[styles.icon, { fontSize: 16 }]}>{sub.icon || ''}</Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{sub.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleCategoryPress(sub)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.moreButtonText}>...</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, activeTab === 'expense' && styles.activeTabText]}>
            Expenses ({categories.filter(c => c.type === 'expense').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && styles.activeTab]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[styles.tabText, activeTab === 'income' && styles.activeTabText]}>
            Income ({categories.filter(c => c.type === 'income').length})
          </Text>
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
          <Text style={[styles.emptyText, { marginTop: theme.spacing.md }]}>Loading categories...</Text>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No {activeTab} categories</Text>
          <Text style={styles.emptyText}>
            Create categories to organize your transactions, or use the template to get started quickly.
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { width: '100%' }]}
            onPress={() => router.push(`/add-category?type=${activeTab}`)}
          >
            <Text style={styles.addButtonText}>Create first category</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.templateButton, { width: '100%' }]}
            onPress={handleUseTemplate}
          >
            <Text style={styles.templateButtonText}>Use template</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            style={{ flex: 1 }}
            data={filteredCategories}
            renderItem={renderItem}
            keyExtractor={(item) => item.category.id}
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
            onPress={() => router.push(`/add-category?type=${activeTab}`)}
          >
            <Text style={styles.addButtonText}>Add category</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
