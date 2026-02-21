import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { ActivityIndicator } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../theme';
import {
  LoginScreen,
  DashboardScreen,
  ConversationsScreen,
  ChatScreen,
  SettingsScreen,
  ChannelsScreen,
  ContactsScreen,
  ContactDetailScreen,
  NewContactScreen,
  FunnelsScreen,
  FunnelDetailScreen,
  AgentsScreen,
  AgentDetailScreen,
  NewAgentScreen,
  UsersScreen,
  UserEditScreen,
  TasksScreen,
  TaskDetailScreen,
  NewTaskScreen,
  TagsScreen,
  NewTagScreen,
  KnowledgeScreen,
  KnowledgeDetailScreen,
  AssistantScreen,
  DevToolsScreen,
} from '../screens';
import { useAuth } from '../contexts/AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Chat: { conversationId: string; contactName: string };
  Assistant: { conversationId: string; contactName: string; contactPhone: string; channelId: string };
  FunnelDetail: { funnelId: string; name: string };
  ContactDetail: { contactId: string };
  NewContact: undefined;
  AgentDetail: { agentId: string };
  NewAgent: undefined;
  UserEdit: { userId: string };
  TaskDetail: { taskId: string };
  NewTask: undefined;
  NewTag: undefined;
  KnowledgeDetail: { baseId: string; name: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

const screenOptions = {
  headerStyle: { 
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { 
    fontWeight: '600' as const,
    fontSize: 17,
  },
};

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  
  return (
    <View style={styles.drawerContainer}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.full_name || 'Usuário'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>
      
      {/* Scrollable menu items */}
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScrollContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
      {/* Fixed logout button at bottom */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        ...screenOptions,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: { marginLeft: -12, fontSize: 15, fontWeight: '500' },
        drawerItemStyle: { borderRadius: radius.md, marginHorizontal: spacing.sm },
        drawerActiveBackgroundColor: colors.primarySoft,
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
        }}
      />
      <Drawer.Screen
        name="Inbox"
        component={ConversationsScreen}
        options={{
          title: 'Inbox',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📥</Text>,
        }}
      />
      <Drawer.Screen
        name="Channels"
        component={ChannelsScreen}
        options={{
          title: 'Canais',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📱</Text>,
        }}
      />
      <Drawer.Screen
        name="Funnels"
        component={FunnelsScreen}
        options={{
          title: 'Funis',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎯</Text>,
        }}
      />
      <Drawer.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          title: 'Contatos',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
        }}
      />
      <Drawer.Screen
        name="Agents"
        component={AgentsScreen}
        options={{
          title: 'Agentes IA',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🤖</Text>,
        }}
      />
      <Drawer.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tarefas',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>✅</Text>,
        }}
      />
      <Drawer.Screen
        name="Tags"
        component={TagsScreen}
        options={{
          title: 'Tags',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏷️</Text>,
        }}
      />
      <Drawer.Screen
        name="Knowledge"
        component={KnowledgeScreen}
        options={{
          title: 'Base de Conhecimento',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
        }}
      />
      <Drawer.Screen
        name="Users"
        component={UsersScreen}
        options={{
          title: 'Usuários',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Configurações',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
      <Drawer.Screen
        name="DevTools"
        component={DevToolsScreen}
        options={{
          title: 'Dev Tools',
          drawerIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛠️</Text>,
        }}
      />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={DrawerNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              title: route.params?.contactName || 'Chat',
            })}
          />
          <Stack.Screen
            name="Assistant"
            component={AssistantScreen}
            options={{
              title: 'Assistente IA',
              headerStyle: { backgroundColor: '#8b5cf6' },
            }}
          />
          <Stack.Screen
            name="FunnelDetail"
            component={FunnelDetailScreen}
            options={({ route }) => ({
              title: route.params?.name || 'Funil',
            })}
          />
          <Stack.Screen
            name="ContactDetail"
            component={ContactDetailScreen}
            options={{ title: 'Contato' }}
          />
          <Stack.Screen
            name="NewContact"
            component={NewContactScreen}
            options={{ title: 'Novo Contato' }}
          />
          <Stack.Screen
            name="AgentDetail"
            component={AgentDetailScreen}
            options={{ title: 'Agente' }}
          />
          <Stack.Screen
            name="NewAgent"
            component={NewAgentScreen}
            options={{ title: 'Novo Agente' }}
          />
          <Stack.Screen
            name="UserEdit"
            component={UserEditScreen}
            options={{ title: 'Editar Usuário' }}
          />
          <Stack.Screen
            name="TaskDetail"
            component={TaskDetailScreen}
            options={{ title: 'Editar Tarefa' }}
          />
          <Stack.Screen
            name="NewTask"
            component={NewTaskScreen}
            options={{ title: 'Nova Tarefa' }}
          />
          <Stack.Screen
            name="NewTag"
            component={NewTagScreen}
            options={{ title: 'Nova Tag' }}
          />
          <Stack.Screen
            name="KnowledgeDetail"
            component={KnowledgeDetailScreen}
            options={({ route }) => ({
              title: route.params?.name || 'Base de Conhecimento',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  drawerScrollContent: {
    paddingTop: 0,
  },
  drawerHeader: {
    backgroundColor: colors.primaryDark,
    padding: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  userAvatarText: {
    color: colors.textInverse,
    fontSize: 26,
    fontWeight: '700',
  },
  userName: {
    color: colors.textInverse,
    ...typography.h3,
  },
  userEmail: {
    color: colors.primaryLight,
    ...typography.bodySmall,
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
});
