import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { funnelsService } from '../services';
import type { FunnelStage } from '../types';

export function FunnelDetailScreen() {
  const route = useRoute<any>();
  const { funnelId } = route.params;
  
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStages = useCallback(async () => {
    try {
      const data = await funnelsService.getStages(funnelId);
      setStages(data.sort((a, b) => a.position - b.position));
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [funnelId]);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadStages();
  }, [loadStages]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
      }
    >
      <View style={styles.pipeline}>
        {stages.map((stage, index) => (
          <View key={stage.id_funnel_stage} style={styles.stageContainer}>
            <View style={[styles.stage, { borderLeftColor: stage.color || '#25D366' }]}>
              <View style={styles.stageHeader}>
                <View style={[styles.stageColorDot, { backgroundColor: stage.color || '#25D366' }]} />
                <Text style={styles.stageName}>{stage.name}</Text>
              </View>
              <View style={styles.stageStats}>
                <Text style={styles.contactsCount}>
                  {stage.contacts_count || 0} contatos
                </Text>
              </View>
              {stage.workflows && stage.workflows.length > 0 && (
                <View style={styles.workflowsBadge}>
                  <Text style={styles.workflowsText}>
                    ⚡ {stage.workflows.length} automação{stage.workflows.length > 1 ? 'ões' : ''}
                  </Text>
                </View>
              )}
            </View>
            {index < stages.length - 1 && (
              <View style={styles.connector}>
                <Text style={styles.connectorArrow}>↓</Text>
              </View>
            )}
          </View>
        ))}
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
  pipeline: { padding: 16 },
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
  stageColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  stageName: { fontSize: 16, fontWeight: '600', color: '#333' },
  stageStats: { marginTop: 8 },
  contactsCount: { fontSize: 14, color: '#666' },
  workflowsBadge: {
    marginTop: 8,
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  workflowsText: { fontSize: 12, color: '#f57c00' },
  connector: { paddingVertical: 8 },
  connectorArrow: { fontSize: 20, color: '#ccc' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8 },
});
