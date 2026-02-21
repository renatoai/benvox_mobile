import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { conversationsService, channelsService } from '../services';
import { colors, spacing, radius, typography, shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ConversationStats {
  total_conversations: number;
  by_status: { status: string; count: number; percentage: number }[];
  by_channel: { channel_type: string; count: number; percentage: number }[];
  avg_first_response_time?: number;
}

interface ChannelStats {
  id_channel: string;
  channel_name: string;
  channel_type: string;
  unanswered_count: number;
}

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const [conversationStats, channels] = await Promise.all([
        conversationsService.getStats(),
        fetch('https://api.voxbel.com/conversations/stats/unanswered-by-channel', {
          headers: { 'Content-Type': 'application/json' }
        }).then(r => r.json()).catch(() => [])
      ]);
      
      setStats(conversationStats);
      setChannelStats(Array.isArray(channels) ? channels : []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#10B981';
      case 'closed': return '#6B7280';
      case 'archived': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abertas';
      case 'closed': return 'Fechadas';
      case 'archived': return 'Arquivadas';
      default: return status;
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return '💬';
      case 'telegram': return '✈️';
      case 'instagram': return '📷';
      case 'facebook': return '👤';
      case 'email': return '📧';
      default: return '💬';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalOpen = stats?.by_status?.find(s => s.status === 'open')?.count || 0;
  const totalClosed = stats?.by_status?.find(s => s.status === 'closed')?.count || 0;
  const totalUnanswered = channelStats.reduce((acc, c) => acc + (c.unanswered_count || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Visão geral do seu CRM</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={[styles.statCard, { borderLeftColor: '#10B981' }]}
          onPress={() => navigation.navigate('Conversations')}
        >
          <Text style={styles.statIcon}>💬</Text>
          <Text style={styles.statValue}>{stats?.total_conversations || 0}</Text>
          <Text style={styles.statLabel}>Total Conversas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}
          onPress={() => navigation.navigate('Conversations')}
        >
          <Text style={styles.statIcon}>📥</Text>
          <Text style={styles.statValue}>{totalOpen}</Text>
          <Text style={styles.statLabel}>Abertas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}
          onPress={() => navigation.navigate('Conversations')}
        >
          <Text style={styles.statIcon}>⏳</Text>
          <Text style={styles.statValue}>{totalUnanswered}</Text>
          <Text style={styles.statLabel}>Aguardando</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, { borderLeftColor: '#22C55E' }]}
          onPress={() => navigation.navigate('Conversations')}
        >
          <Text style={styles.statIcon}>✅</Text>
          <Text style={styles.statValue}>{totalClosed}</Text>
          <Text style={styles.statLabel}>Fechadas</Text>
        </TouchableOpacity>
      </View>

      {/* Conversations by Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por Status</Text>
        <View style={styles.card}>
          {stats?.by_status?.map((item) => (
            <View key={item.status} style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={styles.statusLabel}>{getStatusLabel(item.status)}</Text>
              </View>
              <View style={styles.statusRight}>
                <Text style={styles.statusCount}>{item.count}</Text>
                <Text style={styles.statusPercent}>{item.percentage?.toFixed(1) || 0}%</Text>
              </View>
            </View>
          )) || (
            <Text style={styles.emptyText}>Sem dados disponíveis</Text>
          )}
        </View>
      </View>

      {/* By Channel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por Canal</Text>
        <View style={styles.card}>
          {channelStats.length > 0 ? (
            channelStats.map((channel) => (
              <TouchableOpacity 
                key={channel.id_channel} 
                style={styles.channelRow}
                onPress={() => navigation.navigate('Conversations')}
              >
                <View style={styles.channelLeft}>
                  <Text style={styles.channelIcon}>{getChannelIcon(channel.channel_type)}</Text>
                  <Text style={styles.channelName}>{channel.channel_name}</Text>
                </View>
                <View style={styles.channelRight}>
                  {channel.unanswered_count > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{channel.unanswered_count}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhum canal configurado</Text>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Contacts')}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionLabel}>Contatos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>Tarefas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Funnels')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Funis</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Agents')}
          >
            <Text style={styles.actionIcon}>🤖</Text>
            <Text style={styles.actionLabel}>Agentes</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm) / 2 - 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusCount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusPercent: {
    ...typography.caption,
    color: colors.textTertiary,
    minWidth: 45,
    textAlign: 'right',
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  channelName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  channelRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    width: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 3) / 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
