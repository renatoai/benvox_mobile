import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { contactsService, conversationsService, tagsService } from '../services';
import type { Contact, Conversation, Tag } from '../types';

export function ContactDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { contactId } = route.params;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone_number: '', email: '', notes: '' });

  useEffect(() => {
    loadData();
  }, [contactId]);

  async function loadData() {
    try {
      const [contactData, convData, tagsData] = await Promise.all([
        contactsService.getById(contactId),
        conversationsService.getByContact(contactId).catch(() => []),
        tagsService.getAll().catch(() => []),
      ]);
      setContact(contactData);
      setConversations(convData);
      setAllTags(tagsData);
      setEditData({
        name: contactData.name || '',
        phone_number: contactData.phone_number || '',
        email: contactData.email || '',
        notes: contactData.notes || '',
      });
    } catch (error) {
      console.error('Error loading contact:', error);
      Alert.alert('Erro', 'Não foi possível carregar o contato');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    try {
      const updated = await contactsService.update(contactId, editData);
      setContact(updated);
      setIsEditing(false);
      Alert.alert('Sucesso', 'Contato atualizado!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Excluir Contato',
      'Tem certeza? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await contactsService.delete(contactId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          }
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Contato não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {contact.profile_picture_url ? (
            <Image source={{ uri: contact.profile_picture_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{contact.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          )}
        </View>
        {!isEditing ? (
          <>
            <Text style={styles.name}>{contact.name}</Text>
            <Text style={styles.phone}>{contact.phone_number}</Text>
            {contact.email && <Text style={styles.email}>{contact.email}</Text>}
          </>
        ) : (
          <View style={styles.editHeader}>
            <TextInput
              style={styles.editInput}
              value={editData.name}
              onChangeText={(v) => setEditData(d => ({ ...d, name: v }))}
              placeholder="Nome"
            />
            <TextInput
              style={styles.editInput}
              value={editData.phone_number}
              onChangeText={(v) => setEditData(d => ({ ...d, phone_number: v }))}
              placeholder="Telefone"
            />
            <TextInput
              style={styles.editInput}
              value={editData.email}
              onChangeText={(v) => setEditData(d => ({ ...d, email: v }))}
              placeholder="Email"
            />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {!isEditing ? (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => conversations[0] && navigation.navigate('Chat', {
                conversationId: conversations[0].id_conversation,
                contactName: contact.name,
              })}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>Conversar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleDelete}>
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={[styles.actionText, styles.dangerText]}>Excluir</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.actionText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {contact.tags && contact.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {contact.tags.map((tag) => (
              <View key={tag.id_tag} style={[styles.tag, { backgroundColor: tag.color + '30' }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <TextInput
            style={styles.notesInput}
            value={editData.notes}
            onChangeText={(v) => setEditData(d => ({ ...d, notes: v }))}
            placeholder="Adicionar notas..."
            multiline
            numberOfLines={4}
          />
        </View>
      )}

      {!isEditing && contact.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.notes}>{contact.notes}</Text>
        </View>
      )}

      {conversations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversas ({conversations.length})</Text>
          {conversations.map((conv) => (
            <TouchableOpacity
              key={conv.id_conversation}
              style={styles.conversationItem}
              onPress={() => navigation.navigate('Chat', {
                conversationId: conv.id_conversation,
                contactName: contact.name,
              })}
            >
              <Text style={styles.convChannel}>{conv.channel_type || 'whatsapp'}</Text>
              <Text style={styles.convStatus}>{conv.status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#075E54',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '600' },
  name: { fontSize: 22, fontWeight: '600', color: '#fff' },
  phone: { fontSize: 16, color: '#DCF8C6', marginTop: 4 },
  email: { fontSize: 14, color: '#DCF8C6', marginTop: 2 },
  editHeader: { width: '100%', paddingHorizontal: 16 },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionText: { fontSize: 12, color: '#666' },
  dangerButton: {},
  dangerText: { color: '#e74c3c' },
  saveButton: { backgroundColor: '#25D366', borderRadius: 8, paddingHorizontal: 24 },
  saveText: { color: '#fff', fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  tagText: { fontSize: 13, fontWeight: '500' },
  notes: { fontSize: 14, color: '#666', lineHeight: 20 },
  notesInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  conversationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  convChannel: { fontSize: 14, color: '#333', textTransform: 'capitalize' },
  convStatus: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
});
