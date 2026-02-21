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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { usersService } from '../services';
import type { AppUser } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

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
    navigation.navigate('UserEdit', { userId: user.id_app_user });
  };

  const roles = [
    { key: 'attendant', label: 'Atendente', icon: '💬', color: '#3B82F6' },
    { key: 'manager', label: 'Gerente', icon: '📊', color: '#F59E0B' },
    { key: 'admin', label: 'Admin', icon: '👑', color: '#EF4444' },
  ];

  const getRoleInfo = (roleKey: string) => roles.find(r => r.key === roleKey) || roles[0];

  const renderItem = ({ item }: { item: AppUser }) => {
    const role = getRoleInfo(item.role);
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => openEditUser(item)} 
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View style={[styles.statusIndicator, { backgroundColor: item.is_active ? colors.success : colors.textTertiary }]} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.full_name}</Text>
          <Text style={styles.cardSubtitle}>{item.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: role.color + '15' }]}>
            <Text style={styles.roleIcon}>{role.icon}</Text>
            <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderModal = (isNew: boolean) => (
    <Modal 
      visible={isNew ? showNewUser : showEditUser} 
      animationType="slide" 
      onRequestClose={() => isNew ? setShowNewUser(false) : setShowEditUser(false)}
    >
      <KeyboardAvoidingView 
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={() => isNew ? setShowNewUser(false) : setShowEditUser(false)}
            style={styles.headerButton}
          >
            <Text style={styles.modalCancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{isNew ? 'Novo Usuário' : 'Editar Usuário'}</Text>
          <TouchableOpacity 
            onPress={isNew ? handleCreate : handleUpdate} 
            disabled={isSaving}
            style={styles.headerButton}
          >
            <Text style={[styles.modalSave, isSaving && styles.modalSaveDisabled]}>
              {isSaving ? '...' : (isNew ? 'Criar' : 'Salvar')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(v) => setFormData(d => ({ ...d, full_name: v }))}
                placeholder="João Silva"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, !isNew && styles.inputDisabled]}
                value={formData.email}
                onChangeText={(v) => setFormData(d => ({ ...d, email: v }))}
                placeholder="joao@empresa.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={isNew}
              />
            </View>

            {isNew && (
              <View style={styles.field}>
                <Text style={styles.label}>Senha</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(v) => setFormData(d => ({ ...d, password: v }))}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Função</Text>
              <View style={styles.rolesContainer}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      formData.role === role.key && { 
                        backgroundColor: role.color + '15', 
                        borderColor: role.color 
                      }
                    ]}
                    onPress={() => setFormData(d => ({ ...d, role: role.key }))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.roleOptionIcon}>{role.icon}</Text>
                    <Text style={[
                      styles.roleOptionText, 
                      formData.role === role.key && { color: role.color, fontWeight: '600' }
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
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
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Nenhum usuário</Text>
            <Text style={styles.emptySubtitle}>Adicione usuários à sua equipe</Text>
          </View>
        }
        contentContainerStyle={users.length === 0 ? { flex: 1 } : { padding: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListFooterComponent={
          users.length > 0 ? <Text style={styles.hint}>Toque para editar, segure para excluir</Text> : null
        }
      />

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          setFormData({ full_name: '', email: '', password: '', role: 'attendant' });
          setShowNewUser(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {renderModal(true)}
      {renderModal(false)}
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
  
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  roleIcon: {
    fontSize: 12,
  },
  roleText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
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
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    padding: spacing.lg,
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
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
  },
  headerButton: {
    minWidth: 70,
  },
  modalCancel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSave: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  modalSaveDisabled: {
    color: colors.textTertiary,
  },
  modalContent: {
    padding: spacing.md,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLast: {
    marginBottom: 0,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputDisabled: {
    backgroundColor: colors.background,
    color: colors.textTertiary,
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  roleOptionIcon: {
    fontSize: 16,
  },
  roleOptionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
