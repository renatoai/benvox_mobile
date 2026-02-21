import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { conversationsService, contactsService, funnelsService, agentsService, tagsService } from '../services';
import type { Message, Conversation, AiAgent, Tag, FunnelStage } from '../types';

type RootStackParamList = {
  Chat: { conversationId: string; contactName: string };
};

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export function ChatScreen() {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<any>();
  const { conversationId } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Modals
  const [showActions, setShowActions] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showStageMove, setShowStageMove] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  
  // Data for modals
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const loadConversation = useCallback(async () => {
    try {
      const conv = await conversationsService.getById(conversationId);
      setConversation(conv);
      
      // Load stages if pipeline exists
      if (conv.id_pipeline) {
        const stagesData = await funnelsService.getStages(conv.id_pipeline);
        setStages(stagesData);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await conversationsService.getMessages(conversationId);
      const sorted = data.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
    loadMessages();
    conversationsService.markAsRead(conversationId).catch(console.error);
    
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId, loadConversation, loadMessages]);

  const loadAgents = async () => {
    try {
      const data = await agentsService.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    const tempMessage: Message = {
      id_message: `temp-${Date.now()}`,
      conversation_id: conversationId,
      text_body: text,
      from_me: true,
      sender_type: 'user',
      message_type: 'text',
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      // Get phone and channel from conversation
      const phone = conversation?.contact_phone;
      const channelId = conversation?.id_channel;
      
      if (!phone) {
        throw new Error('Telefone do contato não encontrado');
      }
      
      const newMessage = await conversationsService.sendMessage(conversationId, text, phone, channelId);
      setMessages(prev => 
        prev.map(m => m.id_message === tempMessage.id_message ? { ...newMessage, status: 'sent' } : m)
      );
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.id_message !== tempMessage.id_message));
      Alert.alert('Erro', error.response?.data?.message || error.message || 'Não foi possível enviar');
    } finally {
      setIsSending(false);
    }
  };

  // Actions
  const handleAssignToMe = async () => {
    try {
      await conversationsService.assignToMe(conversationId);
      await loadConversation();
      Alert.alert('Sucesso', 'Conversa atribuída a você!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível assumir a conversa');
    }
    setShowActions(false);
  };

  const handleClose = async () => {
    Alert.alert('Fechar Conversa', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Fechar', 
        onPress: async () => {
          try {
            await conversationsService.close(conversationId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível fechar');
          }
        }
      },
    ]);
    setShowActions(false);
  };

  const handleReopen = async () => {
    try {
      await conversationsService.reopen(conversationId);
      await loadConversation();
      Alert.alert('Sucesso', 'Conversa reaberta!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível reabrir');
    }
    setShowActions(false);
  };

  const handleArchive = async () => {
    Alert.alert('Arquivar Conversa', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Arquivar', 
        onPress: async () => {
          try {
            await conversationsService.archive(conversationId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível arquivar');
          }
        }
      },
    ]);
    setShowActions(false);
  };

  const handleTransferToAgent = async (agentId: string) => {
    try {
      await conversationsService.transfer(conversationId, { agent_id: agentId });
      await loadConversation();
      Alert.alert('Sucesso', 'Transferido para agente!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível transferir');
    }
    setShowTransfer(false);
  };

  const handleTransferToHuman = async () => {
    try {
      await conversationsService.transfer(conversationId, { transfer_to_human: true });
      await loadConversation();
      Alert.alert('Sucesso', 'Transferido para atendimento humano!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível transferir');
    }
    setShowTransfer(false);
  };

  const handleMoveStage = async (stageId: string) => {
    try {
      await funnelsService.moveConversationStage(conversationId, stageId);
      await loadConversation();
      Alert.alert('Sucesso', 'Movido para nova etapa!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível mover');
    }
    setShowStageMove(false);
  };

  const openTransferModal = () => {
    loadAgents();
    setShowTransfer(true);
    setShowActions(false);
  };

  const openStageMoveModal = () => {
    setShowStageMove(true);
    setShowActions(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.from_me;
    
    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && item.sender_display_name && (
          <Text style={styles.senderName}>{item.sender_display_name}</Text>
        )}
        {item.message_type === 'text' || !item.message_type ? (
          <Text style={styles.messageText}>{item.text_body || item.caption}</Text>
        ) : item.message_type === 'image' && item.media_url ? (
          <View>
            <Image source={{ uri: item.media_url }} style={styles.mediaImage} resizeMode="cover" />
            {item.caption && <Text style={styles.captionText}>{item.caption}</Text>}
          </View>
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Text style={styles.mediaIcon}>
              {item.message_type === 'audio' ? '🎵' : 
               item.message_type === 'video' ? '🎬' : 
               item.message_type === 'document' ? '📄' : '📎'}
            </Text>
            <Text style={styles.mediaText}>{item.message_type}</Text>
            {item.caption && <Text style={styles.captionText}>{item.caption}</Text>}
          </View>
        )}
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
          {isMe && (
            <Text style={[styles.status, item.status === 'read' && styles.statusRead]}>
              {item.status === 'read' ? '✓✓' : item.status === 'delivered' ? '✓✓' : item.status === 'sent' ? '✓' : '○'}
            </Text>
          )}
        </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header Info Bar */}
      <TouchableOpacity style={styles.infoBar} onPress={() => setShowContactInfo(true)}>
        <View style={styles.infoContent}>
          {conversation?.assigned_to_agent_name && (
            <View style={styles.agentBadge}>
              <Text style={styles.agentBadgeText}>🤖 {conversation.assigned_to_agent_name}</Text>
            </View>
          )}
          {conversation?.status && (
            <View style={[styles.statusBadge, conversation.status === 'closed' && styles.closedBadge]}>
              <Text style={styles.statusBadgeText}>{conversation.status}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.actionsButton} onPress={() => setShowActions(true)}>
          <Text style={styles.actionsIcon}>⋯</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Messages */}
      <View style={styles.chatBackground}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id_message}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Sem mensagens</Text>
            </View>
          }
        />
      </View>
      
      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Mensagem"
          placeholderTextColor="#999"
          multiline
          maxLength={4096}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Actions Modal */}
      <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowActions(false)}>
          <View style={styles.actionsSheet}>
            <Text style={styles.sheetTitle}>Ações</Text>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleAssignToMe}>
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionText}>Assumir Conversa</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={openTransferModal}>
              <Text style={styles.actionIcon}>🔄</Text>
              <Text style={styles.actionText}>Transferir</Text>
            </TouchableOpacity>
            
            {stages.length > 0 && (
              <TouchableOpacity style={styles.actionItem} onPress={openStageMoveModal}>
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionText}>Mover Etapa</Text>
              </TouchableOpacity>
            )}
            
            {conversation?.status === 'open' ? (
              <TouchableOpacity style={styles.actionItem} onPress={handleClose}>
                <Text style={styles.actionIcon}>✖️</Text>
                <Text style={styles.actionText}>Fechar Conversa</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionItem} onPress={handleReopen}>
                <Text style={styles.actionIcon}>🔓</Text>
                <Text style={styles.actionText}>Reabrir Conversa</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.actionItem} onPress={handleArchive}>
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionText}>Arquivar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => {
              setShowActions(false);
              if (conversation?.id_contact) {
                navigation.navigate('ContactDetail', { contactId: conversation.id_contact });
              }
            }}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Ver Contato</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowActions(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transfer Modal */}
      <Modal visible={showTransfer} transparent animationType="slide" onRequestClose={() => setShowTransfer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.transferSheet}>
            <Text style={styles.sheetTitle}>Transferir Para</Text>
            
            <TouchableOpacity style={styles.transferItem} onPress={handleTransferToHuman}>
              <Text style={styles.transferIcon}>👤</Text>
              <View>
                <Text style={styles.transferTitle}>Atendimento Humano</Text>
                <Text style={styles.transferSubtitle}>Fila de atendentes</Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.sectionLabel}>Agentes IA</Text>
            <ScrollView style={styles.agentsList}>
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id_ai_agent}
                  style={styles.transferItem}
                  onPress={() => handleTransferToAgent(agent.id_ai_agent)}
                >
                  <Text style={styles.transferIcon}>🤖</Text>
                  <View>
                    <Text style={styles.transferTitle}>{agent.name}</Text>
                    <Text style={styles.transferSubtitle}>{agent.model || 'gpt-4'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTransfer(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Stage Move Modal */}
      <Modal visible={showStageMove} transparent animationType="slide" onRequestClose={() => setShowStageMove(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.transferSheet}>
            <Text style={styles.sheetTitle}>Mover para Etapa</Text>
            
            <ScrollView style={styles.stagesList}>
              {stages.map((stage) => (
                <TouchableOpacity
                  key={stage.id_stage || stage.id_funnel_stage}
                  style={[
                    styles.stageItem,
                    (stage.id_stage || stage.id_funnel_stage) === conversation?.id_stage && styles.currentStage
                  ]}
                  onPress={() => handleMoveStage(stage.id_stage || stage.id_funnel_stage || '')}
                >
                  <View style={[styles.stageDot, { backgroundColor: stage.color || '#25D366' }]} />
                  <Text style={styles.stageText}>{stage.name}</Text>
                  {(stage.id_stage || stage.id_funnel_stage) === conversation?.id_stage && (
                    <Text style={styles.currentLabel}>Atual</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowStageMove(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECE5DD' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  agentBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  agentBadgeText: { fontSize: 12, color: '#1976d2' },
  statusBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedBadge: { backgroundColor: '#ffebee' },
  statusBadgeText: { fontSize: 12, color: '#333', textTransform: 'capitalize' },
  actionsButton: { padding: 8 },
  actionsIcon: { fontSize: 24, color: '#666' },
  chatBackground: { flex: 1 },
  messagesList: { padding: 8, paddingBottom: 16 },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 2,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 0,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
  },
  senderName: { fontSize: 12, fontWeight: '600', color: '#075E54', marginBottom: 2 },
  messageText: { fontSize: 15, color: '#333' },
  mediaImage: { width: 200, height: 200, borderRadius: 8 },
  mediaPlaceholder: { alignItems: 'center', padding: 16 },
  mediaIcon: { fontSize: 32 },
  mediaText: { fontSize: 12, color: '#666', marginTop: 4, textTransform: 'capitalize' },
  captionText: { fontSize: 14, color: '#333', marginTop: 8 },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2 },
  timestamp: { fontSize: 11, color: '#999' },
  status: { fontSize: 12, color: '#999', marginLeft: 4 },
  statusRead: { color: '#53bdeb' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#666' },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontSize: 20 },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: { fontSize: 20, marginRight: 12, width: 30 },
  actionText: { fontSize: 16, color: '#333' },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  cancelText: { fontSize: 16, color: '#666', fontWeight: '600' },
  transferSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transferIcon: { fontSize: 24, marginRight: 12 },
  transferTitle: { fontSize: 16, color: '#333', fontWeight: '500' },
  transferSubtitle: { fontSize: 13, color: '#666' },
  sectionLabel: { fontSize: 12, color: '#666', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  agentsList: { maxHeight: 200 },
  stagesList: { maxHeight: 300 },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  currentStage: { backgroundColor: '#e8f5e9' },
  stageDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  stageText: { fontSize: 16, color: '#333', flex: 1 },
  currentLabel: { fontSize: 12, color: '#25D366', fontWeight: '600' },
});
