import api from './api';
import type { Task } from '../types';

export const tasksService = {
  async getAll(params?: { 
    status?: string; 
    priority?: string;
    contact_id?: string;
    assigned_to?: string;
  }): Promise<Task[]> {
    const response = await api.get<Task[]>('/tasks', { params });
    return response.data;
  },

  async getById(id: string): Promise<Task> {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  async create(data: Partial<Task>): Promise<Task> {
    const response = await api.post<Task>('/tasks', data);
    return response.data;
  },

  async update(id: string, data: Partial<Task>): Promise<Task> {
    const response = await api.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async complete(id: string): Promise<Task> {
    const response = await api.patch<Task>(`/tasks/${id}`, { status: 'completed' });
    return response.data;
  },
};
