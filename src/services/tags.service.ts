import api from './api';
import type { Tag } from '../types';

export const tagsService = {
  async getAll(): Promise<Tag[]> {
    const response = await api.get<Tag[]>('/tags');
    return response.data;
  },

  async getById(id: string): Promise<Tag> {
    const response = await api.get<Tag>(`/tags/${id}`);
    return response.data;
  },

  async create(data: Partial<Tag>): Promise<Tag> {
    const response = await api.post<Tag>('/tags', data);
    return response.data;
  },

  async update(id: string, data: Partial<Tag>): Promise<Tag> {
    const response = await api.patch<Tag>(`/tags/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tags/${id}`);
  },
};
