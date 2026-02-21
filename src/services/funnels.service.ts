import api from './api';
import type { Funnel, FunnelStage, Workflow } from '../types';

export const funnelsService = {
  // Funnels
  async getAll(): Promise<Funnel[]> {
    const response = await api.get<Funnel[]>('/funnels');
    return response.data;
  },

  async getById(id: string): Promise<Funnel> {
    const response = await api.get<Funnel>(`/funnels/${id}`);
    return response.data;
  },

  async create(data: Partial<Funnel>): Promise<Funnel> {
    const response = await api.post<Funnel>('/funnels', data);
    return response.data;
  },

  async update(id: string, data: Partial<Funnel>): Promise<Funnel> {
    const response = await api.patch<Funnel>(`/funnels/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/funnels/${id}`);
  },

  // Stages
  async getStages(funnelId: string): Promise<FunnelStage[]> {
    const response = await api.get<FunnelStage[]>(`/funnels/${funnelId}/stages`);
    return response.data;
  },

  async createStage(funnelId: string, data: Partial<FunnelStage>): Promise<FunnelStage> {
    const response = await api.post<FunnelStage>(`/funnels/${funnelId}/stages`, data);
    return response.data;
  },

  async updateStage(funnelId: string, stageId: string, data: Partial<FunnelStage>): Promise<FunnelStage> {
    const response = await api.patch<FunnelStage>(`/funnels/${funnelId}/stages/${stageId}`, data);
    return response.data;
  },

  async deleteStage(funnelId: string, stageId: string): Promise<void> {
    await api.delete(`/funnels/${funnelId}/stages/${stageId}`);
  },

  async reorderStages(funnelId: string, stageIds: string[]): Promise<void> {
    await api.post(`/funnels/${funnelId}/stages/reorder`, { stageIds });
  },

  // Stage contacts
  async getStageContacts(stageId: string): Promise<any[]> {
    const response = await api.get(`/funnel-stages/${stageId}/contacts`);
    return response.data;
  },

  async moveContact(contactId: string, fromStageId: string, toStageId: string): Promise<void> {
    await api.post(`/funnel-contacts/move`, { contactId, fromStageId, toStageId });
  },

  // Workflows
  async getWorkflows(stageId: string): Promise<Workflow[]> {
    const response = await api.get<Workflow[]>(`/workflows`, { params: { stageId } });
    return response.data;
  },
};
