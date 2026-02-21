import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { knowledgeService } from '../services';
import type { KnowledgeBase } from '../types';

export function KnowledgeScreen() {
  const navigation = useNavigation<any>();
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadBases = useCallback(async () => {
    try {
      const data = await knowledgeService.getAll();
      setBases(data);
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBases();
  }, [loadBases]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBases();
  }, [loadBases]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('Erro', 'Digite um nome para a base');
      return;
    }
    
    setIsCreating(true);
    try {
      await knowledgeService.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      loadBases();
      Alert.alert('Sucesso', 'Base de conhecimento criada!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar');
    } finally {
      setIsCreating(false);
    }
  };

  const renderItem = ({ item }: { item: KnowledgeBase }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => navigation.navigate('KnowledgeDetail', { 
        baseId: item.id_knowledge_base, 
        name: item.name 
      })}
    >
      <View style={styles.itemIcon}>
        <Text style={styles.iconText}>📚</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        {item.description && (
          <Text style={styles.itemSubtitle} numberOfLines={1}>{item.description}</Text>
        )}
        <Text style={styles.docsCount}>
          {item.documents_count || 0} documento{(item.documents_count || 0) !== 1 ? 's' : ''}
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
        data={bases}
        keyExtractor={(item) => item.id_knowledge_base}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>Nenhuma base de conhecimento</Text>
            <Text style={styles.emptySubtext}>Crie bases para treinar seus agentes</Text>
          </View>
        }
        contentContainerStyle={bases.length === 0 ? styles.emptyList : { paddingBottom: 100 }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Base de Conhecimento</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nome da base"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Descrição (opcional)"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveBtn, isCreating && styles.modalSaveBtnDisabled]} 
                onPress={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Criar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff3e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 24 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  docsCount: { fontSize: 12, color: '#25D366', marginTop: 4, fontWeight: '500' },
  arrow: { fontSize: 24, color: '#ccc' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyList: { flex: 1 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300' },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  modalTextarea: { height: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  modalCancelText: { fontSize: 16, color: '#666', fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
  },
  modalSaveBtnDisabled: { backgroundColor: '#ccc' },
  modalSaveText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
