import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { conversationsService, tagsService, channelsService } from '../services';
import type { Conversation, Tag } from '../types';
import { useInboxSSE } from '../hooks/useInboxSSE';
import { colors, spacing, radius, typography, shadows } from '../theme';

type RootStackParamList = {
  Conversations: undefined;
  Chat: { conversationId: string; contactName: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Conversations'>;

interface Channel {
  id_channel: string;
  name: string;
  type: string;
  avatar_url?: string;
}

interface ChannelSection {
  channel: Channel;
  data: Conversation[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
}

const ITEMS_PER_PAGE = 20;

export function ConversationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sections, setSections] = useState<ChannelSection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'minhas' | 'fila'>('todas');
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [sseConnected, setSseConnected] = useState(false);

  // SSE for real-time updates
  const { isConnected } = useInboxSSE({
    onNewMessage: (event) => {
      setSections(prev => prev.map(section => ({
        ...section,
        data: section.data.map(conv => {
          if (conv.id_conversation === event.id_conversation) {
            return {
              ...conv,
              last_message_text: event.last_message_text || conv.last_message_text,
              last_message_at: event.last_message_at || conv.last_message_at,
              unread_count: (conv.unread_count || 0) + 1,
            } as Conversation;
          }
          return conv;
        }),
      })));
    },
    onConversationUpdated: (event) => {
      if (event.id_channel) {
        loadChannelConversations(event.id_channel, false);
      }
    },
    onConnected: () => setSseConnected(true),
    onDisconnected: () => setSseConnected(false),
  });

  const loadData = useCallback(async () => {
    try {
      const [channelsData, tagsData] = await Promise.all([
        channelsService.getAll(),
        tagsService.getAll().catch(() => []),
      ]);
      
      setChannels(channelsData);
      setTags(tagsData);
      
      const initialSections: ChannelSection[] = channelsData.map((ch: Channel) => ({
        channel: ch,
        data: [],
        page: 1,
        hasMore: true,
        isLoading: false,
      }));
      setSections(initialSections);
      
      for (const channel of channelsData) {
        loadChannelPage(channel.id_channel, 1, false, filter);
      }
      
      if (channelsData.length > 0) {
        setExpandedChannels(new Set([channelsData[0].id_channel]));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadChannelPage = async (channelId: string, page: number, loadMore: boolean, currentFilter: string) => {
    setSections(prev => prev.map(s => 
      s.channel.id_channel === channelId ? { ...s, isLoading: true } : s
    ));

    try {
      // Map filter to API param
      const assignmentParam = currentFilter === 'minhas' ? 'minhas' 
        : currentFilter === 'fila' ? 'outras'  // fila = não atribuídas
        : undefined; // todas = sem filtro
      
      const response = await conversationsService.getAll({ 
        limit: ITEMS_PER_PAGE, 
        page: page,
        id_channel: channelId,
        assignment: assignmentParam as any,
      });
      
      setSections(prev => prev.map(s => {
        if (s.channel.id_channel !== channelId) return s;
        const newData = loadMore ? [...s.data, ...response] : response;
        return {
          ...s,
          data: newData,
          page: page + 1,
          hasMore: response.length === ITEMS_PER_PAGE,
          isLoading: false,
        };
      }));
    } catch (error) {
      console.error('Error loading channel conversations:', error);
      setSections(prev => prev.map(s => 
        s.channel.id_channel === channelId ? { ...s, isLoading: false } : s
      ));
    }
  };

  const loadMoreConversations = (channelId: string) => {
    const section = sections.find(s => s.channel.id_channel === channelId);
    if (section && section.hasMore && !section.isLoading) {
      loadChannelPage(channelId, section.page, true, filter);
    }
  };

  const loadChannelConversations = (channelId: string, loadMore: boolean) => {
    if (loadMore) {
      loadMoreConversations(channelId);
    } else {
      loadChannelPage(channelId, 1, false, filter);
    }
  };

  // Reload when filter changes
  useEffect(() => {
    if (channels.length > 0) {
      // Reset sections and reload
      setSections(prev => prev.map(s => ({
        ...s,
        data: [],
        page: 1,
        hasMore: true,
      })));
      for (const channel of channels) {
        loadChannelPage(channel.id_channel, 1, false, filter);
      }
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleChannel = (channelId: string) => {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getTagById = (tagId: string): Tag | undefined => tags.find(t => t.id_tag === tagId);

  const getChannelIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'whatsapp': return '📱';
      case 'telegram': return '✈️';
      case 'instagram': return '📷';
      default: return '💬';
    }
  };

  const MessageStatus = ({ status, direction }: { status?: string; direction?: string }) => {
    if (direction !== 'outbound') return null;
    
    const statusConfig: Record<string, { text: string; color: string }> = {
      read: { text: '✓✓', color: '#53bdeb' },
      delivered: { text: '✓✓', color: colors.textTertiary },
      sent: { text: '✓', color: colors.textTertiary },
      queued: { text: '⏱', color: colors.textTertiary },
      sending: { text: '⏱', color: colors.textTertiary },
      pending: { text: '⏱', color: colors.textTertiary },
      failed: { text: '⚠', color: colors.error },
      cancelled: { text: '⚠', color: colors.error },
    };
    
    const config = statusConfig[status || ''];
    if (!config) return null;
    
    return <Text style={[styles.statusIcon, { color: config.color }]}>{config.text}</Text>;
  };

  const renderConversation = (item: Conversation) => {
    const hasUnread = (item.unread_count || 0) > 0;
    const convTags = (item.tags || []).map(getTagById).filter(Boolean) as Tag[];
    const assigneeName = item.assigned_to_name || 
      (item.assigned_to_agent_name ? item.assigned_to_agent_name : null);
    const isAgent = !!item.assigned_to_agent_name || !!item.assigned_to_agent_id;

    return (
      <TouchableOpacity
        key={item.id_conversation}
        style={styles.conversationCard}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id_conversation,
          contactName: item.contact_name || item.contact_phone || 'Conversa',
        })}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {item.contact_avatar_url ? (
            <Image source={{ uri: item.contact_avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(item.contact_name || item.contact_phone || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {hasUnread && <View style={styles.onlineIndicator} />}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          {/* Row 1: Name + Time */}
          <View style={styles.topRow}>
            <Text style={[styles.contactName, hasUnread && styles.contactNameUnread]} numberOfLines={1}>
              {item.contact_name || item.contact_phone || 'Sem nome'}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>

          {/* Row 2: Message preview */}
          <View style={styles.middleRow}>
            <View style={styles.messagePreview}>
              <MessageStatus 
                status={(item as any).last_message_status} 
                direction={(item as any).last_message_direction} 
              />
              <Text style={[styles.messageText, hasUnread && styles.messageTextUnread]} numberOfLines={1}>
                {(item as any).last_message_text || 'Nenhuma mensagem'}
              </Text>
            </View>
          </View>

          {/* Row 3: Badges */}
          <View style={styles.bottomRow}>
            <View style={styles.badgesLeft}>
              {assigneeName && (
                <View style={[styles.badge, isAgent ? styles.badgeAgent : styles.badgeHuman]}>
                  <Text style={[styles.badgeText, isAgent ? styles.badgeTextAgent : styles.badgeTextHuman]}>
                    {isAgent ? '🤖' : '👤'} {assigneeName}
                  </Text>
                </View>
              )}
              {convTags.slice(0, 2).map(tag => (
                <View key={tag.id_tag} style={[styles.tagBadge, { backgroundColor: tag.color + '15' }]}>
                  <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                  <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
                </View>
              ))}
            </View>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unread_count! > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChannelSection = (section: ChannelSection) => {
    const isExpanded = expandedChannels.has(section.channel.id_channel);
    const unreadCount = section.data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    
    return (
      <View key={section.channel.id_channel} style={styles.channelSection}>
        {/* Channel Header */}
        <TouchableOpacity 
          style={styles.channelHeader}
          onPress={() => toggleChannel(section.channel.id_channel)}
          activeOpacity={0.7}
        >
          <View style={[styles.channelIconWrapper, unreadCount > 0 && styles.channelIconActive]}>
            <Text style={styles.channelIconText}>{getChannelIcon(section.channel.type)}</Text>
          </View>
          <View style={styles.channelInfo}>
            <Text style={styles.channelName}>{section.channel.name}</Text>
            <Text style={styles.channelCount}>{section.data.length} conversas</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.channelUnreadBadge}>
              <Text style={styles.channelUnreadText}>{unreadCount}</Text>
            </View>
          )}
          <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        {/* Conversations */}
        {isExpanded && (
          <View style={styles.conversationsList}>
            {section.isLoading && section.data.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : section.data.length === 0 ? (
              <View style={styles.emptyChannel}>
                <Text style={styles.emptyChannelText}>Nenhuma conversa</Text>
              </View>
            ) : (
              <>
                {section.data.map(conv => renderConversation(conv))}
                {section.hasMore && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => loadMoreConversations(section.channel.id_channel)}
                    disabled={section.isLoading}
                  >
                    {section.isLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.loadMoreText}>Carregar mais</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando conversas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with filters */}
      <View style={styles.header}>
        <View style={styles.filterContainer}>
          <View style={[styles.sseIndicator, sseConnected ? styles.sseOn : styles.sseOff]} />
          {(['todas', 'minhas', 'fila'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, filter === tab && styles.filterPillActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
                {tab === 'todas' ? 'Todas' : tab === 'minhas' ? 'Minhas' : 'Fila'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.channel.id_channel}
        renderItem={({ item }) => renderChannelSection(item)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Nenhum canal</Text>
            <Text style={styles.emptySubtitle}>Configure seus canais de comunicação</Text>
          </View>
        }
        contentContainerStyle={sections.length === 0 ? { flex: 1 } : { paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // Loading
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  
  // Header & Filters - Minimal
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  sseOn: { backgroundColor: '#22c55e' },
  sseOff: { backgroundColor: '#f59e0b' },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#f3f4f6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
  },
  filterTextActive: {
    color: '#111827',
  },
  
  // Channel Section - Minimal
  channelSection: {
    marginTop: 0,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  channelIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelIconActive: {
    backgroundColor: 'transparent',
  },
  channelIconText: {
    fontSize: 12,
  },
  channelInfo: {
    flex: 1,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  channelCount: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 6,
  },
  channelUnreadBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  channelUnreadText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
    color: '#d1d5db',
  },
  
  // Conversations List - Clean
  conversationsList: {
    backgroundColor: '#ffffff',
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  conversationCardSelected: {
    backgroundColor: '#f9fafb',
  },
  
  // Avatar - Smaller, cleaner
  avatarWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  
  // Conversation Content - Minimal
  conversationContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '400',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  contactNameUnread: {
    fontWeight: '600',
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  timeTextUnread: {
    color: '#22c55e',
    fontWeight: '500',
  },
  middleRow: {
    marginTop: 2,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 3,
  },
  messageText: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
  },
  messageTextUnread: {
    color: '#6b7280',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  badgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  
  // Badges - Minimal
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeAgent: {
    backgroundColor: '#f3e8ff',
  },
  badgeHuman: {
    backgroundColor: '#e0f2fe',
  },
  badgeText: {
    fontSize: 10,
  },
  badgeTextAgent: {
    color: '#9333ea',
  },
  badgeTextHuman: {
    color: '#0284c7',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 3,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  // Load More
  loadMoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  
  // Empty States
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  emptyChannel: {
    padding: 20,
    alignItems: 'center',
  },
  emptyChannelText: {
    fontSize: 12,
    color: '#d1d5db',
  },
});
