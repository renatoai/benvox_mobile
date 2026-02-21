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
        contentContainerStyle={sections.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Loading
  loadingScreen: {
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
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  
  // Header & Filters
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  sseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
  },
  sseOn: { backgroundColor: colors.success },
  sseOff: { backgroundColor: colors.warning },
  filterPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.surface,
    ...shadows.xs,
  },
  filterText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
  },
  
  // Channel Section
  channelSection: {
    marginTop: spacing.sm,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  channelIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelIconActive: {
    backgroundColor: colors.primarySoft,
  },
  channelIconText: {
    fontSize: 18,
  },
  channelInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  channelName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  channelCount: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  channelUnreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  channelUnreadText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  
  // Conversations List
  conversationsList: {
    backgroundColor: colors.surface,
  },
  conversationCard: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  
  // Avatar
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.textInverse,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  
  // Conversation Content
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  contactNameUnread: {
    fontWeight: '700',
  },
  timeText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  timeTextUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  middleRow: {
    marginTop: spacing.xs,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
    fontWeight: '700',
  },
  messageText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  messageTextUnread: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  badgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  
  // Badges
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeAgent: {
    backgroundColor: colors.agentBg,
  },
  badgeHuman: {
    backgroundColor: colors.humanBg,
  },
  badgeText: {
    ...typography.labelSmall,
  },
  badgeTextAgent: {
    color: colors.agentText,
  },
  badgeTextHuman: {
    color: colors.humanText,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  tagText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  unreadText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '700',
  },
  
  // Load More
  loadMoreButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
  },
  loadMoreText: {
    ...typography.label,
    color: colors.primary,
  },
  
  // Empty States
  emptyState: {
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
  emptyChannel: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyChannelText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
