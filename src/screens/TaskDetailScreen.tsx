import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { tasksService, usersService } from '../services';
import type { UserTask, AppUser } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

type TaskDetailRouteProp = RouteProp<{ TaskDetail: { taskId: string } }, 'TaskDetail'>;

const STATUS_OPTIONS = [
  { label: 'Pendente', value: 'pending', color: '#F59E0B' },
  { label: 'Em progresso', value: 'in_progress', color: '#3B82F6' },
  { label: 'Concluída', value: 'completed', color: '#22C55E' },
  { label: 'Cancelada', value: 'cancelled', color: '#EF4444' },
];

const PRIORITY_OPTIONS = [
  { label: 'Baixa', value: 'low', color: '#6B7280' },
  { label: 'Normal', value: 'normal', color: '#3B82F6' },
  { label: 'Média', value: 'medium', color: '#F59E0B' },
  { label: 'Alta', value: 'high', color: '#F97316' },
  { label: 'Urgente', value: 'urgent', color: '#EF4444' },
];

export function TaskDetailScreen() {
  const route = useRoute<TaskDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { taskId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [task, setTask] = useState<UserTask | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  
  // Edit form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');
  const [priority, setPriority] = useState('normal');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);

  const loadTask = useCallback(async () => {
    try {
      const [taskData, usersData] = await Promise.all([
        tasksService.getById(taskId),
        usersService.getAll(),
      ]);
      
      setTask(taskData);
      setUsers(usersData);
      
      // Populate form
      setTitle(taskData.title || '');
      setDescription(taskData.description || '');
      setStatus(taskData.status || 'pending');
      setPriority(taskData.priority || 'normal');
      setAssignedTo(taskData.assigned_to || null);
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Erro', 'Não foi possível carregar a tarefa');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTask();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      await tasksService.update(taskId, {
        title: title.trim(),
        description: description.trim() || undefined,
        status: status as any,
        priority: priority as any,
        assigned_to: assignedTo || undefined,
      });
      Alert.alert('Sucesso', 'Tarefa atualizada!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Tarefa',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await tasksService.delete(taskId);
              Alert.alert('Sucesso', 'Tarefa excluída!');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await tasksService.update(taskId, { status: 'completed' });
      setStatus('completed');
      Alert.alert('Sucesso', 'Tarefa concluída!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusOption = (value: string) => STATUS_OPTIONS.find(s => s.value === value);
  const getPriorityOption = (value: string) => PRIORITY_OPTIONS.find(p => p.value === value);
  const getUser = (id: string | null) => users.find(u => u.id_app_user === id);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Título da tarefa"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição (opcional)"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowStatusPicker(!showStatusPicker)}
          >
            <View style={styles.selectContent}>
              <View style={[styles.colorDot, { backgroundColor: getStatusOption(status)?.color }]} />
              <Text style={styles.selectText}>{getStatusOption(status)?.label}</Text>
            </View>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          
          {showStatusPicker && (
            <View style={styles.optionsList}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionItem, status === opt.value && styles.optionItemSelected]}
                  onPress={() => {
                    setStatus(opt.value);
                    setShowStatusPicker(false);
                  }}
                >
                  <View style={[styles.colorDot, { backgroundColor: opt.color }]} />
                  <Text style={styles.optionText}>{opt.label}</Text>
                  {status === opt.value && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.label}>Prioridade</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowPriorityPicker(!showPriorityPicker)}
          >
            <View style={styles.selectContent}>
              <View style={[styles.colorDot, { backgroundColor: getPriorityOption(priority)?.color }]} />
              <Text style={styles.selectText}>{getPriorityOption(priority)?.label}</Text>
            </View>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          
          {showPriorityPicker && (
            <View style={styles.optionsList}>
              {PRIORITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionItem, priority === opt.value && styles.optionItemSelected]}
                  onPress={() => {
                    setPriority(opt.value);
                    setShowPriorityPicker(false);
                  }}
                >
                  <View style={[styles.colorDot, { backgroundColor: opt.color }]} />
                  <Text style={styles.optionText}>{opt.label}</Text>
                  {priority === opt.value && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Assigned To */}
        <View style={styles.section}>
          <Text style={styles.label}>Responsável</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowUserPicker(!showUserPicker)}
          >
            <View style={styles.selectContent}>
              <Text style={styles.selectIcon}>👤</Text>
              <Text style={styles.selectText}>
                {assignedTo ? getUser(assignedTo)?.full_name || 'Usuário' : 'Não atribuído'}
              </Text>
            </View>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          
          {showUserPicker && (
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={[styles.optionItem, !assignedTo && styles.optionItemSelected]}
                onPress={() => {
                  setAssignedTo(null);
                  setShowUserPicker(false);
                }}
              >
                <Text style={styles.optionText}>Não atribuído</Text>
                {!assignedTo && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id_app_user}
                  style={[styles.optionItem, assignedTo === user.id_app_user && styles.optionItemSelected]}
                  onPress={() => {
                    setAssignedTo(user.id_app_user);
                    setShowUserPicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{user.full_name}</Text>
                  {assignedTo === user.id_app_user && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        {status !== 'completed' && (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeIcon}>✅</Text>
            <Text style={styles.completeText}>Marcar como Concluída</Text>
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Excluir Tarefa</Text>
        </TouchableOpacity>

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
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
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
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  selectText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  optionsList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    ...shadows.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  checkMark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  completeIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  completeText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  deleteIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  deleteText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
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
