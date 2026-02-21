import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { usersService } from '../services';
import type { AppUser } from '../types';

export function UsersScreen() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'attendant',
  });

  const loadUsers = useCallback(async () => {
    try {
      const data = await usersService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async () => {
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setIsSaving(true);
    try {
      await usersService.create(formData as any);
      setShowNewUser(false);
      setFormData({ full_name: '', email: '', password: '', role: 'attendant' });
      loadUsers();
      Alert.alert('Sucesso', 'Usuário criado!');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível criar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    
    setIsSaving(true);
    try {
      await usersService.update(selectedUser.id_app_user, {
        full_name: formData.full_name,
        role: formData.role as any,
      });
      setShowEditUser(false);
      loadUsers();
      Alert.alert('Sucesso', 'Usuário atualizado!');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível atualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (user: AppUser) => {
    Alert.alert(
      'Excluir Usuário',
      `Tem certeza que deseja excluir "${user.full_name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await usersService.delete(user.id_app_user);
              loadUsers();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          }
        },
      ]
    );
  };

  const openEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowEditUser(true);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'attendant': return 'Atendente';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#e74c3c';
      case 'manager': return '#f39c12';
      case 'attendant': return '#3498db';
      default: return '#666';
    }
  };

  const roles = [
    { key: 'attendant', label: 'Atendente', color: '#3498db' },
    { key: 'manager', label: 'Gerente', color: '#f39c12' },
    { key: 'admin', label: 'Administrador', color: '#e74c3c' },
  ];

  const renderItem = ({ item }: { item: AppUser }) => (
    <TouchableOpacity style={styles.item} onPress={() => openEditUser(item)} onLongPress={() => handleDelete(item)}>
      <View style={styles.avatar}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{item.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
        )}
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.full_name}</Text>
        <Text style={styles.itemSubtitle}>{item.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
            {getRoleName(item.role)}
          </Text>
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#25D366' : '#ccc' }]} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id_app_user}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>Nenhum usuário</Text>
          </View>
        }
        ListFooterComponent={
          users.length > 0 ? <Text style={styles.hint}>Toque para editar, segure para excluir</Text> : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => {
        setFormData({ full_name: '', email: '', password: '', role: 'attendant' });
        setShowNewUser(true);
      }}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* New User Modal */}
      <Modal visible={showNewUser} animationType="slide" onRequestClose={() => setShowNewUser(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewUser(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Novo Usuário</Text>
            <TouchableOpacity onPress={handleCreate} disabled={isSaving}>
              <Text style={[styles.modalSave, isSaving && styles.modalSaveDisabled]}>
                {isSaving ? '...' : 'Criar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(v) => setFormData(d => ({ ...d, full_name: v }))}
                placeholder="João Silva"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(v) => setFormData(d => ({ ...d, email: v }))}
                placeholder="joao@empresa.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(v) => setFormData(d => ({ ...d, password: v }))}
                placeholder="••••••••"
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Função</Text>
              <View style={styles.rolesContainer}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      formData.role === role.key && { backgroundColor: role.color + '20', borderColor: role.color }
                    ]}
                    onPress={() => setFormData(d => ({ ...d, role: role.key }))}
                  >
                    <Text style={[styles.roleOptionText, formData.role === role.key && { color: role.color }]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={showEditUser} animationType="slide" onRequestClose={() => setShowEditUser(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditUser(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Usuário</Text>
            <TouchableOpacity onPress={handleUpdate} disabled={isSaving}>
              <Text style={[styles.modalSave, isSaving && styles.modalSaveDisabled]}>
                {isSaving ? '...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(v) => setFormData(d => ({ ...d, full_name: v }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.email}
                editable={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Função</Text>
              <View style={styles.rolesContainer}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      formData.role === role.key && { backgroundColor: role.color + '20', borderColor: role.color }
                    ]}
                    onPress={() => setFormData(d => ({ ...d, role: role.key }))}
                  >
                    <Text style={[styles.roleOptionText, formData.role === role.key && { color: role.color }]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 12, fontWeight: '600' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  hint: { textAlign: 'center', fontSize: 12, color: '#999', padding: 16 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50,
  },
  modalCancel: { fontSize: 16, color: '#666' },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalSave: { fontSize: 16, color: '#25D366', fontWeight: '600' },
  modalSaveDisabled: { color: '#ccc' },
  modalContent: { padding: 16 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputDisabled: { backgroundColor: '#f0f0f0', color: '#999' },
  rolesContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  roleOptionText: { fontSize: 14, color: '#666' },
});
