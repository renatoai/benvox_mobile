import api from './api';
import type { AiAgent } from '../types';

export const agentsService = {
  async getAll(): Promise<AiAgent[]> {
    const response = await api.get<AiAgent[]>('/ai-agents');
    return response.data;
  },

  async getById(id: string): Promise<AiAgent> {
    const response = await api.get<AiAgent>(`/ai-agents/${id}`);
    return response.data;
  },

  async create(data: Partial<AiAgent>): Promise<AiAgent> {
    const response = await api.post<AiAgent>('/ai-agents', data);
    return response.data;
  },

  async update(id: string, data: Partial<AiAgent>): Promise<AiAgent> {
    const response = await api.patch<AiAgent>(`/ai-agents/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/ai-agents/${id}`);
  },

  async getTools(): Promise<{ name: string; description: string }[]> {
    const response = await api.get('/ai-agents/tools');
    return response.data;
  },

  async getModels(): Promise<{ id: string; name: string; provider: string }[]> {
    const response = await api.get('/ai-models');
    return response.data;
  },

  async testAgent(id: string, message: string): Promise<{ response: string }> {
    const response = await api.post(`/ai-agents/${id}/test`, { message });
    return response.data;
  },
};
