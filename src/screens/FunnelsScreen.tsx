import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { funnelsService } from '../services';
import type { Funnel } from '../types';

export function FunnelsScreen() {
  const navigation = useNavigation<any>();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFunnels = useCallback(async () => {
    try {
      const data = await funnelsService.getAll();
      setFunnels(data);
    } catch (error) {
      console.error('Error loading funnels:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFunnels();
  }, [loadFunnels]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadFunnels();
  }, [loadFunnels]);

  const renderItem = ({ item }: { item: Funnel }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => navigation.navigate('FunnelDetail', { 
        funnelId: item.id_pipeline || item.id_funnel, 
        name: item.name 
      })}
    >
      <View style={styles.itemIcon}>
        <Text style={styles.iconText}>🎯</Text>
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          {item.is_published && (
            <View style={styles.publishedBadge}>
              <Text style={styles.publishedBadgeText}>Ativo</Text>
            </View>
          )}
        </View>
        {item.description && (
          <Text style={styles.itemSubtitle} numberOfLines={1}>{item.description}</Text>
        )}
        <Text style={styles.stagesCount}>
          {item.stage_count || item.stages?.length || 0} etapas
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
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
        data={funnels}
        keyExtractor={(item) => item.id_pipeline || item.id_funnel}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>Nenhum funil</Text>
            <Text style={styles.emptySubtext}>Crie funis para organizar seus contatos</Text>
          </View>
        }
        contentContainerStyle={funnels.length === 0 ? styles.emptyList : undefined}
      />
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
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 24 },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  stagesCount: { fontSize: 12, color: '#25D366', marginTop: 4, fontWeight: '500' },
  publishedBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  publishedBadgeText: { fontSize: 10, color: '#2e7d32', fontWeight: '600' },
  arrow: { fontSize: 24, color: '#ccc' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyList: { flex: 1 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8 },
});
