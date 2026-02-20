import api from './api';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { access_token, user } = response.data;
    
    await SecureStore.setItemAsync('token', access_token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    
    return response.data;
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  },

  async getStoredUser(): Promise<User | null> {
    const userStr = await SecureStore.getItemAsync('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('token');
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
