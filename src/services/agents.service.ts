import api from './api';
import type { AiAgent } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const agentsService = {
  async getAll(): Promise<AiAgent[]> {
    const response = await api.get<PaginatedResponse<AiAgent>>('/ai-agents');
    return Array.isArray(response.data) ? response.data : response.data.data || [];
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

  async duplicate(id: string): Promise<AiAgent> {
    const response = await api.post<AiAgent>(`/ai-agents/${id}/duplicate`);
    return response.data;
  },

  async getTools(id: string): Promise<any[]> {
    const response = await api.get(`/ai-agents/${id}/tools`);
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  async getLearnings(id: string): Promise<any[]> {
    const response = await api.get(`/ai-agents/${id}/learnings`);
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  async testAgent(id: string, message: string): Promise<{ response: string }> {
    const response = await api.post(`/ai-agents/${id}/test`, { message });
    return response.data;
  },

  async chat(id: string, message: string, conversationId?: string): Promise<any> {
    const response = await api.post(`/ai-agents/${id}/chat`, { message, conversationId });
    return response.data;
  },
};
