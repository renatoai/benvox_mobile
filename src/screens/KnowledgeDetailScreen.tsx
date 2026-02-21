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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { knowledgeService } from '../services';
import type { KnowledgeBase, KnowledgeDocument } from '../types';

type RootStackParamList = {
  KnowledgeDetail: { baseId: string; name: string };
};

type KnowledgeDetailRouteProp = RouteProp<RootStackParamList, 'KnowledgeDetail'>;

export function KnowledgeDetailScreen() {
  const route = useRoute<KnowledgeDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { baseId, name } = route.params;

  const [base, setBase] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modal states
  const [showAddText, setShowAddText] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [baseData, docsData] = await Promise.all([
        knowledgeService.getById(baseId),
        knowledgeService.getDocuments(baseId),
      ]);
      setBase(baseData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [baseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/markdown', 'application/msword', 
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setIsUploading(true);

      await knowledgeService.uploadDocument(baseId, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      Alert.alert('Sucesso', 'Documento enviado! Processamento em andamento.');
      await loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar o documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddText = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      Alert.alert('Erro', 'Preencha título e conteúdo');
      return;
    }

    setIsAddingText(true);
    try {
      await knowledgeService.addTextDocument(baseId, textTitle, textContent);
      Alert.alert('Sucesso', 'Texto adicionado!');
      setShowAddText(false);
      setTextTitle('');
      setTextContent('');
      await loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível adicionar');
    } finally {
      setIsAddingText(false);
    }
  };

  const handleDeleteDocument = (docId: string, docTitle: string) => {
    Alert.alert('Excluir Documento', `Excluir "${docTitle}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await knowledgeService.deleteDocument(docId);
            await loadData();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return '📄';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('word') || fileType.includes('doc')) return '📘';
    if (fileType.includes('text')) return '📝';
    return '📄';
  };

  const renderDocument = ({ item }: { item: KnowledgeDocument }) => (
    <TouchableOpacity
      style={styles.docItem}
      onLongPress={() => handleDeleteDocument(item.id_knowledge_document, item.title)}
    >
      <View style={styles.docIcon}>
        <Text style={styles.docIconText}>{getFileIcon(item.file_type)}</Text>
      </View>
      <View style={styles.docContent}>
        <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
        {item.file_type && (
          <Text style={styles.docType}>{item.file_type}</Text>
        )}
        <Text style={styles.docChunks}>
          {item.chunks_count || 0} chunks processados
        </Text>
      </View>
      <View style={styles.docStatus}>
        <Text style={styles.statusDot}>●</Text>
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
      {/* Info Header */}
      <View style={styles.infoHeader}>
        <Text style={styles.infoTitle}>{base?.name || name}</Text>
        {base?.description && (
          <Text style={styles.infoDesc}>{base.description}</Text>
        )}
        <Text style={styles.infoStats}>
          {documents.length} documento{documents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, isUploading && styles.actionBtnDisabled]}
          onPress={handleUploadFile}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.actionBtnIcon}>📎</Text>
              <Text style={styles.actionBtnText}>Upload Arquivo</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowAddText(true)}
        >
          <Text style={styles.actionBtnIcon}>📝</Text>
          <Text style={styles.actionBtnText}>Adicionar Texto</Text>
        </TouchableOpacity>
      </View>

      {/* Documents List */}
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id_knowledge_document}
        renderItem={renderDocument}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📑</Text>
            <Text style={styles.emptyText}>Nenhum documento</Text>
            <Text style={styles.emptySubtext}>
              Adicione documentos para treinar o agente
            </Text>
          </View>
        }
        contentContainerStyle={documents.length === 0 ? styles.emptyList : styles.list}
        ListFooterComponent={
          documents.length > 0 ? (
            <Text style={styles.hintText}>
              Pressione e segure para excluir
            </Text>
          ) : null
        }
      />

      {/* Add Text Modal */}
      <Modal
        visible={showAddText}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddText(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Texto</Text>
            
            <TextInput
              style={styles.modalInput}
              value={textTitle}
              onChangeText={setTextTitle}
              placeholder="Título do documento"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={textContent}
              onChangeText={setTextContent}
              placeholder="Conteúdo do texto..."
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddText(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isAddingText && styles.actionBtnDisabled]}
                onPress={handleAddText}
                disabled={isAddingText}
              >
                {isAddingText ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Salvar</Text>
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
  
  // Info Header
  infoHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  infoDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  infoStats: { fontSize: 13, color: '#25D366', marginTop: 8, fontWeight: '600' },
  
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnDisabled: { backgroundColor: '#ccc' },
  actionBtnIcon: { fontSize: 18 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  // Documents list
  list: { paddingBottom: 100 },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docIconText: { fontSize: 22 },
  docContent: { flex: 1 },
  docTitle: { fontSize: 15, fontWeight: '500', color: '#333' },
  docType: { fontSize: 11, color: '#999', marginTop: 2, textTransform: 'uppercase' },
  docChunks: { fontSize: 12, color: '#25D366', marginTop: 4 },
  docStatus: { padding: 4 },
  statusDot: { fontSize: 10, color: '#25D366' },
  
  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyList: { flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: { fontSize: 13, color: '#999', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  
  hintText: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 16, marginBottom: 32 },
  
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
  modalTextarea: {
    height: 150,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
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
  modalSaveText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
