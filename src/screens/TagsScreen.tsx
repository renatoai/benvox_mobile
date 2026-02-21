import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tagsService } from '../services';
import type { Tag } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

export function TagsScreen() {
  const navigation = useNavigation<any>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTags = useCallback(async () => {
    try {
      const data = await tagsService.getAll();
      setTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadTags);
    return unsubscribe;
  }, [navigation, loadTags]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTags();
  }, [loadTags]);

  const handleDelete = (tag: Tag) => {
    Alert.alert(
      'Excluir Tag',
      `Tem certeza que deseja excluir "${tag.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await tagsService.delete(tag.id_tag);
              setTags(prev => prev.filter(t => t.id_tag !== tag.id_tag));
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Tag }) => (
    <TouchableOpacity 
      style={styles.card}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description && (
          <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text>
        )}
      </View>
      <View style={[styles.previewTag, { backgroundColor: item.color + '15' }]}>
        <View style={[styles.tagDot, { backgroundColor: item.color }]} />
        <Text style={[styles.previewText, { color: item.color }]}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando tags...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id_tag}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>Nenhuma tag</Text>
            <Text style={styles.emptySubtitle}>Crie tags para organizar seus contatos</Text>
          </View>
        }
        contentContainerStyle={tags.length === 0 ? { flex: 1 } : { padding: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListFooterComponent={
          tags.length > 0 ? (
            <Text style={styles.hint}>Segure para excluir</Text>
          ) : null
        }
      />
      
      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('NewTag')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  colorIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    gap: spacing.xs,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.textInverse,
    fontWeight: '300',
  },
});
