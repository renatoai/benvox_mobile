import api from './api';
import type { Contact } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const contactsService = {
  async getAll(params?: { search?: string; limit?: number; offset?: number }): Promise<Contact[]> {
    const response = await api.get<PaginatedResponse<Contact>>('/contacts', { params });
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  async getById(id: string): Promise<Contact> {
    const response = await api.get<Contact>(`/contacts/${id}`);
    return response.data;
  },

  async create(data: Partial<Contact>): Promise<Contact> {
    const response = await api.post<Contact>('/contacts', data);
    return response.data;
  },

  async update(id: string, data: Partial<Contact>): Promise<Contact> {
    const response = await api.patch<Contact>(`/contacts/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  },

  async fetchAvatar(id: string): Promise<void> {
    await api.post(`/contacts/${id}/fetch-avatar`);
  },

  async block(id: string): Promise<void> {
    await api.post(`/contacts/${id}/block`);
  },

  async unblock(id: string): Promise<void> {
    await api.post(`/contacts/${id}/unblock`);
  },
};
