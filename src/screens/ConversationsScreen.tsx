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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { conversationsService, tagsService } from '../services';
import type { Conversation, Tag } from '../types';

type RootStackParamList = {
  Conversations: undefined;
  Chat: { conversationId: string; contactName: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Conversations'>;

export function ConversationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'minhas' | 'fila'>('todas');

  const loadData = useCallback(async () => {
    try {
      const [convData, tagData] = await Promise.all([
        conversationsService.getAll({ limit: 100 }),
        tagsService.getAll().catch(() => []),
      ]);
      setConversations(convData);
      setTags(tagData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

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

  // Message status icon component
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

  const renderItem = ({ item }: { item: Conversation }) => {
    const hasUnread = (item.unread_count || 0) > 0;
    const convTags = (item.tags || []).map(getTagById).filter(Boolean) as Tag[];
    
    // Get assignee info
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
          {/* Channel badge */}
          <View style={[
            styles.channelBadge,
            hasUnread ? styles.channelBadgeActive : styles.channelBadgeInactive
          ]}>
            <Text style={styles.channelIcon}>
              {item.channel_type === 'whatsapp' ? '📱' : 
               item.channel_type === 'telegram' ? '✈️' :
               item.channel_type === 'instagram' ? '📷' : '💬'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Row 1: Name + Time */}
          <View style={styles.row1}>
            <Text 
              style={[styles.name, hasUnread && styles.nameUnread]} 
              numberOfLines={1}
            >
              {item.contact_name || item.contact_phone || 'Sem nome'}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>

          {/* Row 2: Message preview + Status + Unread */}
          <View style={styles.row2}>
            <View style={styles.messageRow}>
              <MessageStatus 
                status={(item as any).last_message_status} 
                direction={(item as any).last_message_direction} 
              />
              <Text 
                style={[styles.message, hasUnread && styles.messageUnread]} 
                numberOfLines={1}
              >
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

          {/* Row 3: Tags */}
          {convTags.length > 0 && (
            <View style={styles.tagsRow}>
              {convTags.slice(0, 3).map(tag => (
                <View 
                  key={tag.id_tag} 
                  style={[styles.tag, { backgroundColor: tag.color + '20' }]}
                >
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
        data={conversations}
        keyExtractor={(item) => item.id_conversation}
        renderItem={renderItem}
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
            <Text style={styles.emptyText}>Nenhuma conversa</Text>
            <Text style={styles.emptySubtext}>Suas conversas aparecerão aqui</Text>
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : undefined}
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
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#25D366',
    fontWeight: '600',
  },
  
  // List item
  item: {
    flexDirection: 'row',
    padding: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  channelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  channelBadgeActive: {
    backgroundColor: '#25D366',
  },
  channelBadgeInactive: {
    backgroundColor: '#e0e0e0',
  },
  channelIcon: {
    fontSize: 10,
  },
  
  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  
  // Row 1: Name + Time
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: '700',
    color: '#000',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  timeUnread: {
    color: '#25D366',
    fontWeight: '600',
  },
  
  // Row 2: Message + Badges
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  messageUnread: {
    color: '#333',
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assigneeBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeBadgeAgent: {
    backgroundColor: '#f3e5f5',
  },
  assigneeText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '500',
  },
  assigneeTextAgent: {
    color: '#7b1fa2',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Row 3: Tags
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreTags: {
    fontSize: 10,
    color: '#999',
  },
  
  // Message status
  statusRead: { fontSize: 14, color: '#53bdeb', marginRight: 4, fontWeight: '700' },
  statusDelivered: { fontSize: 14, color: '#999', marginRight: 4, fontWeight: '700' },
  statusSent: { fontSize: 14, color: '#999', marginRight: 4 },
  statusPending: { fontSize: 12, color: '#999', marginRight: 4 },
  statusFailed: { fontSize: 12, marginRight: 4 },
  
  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8 },
});
