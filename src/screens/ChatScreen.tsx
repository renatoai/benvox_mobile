import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Linking,
  Dimensions,
  Pressable,
  Animated,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { conversationsService, contactsService, funnelsService, agentsService, tagsService, messagesService, usersService } from '../services';
import type { Message, Conversation, AiAgent, Tag, FunnelStage, AppUser, Funnel } from '../types';
import { useMessageSSE } from '../hooks/useMessageSSE';
import { colors, spacing, radius, typography, shadows } from '../theme';

type RootStackParamList = {
  Chat: { conversationId: string; contactName: string };
};

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_BASE_URL = 'https://api.voxbel.com';

// Emoji picker simple
const EMOJI_LIST = ['😀', '😂', '😍', '🥰', '😢', '😮', '😡', '👍', '👎', '❤️', '🔥', '👏', '🙏', '💯', '✨', '🎉', '😎', '🤔', '😅', '🙄', '😴', '🤗', '😇', '🥺'];

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
  
  // Pagination for infinite scroll
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesOffsetRef = useRef(0);
  const MESSAGES_PER_PAGE = 30;
  
  // Modals
  const [showActions, setShowActions] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showStageMove, setShowStageMove] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Data for modals
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [conversationTags, setConversationTags] = useState<string[]>([]);
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [shortcutSearch, setShortcutSearch] = useState('');
  
  // Transfer modal data
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<{ role: string; count: number }[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [transferType, setTransferType] = useState<'agent' | 'user' | 'role' | 'queue' | 'stage'>('agent');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [agentBehavior, setAgentBehavior] = useState<'greeting' | 'respond' | 'wait'>('greeting');
  const [transferPriority, setTransferPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [transferContext, setTransferContext] = useState('');
  const [transferFunnelStages, setTransferFunnelStages] = useState<FunnelStage[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);

  // Long press for message actions
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const loadConversation = useCallback(async () => {
    try {
      const conv = await conversationsService.getById(conversationId);
      setConversation(conv);
      setConversationTags(conv.tags || []);
      
      // Load stages if pipeline exists
      if (conv.id_pipeline) {
        const stagesData = await funnelsService.getStages(conv.id_pipeline);
        setStages(stagesData);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, [conversationId]);

  const loadMessages = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        if (!hasMoreMessages || isLoadingMore) return;
        setIsLoadingMore(true);
      } else {
        // Reset offset when loading fresh
        messagesOffsetRef.current = 0;
      }
      
      const offset = messagesOffsetRef.current;
      console.log(`[Chat] Loading messages, offset: ${offset}, loadMore: ${loadMore}`);
      
      const data = await conversationsService.getMessages(conversationId, MESSAGES_PER_PAGE, offset);
      
      // Sort newest first for display (inverted list shows newest at bottom)
      const sorted = data.sort((a: Message, b: Message) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      if (loadMore) {
        // Append older messages
        setMessages(prev => [...prev, ...sorted]);
      } else {
        setMessages(sorted);
      }
      
      // Update offset for next load
      messagesOffsetRef.current += data.length;
      
      // Check if there are more messages
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
      console.log(`[Chat] Loaded ${data.length} messages, new offset: ${messagesOffsetRef.current}`);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMoreMessages, isLoadingMore]);

  const loadTags = useCallback(async () => {
    try {
      const data = await tagsService.getAll();
      setTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }, []);

  // SSE connection indicator
  const [sseConnected, setSseConnected] = useState(false);

  // SSE for real-time updates
  const { isConnected: sseIsConnected } = useMessageSSE(conversationId, {
    onStatusUpdate: (event) => {
      // Update message status in local state
      setMessages(prev => prev.map(msg => {
        if (msg.id_message === event.id_message || msg.external_message_id === event.id_message) {
          return {
            ...msg,
            status: event.status as any,
            delivered_at: event.delivered_at,
            read_at: event.read_at,
            error_reason: event.error_details,
          };
        }
        return msg;
      }));
    },
    onNewMessage: (event) => {
      // New message received - reload messages
      loadMessages(false);
      conversationsService.markAsRead(conversationId).catch(console.error);
    },
    onMessageUpdated: (event) => {
      // Message updated (e.g., transcription) - reload messages
      loadMessages(false);
    },
    onConnected: () => {
      console.log('[Chat] SSE connected');
      setSseConnected(true);
    },
    onDisconnected: () => {
      console.log('[Chat] SSE disconnected');
      setSseConnected(false);
    },
  });

  useEffect(() => {
    loadConversation();
    loadMessages(false);
    loadTags();
    conversationsService.markAsRead(conversationId).catch(console.error);
    
    // Fallback polling when SSE is not connected (every 10s instead of 5s)
    const interval = setInterval(() => {
      if (!sseConnected) {
        loadMessages(false);
      }
    }, 10000);
    
    return () => {
      clearInterval(interval);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [conversationId]);

  // Check for shortcut trigger
  useEffect(() => {
    const match = inputText.match(/(?:^|\s)\/([\w]*)$/);
    if (match) {
      setShortcutSearch(match[1]);
      setShowShortcuts(true);
      loadShortcuts(match[1]);
    } else {
      setShowShortcuts(false);
    }
  }, [inputText]);

  const loadShortcuts = async (query: string) => {
    try {
      // Load shortcuts and templates
      const [shortcutsData, templatesData] = await Promise.all([
        messagesService.searchShortcuts(query),
        conversation?.id_channel ? messagesService.getTemplates(conversation.id_channel) : Promise.resolve([]),
      ]);
      setShortcuts(shortcutsData || []);
      setTemplates((templatesData || []).filter((t: any) => 
        t.status === 'APPROVED' && (!query || t.name.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 10));
    } catch (error) {
      console.error('Error loading shortcuts:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await agentsService.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await usersService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadRoles = async () => {
    try {
      // Returns { role: string; count: number }[]
      const availableRoles = await usersService.getAvailableRoles();
      setRoles(availableRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadFunnels = async () => {
    try {
      const data = await funnelsService.getAll();
      setFunnels(data);
    } catch (error) {
      console.error('Error loading funnels:', error);
    }
  };

  const loadFunnelStages = async (funnelId: string) => {
    try {
      const data = await funnelsService.getStages(funnelId);
      setTransferFunnelStages(data);
    } catch (error) {
      console.error('Error loading funnel stages:', error);
    }
  };

  // ============ SEND MESSAGE ============
  const handleSend = async (text?: string, quoteMessageId?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isSending) return;
    
    setInputText('');
    setReplyingTo(null);
    setIsSending(true);
    
    const tempMessage: Message = {
      id_message: `temp-${Date.now()}`,
      conversation_id: conversationId,
      text_body: messageText,
      from_me: true,
      sender_type: 'user',
      message_type: 'text',
      created_at: new Date().toISOString(),
      status: 'pending',
      quoted_message_id: quoteMessageId,
    };
    
    // Add at START because list is inverted (newest first)
    setMessages(prev => [tempMessage, ...prev]);
    
    try {
      const phone = conversation?.contact_phone;
      const channelId = conversation?.id_channel;
      
      if (!phone) throw new Error('Telefone do contato não encontrado');
      
      const newMessage = await conversationsService.sendMessage(
        conversationId, 
        messageText, 
        phone, 
        channelId,
        quoteMessageId
      );
      // Replace temp with real message, keeping temp data as fallback
      setMessages(prev => 
        prev.map(m => m.id_message === tempMessage.id_message 
          ? { ...tempMessage, ...newMessage, status: newMessage.status || 'sent' } 
          : m)
      );
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.id_message !== tempMessage.id_message));
      Alert.alert('Erro', error.response?.data?.message || error.message || 'Não foi possível enviar');
    } finally {
      setIsSending(false);
    }
  };

  // ============ SEND MEDIA ============
  const sendMedia = async (uri: string, type: 'image' | 'video' | 'audio' | 'document', caption?: string, fileName?: string) => {
    if (!conversation) return;
    
    setIsSending(true);
    
    // Optimistic update - show media immediately with pending status
    const tempId = `temp-media-${Date.now()}`;
    const tempMessage: Message = {
      id_message: tempId,
      conversation_id: conversationId,
      text_body: caption || '',
      caption: caption || '',
      from_me: true,
      sender_type: 'user',
      message_type: type,
      media_url: uri, // Local URI for preview
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    
    // Add at START because list is inverted (newest first)
    setMessages(prev => [tempMessage, ...prev]);
    
    try {
      const formData = new FormData();
      
      const mimeType = type === 'image' ? 'image/jpeg' : 
                       type === 'video' ? 'video/mp4' : 
                       type === 'audio' ? 'audio/webm' : 
                       'application/octet-stream';
      
      const extension = type === 'image' ? 'jpg' : 
                        type === 'video' ? 'mp4' : 
                        type === 'audio' ? 'webm' : 
                        'bin';
      
      formData.append('file', {
        uri,
        type: mimeType,
        name: fileName || `${type}_${Date.now()}.${extension}`,
      } as any);
      
      formData.append('id_contact', conversation.id_contact);
      formData.append('id_channel', conversation.id_channel);
      formData.append('id_conversation', conversationId);
      formData.append('to_identifier', conversation.contact_phone || '');
      formData.append('media_type', type);
      if (caption) formData.append('caption', caption);
      
      const newMessage = await messagesService.sendMedia(formData);
      
      // Replace temp message with real one
      setMessages(prev => 
        prev.map(m => m.id_message === tempId ? { ...newMessage, status: 'sent' } : m)
      );
      
    } catch (error: any) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id_message !== tempId));
      Alert.alert('Erro', error.message || 'Não foi possível enviar mídia');
    } finally {
      setIsSending(false);
    }
  };

  // ============ PICK IMAGE/VIDEO ============
  const pickImage = async () => {
    setShowAttachments(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      sendMedia(result.assets[0].uri, 'image');
    }
  };

  const pickVideo = async () => {
    setShowAttachments(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      sendMedia(result.assets[0].uri, 'video');
    }
  };

  const takePhoto = async () => {
    setShowAttachments(false);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      sendMedia(result.assets[0].uri, 'image');
    }
  };

  const pickDocument = async () => {
    setShowAttachments(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        sendMedia(result.assets[0].uri, 'document', undefined, result.assets[0].name);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  // ============ AUDIO RECORDING ============
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso ao microfone');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação');
    }
  };

  const stopAndSendRecording = async () => {
    if (!recording) return;
    
    try {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
      
      if (uri) {
        await sendMedia(uri, 'audio');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    
    try {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ============ AUDIO PLAYBACK ============
  const playAudio = async (message: Message) => {
    const url = getMediaUrl(message);
    if (!url) return;
    
    try {
      // Stop current playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      if (playingAudioId === message.id_message) {
        setPlayingAudioId(null);
        return;
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            const duration = status.durationMillis || 0;
            const position = status.positionMillis || 0;
            setAudioProgress(prev => ({ ...prev, [message.id_message]: (position / duration) * 100 }));
            setAudioDurations(prev => ({ ...prev, [message.id_message]: duration / 1000 }));
            
            if (status.didJustFinish) {
              setPlayingAudioId(null);
              setAudioProgress(prev => ({ ...prev, [message.id_message]: 0 }));
            }
          }
        }
      );
      
      soundRef.current = sound;
      setPlayingAudioId(message.id_message);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Erro', 'Não foi possível reproduzir o áudio');
    }
  };

  // ============ REACTIONS ============
  const sendReaction = async (message: Message, emoji: string) => {
    if (!conversation) return;
    
    try {
      const messageId = message.external_message_id || message.id_message;
      await messagesService.sendReaction(
        conversation.id_contact,
        conversation.id_channel,
        conversationId,
        messageId,
        emoji
      );
      setShowReactionPicker(null);
      await loadMessages();
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar reação');
    }
  };

  // ============ TAGS ============
  const toggleTag = async (tagId: string) => {
    if (!conversation) return;
    
    try {
      const isAssigned = conversationTags.includes(tagId);
      
      if (isAssigned) {
        await tagsService.removeFromConversation(tagId, conversationId);
        setConversationTags(prev => prev.filter(id => id !== tagId));
      } else {
        await tagsService.assignToConversation(tagId, conversationId);
        setConversationTags(prev => [...prev, tagId]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar tag');
    }
  };

  // ============ SHORTCUT/TEMPLATE SELECT ============
  const selectShortcut = async (shortcut: any) => {
    setShowShortcuts(false);
    
    try {
      const resolved = await messagesService.useShortcut(shortcut.id_shortcut, conversationId);
      const content = resolved.resolved_content || resolved.content;
      
      if (resolved.message_type === 'text') {
        const slashIndex = inputText.lastIndexOf('/');
        setInputText(inputText.substring(0, slashIndex) + content);
      } else {
        setInputText('');
        // For non-text shortcuts, handle sending
        handleSend(content);
      }
    } catch (error) {
      // Fallback
      if (shortcut.message_type === 'text') {
        const slashIndex = inputText.lastIndexOf('/');
        setInputText(inputText.substring(0, slashIndex) + shortcut.content);
      }
    }
  };

  const selectTemplate = async (template: any) => {
    setShowShortcuts(false);
    setInputText('');
    
    if (!conversation) return;
    
    try {
      await messagesService.sendTemplate(
        conversation.id_contact,
        conversation.id_channel,
        conversationId,
        conversation.contact_phone || '',
        template.meta_template_name || template.name,
        template.language
      );
      await loadMessages();
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar template');
    }
  };

  // ============ ACTIONS ============
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

  const handleRelease = async () => {
    try {
      await conversationsService.release(conversationId);
      await loadConversation();
      Alert.alert('Sucesso', 'Conversa devolvida!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível devolver');
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

  const handleDelete = async () => {
    Alert.alert('Excluir Conversa', 'Esta ação não pode ser desfeita!', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive',
        onPress: async () => {
          try {
            await conversationsService.delete(conversationId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        }
      },
    ]);
    setShowActions(false);
  };

  const handleTransfer = async () => {
    setIsTransferring(true);
    try {
      let payload: any = {};
      
      switch (transferType) {
        case 'agent':
          if (!selectedAgentId) {
            Alert.alert('Erro', 'Selecione um agente');
            return;
          }
          payload.agent_id = selectedAgentId;
          // Map behavior to API params
          if (agentBehavior === 'greeting') {
            payload.auto_respond = false;
            payload.skip_greeting = false;
          } else if (agentBehavior === 'respond') {
            payload.auto_respond = true;
            payload.skip_greeting = true;
          } else {
            payload.auto_respond = false;
            payload.skip_greeting = true;
          }
          break;
          
        case 'user':
          if (!selectedUserId) {
            Alert.alert('Erro', 'Selecione um atendente');
            return;
          }
          payload.user_id = selectedUserId;
          break;
          
        case 'role':
          if (!selectedRole) {
            Alert.alert('Erro', 'Selecione um departamento');
            return;
          }
          payload.queue_role = selectedRole;
          payload.priority = transferPriority;
          break;
          
        case 'queue':
          payload.transfer_to_human = true;
          payload.priority = transferPriority;
          break;
          
        case 'stage':
          if (!selectedStageId) {
            Alert.alert('Erro', 'Selecione uma etapa');
            return;
          }
          payload.stage_id = selectedStageId;
          break;
      }
      
      if (transferContext.trim()) {
        payload.context_summary = transferContext.trim();
      }
      
      await conversationsService.transfer(conversationId, payload);
      await loadConversation();
      Alert.alert('Sucesso', 'Transferido com sucesso!');
      setShowTransfer(false);
      resetTransferForm();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível transferir');
    } finally {
      setIsTransferring(false);
    }
  };

  const resetTransferForm = () => {
    setTransferType('agent');
    setSelectedAgentId(null);
    setSelectedUserId(null);
    setSelectedRole(null);
    setSelectedFunnelId(null);
    setSelectedStageId(null);
    setAgentBehavior('greeting');
    setTransferPriority('normal');
    setTransferContext('');
    setTransferFunnelStages([]);
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
    // Load all data for transfer
    loadAgents();
    loadUsers();
    loadRoles();
    loadFunnels();
    // Reset form
    resetTransferForm();
    if (agents.length > 0) setSelectedAgentId(agents[0].id_ai_agent);
    setShowTransfer(true);
    setShowActions(false);
  };

  const openStageMoveModal = () => {
    setShowStageMove(true);
    setShowActions(false);
  };

  const openTagsModal = () => {
    setShowTagsModal(true);
    setShowActions(false);
  };

  // ============ HELPERS ============
  
  // Render message status indicator
  const renderMessageStatus = (status?: string) => {
    switch (status) {
      case 'read':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusRead}>✓✓</Text>
          </View>
        );
      case 'delivered':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusDelivered}>✓✓</Text>
          </View>
        );
      case 'sent':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusSent}>✓</Text>
          </View>
        );
      case 'queued':
      case 'sending':
      case 'pending':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusPending}>⏱</Text>
          </View>
        );
      case 'failed':
      case 'cancelled':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusFailed}>⚠️</Text>
          </View>
        );
      default:
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusPending}>○</Text>
          </View>
        );
    }
  };

  const getMediaUrl = (message: Message): string => {
    const url = message.stored_media_url || message.media_url || '';
    if (!url) return '';
    if (url.startsWith('uploads/')) {
      return `${API_BASE_URL}/${url}`;
    }
    return url;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openLocation = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const downloadFile = (message: Message) => {
    const url = getMediaUrl(message);
    if (url) Linking.openURL(url);
  };

  const getQuotedMessage = (message: Message): Message | undefined => {
    if (!message.quoted_message_id) return undefined;
    return messages.find(m => 
      m.id_message === message.quoted_message_id || 
      m.external_message_id === message.quoted_message_id
    );
  };

  const getQuotedPreviewText = (message: Message): string => {
    const quoted = getQuotedMessage(message);
    if (quoted) {
      if (quoted.text_body) return quoted.text_body;
      if (quoted.caption) return quoted.caption;
      const typeLabels: Record<string, string> = {
        image: 'Imagem', video: 'Vídeo', audio: 'Áudio', document: 'Documento',
        sticker: 'Sticker', location: 'Localização', contact: 'Contato',
      };
      return typeLabels[quoted.message_type] || 'Mensagem';
    }
    return message.quoted_text || 'Mensagem';
  };

  // ============ MESSAGE LONG PRESS ============
  const handleMessageLongPress = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageActions(true);
  };

  const handleReply = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
    }
    setShowMessageActions(false);
    setSelectedMessage(null);
  };

  const handleReact = () => {
    if (selectedMessage) {
      setShowReactionPicker(selectedMessage.id_message);
    }
    setShowMessageActions(false);
    setSelectedMessage(null);
  };

  const handleCopyMessage = () => {
    // TODO: Implement clipboard
    setShowMessageActions(false);
    setSelectedMessage(null);
  };

  // ============ SEARCH ============
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setHighlightedMessageId(null);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const results = messages.filter(msg => {
      const text = msg.text_body || msg.caption || '';
      return text.toLowerCase().includes(lowerQuery);
    });
    setSearchResults(results);
  }, [messages]);

  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex(m => m.id_message === messageId);
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedMessageId(messageId);
      // Clear highlight after 2 seconds
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  }, [messages]);

  const navigateSearchResults = (direction: 'prev' | 'next') => {
    if (searchResults.length === 0) return;
    
    const currentIndex = highlightedMessageId 
      ? searchResults.findIndex(m => m.id_message === highlightedMessageId)
      : -1;
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = currentIndex + 1 >= searchResults.length ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex - 1 < 0 ? searchResults.length - 1 : currentIndex - 1;
    }
    
    scrollToMessage(searchResults[newIndex].id_message);
  };

  // ============ RENDER MESSAGE ============
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.from_me || item.direction === 'outbound';
    const mediaUrl = getMediaUrl(item);
    const isFailed = item.status === 'failed';
    
    const isHighlighted = item.id_message === highlightedMessageId;
    
    return (
      <Pressable 
        onLongPress={() => handleMessageLongPress(item)}
        style={[
          styles.messageContainer, 
          isMe ? styles.myMessage : styles.theirMessage,
          isFailed && styles.failedMessage,
          isHighlighted && styles.highlightedMessage
        ]}
      >
        {/* Sender name */}
        {!isMe && item.sender_display_name && (
          <Text style={styles.senderName}>{item.sender_display_name}</Text>
        )}

        {/* Quoted message */}
        {item.quoted_message_id && (
          <View style={[styles.quotedMessage, isMe ? styles.quotedMessageMine : styles.quotedMessageTheirs]}>
            <Text style={styles.quotedSender}>
              {getQuotedMessage(item)?.direction === 'outbound' ? 'Você' : 'Contato'}
            </Text>
            <Text style={styles.quotedText} numberOfLines={2}>
              {getQuotedPreviewText(item)}
            </Text>
          </View>
        )}

        {/* TEXT */}
        {(item.message_type === 'text' || !item.message_type) && (
          <Text style={styles.messageText}>{item.text_body || item.caption}</Text>
        )}

        {/* IMAGE */}
        {item.message_type === 'image' && (
          <View>
            {mediaUrl ? (
              <Image source={{ uri: mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
            ) : (
              <View style={styles.mediaUnavailable}>
                <Text style={styles.mediaUnavailableText}>Imagem indisponível</Text>
              </View>
            )}
            {item.caption && <Text style={styles.captionText}>{item.caption}</Text>}
          </View>
        )}

        {/* VIDEO */}
        {item.message_type === 'video' && (
          <TouchableOpacity onPress={() => mediaUrl && Linking.openURL(mediaUrl)}>
            <View style={styles.videoContainer}>
              <Text style={styles.mediaIcon}>🎬</Text>
              <Text style={styles.mediaText}>Vídeo</Text>
              <Text style={styles.playIcon}>▶️</Text>
            </View>
            {item.caption && <Text style={styles.captionText}>{item.caption}</Text>}
          </TouchableOpacity>
        )}

        {/* AUDIO */}
        {(item.message_type === 'audio' || item.message_type === 'voice') && (
          <View>
            <View style={styles.audioContainer}>
              <TouchableOpacity 
                style={[styles.audioPlayButton, isMe ? styles.audioPlayButtonMine : {}]}
                onPress={() => playAudio(item)}
              >
                <Text style={styles.audioPlayIcon}>
                  {playingAudioId === item.id_message ? '⏸' : '▶️'}
                </Text>
              </TouchableOpacity>
              <View style={styles.audioProgress}>
                <View style={styles.audioProgressBar}>
                  <View 
                    style={[
                      styles.audioProgressFill, 
                      { width: `${audioProgress[item.id_message] || 0}%` },
                      isMe ? styles.audioProgressFillMine : {}
                    ]} 
                  />
                </View>
                <Text style={styles.audioDuration}>
                  {formatDuration(audioDurations[item.id_message] || 0)}
                </Text>
              </View>
            </View>
            {item.caption && (
              <Text style={[styles.captionText, styles.transcription]}>{item.caption}</Text>
            )}
          </View>
        )}

        {/* DOCUMENT */}
        {item.message_type === 'document' && (
          <TouchableOpacity style={styles.documentContainer} onPress={() => downloadFile(item)}>
            <View style={[styles.documentIcon, isMe ? styles.documentIconMine : {}]}>
              <Text style={styles.documentIconText}>📄</Text>
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>{item.file_name || 'Documento'}</Text>
              <Text style={styles.documentType}>{item.mime_type || 'Arquivo'}</Text>
            </View>
            <Text style={styles.downloadIcon}>⬇️</Text>
          </TouchableOpacity>
        )}

        {/* STICKER */}
        {item.message_type === 'sticker' && (
          <View>
            {mediaUrl ? (
              <Image source={{ uri: mediaUrl }} style={styles.stickerImage} resizeMode="contain" />
            ) : (
              <Text style={styles.stickerFallback}>🖼️</Text>
            )}
          </View>
        )}

        {/* LOCATION */}
        {item.message_type === 'location' && item.latitude && item.longitude && (
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={() => openLocation(item.latitude!, item.longitude!)}
          >
            <View style={styles.locationMap}>
              <Text style={styles.locationMapIcon}>🗺️</Text>
            </View>
            <View style={[styles.locationInfo, isMe ? styles.locationInfoMine : {}]}>
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={styles.locationTextContainer}>
                  {item.location_name && <Text style={styles.locationName}>{item.location_name}</Text>}
                  {item.location_address && <Text style={styles.locationAddress}>{item.location_address}</Text>}
                  {!item.location_name && !item.location_address && (
                    <Text style={styles.locationCoords}>
                      {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}
                    </Text>
                  )}
                </View>
                <Text style={styles.openIcon}>↗️</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* CONTACT */}
        {item.message_type === 'contact' && (
          <View style={[styles.contactCard, isMe ? styles.contactCardMine : {}]}>
            <View style={styles.contactHeader}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {(item.shared_contact_full_name || 'C')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.contactName}>{item.shared_contact_full_name || 'Contato'}</Text>
            </View>
            {item.shared_contact_phone_number && (
              <View style={styles.contactRow}>
                <Text style={styles.contactIcon}>📱</Text>
                <Text style={styles.contactValue}>{item.shared_contact_phone_number}</Text>
              </View>
            )}
            {item.shared_contact_email && (
              <View style={styles.contactRow}>
                <Text style={styles.contactIcon}>✉️</Text>
                <Text style={styles.contactValue}>{item.shared_contact_email}</Text>
              </View>
            )}
            {item.shared_contact_organization && (
              <View style={styles.contactRow}>
                <Text style={styles.contactIcon}>🏢</Text>
                <Text style={styles.contactValue}>{item.shared_contact_organization}</Text>
              </View>
            )}
          </View>
        )}

        {/* INTERACTIVE (buttons/list) */}
        {item.message_type === 'interactive' && (
          <View>
            {item.interactive_header && <Text style={styles.interactiveHeader}>{item.interactive_header}</Text>}
            {item.interactive_body && <Text style={styles.messageText}>{item.interactive_body}</Text>}
            {item.interactive_footer && <Text style={styles.interactiveFooter}>{item.interactive_footer}</Text>}
            {item.interactive_buttons && (
              <View style={styles.interactiveButtons}>
                {(item.interactive_buttons as Array<{id: string; title: string}>).map((btn, idx) => (
                  <View key={idx} style={styles.interactiveButton}>
                    <Text style={styles.interactiveButtonText}>{btn.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TEMPLATE */}
        {item.message_type === 'template' && (
          <View>
            {item.raw_payload?.template_display ? (
              <>
                {item.raw_payload.template_display.header && (
                  <Text style={styles.interactiveHeader}>{item.raw_payload.template_display.header}</Text>
                )}
                {item.raw_payload.template_display.body && (
                  <Text style={styles.messageText}>{item.raw_payload.template_display.body}</Text>
                )}
                {item.raw_payload.template_display.footer && (
                  <Text style={styles.interactiveFooter}>{item.raw_payload.template_display.footer}</Text>
                )}
                {item.raw_payload.template_display.buttons && (
                  <View style={styles.interactiveButtons}>
                    {item.raw_payload.template_display.buttons.map((btn: any, idx: number) => (
                      <View key={idx} style={styles.interactiveButton}>
                        <Text style={styles.interactiveButtonText}>{btn.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.messageText}>{item.text_body}</Text>
            )}
            <View style={styles.templateBadge}>
              <Text style={styles.templateBadgeText}>
                Template{item.raw_payload?.template_name ? `: ${item.raw_payload.template_name}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* REACTION */}
        {item.message_type === 'reaction' && (
          <View style={styles.reactionMessage}>
            <View style={styles.reactionEmoji}>
              <Text style={styles.reactionEmojiText}>{item.reaction_emoji}</Text>
            </View>
            <Text style={styles.reactionLabel}>Reagiu com {item.reaction_emoji}</Text>
          </View>
        )}

        {/* UNKNOWN */}
        {!['text', 'image', 'video', 'audio', 'voice', 'document', 'sticker', 'location', 'contact', 'interactive', 'template', 'reaction'].includes(item.message_type) && item.message_type && (
          <View>
            <Text style={styles.unknownType}>{item.message_type}</Text>
            {item.text_body && <Text style={styles.messageText}>{item.text_body}</Text>}
          </View>
        )}

        {/* Error reason for failed messages */}
        {isFailed && (item as any).error_reason && (
          <Text style={styles.errorReason} numberOfLines={2}>
            ⚠️ {(item as any).error_reason}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
          {isMe && renderMessageStatus(item.status)}
        </View>

        {/* Retry button for failed messages */}
        {isFailed && isMe && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              Alert.alert(
                'Mensagem Falhou',
                (item as any).error_reason || 'Erro ao enviar mensagem',
                [
                  { text: 'OK', style: 'cancel' },
                  { 
                    text: 'Tentar Novamente', 
                    onPress: () => handleSend(item.text_body || item.caption) 
                  }
                ]
              );
            }}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}

        {/* Reaction picker for this message */}
        {showReactionPicker === item.id_message && (
          <View style={styles.reactionPicker}>
            {EMOJI_LIST.slice(0, 8).map(emoji => (
              <TouchableOpacity key={emoji} onPress={() => sendReaction(item, emoji)}>
                <Text style={styles.reactionOption}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  // ============ RENDER ============
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  const assignedTags = tags.filter(t => conversationTags.includes(t.id_tag));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Minimal header - just actions, no info bar like WhatsApp */}

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Buscar mensagens..."
            placeholderTextColor="#999"
            autoFocus
          />
          {searchResults.length > 0 && (
            <View style={styles.searchNav}>
              <Text style={styles.searchCount}>
                {highlightedMessageId 
                  ? `${searchResults.findIndex(m => m.id_message === highlightedMessageId) + 1}/${searchResults.length}`
                  : `${searchResults.length} resultados`
                }
              </Text>
              <TouchableOpacity onPress={() => navigateSearchResults('prev')} style={styles.searchNavBtn}>
                <Text style={styles.searchNavIcon}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateSearchResults('next')} style={styles.searchNavBtn}>
                <Text style={styles.searchNavIcon}>▼</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
            <Text style={styles.searchClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <View style={styles.chatBackground}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id_message}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          inverted
          onEndReached={() => loadMessages(true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#25D366" />
                <Text style={styles.loadingMoreText}>Carregando...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { transform: [{ scaleY: -1 }] }]}>
              <Text style={styles.emptyText}>Sem mensagens</Text>
            </View>
          }
        />
      </View>

      {/* Reply Preview */}
      {replyingTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>
              Respondendo a {replyingTo.direction === 'outbound' ? 'você' : 'contato'}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyingTo.text_body || replyingTo.caption || replyingTo.message_type}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Text style={styles.replyClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Shortcuts dropdown */}
      {showShortcuts && (shortcuts.length > 0 || templates.length > 0) && (
        <View style={styles.shortcutsDropdown}>
          <ScrollView style={styles.shortcutsList}>
            {shortcuts.length > 0 && (
              <>
                <Text style={styles.shortcutsHeader}>Atalhos</Text>
                {shortcuts.map((shortcut) => (
                  <TouchableOpacity 
                    key={shortcut.id_shortcut} 
                    style={styles.shortcutItem}
                    onPress={() => selectShortcut(shortcut)}
                  >
                    <Text style={styles.shortcutName}>/{shortcut.name}</Text>
                    <Text style={styles.shortcutContent} numberOfLines={1}>{shortcut.content}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            {templates.length > 0 && (
              <>
                <Text style={styles.shortcutsHeader}>Templates</Text>
                {templates.map((template) => (
                  <TouchableOpacity 
                    key={template.id_template} 
                    style={styles.shortcutItem}
                    onPress={() => selectTemplate(template)}
                  >
                    <View style={styles.templateRow}>
                      <Text style={styles.shortcutName}>{template.name}</Text>
                      <View style={styles.templateTag}>
                        <Text style={styles.templateTagText}>Template</Text>
                      </View>
                    </View>
                    <Text style={styles.shortcutContent} numberOfLines={1}>
                      {template.components?.find((c: any) => c.type === 'BODY')?.text || template.language}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Recording Bar */}
      {isRecording && (
        <View style={styles.recordingBar}>
          <TouchableOpacity onPress={cancelRecording} style={styles.recordingCancel}>
            <Text style={styles.recordingCancelText}>🗑️</Text>
          </TouchableOpacity>
          <View style={styles.recordingInfo}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatRecordingTime(recordingDuration)}</Text>
            <View style={styles.recordingWave}>
              {[...Array(20)].map((_, i) => (
                <View key={i} style={[styles.recordingWaveBar, { height: 4 + Math.random() * 16 }]} />
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={stopAndSendRecording} style={styles.recordingSend}>
            <Text style={styles.recordingSendText}>➤</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input - WhatsApp style */}
      {!isRecording && (
        <View style={styles.inputContainer}>
          {/* Input field wrapper */}
          <View style={styles.inputWrapper}>
            <TouchableOpacity 
              style={styles.emojiButton} 
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Text style={styles.emojiIcon}>😊</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Mensagem"
              placeholderTextColor="#8696a0"
              multiline
              maxLength={4096}
            />
            
            <TouchableOpacity 
              style={styles.attachButton} 
              onPress={() => setShowAttachments(true)}
            >
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Text style={styles.cameraIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          
          {/* Send/Mic button */}
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => inputText.trim() ? handleSend(undefined, replyingTo?.id_message) : startRecording()}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : inputText.trim() ? (
              <Text style={styles.sendButtonText}>➤</Text>
            ) : (
              <Text style={styles.micIcon}>🎤</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <View style={styles.emojiPickerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.emojiGrid}>
              {EMOJI_LIST.map(emoji => (
                <TouchableOpacity 
                  key={emoji} 
                  onPress={() => {
                    setInputText(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  <Text style={styles.emojiItem}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Attachments Modal */}
      <Modal visible={showAttachments} transparent animationType="fade" onRequestClose={() => setShowAttachments(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAttachments(false)}>
          <View style={styles.attachmentSheet}>
            <Text style={styles.sheetTitle}>Enviar</Text>
            <View style={styles.attachmentGrid}>
              <TouchableOpacity style={styles.attachmentItem} onPress={takePhoto}>
                <View style={[styles.attachmentIcon, { backgroundColor: '#8b5cf6' }]}>
                  <Text style={styles.attachmentIconText}>📷</Text>
                </View>
                <Text style={styles.attachmentLabel}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={pickImage}>
                <View style={[styles.attachmentIcon, { backgroundColor: '#ec4899' }]}>
                  <Text style={styles.attachmentIconText}>🖼️</Text>
                </View>
                <Text style={styles.attachmentLabel}>Imagem</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={pickVideo}>
                <View style={[styles.attachmentIcon, { backgroundColor: '#ef4444' }]}>
                  <Text style={styles.attachmentIconText}>🎬</Text>
                </View>
                <Text style={styles.attachmentLabel}>Vídeo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentItem} onPress={pickDocument}>
                <View style={[styles.attachmentIcon, { backgroundColor: '#3b82f6' }]}>
                  <Text style={styles.attachmentIconText}>📄</Text>
                </View>
                <Text style={styles.attachmentLabel}>Documento</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAttachments(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Actions Modal */}
      <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowActions(false)}>
          <View style={styles.actionsSheet}>
            <Text style={styles.sheetTitle}>Ações</Text>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleAssignToMe}>
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionText}>Assumir Conversa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleRelease}>
              <Text style={styles.actionIcon}>🔙</Text>
              <Text style={styles.actionText}>Devolver à Fila</Text>
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

            <TouchableOpacity style={styles.actionItem} onPress={openTagsModal}>
              <Text style={styles.actionIcon}>🏷️</Text>
              <Text style={styles.actionText}>Gerenciar Tags</Text>
            </TouchableOpacity>
            
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

            <TouchableOpacity style={[styles.actionItem, styles.assistantItem]} onPress={() => {
              setShowActions(false);
              if (conversation) {
                navigation.navigate('Assistant', { 
                  conversationId: conversation.id_conversation,
                  contactName: conversation.contact_name || '',
                  contactPhone: conversation.contact_phone || '',
                  channelId: conversation.id_channel,
                });
              }
            }}>
              <Text style={styles.actionIcon}>🤖</Text>
              <Text style={[styles.actionText, styles.assistantText]}>Assistente IA</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionItem, styles.dangerItem]} onPress={handleDelete}>
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={[styles.actionText, styles.dangerText]}>Excluir Conversa</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowActions(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tags Modal */}
      <Modal visible={showTagsModal} transparent animationType="slide" onRequestClose={() => setShowTagsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.transferSheet}>
            <Text style={styles.sheetTitle}>Gerenciar Tags</Text>
            <ScrollView style={styles.tagsList}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.id_tag}
                  style={styles.tagItem}
                  onPress={() => toggleTag(tag.id_tag)}
                >
                  <View style={[styles.tagCheckbox, conversationTags.includes(tag.id_tag) && styles.tagCheckboxChecked]}>
                    {conversationTags.includes(tag.id_tag) && <Text style={styles.tagCheck}>✓</Text>}
                  </View>
                  <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
                  <Text style={styles.tagItemText}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTagsModal(false)}>
              <Text style={styles.cancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transfer Modal - Complete Version */}
      <Modal visible={showTransfer} transparent animationType="slide" onRequestClose={() => setShowTransfer(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.transferSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Transferir Conversa</Text>
              <TouchableOpacity onPress={() => setShowTransfer(false)}>
                <Text style={{ fontSize: 24, color: '#666' }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Transfer Type Selection */}
              <Text style={styles.sectionLabel}>Transferir para:</Text>
              <View style={styles.transferTypeGrid}>
                <TouchableOpacity 
                  style={[styles.transferTypeOption, transferType === 'agent' && styles.transferTypeSelected]}
                  onPress={() => setTransferType('agent')}
                >
                  <Text style={styles.transferTypeIcon}>🤖</Text>
                  <Text style={[styles.transferTypeText, transferType === 'agent' && styles.transferTypeTextSelected]}>Agente IA</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.transferTypeOption, transferType === 'user' && styles.transferTypeSelected]}
                  onPress={() => setTransferType('user')}
                >
                  <Text style={styles.transferTypeIcon}>👤</Text>
                  <Text style={[styles.transferTypeText, transferType === 'user' && styles.transferTypeTextSelected]}>Atendente</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.transferTypeOption, transferType === 'role' && styles.transferTypeSelected]}
                  onPress={() => setTransferType('role')}
                >
                  <Text style={styles.transferTypeIcon}>👥</Text>
                  <Text style={[styles.transferTypeText, transferType === 'role' && styles.transferTypeTextSelected]}>Departamento</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.transferTypeOption, transferType === 'queue' && styles.transferTypeSelected]}
                  onPress={() => setTransferType('queue')}
                >
                  <Text style={styles.transferTypeIcon}>📋</Text>
                  <Text style={[styles.transferTypeText, transferType === 'queue' && styles.transferTypeTextSelected]}>Fila Geral</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.transferTypeOption, transferType === 'stage' && styles.transferTypeSelected]}
                  onPress={() => setTransferType('stage')}
                >
                  <Text style={styles.transferTypeIcon}>🔀</Text>
                  <Text style={[styles.transferTypeText, transferType === 'stage' && styles.transferTypeTextSelected]}>Etapa</Text>
                </TouchableOpacity>
              </View>
              
              {/* Agent Selection */}
              {transferType === 'agent' && (
                <View style={styles.transferSection}>
                  <Text style={styles.sectionLabel}>Selecione o agente:</Text>
                  {agents.map((agent) => (
                    <TouchableOpacity
                      key={agent.id_ai_agent}
                      style={[styles.transferSelectItem, selectedAgentId === agent.id_ai_agent && styles.transferSelectItemSelected]}
                      onPress={() => setSelectedAgentId(agent.id_ai_agent)}
                    >
                      <Text style={styles.transferSelectIcon}>🤖</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.transferSelectTitle}>{agent.name}</Text>
                        <Text style={styles.transferSelectSubtitle}>{agent.model || 'gpt-4'}</Text>
                      </View>
                      {selectedAgentId === agent.id_ai_agent && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                  
                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>O que o agente deve fazer?</Text>
                  <TouchableOpacity
                    style={[styles.behaviorOption, agentBehavior === 'greeting' && styles.behaviorOptionSelected]}
                    onPress={() => setAgentBehavior('greeting')}
                  >
                    <View style={[styles.radioCircle, agentBehavior === 'greeting' && styles.radioCircleSelected]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.behaviorTitle}>Enviar saudação</Text>
                      <Text style={styles.behaviorSubtitle}>O agente envia a mensagem de boas-vindas</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.behaviorOption, agentBehavior === 'respond' && styles.behaviorOptionSelected]}
                    onPress={() => setAgentBehavior('respond')}
                  >
                    <View style={[styles.radioCircle, agentBehavior === 'respond' && styles.radioCircleSelected]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.behaviorTitle}>Responder última mensagem</Text>
                      <Text style={styles.behaviorSubtitle}>O agente processa e responde a última mensagem</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.behaviorOption, agentBehavior === 'wait' && styles.behaviorOptionSelected]}
                    onPress={() => setAgentBehavior('wait')}
                  >
                    <View style={[styles.radioCircle, agentBehavior === 'wait' && styles.radioCircleSelected]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.behaviorTitle}>Apenas atribuir</Text>
                      <Text style={styles.behaviorSubtitle}>Aguarda a próxima mensagem do cliente</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* User Selection */}
              {transferType === 'user' && (
                <View style={styles.transferSection}>
                  <Text style={styles.sectionLabel}>Selecione o atendente:</Text>
                  {users.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum atendente disponível</Text>
                  ) : (
                    users.map((user) => (
                      <TouchableOpacity
                        key={user.id_app_user}
                        style={[styles.transferSelectItem, selectedUserId === user.id_app_user && styles.transferSelectItemSelected]}
                        onPress={() => setSelectedUserId(user.id_app_user)}
                      >
                        <Text style={styles.transferSelectIcon}>👤</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.transferSelectTitle}>{user.full_name}</Text>
                          <Text style={styles.transferSelectSubtitle}>{user.email}</Text>
                        </View>
                        {selectedUserId === user.id_app_user && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
              
              {/* Role Selection */}
              {transferType === 'role' && (
                <View style={styles.transferSection}>
                  <Text style={styles.sectionLabel}>Selecione o departamento:</Text>
                  {roles.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum departamento disponível</Text>
                  ) : (
                    roles.map((role) => (
                      <TouchableOpacity
                        key={role.role}
                        style={[styles.transferSelectItem, selectedRole === role.role && styles.transferSelectItemSelected]}
                        onPress={() => setSelectedRole(role.role)}
                      >
                        <Text style={styles.transferSelectIcon}>👥</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.transferSelectTitle}>{role.role}</Text>
                          <Text style={styles.transferSelectSubtitle}>{role.count} pessoas</Text>
                        </View>
                        {selectedRole === role.role && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                  
                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Prioridade:</Text>
                  <View style={styles.priorityGrid}>
                    {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.priorityOption, transferPriority === p && styles.priorityOptionSelected]}
                        onPress={() => setTransferPriority(p)}
                      >
                        <Text style={styles.priorityText}>
                          {p === 'low' ? '⚪ Baixa' : p === 'normal' ? '🔵 Normal' : p === 'high' ? '🟠 Alta' : '🔴 Urgente'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Queue Info */}
              {transferType === 'queue' && (
                <View style={styles.transferSection}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      A conversa entrará na fila geral e poderá ser assumida por qualquer atendente disponível.
                    </Text>
                  </View>
                  
                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Prioridade:</Text>
                  <View style={styles.priorityGrid}>
                    {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.priorityOption, transferPriority === p && styles.priorityOptionSelected]}
                        onPress={() => setTransferPriority(p)}
                      >
                        <Text style={styles.priorityText}>
                          {p === 'low' ? '⚪ Baixa' : p === 'normal' ? '🔵 Normal' : p === 'high' ? '🟠 Alta' : '🔴 Urgente'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Stage Selection */}
              {transferType === 'stage' && (
                <View style={styles.transferSection}>
                  <Text style={styles.sectionLabel}>Selecione o funil:</Text>
                  {funnels.map((funnel) => {
                    const funnelId = funnel.id_pipeline || funnel.id_funnel || '';
                    return (
                      <TouchableOpacity
                        key={funnelId}
                        style={[styles.transferSelectItem, selectedFunnelId === funnelId && styles.transferSelectItemSelected]}
                        onPress={() => {
                          setSelectedFunnelId(funnelId);
                          setSelectedStageId(null);
                          loadFunnelStages(funnelId);
                        }}
                      >
                        <Text style={styles.transferSelectIcon}>📊</Text>
                        <Text style={[styles.transferSelectTitle, { flex: 1 }]}>{funnel.name}</Text>
                        {selectedFunnelId === funnelId && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  
                  {selectedFunnelId && (
                    <>
                      <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Selecione a etapa:</Text>
                      {transferFunnelStages.map((stage) => {
                        const stageId = stage.id_stage || stage.id_funnel_stage || '';
                        return (
                          <TouchableOpacity
                            key={stageId}
                            style={[styles.transferSelectItem, selectedStageId === stageId && styles.transferSelectItemSelected]}
                            onPress={() => setSelectedStageId(stageId)}
                          >
                            <View style={[styles.stageDot, { backgroundColor: stage.color || '#10B981' }]} />
                            <Text style={[styles.transferSelectTitle, { flex: 1 }]}>{stage.name}</Text>
                            {selectedStageId === stageId && <Text style={styles.checkMark}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                  
                  <View style={[styles.infoBox, { marginTop: 16, backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.infoText, { color: '#92400E' }]}>
                      A conversa será movida para a etapa selecionada e os workflows de entrada serão acionados.
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Context Summary (for non-agent transfers) */}
              {transferType !== 'agent' && transferType !== 'stage' && (
                <View style={styles.transferSection}>
                  <Text style={styles.sectionLabel}>Contexto (opcional):</Text>
                  <TextInput
                    style={styles.contextInput}
                    value={transferContext}
                    onChangeText={setTransferContext}
                    placeholder="Escreva um resumo do que foi conversado..."
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />
                </View>
              )}
            </ScrollView>
            
            {/* Actions */}
            <View style={styles.transferActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTransfer(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.transferButton, isTransferring && styles.transferButtonDisabled]}
                onPress={handleTransfer}
                disabled={isTransferring}
              >
                {isTransferring ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.transferButtonText}>Transferir</Text>
                )}
              </TouchableOpacity>
            </View>
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

      {/* Message Actions Modal */}
      <Modal visible={showMessageActions} transparent animationType="fade" onRequestClose={() => setShowMessageActions(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMessageActions(false)}>
          <View style={styles.messageActionsSheet}>
            <TouchableOpacity style={styles.messageActionItem} onPress={handleReply}>
              <Text style={styles.messageActionIcon}>↩️</Text>
              <Text style={styles.messageActionText}>Responder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageActionItem} onPress={handleReact}>
              <Text style={styles.messageActionIcon}>😀</Text>
              <Text style={styles.messageActionText}>Reagir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageActionItem} onPress={handleCopyMessage}>
              <Text style={styles.messageActionIcon}>📋</Text>
              <Text style={styles.messageActionText}>Copiar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECE5DD' },
  
  // Header - WhatsApp style info bar (compact)
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 0,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionOnline: {
    backgroundColor: '#25D366',
  },
  connectionOffline: {
    backgroundColor: '#f59e0b',
  },
  infoContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  agentBadge: {
    backgroundColor: '#e7f8e8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentBadgeText: { fontSize: 11, color: '#25D366', fontWeight: '600' },
  statusBadge: {
    backgroundColor: '#e7f8e8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
  },
  closedBadge: { backgroundColor: '#fce7e7' },
  statusBadgeText: { fontSize: 11, color: '#666', textTransform: 'capitalize', fontWeight: '500' },
  tagsScroll: { flexDirection: 'row' },
  tagBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 4 },
  tagDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  tagText: { fontSize: 10, fontWeight: '600' },
  actionsButton: { padding: 6 },
  actionsIcon: { fontSize: 20, color: '#54656f' },
  searchButton: { padding: 6 },
  searchIcon: { fontSize: 18 },
  
  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
  },
  searchNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchCount: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  searchNavBtn: {
    padding: 4,
  },
  searchNavIcon: {
    fontSize: 14,
    color: '#666',
  },
  searchClose: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  highlightedMessage: {
    backgroundColor: '#fef08a',
    borderColor: '#facc15',
    borderWidth: 2,
  },
  
  // Chat - WhatsApp style
  chatBackground: { flex: 1, backgroundColor: '#ECE5DD' }, // WhatsApp beige
  messagesList: { padding: 8, paddingBottom: 16 },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 1,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#d9fdd3', // WhatsApp light green
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 2, // Small tail
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff', // White for incoming
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 2, // Small tail
  },
  failedMessage: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
  },
  errorReason: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  retryText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  senderName: { fontSize: 12, fontWeight: '600', color: '#00a884', marginBottom: 2 },
  messageText: { fontSize: 15, color: '#111b21', lineHeight: 20 },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3 },
  timestamp: { fontSize: 11, color: '#667781' },
  statusContainer: { marginLeft: 3 },
  statusRead: { fontSize: 13, color: '#53bdeb', fontWeight: '600' }, // WhatsApp blue
  statusDelivered: { fontSize: 13, color: '#667781', fontWeight: '600' },
  statusSent: { fontSize: 13, color: '#667781' },
  statusPending: { fontSize: 11, color: '#667781' },
  statusFailed: { fontSize: 11 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  loadingMoreText: { fontSize: 13, color: '#666' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 20 },
  
  // Quoted message
  quotedMessage: {
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  quotedMessageMine: { backgroundColor: 'rgba(0,0,0,0.05)', borderLeftColor: '#25D366' },
  quotedMessageTheirs: { backgroundColor: 'rgba(0,0,0,0.05)', borderLeftColor: '#888' },
  quotedSender: { fontSize: 11, fontWeight: '600', color: '#25D366', marginBottom: 2 },
  quotedText: { fontSize: 12, color: '#666' },
  
  // Media
  mediaImage: { width: 200, height: 200, borderRadius: 8 },
  mediaUnavailable: { width: 200, height: 100, backgroundColor: '#e0e0e0', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  mediaUnavailableText: { color: '#999' },
  captionText: { fontSize: 14, color: '#333', marginTop: 6 },
  transcription: { fontStyle: 'italic', color: '#555' },
  videoContainer: { width: 200, height: 150, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  mediaIcon: { fontSize: 32 },
  mediaText: { fontSize: 12, color: '#fff', marginTop: 4 },
  playIcon: { position: 'absolute', fontSize: 40 },
  stickerImage: { width: 150, height: 150 },
  stickerFallback: { fontSize: 64 },
  
  // Audio
  audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 200, paddingVertical: 4 },
  audioPlayButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  audioPlayButtonMine: { backgroundColor: '#b8d9b4' },
  audioPlayIcon: { fontSize: 18 },
  audioProgress: { flex: 1, marginLeft: 10 },
  audioProgressBar: { height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden' },
  audioProgressFill: { height: '100%', backgroundColor: '#25D366', borderRadius: 2 },
  audioProgressFillMine: { backgroundColor: '#6bb86a' },
  audioDuration: { fontSize: 11, color: '#999', marginTop: 4 },
  
  // Document
  documentContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', minWidth: 200 },
  documentIcon: { width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  documentIconMine: { backgroundColor: '#a8d9a4' },
  documentIconText: { fontSize: 24 },
  documentInfo: { flex: 1, marginLeft: 10 },
  documentName: { fontSize: 14, fontWeight: '500', color: '#333' },
  documentType: { fontSize: 11, color: '#999' },
  downloadIcon: { fontSize: 18 },
  
  // Location
  locationContainer: { borderRadius: 8, overflow: 'hidden', minWidth: 250 },
  locationMap: { height: 100, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  locationMapIcon: { fontSize: 40 },
  locationInfo: { padding: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  locationInfoMine: { backgroundColor: '#c5e8c0' },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationIcon: { fontSize: 16, marginRight: 8 },
  locationTextContainer: { flex: 1 },
  locationName: { fontSize: 14, fontWeight: '500', color: '#333' },
  locationAddress: { fontSize: 12, color: '#666' },
  locationCoords: { fontSize: 12, color: '#666' },
  openIcon: { fontSize: 16 },
  
  // Contact card
  contactCard: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', minWidth: 200 },
  contactCardMine: { backgroundColor: '#c5e8c0' },
  contactHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)', marginBottom: 8 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  contactAvatarText: { fontSize: 18, color: '#fff', fontWeight: '600' },
  contactName: { fontSize: 15, fontWeight: '500', color: '#333' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  contactIcon: { fontSize: 14, marginRight: 8 },
  contactValue: { fontSize: 13, color: '#333' },
  
  // Interactive / Template
  interactiveHeader: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  interactiveFooter: { fontSize: 11, color: '#999', marginTop: 4 },
  interactiveButtons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  interactiveButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(37,211,102,0.1)' },
  interactiveButtonText: { fontSize: 13, fontWeight: '500', color: '#25D366' },
  templateBadge: { marginTop: 6 },
  templateBadgeText: { fontSize: 10, color: '#999', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  
  // Reaction
  reactionMessage: { flexDirection: 'row', alignItems: 'center' },
  reactionEmoji: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  reactionEmojiText: { fontSize: 24 },
  reactionLabel: { fontSize: 12, color: '#999', marginLeft: 8, fontStyle: 'italic' },
  reactionPicker: { flexDirection: 'row', position: 'absolute', bottom: '100%', left: 0, backgroundColor: '#fff', borderRadius: 20, padding: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  reactionOption: { fontSize: 22, marginHorizontal: 4 },
  
  unknownType: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  
  // Reply preview
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#25D366',
  },
  replyContent: { flex: 1 },
  replyLabel: { fontSize: 11, fontWeight: '600', color: '#25D366' },
  replyText: { fontSize: 13, color: '#666' },
  replyClose: { fontSize: 18, color: '#999', padding: 4 },
  
  // Shortcuts dropdown
  shortcutsDropdown: {
    position: 'absolute',
    bottom: 60,
    left: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  shortcutsList: { padding: 8 },
  shortcutsHeader: { fontSize: 10, fontWeight: '600', color: '#999', textTransform: 'uppercase', marginTop: 8, marginBottom: 4, paddingHorizontal: 8 },
  shortcutItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  shortcutName: { fontSize: 14, fontWeight: '500', color: '#333' },
  shortcutContent: { fontSize: 12, color: '#999', marginTop: 2 },
  templateRow: { flexDirection: 'row', alignItems: 'center' },
  templateTag: { marginLeft: 8, backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  templateTagText: { fontSize: 10, color: '#25D366', fontWeight: '600' },
  
  // Recording bar
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recordingCancel: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  recordingCancelText: { fontSize: 20 },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 8 },
  recordingTime: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#333', marginRight: 12 },
  recordingWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  recordingWaveBar: { width: 3, borderRadius: 2, backgroundColor: '#d0d0d0' },
  recordingSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
  recordingSendText: { fontSize: 18, color: '#fff' },
  
  // Input - Compact
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    gap: 6,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 4,
    height: 44,
  },
  emojiButton: { 
    width: 36, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  emojiIcon: { fontSize: 22 },
  input: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 0,
    maxHeight: 100,
    fontSize: 16,
    color: '#111b21',
    backgroundColor: 'transparent',
  },
  attachButton: { 
    width: 32, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  attachIcon: { fontSize: 20, color: '#54656f' },
  cameraButton: {
    width: 32,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: { fontSize: 20, color: '#54656f' },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: { backgroundColor: '#00a884' },
  sendButtonText: { color: '#ffffff', fontSize: 18 },
  micIcon: { fontSize: 22, color: '#ffffff' },
  
  // Emoji picker
  emojiPickerContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emojiItem: { fontSize: 28, padding: 6 },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionsSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl + 8,
  },
  sheetTitle: { ...typography.h3, marginBottom: spacing.lg, textAlign: 'center', color: colors.textPrimary },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dangerItem: { borderBottomWidth: 0 },
  dangerText: { color: colors.error },
  assistantItem: { backgroundColor: colors.agentBg, borderRadius: radius.md, marginBottom: spacing.sm },
  assistantText: { color: colors.agentText, fontWeight: '600' },
  actionIcon: { fontSize: 20, marginRight: spacing.md, width: 30, color: colors.textSecondary },
  actionText: { ...typography.body, color: colors.textPrimary },
  cancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
  },
  cancelText: { ...typography.button, color: colors.textSecondary },
  
  // Attachments
  attachmentSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  attachmentGrid: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  attachmentItem: { alignItems: 'center' },
  attachmentIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  attachmentIconText: { fontSize: 24 },
  attachmentLabel: { fontSize: 12, color: '#666' },
  
  // Transfer
  transferSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  sectionLabel: { fontSize: 12, color: '#666', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' },
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
  
  // Transfer Modal - Complete
  transferTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  transferTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  transferTypeSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  transferTypeIcon: { fontSize: 16, marginRight: 6 },
  transferTypeText: { fontSize: 13, color: '#666' },
  transferTypeTextSelected: { color: '#10B981', fontWeight: '600' },
  transferSection: { marginBottom: 16 },
  transferSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  transferSelectItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  transferSelectIcon: { fontSize: 20, marginRight: 12 },
  transferSelectTitle: { fontSize: 15, color: '#333', fontWeight: '500' },
  transferSelectSubtitle: { fontSize: 12, color: '#666' },
  checkMark: { fontSize: 18, color: '#10B981', fontWeight: '700' },
  behaviorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  behaviorOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  behaviorTitle: { fontSize: 14, color: '#333', fontWeight: '500' },
  behaviorSubtitle: { fontSize: 12, color: '#666' },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  priorityOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  priorityText: { fontSize: 13, color: '#333' },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  contextInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  transferActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  transferButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Tags modal
  tagsList: { maxHeight: 300 },
  tagItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tagCheckbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  tagCheckboxChecked: { backgroundColor: '#25D366', borderColor: '#25D366' },
  tagCheck: { color: '#fff', fontWeight: '600' },
  tagColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  tagItemText: { fontSize: 16, color: '#333' },
  
  // Message actions
  messageActionsSheet: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  messageActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  messageActionIcon: { fontSize: 20, marginRight: 12 },
  messageActionText: { fontSize: 16, color: '#333' },
});
