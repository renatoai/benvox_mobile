import api from './api';
import { storage } from '../utils/storage';
import type { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { access_token, user } = response.data;
    
    await storage.setItem('token', access_token);
    await storage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  async logout(): Promise<void> {
    await storage.removeItem('token');
    await storage.removeItem('user');
  },

  async getStoredUser(): Promise<User | null> {
    const userStr = await storage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async getToken(): Promise<string | null> {
    return await storage.getItem('token');
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
