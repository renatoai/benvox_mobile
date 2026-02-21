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
  Switch,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { usersService } from '../services';
import type { AppUser } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

type UserEditRouteProp = RouteProp<{ UserEdit: { userId: string } }, 'UserEdit'>;

const ROLE_OPTIONS = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Gerente', value: 'manager' },
  { label: 'Atendente', value: 'attendant' },
];

export function UserEditScreen() {
  const route = useRoute<UserEditRouteProp>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('attendant');
  const [isActive, setIsActive] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const userData = await usersService.getById(userId);
      setUser(userData);
      
      // Populate form
      setFullName(userData.full_name || '');
      setEmail(userData.email || '');
      setRole(userData.role || 'attendant');
      setIsActive(userData.is_active !== false);
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Erro', 'Não foi possível carregar o usuário');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Erro', 'O nome é obrigatório');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Erro', 'O email é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      await usersService.update(userId, {
        full_name: fullName.trim(),
        email: email.trim(),
        role: role as any,
        is_active: isActive,
      });
      Alert.alert('Sucesso', 'Usuário atualizado!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Usuário',
      'Tem certeza que deseja excluir este usuário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await usersService.delete(userId);
              Alert.alert('Sucesso', 'Usuário excluído!');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (value: string) => ROLE_OPTIONS.find(r => r.value === value)?.label || value;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {fullName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.avatarHint}>Clique para alterar</Text>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nome do usuário"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Email */}
        <View style={styles.section}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Role */}
        <View style={styles.section}>
          <Text style={styles.label}>Cargo</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowRolePicker(!showRolePicker)}
          >
            <Text style={styles.selectText}>{getRoleLabel(role)}</Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          
          {showRolePicker && (
            <View style={styles.optionsList}>
              {ROLE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionItem, role === opt.value && styles.optionItemSelected]}
                  onPress={() => {
                    setRole(opt.value);
                    setShowRolePicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                  {role === opt.value && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Active Toggle */}
        <View style={styles.switchSection}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>Usuário Ativo</Text>
            <Text style={styles.switchHint}>
              Usuários inativos não podem fazer login
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#D1D5DB', true: colors.primaryLight }}
            thumbColor={isActive ? colors.primary : '#f4f3f4'}
          />
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Excluir Usuário</Text>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  avatarHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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
  selectText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: colors.textTertiary,
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
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  switchContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  switchHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
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
