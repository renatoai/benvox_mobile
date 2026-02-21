import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import api from '../services/api';
import { colors, spacing, radius, typography, shadows } from '../theme';

type ChannelTemplatesRouteProp = RouteProp<{ ChannelTemplates: { channelId: string; channelName: string } }, 'ChannelTemplates'>;

interface MessageTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  category: string;
  language: string;
  components?: any[];
}

export function ChannelTemplatesScreen() {
  const route = useRoute<ChannelTemplatesRouteProp>();
  const navigation = useNavigation<any>();
  const { channelId, channelName } = route.params;

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await api.get(`/channels/${channelId}/templates`);
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [channelId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTemplates();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post(`/channels/${channelId}/templates/sync`);
      Alert.alert('Sucesso', 'Templates sincronizados com sucesso!');
      loadTemplates();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#ECFDF5', color: '#10B981', label: 'Aprovado', icon: '✅' };
      case 'PENDING':
        return { bg: '#FEF3C7', color: '#F59E0B', label: 'Pendente', icon: '⏳' };
      case 'REJECTED':
        return { bg: '#FEE2E2', color: '#EF4444', label: 'Rejeitado', icon: '❌' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', label: status, icon: '❓' };
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'UTILITY': return '🔧 Utilidade';
      case 'MARKETING': return '📣 Marketing';
      case 'AUTHENTICATION': return '🔐 Autenticação';
      default: return category;
    }
  };

  const renderTemplate = ({ item }: { item: MessageTemplate }) => {
    const status = getStatusStyle(item.status);
    const bodyComponent = item.components?.find((c: any) => c.type === 'BODY');
    const bodyText = bodyComponent?.text || '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.templateName}>{item.name}</Text>
            <Text style={styles.templateLang}>{item.language}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={styles.statusIcon}>{status.icon}</Text>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        
        <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
        
        {bodyText && (
          <View style={styles.previewBox}>
            <Text style={styles.previewText} numberOfLines={3}>{bodyText}</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sync Button */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {templates.length} template{templates.length !== 1 ? 's' : ''} encontrado{templates.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity 
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.syncIcon}>🔄</Text>
              <Text style={styles.syncText}>Sincronizar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id || item.name}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>Nenhum template</Text>
            <Text style={styles.emptySubtext}>Sincronize com a Meta para carregar os templates</Text>
          </View>
        }
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
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  syncText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    marginRight: spacing.sm,
  },
  templateName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  templateLang: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  previewText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
});
