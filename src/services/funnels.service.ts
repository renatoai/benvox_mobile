import api from './api';
import type { Funnel, FunnelStage } from '../types';

interface PipelinesResponse {
  pipelines: Funnel[];
  total: number;
}

export const funnelsService = {
  // Pipelines (funnels)
  async getAll(): Promise<Funnel[]> {
    const response = await api.get<PipelinesResponse>('/pipelines');
    // Handle both { pipelines: [...] } and [...] formats
    if (Array.isArray(response.data)) return response.data;
    return response.data.pipelines || [];
  },

  async getById(id: string): Promise<Funnel> {
    const response = await api.get<Funnel>(`/pipelines/${id}`);
    return response.data;
  },

  async getWithStages(id: string): Promise<Funnel> {
    const response = await api.get<Funnel>(`/pipelines/${id}/with-stages`);
    return response.data;
  },

  async create(data: Partial<Funnel>): Promise<Funnel> {
    const response = await api.post<Funnel>('/pipelines', data);
    return response.data;
  },

  async update(id: string, data: Partial<Funnel>): Promise<Funnel> {
    const response = await api.patch<Funnel>(`/pipelines/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/pipelines/${id}`);
  },

  // Stages
  async getStages(pipelineId: string): Promise<FunnelStage[]> {
    const response = await api.get<FunnelStage[] | { stages: FunnelStage[] }>(`/pipelines/${pipelineId}/stages`);
    if (Array.isArray(response.data)) return response.data;
    return (response.data as any).stages || [];
  },

  async createStage(pipelineId: string, data: Partial<FunnelStage>): Promise<FunnelStage> {
    const response = await api.post<FunnelStage>(`/pipelines/${pipelineId}/stages`, data);
    return response.data;
  },

  async updateStage(stageId: string, data: Partial<FunnelStage>): Promise<FunnelStage> {
    const response = await api.patch<FunnelStage>(`/pipelines/stages/${stageId}`, data);
    return response.data;
  },

  async deleteStage(stageId: string): Promise<void> {
    await api.delete(`/pipelines/stages/${stageId}`);
  },

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
    await api.post(`/pipelines/${pipelineId}/stages/reorder`, { stageIds });
  },

  // Pipeline contacts
  async getContacts(pipelineId: string): Promise<any[]> {
    const response = await api.get(`/pipelines/${pipelineId}/contacts`);
    return Array.isArray(response.data) ? response.data : response.data.contacts || [];
  },

  async moveConversationStage(conversationId: string, stageId: string): Promise<void> {
    await api.post(`/pipelines/conversations/${conversationId}/move-stage`, { stageId });
  },

  // Stats
  async getStats(pipelineId: string): Promise<any> {
    const response = await api.get(`/pipelines/${pipelineId}/stats`);
    return response.data;
  },

  async getStageContactsCount(stageId: string): Promise<number> {
    const response = await api.get(`/pipelines/stages/${stageId}/contacts-count`);
    return response.data.count || 0;
  },
};
