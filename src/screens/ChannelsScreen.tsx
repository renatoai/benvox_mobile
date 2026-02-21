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
  ScrollView,
  Switch,
} from 'react-native';
import { channelsService } from '../services';

interface Channel {
  id_channel: string;
  name: string;
  type: string;
  provider?: string;
  status?: string;
  is_active?: boolean;
  is_connected?: boolean;
  display_phone_number?: string;
  phone_number?: string;
  channel_identifier?: string;
  id_pipeline?: string;
  pipeline_name?: string;
  webhook_url?: string;
}

export function ChannelsScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form fields
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const loadChannels = useCallback(async () => {
    try {
      const data = await channelsService.getAll();
      setChannels(data);
    } catch (error) {
      console.error('Error loading channels:', error);
      Alert.alert('Erro', 'Não foi possível carregar os canais');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadChannels();
  }, [loadChannels]);

  const handleOpenEdit = (channel: Channel) => {
    setSelectedChannel(channel);
    setEditName(channel.name);
    setEditIsActive(channel.is_active !== false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedChannel || !editName.trim()) return;
    
    setIsSaving(true);
    try {
      await channelsService.update(selectedChannel.id_channel, { 
        name: editName.trim(),
        is_active: editIsActive,
      });
      loadChannels();
      setEditModalVisible(false);
      Alert.alert('Sucesso', 'Canal atualizado!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o canal');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusInfo = (channel: Channel) => {
    // Check is_connected first, then is_active, then status field
    if (channel.is_connected) {
      return { color: '#25D366', text: 'Conectado' };
    }
    if (channel.is_active === false) {
      return { color: '#e74c3c', text: 'Inativo' };
    }
    if (channel.status === 'active' || channel.is_active === true) {
      return { color: '#25D366', text: 'Ativo' };
    }
    if (channel.status === 'disconnected' || channel.is_connected === false) {
      return { color: '#f39c12', text: 'Desconectado' };
    }
    return { color: '#f39c12', text: channel.status || 'Pendente' };
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'whatsapp': return '📱';
      case 'telegram': return '✈️';
      case 'instagram': return '📷';
      case 'messenger': return '💬';
      case 'meta': return '📱';
      default: return '📨';
    }
  };

  const renderItem = ({ item }: { item: Channel }) => {
    const statusInfo = getStatusInfo(item);
    const phoneDisplay = item.display_phone_number || item.phone_number || item.channel_identifier || item.type;
    
    return (
      <TouchableOpacity style={styles.item} onPress={() => handleOpenEdit(item)}>
        <View style={styles.itemIcon}>
          <Text style={styles.iconText}>{getTypeIcon(item.type)}</Text>
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.name}</Text>
          </View>
          <Text style={styles.itemSubtitle}>{phoneDisplay}</Text>
          {item.pipeline_name && (
            <Text style={styles.pipelineText}>📊 {item.pipeline_name}</Text>
          )}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>▶</Text>
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
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id_channel}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyText}>Nenhum canal</Text>
            <Text style={styles.emptySubtext}>Configure seus canais de comunicação</Text>
          </View>
        }
        contentContainerStyle={channels.length === 0 ? styles.emptyList : undefined}
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Configurar Canal</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSaving}>
              <Text style={[styles.modalSave, isSaving && { opacity: 0.5 }]}>
                {isSaving ? '...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedChannel && (
              <>
                {/* Channel Info Header */}
                <View style={styles.channelHeader}>
                  <View style={styles.channelIcon}>
                    <Text style={styles.channelIconText}>{getTypeIcon(selectedChannel.type)}</Text>
                  </View>
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelType}>{selectedChannel.type?.toUpperCase()}</Text>
                    <Text style={styles.channelPhone}>
                      {selectedChannel.display_phone_number || selectedChannel.channel_identifier}
                    </Text>
                  </View>
                </View>

                {/* Name */}
                <View style={styles.field}>
                  <Text style={styles.label}>Nome do Canal</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nome do canal"
                  />
                </View>

                {/* Active Toggle */}
                <View style={styles.switchField}>
                  <View>
                    <Text style={styles.label}>Canal Ativo</Text>
                    <Text style={styles.labelHint}>Quando inativo, não recebe mensagens</Text>
                  </View>
                  <Switch
                    value={editIsActive}
                    onValueChange={setEditIsActive}
                    trackColor={{ false: '#ddd', true: '#25D366' }}
                  />
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Informações</Text>
                  
                  {selectedChannel.pipeline_name && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Funil</Text>
                      <Text style={styles.infoValue}>{selectedChannel.pipeline_name}</Text>
                    </View>
                  )}
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDotSmall, { backgroundColor: getStatusInfo(selectedChannel).color }]} />
                      <Text style={styles.statusBadgeText}>{getStatusInfo(selectedChannel).text}</Text>
                    </View>
                  </View>

                  {selectedChannel.provider && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Provedor</Text>
                      <Text style={styles.infoValue}>{selectedChannel.provider}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>ID</Text>
                    <Text style={styles.infoValueMono}>{selectedChannel.id_channel.slice(0, 8)}...</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 24 },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  pipelineText: { fontSize: 12, color: '#8b5cf6', marginTop: 4 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '500' },
  chevron: { fontSize: 14, color: '#ccc' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyList: { flex: 1 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8 },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: { fontSize: 16, color: '#666' },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { fontSize: 16, color: '#25D366', fontWeight: '600' },
  modalContent: { flex: 1 },
  
  // Channel header
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  channelIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelIconText: { fontSize: 32 },
  channelInfo: { marginLeft: 16 },
  channelType: { fontSize: 12, color: '#666', fontWeight: '600' },
  channelPhone: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 4 },
  
  // Form fields
  field: { backgroundColor: '#fff', padding: 16, marginBottom: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8, textTransform: 'uppercase' },
  labelHint: { fontSize: 12, color: '#999', marginTop: -4 },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  
  // Info section
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 16, textTransform: 'uppercase' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  infoValueMono: { fontSize: 13, color: '#666', fontFamily: 'monospace' },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusBadgeText: { fontSize: 14, fontWeight: '500' },
});
