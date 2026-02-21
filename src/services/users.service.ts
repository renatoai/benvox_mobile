import api from './api';
import type { AppUser } from '../types';

export const usersService = {
  async getAll(): Promise<AppUser[]> {
    const response = await api.get<AppUser[]>('/users');
    return response.data;
  },

  async getById(id: string): Promise<AppUser> {
    const response = await api.get<AppUser>(`/users/${id}`);
    return response.data;
  },

  async create(data: Partial<AppUser> & { password: string }): Promise<AppUser> {
    const response = await api.post<AppUser>('/users', data);
    return response.data;
  },

  async update(id: string, data: Partial<AppUser>): Promise<AppUser> {
    const response = await api.patch<AppUser>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async changePassword(id: string, password: string): Promise<void> {
    await api.patch(`/users/${id}/password`, { password });
  },
};
