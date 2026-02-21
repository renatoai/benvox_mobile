import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { agentsService } from '../services';
import type { AiAgent } from '../types';

export function AgentsScreen() {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const data = await agentsService.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAgents();
  }, [loadAgents]);

  const toggleAgent = async (agent: AiAgent) => {
    try {
      await agentsService.update(agent.id_ai_agent, { is_active: !agent.is_active });
      setAgents(prev => prev.map(a => 
        a.id_ai_agent === agent.id_ai_agent ? { ...a, is_active: !a.is_active } : a
      ));
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const renderItem = ({ item }: { item: AiAgent }) => (
    <TouchableOpacity style={styles.item}>
      <View style={styles.itemIcon}>
        <Text style={styles.iconText}>🤖</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSubtitle}>{item.model || 'gpt-4'}</Text>
        {item.greeting_enabled && (
          <View style={styles.greetingBadge}>
            <Text style={styles.greetingText}>👋 Saudação ativa</Text>
          </View>
        )}
      </View>
      <Switch
        value={item.is_active}
        onValueChange={() => toggleAgent(item)}
        trackColor={{ false: '#ddd', true: '#25D366' }}
        thumbColor="#fff"
      />
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
        data={agents}
        keyExtractor={(item) => item.id_ai_agent}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyText}>Nenhum agente</Text>
            <Text style={styles.emptySubtext}>Crie agentes de IA para automatizar atendimentos</Text>
          </View>
        }
        contentContainerStyle={agents.length === 0 ? styles.emptyList : undefined}
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
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 24 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  greetingBadge: {
    marginTop: 6,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  greetingText: { fontSize: 12, color: '#2e7d32' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyList: { flex: 1 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
