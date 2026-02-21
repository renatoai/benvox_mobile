import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  SectionList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { conversationsService, tagsService, channelsService } from '../services';
import type { Conversation, Tag } from '../types';

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
  cursor?: string;
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

  // Load channels and initial conversations
  const loadData = useCallback(async () => {
    try {
      const [channelsData, tagsData] = await Promise.all([
        channelsService.getAll(),
        tagsService.getAll().catch(() => []),
      ]);
      
      setChannels(channelsData);
      setTags(tagsData);
      
      // Initialize sections with channels
      const initialSections: ChannelSection[] = channelsData.map((ch: Channel) => ({
        channel: ch,
        data: [],
        hasMore: true,
        isLoading: false,
      }));
      setSections(initialSections);
      
      // Load first page for each channel
      for (const channel of channelsData) {
        loadChannelConversations(channel.id_channel, false);
      }
      
      // Expand first channel by default
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

  const loadChannelConversations = async (channelId: string, loadMore: boolean) => {
    setSections(prev => prev.map(s => 
      s.channel.id_channel === channelId 
        ? { ...s, isLoading: true }
        : s
    ));

    try {
      const section = sections.find(s => s.channel.id_channel === channelId);
      const cursor = loadMore ? section?.cursor : undefined;
      
      const response = await conversationsService.getAll({ 
        limit: ITEMS_PER_PAGE, 
        cursor,
        // @ts-ignore - backend supports these params
        id_channel: channelId,
      });
      
      setSections(prev => prev.map(s => {
        if (s.channel.id_channel !== channelId) return s;
        
        const newData = loadMore 
          ? [...s.data, ...response]
          : response;
        
        return {
          ...s,
          data: newData,
          hasMore: response.length === ITEMS_PER_PAGE,
          isLoading: false,
          // cursor: response.nextCursor, // If API returns cursor
        };
      }));
    } catch (error) {
      console.error('Error loading channel conversations:', error);
      setSections(prev => prev.map(s => 
        s.channel.id_channel === channelId 
          ? { ...s, isLoading: false }
          : s
      ));
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleChannel = (channelId: string) => {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getTagById = (tagId: string): Tag | undefined => {
    return tags.find(t => t.id_tag === tagId);
  };

  const MessageStatus = ({ status, direction }: { status?: string; direction?: string }) => {
    if (direction !== 'outbound') return null;
    
    switch (status) {
      case 'read':
        return <Text style={styles.statusRead}>✓✓</Text>;
      case 'delivered':
        return <Text style={styles.statusDelivered}>✓✓</Text>;
      case 'sent':
        return <Text style={styles.statusSent}>✓</Text>;
      case 'queued':
      case 'sending':
      case 'pending':
        return <Text style={styles.statusPending}>⏱</Text>;
      case 'failed':
      case 'cancelled':
        return <Text style={styles.statusFailed}>⚠️</Text>;
      default:
        return null;
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'whatsapp': return '📱';
      case 'telegram': return '✈️';
      case 'instagram': return '📷';
      case 'messenger': return '💬';
      default: return '📨';
    }
  };

  const renderConversation = (item: Conversation) => {
    const hasUnread = (item.unread_count || 0) > 0;
    const convTags = (item.tags || []).map(getTagById).filter(Boolean) as Tag[];
    const assigneeName = item.assigned_to_name || 
      (item.assigned_to_agent_name ? `🤖 ${item.assigned_to_agent_name}` : null);
    const isAgent = !!item.assigned_to_agent_name || !!item.assigned_to_agent_id;

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id_conversation,
          contactName: item.contact_name || item.contact_phone || 'Conversa',
        })}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.contact_avatar_url ? (
            <Image source={{ uri: item.contact_avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(item.contact_name || item.contact_phone || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.row1}>
            <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
              {item.contact_name || item.contact_phone || 'Sem nome'}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>

          <View style={styles.row2}>
            <View style={styles.messageRow}>
              <MessageStatus 
                status={(item as any).last_message_status} 
                direction={(item as any).last_message_direction} 
              />
              <Text style={[styles.message, hasUnread && styles.messageUnread]} numberOfLines={1}>
                {(item as any).last_message_text || 'Nenhuma mensagem'}
              </Text>
            </View>
            <View style={styles.badges}>
              {assigneeName && (
                <View style={[styles.assigneeBadge, isAgent && styles.assigneeBadgeAgent]}>
                  <Text style={[styles.assigneeText, isAgent && styles.assigneeTextAgent]}>
                    {isAgent ? '🤖' : '👤'} {assigneeName.replace('🤖 ', '')}
                  </Text>
                </View>
              )}
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unread_count! > 99 ? '99+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {convTags.length > 0 && (
            <View style={styles.tagsRow}>
              {convTags.slice(0, 3).map(tag => (
                <View key={tag.id_tag} style={[styles.tag, { backgroundColor: tag.color + '20' }]}>
                  <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                  <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
                </View>
              ))}
              {convTags.length > 3 && (
                <Text style={styles.moreTags}>+{convTags.length - 3}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderChannelSection = (section: ChannelSection) => {
    const isExpanded = expandedChannels.has(section.channel.id_channel);
    const unreadCount = section.data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    
    return (
      <View key={section.channel.id_channel}>
        {/* Channel Header */}
        <TouchableOpacity 
          style={styles.channelHeader}
          onPress={() => toggleChannel(section.channel.id_channel)}
        >
          <View style={[
            styles.channelIcon,
            unreadCount > 0 && styles.channelIconActive
          ]}>
            <Text style={styles.channelIconText}>
              {getChannelIcon(section.channel.type)}
            </Text>
          </View>
          <Text style={styles.channelName}>{section.channel.name}</Text>
          <Text style={styles.channelCount}>({section.data.length})</Text>
          {unreadCount > 0 && (
            <View style={styles.channelUnread}>
              <Text style={styles.channelUnreadText}>{unreadCount}</Text>
            </View>
          )}
          <Text style={styles.channelChevron}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {/* Conversations */}
        {isExpanded && (
          <View>
            {section.data.map(conv => renderConversation(conv))}
            
            {/* Load more button */}
            {section.hasMore && section.data.length > 0 && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => loadChannelConversations(section.channel.id_channel, true)}
                disabled={section.isLoading}
              >
                {section.isLoading ? (
                  <ActivityIndicator size="small" color="#25D366" />
                ) : (
                  <Text style={styles.loadMoreText}>Carregar mais...</Text>
                )}
              </TouchableOpacity>
            )}
            
            {/* Empty state */}
            {section.data.length === 0 && !section.isLoading && (
              <View style={styles.emptyChannel}>
                <Text style={styles.emptyChannelText}>Nenhuma conversa</Text>
              </View>
            )}
            
            {/* Loading state */}
            {section.isLoading && section.data.length === 0 && (
              <View style={styles.loadingChannel}>
                <ActivityIndicator size="small" color="#25D366" />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        {(['todas', 'minhas', 'fila'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab === 'todas' ? 'Todas' : tab === 'minhas' ? 'Minhas' : 'Fila'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.channel.id_channel}
        renderItem={({ item }) => renderChannelSection(item)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#25D366']}
            tintColor="#25D366"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Nenhum canal</Text>
            <Text style={styles.emptySubtext}>Configure seus canais de comunicação</Text>
          </View>
        }
        contentContainerStyle={sections.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  
  // Filter tabs
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    margin: 12,
    marginBottom: 4,
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#666' },
  filterTabTextActive: { color: '#25D366', fontWeight: '600' },
  
  // Channel header
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  channelIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  channelIconActive: {
    backgroundColor: '#25D366',
  },
  channelIconText: { fontSize: 14 },
  channelName: { fontSize: 14, fontWeight: '600', color: '#333' },
  channelCount: { fontSize: 12, color: '#999', marginLeft: 4 },
  channelUnread: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  channelUnreadText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  channelChevron: { fontSize: 10, color: '#999', marginLeft: 'auto' },
  
  // Conversation item
  item: {
    flexDirection: 'row',
    padding: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center' },
  row1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, color: '#333', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '700', color: '#000' },
  time: { fontSize: 12, color: '#999' },
  timeUnread: { color: '#25D366', fontWeight: '600' },
  row2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  messageRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  message: { fontSize: 14, color: '#666', flex: 1 },
  messageUnread: { color: '#333', fontWeight: '500' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  assigneeBadgeAgent: { backgroundColor: '#f3e5f5' },
  assigneeText: { fontSize: 11, color: '#1976d2', fontWeight: '500' },
  assigneeTextAgent: { color: '#7b1fa2' },
  unreadBadge: { backgroundColor: '#25D366', minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, gap: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  tagText: { fontSize: 10, fontWeight: '600' },
  moreTags: { fontSize: 10, color: '#999' },
  
  // Message status
  statusRead: { fontSize: 14, color: '#53bdeb', marginRight: 4, fontWeight: '700' },
  statusDelivered: { fontSize: 14, color: '#999', marginRight: 4, fontWeight: '700' },
  statusSent: { fontSize: 14, color: '#999', marginRight: 4 },
  statusPending: { fontSize: 12, color: '#999', marginRight: 4 },
  statusFailed: { fontSize: 12, marginRight: 4 },
  
  // Load more
  loadMoreBtn: { paddingVertical: 14, alignItems: 'center', backgroundColor: '#f9f9f9' },
  loadMoreText: { fontSize: 13, color: '#25D366', fontWeight: '500' },
  
  // Empty states
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8 },
  emptyChannel: { padding: 20, alignItems: 'center' },
  emptyChannelText: { fontSize: 13, color: '#999' },
  loadingChannel: { padding: 20, alignItems: 'center' },
});
