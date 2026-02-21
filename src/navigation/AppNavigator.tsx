import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { ActivityIndicator } from 'react-native';
import {
  LoginScreen,
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
  TasksScreen,
  NewTaskScreen,
  TagsScreen,
  NewTagScreen,
  KnowledgeScreen,
} from '../screens';
import { useAuth } from '../contexts/AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Chat: { conversationId: string; contactName: string };
  FunnelDetail: { funnelId: string; name: string };
  ContactDetail: { contactId: string };
  NewContact: undefined;
  AgentDetail: { agentId: string };
  NewAgent: undefined;
  NewTask: undefined;
  NewTag: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#075E54' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600' as const },
};

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.full_name || 'Usuário'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>
      
      <View style={styles.drawerContent}>
        <DrawerItemList {...props} />
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        ...screenOptions,
        drawerActiveTintColor: '#25D366',
        drawerInactiveTintColor: '#666',
        drawerLabelStyle: { marginLeft: -16, fontSize: 15 },
      }}
    >
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
            name="NewTask"
            component={NewTaskScreen}
            options={{ title: 'Nova Tarefa' }}
          />
          <Stack.Screen
            name="NewTag"
            component={NewTagScreen}
            options={{ title: 'Nova Tag' }}
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
    backgroundColor: '#075E54',
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    backgroundColor: '#075E54',
    padding: 20,
    paddingTop: 40,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    color: '#DCF8C6',
    fontSize: 14,
    marginTop: 4,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 15,
    color: '#e74c3c',
    fontWeight: '500',
  },
});
