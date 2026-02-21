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
import { tasksService } from '../services';
import type { Task } from '../types';

export function TasksScreen() {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#666';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity style={styles.item} onPress={() => toggleComplete(item)}>
      <TouchableOpacity 
        style={[styles.checkbox, item.status === 'completed' && styles.checkboxChecked]}
        onPress={() => toggleComplete(item)}
      >
        {item.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, item.status === 'completed' && styles.completedText]}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.itemSubtitle} numberOfLines={1}>{item.description}</Text>
        )}
        <View style={styles.itemMeta}>
          {item.due_date && (
            <Text style={styles.dueDate}>📅 {formatDate(item.due_date)}</Text>
          )}
          {item.contact_name && (
            <Text style={styles.contactName}>👤 {item.contact_name}</Text>
          )}
        </View>
      </View>
      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
    </TouchableOpacity>
  );

  const filters = [
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'completed', label: 'Concluídas' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key)}
          >
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
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>Nenhuma tarefa</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: { backgroundColor: '#25D366' },
  filterText: { fontSize: 14, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#25D366', borderColor: '#25D366' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  completedText: { textDecorationLine: 'line-through', color: '#999' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  itemMeta: { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  dueDate: { fontSize: 12, color: '#666', marginRight: 12 },
  contactName: { fontSize: 12, color: '#666' },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
});
