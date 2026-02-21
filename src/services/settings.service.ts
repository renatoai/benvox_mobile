import api from './api';
import type { TenantSettings } from '../types';

export const settingsService = {
  async get(): Promise<TenantSettings> {
    const response = await api.get<TenantSettings>('/tenant/settings');
    return response.data;
  },

  async update(data: Partial<TenantSettings>): Promise<TenantSettings> {
    const response = await api.patch<TenantSettings>('/tenant/settings', data);
    return response.data;
  },

  async getPromptTemplate(): Promise<{ template: string }> {
    const response = await api.get('/tenant/prompt-template');
    return response.data;
  },

  async updatePromptTemplate(template: string): Promise<void> {
    await api.patch('/tenant/prompt-template', { template });
  },

  async getAudioSettings(): Promise<any> {
    const response = await api.get('/system/settings/audio');
    return response.data;
  },

  async updateAudioSettings(data: any): Promise<void> {
    await api.patch('/system/settings/audio', data);
  },
};
