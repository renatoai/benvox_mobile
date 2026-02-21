import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { funnelsService } from '../services';
import type { FunnelStage, Conversation } from '../types';

export function FunnelDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { funnelId, name } = route.params;
  
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [stageConversations, setStageConversations] = useState<Record<string, Conversation[]>>({});
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [loadingStages, setLoadingStages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const loadStages = useCallback(async () => {
    try {
      const [stagesData, statsData] = await Promise.all([
        funnelsService.getStages(funnelId),
        funnelsService.getStats(funnelId).catch(() => null),
      ]);
      
      const sorted = stagesData.sort((a: FunnelStage, b: FunnelStage) => a.position - b.position);
      setStages(sorted);
      setStats(statsData);
      
      // Auto-expand first stage with contacts
      const firstWithContacts = sorted.find((s: FunnelStage) => (s.contacts_count || 0) > 0);
      if (firstWithContacts) {
        const stageId = firstWithContacts.id_stage || firstWithContacts.id_funnel_stage || '';
        setExpandedStages(new Set([stageId]));
        loadStageConversations(stageId);
      }
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [funnelId]);

  const loadStageConversations = async (stageId: string) => {
    if (loadingStages.has(stageId) || stageConversations[stageId]) return;
    
    setLoadingStages(prev => new Set(prev).add(stageId));
    try {
      const data = await funnelsService.getStageConversations(stageId);
      setStageConversations(prev => ({ ...prev, [stageId]: data }));
    } catch (error) {
      console.error('Error loading stage conversations:', error);
    } finally {
      setLoadingStages(prev => {
        const next = new Set(prev);
        next.delete(stageId);
        return next;
      });
    }
  };

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setStageConversations({});
    loadStages();
  }, [loadStages]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
        loadStageConversations(stageId);
      }
      return next;
    });
  };

  const openConversation = (conv: Conversation) => {
    navigation.navigate('Chat', {
      conversationId: conv.id_conversation,
      contactName: conv.contact_name || conv.contact_phone || 'Conversa',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const renderConversation = (conv: Conversation) => (
    <TouchableOpacity
      key={conv.id_conversation}
      style={styles.conversationItem}
      onPress={() => openConversation(conv)}
    >
      <View style={styles.convAvatar}>
        {conv.contact_avatar_url ? (
          <Image source={{ uri: conv.contact_avatar_url }} style={styles.convAvatarImage} />
        ) : (
          <Text style={styles.convAvatarText}>
            {(conv.contact_name || conv.contact_phone || '?').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.convContent}>
        <View style={styles.convHeader}>
          <Text style={styles.convName} numberOfLines={1}>
            {conv.contact_name || conv.contact_phone || 'Sem nome'}
          </Text>
          <Text style={styles.convTime}>{formatTime(conv.last_message_at)}</Text>
        </View>
        <View style={styles.convFooter}>
          <Text style={styles.convLastMsg} numberOfLines={1}>
            {(conv as any).last_message_text || conv.contact_phone || ''}
          </Text>
          {conv.unread_count && conv.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conv.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  // Calculate totals from stages
  const totalContacts = stages.reduce((sum, s) => sum + (s.contacts_count || 0), 0);
  const openConversations = stats?.conversations_open || 0;
  const closedConversations = stats?.conversations_closed || 0;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
      }
    >
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statValue}>{totalContacts}</Text>
          <Text style={styles.statLabel}>Leads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💬</Text>
          <Text style={styles.statValue}>{openConversations}</Text>
          <Text style={styles.statLabel}>Abertas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✅</Text>
          <Text style={styles.statValue}>{closedConversations}</Text>
          <Text style={styles.statLabel}>Fechadas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>{stages.length}</Text>
          <Text style={styles.statLabel}>Etapas</Text>
        </View>
      </View>

      <View style={styles.pipeline}>
        {stages.map((stage, index) => {
          const stageId = stage.id_stage || stage.id_funnel_stage || '';
          const isExpanded = expandedStages.has(stageId);
          const isLoadingConvs = loadingStages.has(stageId);
          const conversations = stageConversations[stageId] || [];
          const count = stage.contacts_count || 0;
          
          return (
            <View key={stageId} style={styles.stageContainer}>
              <TouchableOpacity 
                style={[styles.stage, { borderLeftColor: stage.color || '#25D366' }]}
                onPress={() => toggleStage(stageId)}
                activeOpacity={0.7}
              >
                <View style={styles.stageHeader}>
                  <View style={[styles.stageColorDot, { backgroundColor: stage.color || '#25D366' }]} />
                  <Text style={styles.stageName}>{stage.name}</Text>
                  <View style={styles.stageRight}>
                    <View style={[styles.countBadge, { backgroundColor: (stage.color || '#25D366') + '20' }]}>
                      <Text style={[styles.countText, { color: stage.color || '#25D366' }]}>
                        {count}
                      </Text>
                    </View>
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                  </View>
                </View>
                
                {stage.workflows && stage.workflows.length > 0 && (
                  <View style={styles.workflowsBadge}>
                    <Text style={styles.workflowsText}>
                      ⚡ {stage.workflows.length} automação{stage.workflows.length > 1 ? 'ões' : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Conversations List */}
              {isExpanded && (
                <View style={styles.conversationsList}>
                  {isLoadingConvs ? (
                    <View style={styles.loadingConvs}>
                      <ActivityIndicator size="small" color="#25D366" />
                      <Text style={styles.loadingText}>Carregando...</Text>
                    </View>
                  ) : conversations.length === 0 ? (
                    <View style={styles.emptyConvs}>
                      <Text style={styles.emptyConvsText}>Nenhum lead nesta etapa</Text>
                    </View>
                  ) : (
                    conversations.map(conv => renderConversation(conv))
                  )}
                </View>
              )}

              {index < stages.length - 1 && (
                <View style={styles.connector}>
                  <Text style={styles.connectorArrow}>↓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {stages.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Nenhuma etapa</Text>
          <Text style={styles.emptySubtext}>Adicione etapas ao funil</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#333' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  pipeline: { padding: 16, paddingTop: 0 },
  stageContainer: { alignItems: 'center' },
  stage: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stageHeader: { flexDirection: 'row', alignItems: 'center' },
  stageColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  stageName: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  stageRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { fontSize: 14, fontWeight: '700' },
  expandIcon: { fontSize: 12, color: '#999' },
  workflowsBadge: {
    marginTop: 10,
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  workflowsText: { fontSize: 12, color: '#f57c00' },
  connector: { paddingVertical: 8 },
  connectorArrow: { fontSize: 20, color: '#ccc' },
  
  // Conversations list
  conversationsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    overflow: 'hidden',
  },
  loadingConvs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: { color: '#666', fontSize: 14 },
  emptyConvs: { padding: 20, alignItems: 'center' },
  emptyConvsText: { color: '#999', fontSize: 14 },
  
  // Conversation item
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  convAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  convAvatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  convContent: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  convTime: { fontSize: 12, color: '#999' },
  convFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  convLastMsg: { fontSize: 13, color: '#666', flex: 1, marginRight: 8 },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  
  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8 },
});
