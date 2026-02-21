import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { settingsService } from '../services';
import type { TenantSettings } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

const DISPLAY_OPTIONS = [
  { label: 'Não exibir', value: 'none' },
  { label: 'Somente nome', value: 'name' },
  { label: 'Nome e título', value: 'title' },
  { label: 'Somente título', value: 'title_only' },
];

export function ChatSettingsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<TenantSettings>({
    show_sender_name_attendant: 'none',
    show_sender_name_agent: 'none',
    show_sender_name_robot: 'none',
    default_attendant_title: 'Atendente',
    default_agent_title: 'Agente',
    default_system_user_name: 'Sistema',
  });

  const [showAttendantPicker, setShowAttendantPicker] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showRobotPicker, setShowRobotPicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsService.update(settings);
      Alert.alert('Sucesso', 'Configurações salvas!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayLabel = (value?: string) => 
    DISPLAY_OPTIONS.find(o => o.value === value)?.label || 'Não exibir';

  const renderPicker = (
    show: boolean,
    setShow: (v: boolean) => void,
    currentValue: string | undefined,
    onSelect: (value: string) => void
  ) => {
    if (!show) return null;
    return (
      <View style={styles.pickerList}>
        {DISPLAY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pickerItem, currentValue === opt.value && styles.pickerItemSelected]}
            onPress={() => {
              onSelect(opt.value);
              setShow(false);
            }}
          >
            <Text style={styles.pickerItemText}>{opt.label}</Text>
            {currentValue === opt.value && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Preview examples
  const attendantPreview = () => {
    switch (settings.show_sender_name_attendant) {
      case 'name': return '*Renato:*';
      case 'title': return `*Renato - ${settings.default_attendant_title}:*`;
      case 'title_only': return `*${settings.default_attendant_title}:*`;
      default: return '(sem prefixo)';
    }
  };

  const agentPreview = () => {
    switch (settings.show_sender_name_agent) {
      case 'name': return '*Lia:*';
      case 'title': return `*Lia - ${settings.default_agent_title}:*`;
      case 'title_only': return `*${settings.default_agent_title}:*`;
      default: return '(sem prefixo)';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Attendant Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Atendentes</Text>
          <Text style={styles.sectionDesc}>Como exibir o nome dos atendentes humanos</Text>
          
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowAttendantPicker(!showAttendantPicker)}
          >
            <Text style={styles.selectText}>{getDisplayLabel(settings.show_sender_name_attendant)}</Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          {renderPicker(
            showAttendantPicker,
            setShowAttendantPicker,
            settings.show_sender_name_attendant,
            (v) => setSettings(s => ({ ...s, show_sender_name_attendant: v }))
          )}
          
          {settings.show_sender_name_attendant !== 'none' && settings.show_sender_name_attendant !== 'name' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título padrão</Text>
              <TextInput
                style={styles.input}
                value={settings.default_attendant_title}
                onChangeText={(v) => setSettings(s => ({ ...s, default_attendant_title: v }))}
                placeholder="Atendente"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}
          
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Text style={styles.previewText}>{attendantPreview()}</Text>
          </View>
        </View>

        {/* Agent Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 Agentes IA</Text>
          <Text style={styles.sectionDesc}>Como exibir o nome dos agentes de IA</Text>
          
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowAgentPicker(!showAgentPicker)}
          >
            <Text style={styles.selectText}>{getDisplayLabel(settings.show_sender_name_agent)}</Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          {renderPicker(
            showAgentPicker,
            setShowAgentPicker,
            settings.show_sender_name_agent,
            (v) => setSettings(s => ({ ...s, show_sender_name_agent: v }))
          )}
          
          {settings.show_sender_name_agent !== 'none' && settings.show_sender_name_agent !== 'name' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título padrão</Text>
              <TextInput
                style={styles.input}
                value={settings.default_agent_title}
                onChangeText={(v) => setSettings(s => ({ ...s, default_agent_title: v }))}
                placeholder="Agente"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}
          
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Text style={styles.previewText}>{agentPreview()}</Text>
          </View>
        </View>

        {/* System Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Sistema</Text>
          <Text style={styles.sectionDesc}>Como exibir mensagens automáticas do sistema</Text>
          
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowRobotPicker(!showRobotPicker)}
          >
            <Text style={styles.selectText}>{getDisplayLabel(settings.show_sender_name_robot)}</Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          {renderPicker(
            showRobotPicker,
            setShowRobotPicker,
            settings.show_sender_name_robot,
            (v) => setSettings(s => ({ ...s, show_sender_name_robot: v }))
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do sistema</Text>
            <TextInput
              style={styles.input}
              value={settings.default_system_user_name}
              onChangeText={(v) => setSettings(s => ({ ...s, default_system_user_name: v }))}
              placeholder="Sistema"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Configurações</Text>
          )}
        </TouchableOpacity>
      </View>
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  selectButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  pickerList: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  checkMark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  inputGroup: {
    marginTop: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  preview: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  previewText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
