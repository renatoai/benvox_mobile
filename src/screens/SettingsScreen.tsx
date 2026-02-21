import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { settingsService } from '../services';
import type { TenantSettings } from '../types';
import { colors, spacing, radius, typography, shadows } from '../theme';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await settingsService.get();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Conta',
      items: [
        { icon: '👤', label: 'Meu Perfil', onPress: () => {} },
        { icon: '🔔', label: 'Notificações', onPress: () => {} },
        { icon: '🔒', label: 'Segurança', onPress: () => {} },
      ],
    },
    {
      title: 'Chat',
      items: [
        { icon: '💬', label: 'Configurações do Chat', onPress: () => navigation.navigate('ChatSettings'), hasArrow: true },
        { icon: '🤖', label: 'Título do Agente', value: settings?.default_agent_title || 'Agente' },
        { icon: '👤', label: 'Título do Atendente', value: settings?.default_attendant_title || 'Atendente' },
      ],
    },
    {
      title: 'IA & Automação',
      items: [
        { icon: '🎤', label: 'Provedor TTS', value: settings?.tts_provider || 'openai' },
        { icon: '🗣️', label: 'Voz TTS', value: settings?.tts_openai_voice || 'alloy' },
      ],
    },
    {
      title: 'Sobre',
      items: [
        { icon: 'ℹ️', label: 'Versão do App', value: '1.0.0' },
        { icon: '📄', label: 'Termos de Uso', onPress: () => {} },
        { icon: '🔐', label: 'Política de Privacidade', onPress: () => {} },
      ],
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.full_name || 'Usuário'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'Usuário'}</Text>
          </View>
        </View>
      </View>

      {/* Menu Sections */}
      {menuItems.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.menuItem,
                  itemIndex === section.items.length - 1 && styles.menuItemLast
                ]}
                onPress={item.onPress}
                disabled={!item.onPress}
                activeOpacity={item.onPress ? 0.7 : 1}
              >
                <View style={styles.menuItemIcon}>
                  <Text style={styles.menuItemIconText}>{item.icon}</Text>
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
                {item.value ? (
                  <Text style={styles.menuItemValue}>{item.value}</Text>
                ) : (
                  <Text style={styles.menuItemArrow}>›</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Benvox Mobile v1.0.0</Text>
        <Text style={styles.footerCopyright}>© 2026 Benvox</Text>
      </View>
    </ScrollView>
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
  
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 26,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  userName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    marginTop: spacing.sm,
  },
  roleText: {
    ...typography.labelSmall,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  
  // Sections
  section: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemIconText: {
    fontSize: 18,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  menuItemArrow: {
    fontSize: 20,
    color: colors.textTertiary,
  },
  menuItemValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  logoutButtonText: {
    ...typography.button,
    color: colors.error,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  footerCopyright: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
