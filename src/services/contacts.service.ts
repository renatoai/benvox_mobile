import api from './api';
import type { Contact } from '../types';

export const contactsService = {
  async getAll(params?: { search?: string; limit?: number; offset?: number }): Promise<Contact[]> {
    const response = await api.get<Contact[]>('/contacts', { params });
    return response.data;
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

  async addTag(contactId: string, tagId: string): Promise<void> {
    await api.post(`/contacts/${contactId}/tags/${tagId}`);
  },

  async removeTag(contactId: string, tagId: string): Promise<void> {
    await api.delete(`/contacts/${contactId}/tags/${tagId}`);
  },
};
