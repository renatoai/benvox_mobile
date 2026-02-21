import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { agentsService } from '../services';

export function NewAgentScreen() {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    model: 'gpt-4o-mini',
    greeting_enabled: false,
    greeting_message: '',
    is_active: true,
  });

  async function handleCreate() {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      await agentsService.create(formData);
      Alert.alert('Sucesso', 'Agente criado!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível criar o agente');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(v) => setFormData(d => ({ ...d, name: v }))}
            placeholder="Ex: Assistente de Vendas"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Modelo</Text>
          <View style={styles.modelOptions}>
            {['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'].map((model) => (
              <TouchableOpacity
                key={model}
                style={[styles.modelOption, formData.model === model && styles.modelSelected]}
                onPress={() => setFormData(d => ({ ...d, model }))}
              >
                <Text style={[styles.modelText, formData.model === model && styles.modelTextSelected]}>
                  {model}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Instruções</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.instructions}
            onChangeText={(v) => setFormData(d => ({ ...d, instructions: v }))}
            placeholder="Você é um assistente de atendimento ao cliente..."
            multiline
            numberOfLines={6}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Saudação Automática</Text>
            <Switch
              value={formData.greeting_enabled}
              onValueChange={(v) => setFormData(d => ({ ...d, greeting_enabled: v }))}
              trackColor={{ false: '#ddd', true: '#25D366' }}
            />
          </View>
        </View>

        {formData.greeting_enabled && (
          <View style={styles.field}>
            <Text style={styles.label}>Mensagem de Saudação</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.greeting_message}
              onChangeText={(v) => setFormData(d => ({ ...d, greeting_message: v }))}
              placeholder="Olá! Como posso ajudar?"
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Ativo</Text>
            <Switch
              value={formData.is_active}
              onValueChange={(v) => setFormData(d => ({ ...d, is_active: v }))}
              trackColor={{ false: '#ddd', true: '#25D366' }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Criar Agente</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  form: { padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modelOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  modelSelected: {
    backgroundColor: '#25D366',
  },
  modelText: { fontSize: 14, color: '#666' },
  modelTextSelected: { color: '#fff', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#25D366',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
