import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tasksService } from '../services';
import type { Task } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

export function TasksScreen() {
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const loadTasks = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : undefined;
      const data = await tasksService.getAll(params);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadTasks);
    return unsubscribe;
  }, [navigation, loadTasks]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTasks();
  }, [loadTasks]);

  const toggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await tasksService.update(task.id_task, { status: newStatus });
      setTasks(prev => prev.map(t => 
        t.id_task === task.id_task ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: '#FEE2E2', color: '#DC2626', label: 'Alta' };
      case 'medium': return { bg: '#FEF3C7', color: '#D97706', label: 'Média' };
      case 'low': return { bg: '#D1FAE5', color: '#059669', label: 'Baixa' };
      default: return { bg: colors.surfaceHover, color: colors.textSecondary, label: 'Normal' };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === tomorrow.toDateString()) return 'Amanhã';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const renderItem = ({ item }: { item: Task }) => {
    const priority = getPriorityStyle(item.priority);
    const overdue = item.status !== 'completed' && isOverdue(item.due_date);
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => toggleComplete(item)}
        activeOpacity={0.7}
      >
        <TouchableOpacity 
          style={[styles.checkbox, item.status === 'completed' && styles.checkboxChecked]}
          onPress={() => toggleComplete(item)}
        >
          {item.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, item.status === 'completed' && styles.completedText]}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text>
          )}
          <View style={styles.metaRow}>
            {item.due_date && (
              <View style={[styles.metaItem, overdue && styles.metaItemOverdue]}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={[styles.metaText, overdue && styles.metaTextOverdue]}>
                  {formatDate(item.due_date)}
                </Text>
              </View>
            )}
            {item.contact_name && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👤</Text>
                <Text style={styles.metaText}>{item.contact_name}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filters = [
    { key: 'all', label: 'Todas', icon: '📋' },
    { key: 'pending', label: 'Pendentes', icon: '⏳' },
    { key: 'completed', label: 'Concluídas', icon: '✅' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando tarefas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterIcon}>{f.icon}</Text>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id_task}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>Nenhuma tarefa</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'completed' ? 'Nenhuma tarefa concluída' : 'Crie sua primeira tarefa'}
            </Text>
          </View>
        }
        contentContainerStyle={tasks.length === 0 ? { flex: 1 } : { padding: spacing.md, paddingTop: 0 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('NewTask')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  
  // Filters
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    gap: spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterIcon: {
    fontSize: 14,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaItemOverdue: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaTextOverdue: {
    color: '#DC2626',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    marginLeft: spacing.sm,
  },
  priorityText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
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
    textAlign: 'center',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.textInverse,
    fontWeight: '300',
  },
});
