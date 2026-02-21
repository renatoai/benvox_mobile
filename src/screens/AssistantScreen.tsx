import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { agentsService, messagesService, conversationsService } from '../services';
import type { AiAgent } from '../types';
import { getStorageItem } from '../utils/storage';

const API_BASE_URL = 'https://api.voxbel.com';

type RootStackParamList = {
  Assistant: { conversationId: string; contactName: string; contactPhone: string; channelId: string };
};

type AssistantRouteProp = RouteProp<RootStackParamList, 'Assistant'>;

interface AssistantMessage {
  id_assistant: string;
  assistant_type: 'human_to_agent' | 'agent_to_human';
  sender_name?: string;
  content: string;
  status: 'pending' | 'sent' | 'deleted';
  created_at: string;
  metadata?: {
    structured_response?: {
      type: 'message' | 'options' | 'buttons' | 'list' | 'plain';
      content?: string;
      intro?: string;
      options?: Array<{ id: string; content: string }>;
      title?: string;
      items?: Array<{ label: string; description?: string }>;
    };
  };
}

export function AssistantScreen() {
  const route = useRoute<AssistantRouteProp>();
  const navigation = useNavigation<any>();
  const { conversationId, contactName, contactPhone, channelId } = route.params;
  
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // Load agents
  useEffect(() => {
    loadAgents();
    loadMessages();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await agentsService.getAll();
      const activeAgents = data.filter((a: AiAgent) => a.is_active);
      setAgents(activeAgents);
      if (activeAgents.length > 0 && !selectedAgent) {
        setSelectedAgent(activeAgents[0]);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const token = await getStorageItem('token');
      const response = await fetch(`${API_BASE_URL}/assistant/conversation/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading assistant messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedAgent || isSending) return;
    
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    setIsStreaming(true);
    setStreamingText('');
    
    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const tempMessage: AssistantMessage = {
      id_assistant: tempId,
      assistant_type: 'human_to_agent',
      sender_name: 'Você',
      content: text,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      const token = await getStorageItem('token');
      
      // Use streaming endpoint
      const response = await fetch(`${API_BASE_URL}/assistant/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          id_conversation: conversationId,
          target_agent_id: selectedAgent.id_ai_agent,
          content: text,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let agentMessageId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              if (eventData.type === 'chunk') {
                fullText += eventData.text || '';
                setStreamingText(fullText);
              } else if (eventData.type === 'message_created') {
                agentMessageId = eventData.id_assistant;
              } else if (eventData.type === 'complete') {
                // Add the complete agent message
                if (eventData.message) {
                  setMessages(prev => [...prev, eventData.message]);
                }
              } else if (eventData.type === 'error') {
                throw new Error(eventData.error);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Reload to get final state
      await loadMessages();
      
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar');
      setMessages(prev => prev.filter(m => m.id_assistant !== tempId));
    } finally {
      setIsSending(false);
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const sendToClient = async (content: string) => {
    try {
      await conversationsService.sendMessage(conversationId, content, contactPhone, channelId);
      Alert.alert('Sucesso', 'Mensagem enviada ao cliente!');
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar ao cliente');
    }
  };

  const clearChat = async () => {
    Alert.alert('Limpar Chat', 'Excluir todas as mensagens do assistente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getStorageItem('token');
            await fetch(`${API_BASE_URL}/assistant/conversation/${conversationId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            setMessages([]);
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível limpar');
          }
        },
      },
    ]);
  };

  const renderMessage = ({ item }: { item: AssistantMessage }) => {
    const isUser = item.assistant_type === 'human_to_agent';
    const structured = item.metadata?.structured_response;
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.agentMessage]}>
        {/* Sender label */}
        <Text style={styles.senderLabel}>
          {isUser ? '👤 Você' : `🤖 ${selectedAgent?.name || 'Agente'}`}
        </Text>
        
        {/* Content */}
        {structured?.type === 'message' && structured.content && (
          <View style={styles.structuredCard}>
            {structured.intro && <Text style={styles.cardIntro}>{structured.intro}</Text>}
            <Text style={styles.cardContent}>{structured.content}</Text>
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={() => sendToClient(structured.content!)}
            >
              <Text style={styles.sendButtonText}>📤 Enviar ao Cliente</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {structured?.type === 'options' && structured.options && (
          <View style={styles.structuredCard}>
            {structured.intro && <Text style={styles.cardIntro}>{structured.intro}</Text>}
            {structured.options.map((opt, idx) => (
              <View key={idx} style={styles.optionCard}>
                <Text style={styles.optionLabel}>Opção {idx + 1}</Text>
                <Text style={styles.optionContent}>{opt.content}</Text>
                <TouchableOpacity 
                  style={styles.sendButtonSmall}
                  onPress={() => sendToClient(opt.content)}
                >
                  <Text style={styles.sendButtonSmallText}>Enviar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        {structured?.type === 'buttons' && (
          <View style={styles.structuredCard}>
            {structured.title && <Text style={styles.cardIntro}>{structured.title}</Text>}
            <Text style={styles.cardContent}>[Mensagem com botões]</Text>
          </View>
        )}
        
        {structured?.type === 'list' && (
          <View style={styles.structuredCard}>
            {structured.title && <Text style={styles.cardIntro}>{structured.title}</Text>}
            {structured.items?.map((item, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.listLabel}>{item.label}</Text>
                {item.description && <Text style={styles.listDesc}>{item.description}</Text>}
              </View>
            ))}
          </View>
        )}
        
        {(!structured || structured.type === 'plain') && item.content && (
          <Text style={styles.messageText}>{item.content}</Text>
        )}
        
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.agentSelector} onPress={() => setShowAgentPicker(true)}>
          <Text style={styles.agentLabel}>🤖</Text>
          <Text style={styles.agentName}>{selectedAgent?.name || 'Selecionar Agente'}</Text>
          <Text style={styles.agentArrow}>▼</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
          <Text style={styles.clearIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
      
      {/* Info */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          💬 Conversa com {contactName}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id_assistant}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyText}>Assistente IA</Text>
            <Text style={styles.emptySubtext}>
              Pergunte ao agente o que responder ao cliente
            </Text>
          </View>
        }
        ListFooterComponent={
          isStreaming && streamingText ? (
            <View style={[styles.messageContainer, styles.agentMessage]}>
              <Text style={styles.senderLabel}>🤖 {selectedAgent?.name || 'Agente'}</Text>
              <Text style={styles.messageText}>{streamingText}</Text>
              <ActivityIndicator size="small" color="#8b5cf6" style={{ marginTop: 8 }} />
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Pergunte ao assistente..."
          placeholderTextColor="#999"
          multiline
          maxLength={4096}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Agent Picker Modal */}
      <Modal visible={showAgentPicker} transparent animationType="slide" onRequestClose={() => setShowAgentPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.sheetTitle}>Selecionar Agente</Text>
            <ScrollView style={styles.agentsList}>
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id_ai_agent}
                  style={[
                    styles.agentItem,
                    selectedAgent?.id_ai_agent === agent.id_ai_agent && styles.agentItemSelected
                  ]}
                  onPress={() => {
                    setSelectedAgent(agent);
                    setShowAgentPicker(false);
                  }}
                >
                  <Text style={styles.agentItemIcon}>🤖</Text>
                  <View style={styles.agentItemInfo}>
                    <Text style={styles.agentItemName}>{agent.name}</Text>
                    <Text style={styles.agentItemModel}>{agent.model || 'gpt-4'}</Text>
                  </View>
                  {selectedAgent?.id_ai_agent === agent.id_ai_agent && (
                    <Text style={styles.agentItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAgentPicker(false)}>
              <Text style={styles.cancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  agentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  agentLabel: { fontSize: 16, marginRight: 8 },
  agentName: { fontSize: 14, color: '#fff', fontWeight: '600' },
  agentArrow: { fontSize: 10, color: '#fff', marginLeft: 8 },
  clearButton: { padding: 8 },
  clearIcon: { fontSize: 18 },
  
  // Info bar
  infoBar: {
    backgroundColor: '#e9d5ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoText: { fontSize: 13, color: '#7c3aed' },
  
  // Messages
  messagesList: { padding: 16, paddingBottom: 100 },
  messageContainer: {
    maxWidth: '85%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#ddd6fe',
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  senderLabel: { fontSize: 11, color: '#666', marginBottom: 4, fontWeight: '600' },
  messageText: { fontSize: 15, color: '#333', lineHeight: 22 },
  timestamp: { fontSize: 10, color: '#999', marginTop: 6, textAlign: 'right' },
  
  // Structured content
  structuredCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  cardIntro: { fontSize: 12, color: '#666', marginBottom: 8, fontStyle: 'italic' },
  cardContent: { fontSize: 14, color: '#333', lineHeight: 20 },
  sendButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  // Options
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionLabel: { fontSize: 10, color: '#8b5cf6', fontWeight: '600', marginBottom: 4 },
  optionContent: { fontSize: 14, color: '#333', lineHeight: 20 },
  sendButtonSmall: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  sendButtonSmallText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  
  // List
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  listDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#8b5cf6', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 32 },
  
  // Input
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 8,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#d1d5db' },
  sendBtnText: { color: '#fff', fontSize: 20 },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  agentsList: { maxHeight: 300 },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  agentItemSelected: { backgroundColor: '#ede9fe', borderColor: '#8b5cf6', borderWidth: 1 },
  agentItemIcon: { fontSize: 24, marginRight: 12 },
  agentItemInfo: { flex: 1 },
  agentItemName: { fontSize: 16, fontWeight: '500', color: '#333' },
  agentItemModel: { fontSize: 12, color: '#666' },
  agentItemCheck: { fontSize: 18, color: '#8b5cf6', fontWeight: '600' },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  cancelText: { fontSize: 16, color: '#666', fontWeight: '600' },
});
