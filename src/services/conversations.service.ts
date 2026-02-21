import api from './api';
import type { Conversation, Message } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    cursor?: string;
  };
}

export const conversationsService = {
  async getAll(params?: { limit?: number; cursor?: string }): Promise<Conversation[]> {
    const response = await api.get<PaginatedResponse<Conversation>>('/conversations', { params });
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  async getById(id: string): Promise<Conversation> {
    const response = await api.get<Conversation>(`/conversations/${id}`);
    return response.data;
  },

  async getByContact(contactId: string): Promise<Conversation[]> {
    const response = await api.get<PaginatedResponse<Conversation>>(`/conversations/contact/${contactId}`);
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await api.get<PaginatedResponse<Message> | Message[]>(`/messages/conversation/${conversationId}`, {
      params: { limit, offset },
    });
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
  },

  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const response = await api.post<Message>('/messages/send/text', {
      conversation_id: conversationId,
      text,
    });
    return response.data;
  },

  async sendMedia(conversationId: string, mediaUrl: string, mediaType: string, caption?: string): Promise<Message> {
    const response = await api.post<Message>('/messages/send/media', {
      conversation_id: conversationId,
      media_url: mediaUrl,
      media_type: mediaType,
      caption,
    });
    return response.data;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await api.post(`/messages/conversation/${conversationId}/read`).catch(() => {});
  },

  async archive(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/archive`);
  },

  async close(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/close`);
  },

  async reopen(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/reopen`);
  },

  async assignToMe(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/assign-to-me`);
  },

  async assign(conversationId: string, userId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/assign`, { user_id: userId });
  },

  async unassign(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/unassign`);
  },

  async transfer(conversationId: string, data: { agent_id?: string; transfer_to_human?: boolean }): Promise<void> {
    await api.post(`/conversations/${conversationId}/transfer`, data);
  },

  async getStats(): Promise<any> {
    const response = await api.get('/conversations/stats/by-channel');
    return response.data;
  },
};
