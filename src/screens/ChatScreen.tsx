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
import { conversationsService, contactsService, funnelsService, agentsService, tagsService, messagesService } from '../services';
import type { Message, Conversation, AiAgent, Tag, FunnelStage } from '../types';

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

  // Long press for message actions
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);

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

  const loadMessages = useCallback(async () => {
    try {
      const data = await conversationsService.getMessages(conversationId);
      const sorted = data.sort((a: Message, b: Message) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const loadTags = useCallback(async () => {
    try {
      const data = await tagsService.getAll();
      setTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }, []);

  useEffect(() => {
    loadConversation();
    loadMessages();
    loadTags();
    conversationsService.markAsRead(conversationId).catch(console.error);
    
    // Poll for new messages (TODO: Replace with SSE)
    const interval = setInterval(loadMessages, 5000);
    return () => {
      clearInterval(interval);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [conversationId, loadConversation, loadMessages, loadTags]);

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
    
    setMessages(prev => [...prev, tempMessage]);
    
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

  // ============ SEND MEDIA ============
  const sendMedia = async (uri: string, type: 'image' | 'video' | 'audio' | 'document', caption?: string, fileName?: string) => {
    if (!conversation) return;
    
    setIsSending(true);
    
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
      
      await messagesService.sendMedia(formData);
      await loadMessages();
      
    } catch (error: any) {
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

  const openTagsModal = () => {
    setShowTagsModal(true);
    setShowActions(false);
  };

  // ============ HELPERS ============
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

  // ============ RENDER MESSAGE ============
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.from_me || item.direction === 'outbound';
    const mediaUrl = getMediaUrl(item);
    
    return (
      <Pressable 
        onLongPress={() => handleMessageLongPress(item)}
        style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}
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

        {/* Footer */}
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
          {isMe && (
            <Text style={[styles.status, item.status === 'read' && styles.statusRead]}>
              {item.status === 'read' ? '✓✓' : item.status === 'delivered' ? '✓✓' : item.status === 'sent' ? '✓' : '○'}
            </Text>
          )}
        </View>

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
      {/* Header Info Bar */}
      <View style={styles.infoBar}>
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
          {/* Tags */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
            {assignedTags.map(tag => (
              <View key={tag.id_tag} style={[styles.tagBadge, { backgroundColor: tag.color + '30' }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.actionsButton} onPress={() => setShowActions(true)}>
          <Text style={styles.actionsIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

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

      {/* Input */}
      {!isRecording && (
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={() => setShowAttachments(true)}
          >
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          
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
            placeholderTextColor="#999"
            multiline
            maxLength={4096}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, inputText.trim() ? styles.sendButtonActive : {}]}
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
  
  // Header
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
    marginRight: 8,
  },
  closedBadge: { backgroundColor: '#ffebee' },
  statusBadgeText: { fontSize: 12, color: '#333', textTransform: 'capitalize' },
  tagsScroll: { flexDirection: 'row' },
  tagBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 6 },
  tagDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  tagText: { fontSize: 11, fontWeight: '600' },
  actionsButton: { padding: 8 },
  actionsIcon: { fontSize: 24, color: '#666' },
  
  // Chat
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
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2 },
  timestamp: { fontSize: 11, color: '#999' },
  status: { fontSize: 12, color: '#999', marginLeft: 4 },
  statusRead: { color: '#53bdeb' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#666' },
  
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
  
  // Input
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'flex-end',
  },
  attachButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  attachIcon: { fontSize: 22 },
  emojiButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  emojiIcon: { fontSize: 22 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: { backgroundColor: '#25D366' },
  sendButtonText: { color: '#fff', fontSize: 20 },
  micIcon: { fontSize: 22 },
  
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
  dangerItem: { borderBottomWidth: 0 },
  dangerText: { color: '#ef4444' },
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
