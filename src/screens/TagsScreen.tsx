import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tagsService } from '../services';
import type { Tag } from '../types';

export function TagsScreen() {
  const navigation = useNavigation<any>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTags = useCallback(async () => {
    try {
      const data = await tagsService.getAll();
      setTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadTags);
    return unsubscribe;
  }, [navigation, loadTags]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTags();
  }, [loadTags]);

  const handleDelete = (tag: Tag) => {
    Alert.alert(
      'Excluir Tag',
      `Tem certeza que deseja excluir "${tag.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await tagsService.delete(tag.id_tag);
              setTags(prev => prev.filter(t => t.id_tag !== tag.id_tag));
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Tag }) => (
    <TouchableOpacity 
      style={styles.item}
      onLongPress={() => handleDelete(item)}
    >
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        {item.description && (
          <Text style={styles.itemSubtitle} numberOfLines={1}>{item.description}</Text>
        )}
      </View>
      <View style={[styles.previewTag, { backgroundColor: item.color + '20' }]}>
        <Text style={[styles.previewText, { color: item.color }]}>{item.name}</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id_tag}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyText}>Nenhuma tag</Text>
            <Text style={styles.emptySubtext}>Crie tags para organizar seus contatos</Text>
          </View>
        }
        contentContainerStyle={tags.length === 0 ? styles.emptyList : undefined}
        ListFooterComponent={
          tags.length > 0 ? (
            <Text style={styles.hint}>Segure para excluir</Text>
          ) : null
        }
      />
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('NewTag')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  previewTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewText: { fontSize: 12, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyList: { flex: 1 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8 },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    padding: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300' },
});
