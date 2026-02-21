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

interface PromptTemplate {
  prompt_template?: string;
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
    if (!memorySearch.trim()) return;
    
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
    { key: 'openai', label: 'OpenAI' },
    { key: 'elevenlabs', label: 'ElevenLabs' },
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

  const renderMemoryExplorer = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={memorySearch}
          onChangeText={setMemorySearch}
          placeholder="Buscar memórias..."
          placeholderTextColor="#999"
          onSubmitEditing={searchMemories}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchMemories}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.memoryList}>
        {memories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyText}>Nenhuma memória encontrada</Text>
          </View>
        ) : (
          memories.map(memory => (
            <TouchableOpacity
              key={memory.id}
              style={styles.memoryItem}
              onLongPress={() => deleteMemory(memory.id)}
            >
              <View style={styles.memoryHeader}>
                <Text style={styles.memoryType}>{memory.type}</Text>
                {memory.contact_name && (
                  <Text style={styles.memoryContact}>{memory.contact_name}</Text>
                )}
              </View>
              <Text style={styles.memoryContent} numberOfLines={3}>
                {memory.content}
              </Text>
              <Text style={styles.memoryDate}>
                {new Date(memory.created_at).toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderAudioSettings = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.settingSection}>
        <Text style={styles.sectionTitle}>Provedor TTS</Text>
        <View style={styles.optionsRow}>
          {TTS_PROVIDERS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.optionBtn,
                audioSettings.tts_provider === p.key && styles.optionBtnActive
              ]}
              onPress={() => setAudioSettings(s => ({ ...s, tts_provider: p.key }))}
            >
              <Text style={[
                styles.optionBtnText,
                audioSettings.tts_provider === p.key && styles.optionBtnTextActive
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {audioSettings.tts_provider === 'openai' && (
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>Voz OpenAI</Text>
          <View style={styles.optionsRow}>
            {OPENAI_VOICES.map(v => (
              <TouchableOpacity
                key={v.key}
                style={[
                  styles.optionBtn,
                  audioSettings.tts_openai_voice === v.key && styles.optionBtnActive
                ]}
                onPress={() => setAudioSettings(s => ({ ...s, tts_openai_voice: v.key }))}
              >
                <Text style={[
                  styles.optionBtnText,
                  audioSettings.tts_openai_voice === v.key && styles.optionBtnTextActive
                ]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {audioSettings.tts_provider === 'elevenlabs' && (
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>Voice ID (ElevenLabs)</Text>
          <TextInput
            style={styles.textInput}
            value={audioSettings.tts_elevenlabs_voice_id}
            onChangeText={(v) => setAudioSettings(s => ({ ...s, tts_elevenlabs_voice_id: v }))}
            placeholder="Ex: cgSgspJ2msm6clMCkdW9"
            placeholderTextColor="#999"
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, isSavingAudio && styles.saveBtnDisabled]}
        onPress={saveAudioSettings}
        disabled={isSavingAudio}
      >
        {isSavingAudio ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Salvar Configurações</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPromptTemplate = () => (
    <View style={styles.tabContent}>
      <View style={styles.promptHeader}>
        <Text style={styles.promptLabel}>Template do Prompt</Text>
        <TouchableOpacity onPress={() => setShowVariables(true)}>
          <Text style={styles.variablesBtn}>📋 Variáveis</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.promptInput}
        value={promptTemplate}
        onChangeText={setPromptTemplate}
        placeholder="Digite o template do prompt..."
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.saveBtn, isSavingPrompt && styles.saveBtnDisabled]}
        onPress={savePromptTemplate}
        disabled={isSavingPrompt}
      >
        {isSavingPrompt ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Salvar Template</Text>
        )}
      </TouchableOpacity>

      {/* Variables Modal */}
      <Modal visible={showVariables} transparent animationType="slide" onRequestClose={() => setShowVariables(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Variáveis Disponíveis</Text>
            <ScrollView style={styles.variablesList}>
              {PROMPT_VARIABLES.map(v => (
                <TouchableOpacity
                  key={v.var}
                  style={styles.variableItem}
                  onPress={() => {
                    setPromptTemplate(prev => prev + ' ' + v.var);
                    setShowVariables(false);
                  }}
                >
                  <Text style={styles.variableCode}>{v.var}</Text>
                  <Text style={styles.variableDesc}>{v.desc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowVariables(false)}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'memory' && styles.tabActive]}
          onPress={() => setActiveTab('memory')}
        >
          <Text style={[styles.tabText, activeTab === 'memory' && styles.tabTextActive]}>
            🧠 Memória
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audio' && styles.tabActive]}
          onPress={() => setActiveTab('audio')}
        >
          <Text style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>
            🔊 Áudio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prompt' && styles.tabActive]}
          onPress={() => setActiveTab('prompt')}
        >
          <Text style={[styles.tabText, activeTab === 'prompt' && styles.tabTextActive]}>
            📝 Prompt
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#25D366',
  },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#25D366', fontWeight: '600' },
  
  // Tab content
  tabContent: { flex: 1, padding: 16 },
  
  // Memory Explorer
  searchRow: { flexDirection: 'row', marginBottom: 16 },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginRight: 8,
  },
  searchBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#25D366',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { fontSize: 20 },
  memoryList: { flex: 1 },
  memoryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  memoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  memoryType: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  memoryContact: { fontSize: 12, color: '#666' },
  memoryContent: { fontSize: 14, color: '#333', lineHeight: 20 },
  memoryDate: { fontSize: 11, color: '#999', marginTop: 8 },
  
  // Settings section
  settingSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionBtnActive: { backgroundColor: '#25D366', borderColor: '#25D366' },
  optionBtnText: { fontSize: 14, color: '#666' },
  optionBtnTextActive: { color: '#fff', fontWeight: '600' },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  
  // Prompt
  promptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  promptLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  variablesBtn: { fontSize: 13, color: '#25D366', fontWeight: '500' },
  promptInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  
  // Save button
  saveBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#666' },
  
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
    maxHeight: '60%',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  variablesList: { maxHeight: 300 },
  variableItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  variableCode: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#8b5cf6', fontWeight: '600' },
  variableDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  modalClose: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  modalCloseText: { fontSize: 16, color: '#666', fontWeight: '600' },
});
