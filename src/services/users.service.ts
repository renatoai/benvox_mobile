import api from './api';
import type { AppUser } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const usersService = {
  async getAll(): Promise<AppUser[]> {
    const response = await api.get<PaginatedResponse<AppUser> | AppUser[]>('/users');
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
  },

  async getById(id: string): Promise<AppUser> {
    const response = await api.get<AppUser>(`/users/${id}`);
    return response.data;
  },

  async getByRole(role: string): Promise<AppUser[]> {
    const response = await api.get<PaginatedResponse<AppUser> | AppUser[]>(`/users/by-role/${role}`);
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
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

  async getAvailableRoles(): Promise<{ role: string; count: number }[]> {
    const response = await api.get<{ role: string; count: number }[]>('/users/roles/available');
    return response.data;
  },

  async getUserRoles(userId: string): Promise<string[]> {
    const response = await api.get(`/users/${userId}/roles`);
    return response.data;
  },

  async addRole(userId: string, roleId: string): Promise<void> {
    await api.post(`/users/${userId}/roles/add`, { roleId });
  },

  async removeRole(userId: string, roleId: string): Promise<void> {
    await api.post(`/users/${userId}/roles/remove`, { roleId });
  },
};
