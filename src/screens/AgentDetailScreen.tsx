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
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { agentsService } from '../services';
import type { AiAgent } from '../types';

// Default tools list (fallback if API doesn't return)
const DEFAULT_TOOLS = [
  'send_whatsapp_message',
  'send_audio',
  'send_buttons',
  'send_list',
  'generate_image',
  'text_to_speech',
  'web_search',
  'web_scrape',
  'get_contact_info',
  'update_contact_info',
  'save_memory',
  'get_conversation_history',
  'move_stage',
  'transfer_agent',
  'transfer_human',
  'end_session',
  'schedule_followup',
  'cancel_followup',
  'search_knowledge_base',
  'get_current_datetime',
  'analyze_image',
];

export function AgentDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { agentId } = route.params;
  
  const [agent, setAgent] = useState<AiAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    greeting_enabled: false,
    greeting_message: '',
    is_active: true,
  });
  
  // Tools/permissions
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [availableTools, setAvailableTools] = useState<string[]>(DEFAULT_TOOLS);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [toolSearch, setToolSearch] = useState('');
  const [isSavingTools, setIsSavingTools] = useState(false);

  useEffect(() => {
    loadAgent();
    loadAvailableTools();
  }, [agentId]);

  async function loadAgent() {
    try {
      const data = await agentsService.getById(agentId);
      setAgent(data);
      setSelectedTools(data.allowed_actions || []);
      setFormData({
        name: data.name || '',
        instructions: data.instructions || '',
        greeting_enabled: data.greeting_enabled || false,
        greeting_message: data.greeting_message || '',
        is_active: data.is_active,
      });
    } catch (error) {
      console.error('Error loading agent:', error);
      Alert.alert('Erro', 'Não foi possível carregar o agente');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAvailableTools() {
    try {
      const tools = await agentsService.getAllTools();
      if (tools && tools.length > 0) {
        // Tools come from registry with code_ref or name
        const toolNames = tools.map((t: any) => {
          if (typeof t === 'string') return t;
          return t.code_ref || t.codeRef || t.name || t.tool_name;
        }).filter(Boolean);
        if (toolNames.length > 0) {
          setAvailableTools(toolNames);
        }
      }
    } catch (error) {
      console.error('Error loading tools:', error);
      // Keep default tools
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await agentsService.update(agentId, formData);
      setAgent(updated);
      setEditMode(false);
      Alert.alert('Sucesso', 'Agente atualizado!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveTools() {
    setIsSavingTools(true);
    try {
      await agentsService.updateTools(agentId, selectedTools);
      await loadAgent();
      setShowToolsModal(false);
      Alert.alert('Sucesso', 'Permissões atualizadas!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar permissões');
    } finally {
      setIsSavingTools(false);
    }
  }

  function toggleTool(tool: string) {
    setSelectedTools(prev => 
      prev.includes(tool) 
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    );
  }

  function selectAllTools() {
    setSelectedTools([...availableTools]);
  }

  function deselectAllTools() {
    setSelectedTools([]);
  }

  async function handleDelete() {
    Alert.alert(
      'Excluir Agente',
      'Tem certeza? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await agentsService.delete(agentId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          }
        },
      ]
    );
  }

  async function handleDuplicate() {
    try {
      await agentsService.duplicate(agentId);
      Alert.alert('Sucesso', 'Agente duplicado!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível duplicar');
    }
  }

  const filteredTools = availableTools.filter(tool => 
    tool.toLowerCase().includes(toolSearch.toLowerCase())
  );

  const getToolDisplayName = (tool: string) => {
    return tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Agente não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.agentIcon}>
          <Text style={styles.iconText}>🤖</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentModel}>{agent.model || 'gpt-4'}</Text>
        </View>
        <Switch
          value={formData.is_active}
          onValueChange={(v) => {
            setFormData(d => ({ ...d, is_active: v }));
            agentsService.update(agentId, { is_active: v }).then(loadAgent);
          }}
          trackColor={{ false: '#ddd', true: '#25D366' }}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setEditMode(!editMode)}>
          <Text style={styles.actionIcon}>{editMode ? '❌' : '✏️'}</Text>
          <Text style={styles.actionText}>{editMode ? 'Cancelar' : 'Editar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleDuplicate}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>Duplicar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton]} onPress={handleDelete}>
          <Text style={styles.actionIcon}>🗑️</Text>
          <Text style={[styles.actionText, { color: '#e74c3c' }]}>Excluir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nome</Text>
        {editMode ? (
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(v) => setFormData(d => ({ ...d, name: v }))}
          />
        ) : (
          <Text style={styles.value}>{agent.name}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instruções</Text>
        {editMode ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.instructions}
            onChangeText={(v) => setFormData(d => ({ ...d, instructions: v }))}
            multiline
            numberOfLines={6}
            placeholder="Instruções para o agente..."
          />
        ) : (
          <Text style={styles.value}>{agent.instructions || 'Sem instruções definidas'}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.sectionTitle}>Saudação Automática</Text>
          <Switch
            value={formData.greeting_enabled}
            onValueChange={(v) => setFormData(d => ({ ...d, greeting_enabled: v }))}
            trackColor={{ false: '#ddd', true: '#25D366' }}
            disabled={!editMode}
          />
        </View>
        {(editMode || agent.greeting_enabled) && (
          editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.greeting_message}
              onChangeText={(v) => setFormData(d => ({ ...d, greeting_message: v }))}
              multiline
              numberOfLines={3}
              placeholder="Mensagem de saudação..."
            />
          ) : (
            <Text style={styles.value}>{agent.greeting_message || 'Sem mensagem'}</Text>
          )
        )}
      </View>

      {/* Tools/Permissions Section */}
      <TouchableOpacity style={styles.section} onPress={() => setShowToolsModal(true)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ferramentas / Permissões</Text>
          <Text style={styles.editLink}>Editar ▶</Text>
        </View>
        <View style={styles.toolsContainer}>
          {(agent.allowed_actions || []).slice(0, 6).map((tool, i) => (
            <View key={i} style={styles.toolBadge}>
              <Text style={styles.toolText}>{getToolDisplayName(tool)}</Text>
            </View>
          ))}
          {(agent.allowed_actions || []).length > 6 && (
            <View style={styles.moreBadge}>
              <Text style={styles.moreText}>+{(agent.allowed_actions || []).length - 6}</Text>
            </View>
          )}
          {(!agent.allowed_actions || agent.allowed_actions.length === 0) && (
            <Text style={styles.noTools}>Nenhuma ferramenta habilitada</Text>
          )}
        </View>
      </TouchableOpacity>

      {editMode && (
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Tools Modal */}
      <Modal visible={showToolsModal} animationType="slide" onRequestClose={() => setShowToolsModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowToolsModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Permissões</Text>
            <TouchableOpacity onPress={handleSaveTools} disabled={isSavingTools}>
              <Text style={[styles.modalSave, isSavingTools && { opacity: 0.5 }]}>
                {isSavingTools ? '...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={toolSearch}
              onChangeText={setToolSearch}
              placeholder="Buscar ferramenta..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.selectAllRow}>
            <TouchableOpacity style={styles.selectAllBtn} onPress={selectAllTools}>
              <Text style={styles.selectAllText}>✓ Selecionar Todas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectAllBtn} onPress={deselectAllTools}>
              <Text style={styles.selectAllText}>✕ Limpar</Text>
            </TouchableOpacity>
            <Text style={styles.countText}>{selectedTools.length}/{availableTools.length}</Text>
          </View>

          <FlatList
            data={filteredTools}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => toggleTool(item)}
              >
                <View style={[styles.checkbox, selectedTools.includes(item) && styles.checkboxChecked]}>
                  {selectedTools.includes(item) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.toolItemText}>{getToolDisplayName(item)}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.toolsList}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  agentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 28 },
  headerInfo: { flex: 1, marginLeft: 12 },
  agentName: { fontSize: 18, fontWeight: '600', color: '#333' },
  agentModel: { fontSize: 14, color: '#666', marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionText: { fontSize: 12, color: '#666' },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#075E54',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  editLink: {
    fontSize: 13,
    color: '#25D366',
    fontWeight: '500',
  },
  value: { fontSize: 15, color: '#333', lineHeight: 22 },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  toolBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  toolText: { fontSize: 12, color: '#1976d2' },
  moreBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  moreText: { fontSize: 12, color: '#666' },
  noTools: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  saveButton: {
    backgroundColor: '#25D366',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  modalCancel: { fontSize: 16, color: '#666' },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { fontSize: 16, color: '#25D366', fontWeight: '600' },
  searchContainer: { padding: 12 },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  selectAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  selectAllText: { fontSize: 13, color: '#666' },
  countText: { fontSize: 13, color: '#999', marginLeft: 'auto' },
  toolsList: { paddingHorizontal: 12 },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toolItemText: { fontSize: 15, color: '#333' },
});
