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
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { conversationsService } from '../services/conversations.service';
import type { Message } from '../types';

type RootStackParamList = {
  Chat: { conversationId: string; contactName: string };
};

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export function ChatScreen() {
  const route = useRoute<ChatRouteProp>();
  const { conversationId } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await conversationsService.getMessages(conversationId);
      setMessages(data.reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    
    // Mark as read
    conversationsService.markAsRead(conversationId).catch(console.error);
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId, loadMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    // Optimistic update
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
      const newMessage = await conversationsService.sendMessage(conversationId, text);
      setMessages(prev => 
        prev.map(m => m.id_message === tempMessage.id_message ? newMessage : m)
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temp message on error
      setMessages(prev => prev.filter(m => m.id_message !== tempMessage.id_message));
    } finally {
      setIsSending(false);
    }
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
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.text_body}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, isMe && styles.myTimestamp]}>
            {formatTime(item.created_at)}
          </Text>
          {isMe && (
            <Text style={styles.status}>
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
              <Text style={styles.emptySubtext}>Envie uma mensagem para iniciar</Text>
            </View>
          }
        />
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Mensagem"
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>▶</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECE5DD',
  },
  chatBackground: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  messagesList: {
    padding: 8,
    paddingBottom: 16,
  },
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
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
  },
  myMessageText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
  myTimestamp: {
    color: '#666',
  },
  status: {
    fontSize: 12,
    color: '#53bdeb',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
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
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
  },
});
