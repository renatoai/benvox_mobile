import api from './api';
import type { Channel } from '../types';

export const channelsService = {
  async getAll(): Promise<Channel[]> {
    const response = await api.get<Channel[]>('/channels');
    return response.data;
  },

  async getById(id: string): Promise<Channel> {
    const response = await api.get<Channel>(`/channels/${id}`);
    return response.data;
  },

  async create(data: Partial<Channel>): Promise<Channel> {
    const response = await api.post<Channel>('/channels', data);
    return response.data;
  },

  async update(id: string, data: Partial<Channel>): Promise<Channel> {
    const response = await api.patch<Channel>(`/channels/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/channels/${id}`);
  },

  async getStatus(id: string): Promise<{ status: string; qrCode?: string }> {
    const response = await api.get(`/channels/${id}/status`);
    return response.data;
  },

  async disconnect(id: string): Promise<void> {
    await api.post(`/channels/${id}/disconnect`);
  },
};
