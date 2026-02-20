import api from './api';
import type { Conversation, Message } from '../types';

export const conversationsService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<Conversation[]>('/conversations');
    return response.data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const response = await api.get<Conversation>(`/conversations/${id}`);
    return response.data;
  },

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await api.get<Message[]>(`/messages/conversation/${conversationId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const response = await api.post<Message>(`/messages/send`, {
      conversation_id: conversationId,
      text_body: text,
      message_type: 'text',
    });
    return response.data;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/read`);
  },
};
