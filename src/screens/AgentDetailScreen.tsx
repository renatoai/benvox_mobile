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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { agentsService } from '../services';
import type { AiAgent } from '../types';

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

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  async function loadAgent() {
    try {
      const data = await agentsService.getById(agentId);
      setAgent(data);
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

      {agent.allowed_actions && agent.allowed_actions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ferramentas ({agent.allowed_actions.length})</Text>
          <View style={styles.toolsContainer}>
            {agent.allowed_actions.slice(0, 10).map((tool, i) => (
              <View key={i} style={styles.toolBadge}>
                <Text style={styles.toolText}>{tool}</Text>
              </View>
            ))}
            {agent.allowed_actions.length > 10 && (
              <Text style={styles.moreText}>+{agent.allowed_actions.length - 10} mais</Text>
            )}
          </View>
        </View>
      )}

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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#075E54',
    textTransform: 'uppercase',
    marginBottom: 8,
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
  toolsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  toolBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  toolText: { fontSize: 12, color: '#1976d2' },
  moreText: { fontSize: 12, color: '#666', alignSelf: 'center' },
  saveButton: {
    backgroundColor: '#25D366',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
