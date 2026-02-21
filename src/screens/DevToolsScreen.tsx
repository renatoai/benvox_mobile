import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { settingsService } from '../services';
import { getStorageItem } from '../utils/storage';
import { colors, spacing, radius, typography, shadows } from '../theme';

const API_BASE_URL = 'https://api.voxbel.com';

interface MemoryEntry {
  id: string;
  contact_name?: string;
  content: string;
  type: string;
  created_at: string;
}

interface AudioSettings {
  tts_provider?: string;
  tts_openai_voice?: string;
  tts_elevenlabs_voice_id?: string;
}

export function DevToolsScreen() {
  const [activeTab, setActiveTab] = useState<'memory' | 'audio' | 'prompt'>('memory');
  const [isLoading, setIsLoading] = useState(true);
  
  // Memory Explorer
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [memorySearch, setMemorySearch] = useState('');
  
  // Audio Settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({});
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  
  // Prompt Template
  const [promptTemplate, setPromptTemplate] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  
  // Variable modal
  const [showVariables, setShowVariables] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'memory') {
        await loadMemories();
      } else if (activeTab === 'audio') {
        await loadAudioSettings();
      } else if (activeTab === 'prompt') {
        await loadPromptTemplate();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMemories = async () => {
    try {
      const token = await getStorageItem('token');
      const response = await fetch(`${API_BASE_URL}/memory/recent?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMemories(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const loadAudioSettings = async () => {
    try {
      const settings = await settingsService.getAll();
      setAudioSettings({
        tts_provider: settings.tts_provider || 'openai',
        tts_openai_voice: settings.tts_openai_voice || 'alloy',
        tts_elevenlabs_voice_id: settings.tts_elevenlabs_voice_id || '',
      });
    } catch (error) {
      console.error('Error loading audio settings:', error);
    }
  };

  const loadPromptTemplate = async () => {
    try {
      const token = await getStorageItem('token');
      const response = await fetch(`${API_BASE_URL}/tenant/prompt-template`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPromptTemplate(data.prompt_template || '');
      }
    } catch (error) {
      console.error('Error loading prompt template:', error);
    }
  };

  const saveAudioSettings = async () => {
    setIsSavingAudio(true);
    try {
      await settingsService.update(audioSettings);
      Alert.alert('Sucesso', 'Configurações de áudio salvas!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    } finally {
      setIsSavingAudio(false);
    }
  };

  const savePromptTemplate = async () => {
    setIsSavingPrompt(true);
    try {
      const token = await getStorageItem('token');
      await fetch(`${API_BASE_URL}/tenant/prompt-template`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt_template: promptTemplate }),
      });
      Alert.alert('Sucesso', 'Template salvo!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const searchMemories = async () => {
    if (!memorySearch.trim()) {
      loadMemories();
      return;
    }
    
    setIsLoading(true);
    try {
      const token = await getStorageItem('token');
      const response = await fetch(`${API_BASE_URL}/memory/search?q=${encodeURIComponent(memorySearch)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMemories(data.data || data || []);
      }
    } catch (error) {
      console.error('Error searching memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    Alert.alert('Excluir Memória', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getStorageItem('token');
            await fetch(`${API_BASE_URL}/memory/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            setMemories(prev => prev.filter(m => m.id !== id));
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const TTS_PROVIDERS = [
    { key: 'openai', label: 'OpenAI', icon: '🤖' },
    { key: 'elevenlabs', label: 'ElevenLabs', icon: '🎙️' },
  ];

  const OPENAI_VOICES = [
    { key: 'alloy', label: 'Alloy' },
    { key: 'echo', label: 'Echo' },
    { key: 'fable', label: 'Fable' },
    { key: 'onyx', label: 'Onyx' },
    { key: 'nova', label: 'Nova' },
    { key: 'shimmer', label: 'Shimmer' },
  ];

  const PROMPT_VARIABLES = [
    { var: '{{data}}', desc: 'Data atual' },
    { var: '{{hora}}', desc: 'Hora atual' },
    { var: '{{contato.nome}}', desc: 'Nome do contato' },
    { var: '{{contato.telefone}}', desc: 'Telefone do contato' },
    { var: '{{instrucoes}}', desc: 'Instruções do agente' },
    { var: '{{working_memory}}', desc: 'Memória de trabalho' },
    { var: '{{rag_context}}', desc: 'Contexto RAG' },
  ];

  const tabs = [
    { key: 'memory', label: 'Memória', icon: '🧠' },
    { key: 'audio', label: 'Áudio', icon: '🔊' },
    { key: 'prompt', label: 'Prompt', icon: '📝' },
  ];

  const renderMemoryExplorer = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={memorySearch}
            onChangeText={setMemorySearch}
            placeholder="Buscar memórias..."
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={searchMemories}
            returnKeyType="search"
          />
          {memorySearch.length > 0 && (
            <TouchableOpacity onPress={() => { setMemorySearch(''); loadMemories(); }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.memoryList} showsVerticalScrollIndicator={false}>
        {memories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyTitle}>Nenhuma memória</Text>
            <Text style={styles.emptySubtitle}>As memórias do agente aparecerão aqui</Text>
          </View>
        ) : (
          memories.map(memory => (
            <TouchableOpacity
              key={memory.id}
              style={styles.memoryCard}
              onLongPress={() => deleteMemory(memory.id)}
              activeOpacity={0.7}
            >
              <View style={styles.memoryHeader}>
                <View style={styles.memoryTypeBadge}>
                  <Text style={styles.memoryTypeText}>{memory.type}</Text>
                </View>
                {memory.contact_name && (
                  <Text style={styles.memoryContact}>👤 {memory.contact_name}</Text>
                )}
              </View>
              <Text style={styles.memoryContent} numberOfLines={3}>
                {memory.content}
              </Text>
              <Text style={styles.memoryDate}>
                {new Date(memory.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          ))
        )}
        {memories.length > 0 && (
          <Text style={styles.hint}>Segure para excluir</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderAudioSettings = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.settingsCard}>
        <Text style={styles.settingLabel}>Provedor TTS</Text>
        <View style={styles.optionsRow}>
          {TTS_PROVIDERS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.optionBtn,
                audioSettings.tts_provider === p.key && styles.optionBtnActive
              ]}
              onPress={() => setAudioSettings(s => ({ ...s, tts_provider: p.key }))}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>{p.icon}</Text>
              <Text style={[
                styles.optionBtnText,
                audioSettings.tts_provider === p.key && styles.optionBtnTextActive
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {audioSettings.tts_provider === 'openai' && (
          <>
            <Text style={[styles.settingLabel, { marginTop: spacing.xl }]}>Voz OpenAI</Text>
            <View style={styles.voicesGrid}>
              {OPENAI_VOICES.map(v => (
                <TouchableOpacity
                  key={v.key}
                  style={[
                    styles.voiceBtn,
                    audioSettings.tts_openai_voice === v.key && styles.voiceBtnActive
                  ]}
                  onPress={() => setAudioSettings(s => ({ ...s, tts_openai_voice: v.key }))}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.voiceBtnText,
                    audioSettings.tts_openai_voice === v.key && styles.voiceBtnTextActive
                  ]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {audioSettings.tts_provider === 'elevenlabs' && (
          <>
            <Text style={[styles.settingLabel, { marginTop: spacing.xl }]}>Voice ID</Text>
            <TextInput
              style={styles.textInput}
              value={audioSettings.tts_elevenlabs_voice_id}
              onChangeText={(v) => setAudioSettings(s => ({ ...s, tts_elevenlabs_voice_id: v }))}
              placeholder="Ex: cgSgspJ2msm6clMCkdW9"
              placeholderTextColor={colors.textTertiary}
            />
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, isSavingAudio && styles.saveBtnDisabled]}
        onPress={saveAudioSettings}
        disabled={isSavingAudio}
        activeOpacity={0.8}
      >
        {isSavingAudio ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <Text style={styles.saveBtnText}>Salvar Configurações</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPromptTemplate = () => (
    <View style={styles.tabContent}>
      <View style={styles.promptHeader}>
        <Text style={styles.settingLabel}>Template do Prompt</Text>
        <TouchableOpacity 
          onPress={() => setShowVariables(true)}
          style={styles.variablesBtn}
        >
          <Text style={styles.variablesBtnText}>📋 Variáveis</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.promptCard}>
        <TextInput
          style={styles.promptInput}
          value={promptTemplate}
          onChangeText={setPromptTemplate}
          placeholder="Digite o template do prompt..."
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, isSavingPrompt && styles.saveBtnDisabled]}
        onPress={savePromptTemplate}
        disabled={isSavingPrompt}
        activeOpacity={0.8}
      >
        {isSavingPrompt ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <Text style={styles.saveBtnText}>Salvar Template</Text>
        )}
      </TouchableOpacity>

      {/* Variables Modal */}
      <Modal visible={showVariables} transparent animationType="slide" onRequestClose={() => setShowVariables(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Variáveis Disponíveis</Text>
            <ScrollView style={styles.variablesList} showsVerticalScrollIndicator={false}>
              {PROMPT_VARIABLES.map(v => (
                <TouchableOpacity
                  key={v.var}
                  style={styles.variableItem}
                  onPress={() => {
                    setPromptTemplate(prev => prev + ' ' + v.var);
                    setShowVariables(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.variableCode}>{v.var}</Text>
                  <Text style={styles.variableDesc}>{v.desc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setShowVariables(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'memory' && renderMemoryExplorer()}
          {activeTab === 'audio' && renderAudioSettings()}
          {activeTab === 'prompt' && renderPromptTemplate()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Tab content
  tabContent: {
    flex: 1,
    padding: spacing.md,
  },
  
  // Search
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...shadows.xs,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textTertiary,
    padding: spacing.xs,
  },
  
  // Memory
  memoryList: {
    flex: 1,
  },
  memoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  memoryTypeBadge: {
    backgroundColor: colors.agentBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  memoryTypeText: {
    ...typography.labelSmall,
    color: colors.agentText,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  memoryContact: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  memoryContent: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  memoryDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  
  // Settings Card
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  settingLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.xs,
  },
  optionBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionIcon: {
    fontSize: 18,
  },
  optionBtnText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  optionBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  voicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  voiceBtn: {
    width: '30%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  voiceBtnText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  voiceBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
  },
  
  // Prompt
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  variablesBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  variablesBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  promptCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  promptInput: {
    flex: 1,
    padding: spacing.lg,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  
  // Save button
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
  },
  saveBtnText: {
    ...typography.button,
    color: colors.textInverse,
  },
  
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl + 8 : spacing.xl,
    maxHeight: '60%',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  variablesList: {
    maxHeight: 300,
  },
  variableItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  variableCode: {
    ...typography.body,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.agentText,
    fontWeight: '600',
  },
  variableDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalCloseBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
  },
  modalCloseBtnText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
