import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { contactsService } from '../services';
import type { Contact } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

export function ContactsScreen() {
  const navigation = useNavigation<any>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadContacts = useCallback(async () => {
    try {
      const data = await contactsService.getAll({ search: search || undefined });
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadContacts);
    return unsubscribe;
  }, [navigation, loadContacts]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadContacts();
  }, [loadContacts]);

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('ContactDetail', { contactId: item.id_contact })}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrapper}>
        {item.profile_picture_url ? (
          <Image source={{ uri: item.profile_picture_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name || 'Sem nome'}</Text>
        <Text style={styles.cardSubtitle}>{item.phone_number}</Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag.id_tag} style={[styles.tag, { backgroundColor: tag.color + '15' }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTags}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando contatos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar contatos..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadContacts}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id_contact}
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
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Nenhum contato</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Nenhum resultado para sua busca' : 'Seus contatos aparecerão aqui'}
            </Text>
          </View>
        }
        contentContainerStyle={contacts.length === 0 ? { flex: 1 } : { padding: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewContact')}
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
  
  // Search
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textTertiary,
    padding: spacing.xs,
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
  avatarWrapper: {
    marginRight: spacing.md,
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.textInverse,
  },
  cardContent: {
    flex: 1,
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tag: {
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
  moreTags: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    alignSelf: 'center',
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
