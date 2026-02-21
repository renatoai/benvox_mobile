import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { funnelsService } from '../services';
import type { Funnel } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

export function FunnelsScreen() {
  const navigation = useNavigation<any>();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFunnels = useCallback(async () => {
    try {
      const data = await funnelsService.getAll();
      setFunnels(data);
    } catch (error) {
      console.error('Error loading funnels:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFunnels();
  }, [loadFunnels]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadFunnels();
  }, [loadFunnels]);

  const renderItem = ({ item }: { item: Funnel }) => {
    const stageCount = item.stage_count || item.stages?.length || 0;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('FunnelDetail', { 
          funnelId: item.id_pipeline || item.id_funnel, 
          name: item.name 
        })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, item.is_published && styles.iconWrapperActive]}>
          <Text style={styles.iconText}>🎯</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.is_published && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Ativo</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text>
          )}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stageCount}</Text>
              <Text style={styles.statLabel}>etapas</Text>
            </View>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando funis...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={funnels}
        keyExtractor={(item) => item.id_pipeline || item.id_funnel}
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
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Nenhum funil</Text>
            <Text style={styles.emptySubtitle}>Crie funis para organizar seus contatos</Text>
          </View>
        }
        contentContainerStyle={funnels.length === 0 ? { flex: 1 } : { padding: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
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
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: colors.primarySoft,
  },
  iconText: {
    fontSize: 26,
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    gap: spacing.xs,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  activeBadgeText: {
    ...typography.labelSmall,
    color: colors.success,
    fontWeight: '600',
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
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
});
