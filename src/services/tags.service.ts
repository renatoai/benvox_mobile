import api from './api';
import type { Tag } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const tagsService = {
  async getAll(): Promise<Tag[]> {
    const response = await api.get<PaginatedResponse<Tag> | Tag[]>('/tags');
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
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

  async assignToEntity(tagId: string, entityType: string, entityId: string): Promise<void> {
    await api.post(`/tags/${tagId}/assign/${entityType}/${entityId}`);
  },

  async getEntityTags(entityType: string, entityId: string): Promise<Tag[]> {
    const response = await api.get<Tag[]>(`/tags/entity/${entityType}/${entityId}`);
    return response.data;
  },

  async getStats(): Promise<any> {
    const response = await api.get('/tags/stats');
    return response.data;
  },
};
