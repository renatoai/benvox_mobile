import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { agentsService } from '../services';
import type { AiAgent } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

export function AgentsScreen() {
  const navigation = useNavigation<any>();
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const data = await agentsService.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAgents);
    return unsubscribe;
  }, [navigation, loadAgents]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAgents();
  }, [loadAgents]);

  const toggleAgent = async (agent: AiAgent) => {
    try {
      await agentsService.update(agent.id_ai_agent, { is_active: !agent.is_active });
      setAgents(prev => prev.map(a => 
        a.id_ai_agent === agent.id_ai_agent ? { ...a, is_active: !a.is_active } : a
      ));
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const renderItem = ({ item }: { item: AiAgent }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('AgentDetail', { agentId: item.id_ai_agent })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrapper, item.is_active && styles.iconWrapperActive]}>
        <Text style={styles.iconText}>🤖</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.model || 'gpt-4'}</Text>
        <View style={styles.badgesRow}>
          {item.greeting_enabled && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👋 Saudação</Text>
            </View>
          )}
          {item.allowed_actions && item.allowed_actions.length > 0 && (
            <View style={[styles.badge, styles.badgeInfo]}>
              <Text style={[styles.badgeText, styles.badgeTextInfo]}>
                {item.allowed_actions.length} tools
              </Text>
            </View>
          )}
        </View>
      </View>
      <Switch
        value={item.is_active}
        onValueChange={() => toggleAgent(item)}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando agentes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={agents}
        keyExtractor={(item) => item.id_ai_agent}
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
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>Nenhum agente</Text>
            <Text style={styles.emptySubtitle}>Crie seu primeiro agente de IA</Text>
          </View>
        }
        contentContainerStyle={agents.length === 0 ? { flex: 1 } : { padding: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewAgent')}
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
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  badgeInfo: {
    backgroundColor: colors.humanBg,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.primaryDark,
  },
  badgeTextInfo: {
    color: colors.humanText,
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
