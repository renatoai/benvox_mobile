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
    // Messages endpoint returns { data: [...], total, ... }
    if (Array.isArray(response.data)) return response.data;
    if ((response.data as any).data) return (response.data as any).data;
    // If it's an object with messages
    return [];
  },

  async sendMessage(conversationId: string, text: string, toPhone?: string, channelId?: string): Promise<Message> {
    // First, get conversation details to get phone and channel
    let phone = toPhone;
    let channel = channelId;
    
    if (!phone || !channel) {
      try {
        const conv = await this.getById(conversationId);
        phone = phone || conv.contact_phone;
        channel = channel || conv.id_channel;
      } catch (e) {
        console.error('Error getting conversation details:', e);
      }
    }
    
    if (!phone) {
      throw new Error('Phone number is required to send message');
    }

    const response = await api.post<Message>('/messages/send/text', {
      text,
      to_identifier: phone,
      id_channel: channel,
      id_conversation: conversationId,
    });
    return response.data;
  },

  async sendMedia(conversationId: string, mediaUrl: string, mediaType: string, toPhone: string, channelId: string, caption?: string): Promise<Message> {
    const response = await api.post<Message>('/messages/send/media', {
      media_url: mediaUrl,
      media_type: mediaType,
      to_identifier: toPhone,
      id_channel: channelId,
      id_conversation: conversationId,
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
