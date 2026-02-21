import api from './api';
import type { KnowledgeBase, KnowledgeDocument } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  total?: number;
}

export const knowledgeService = {
  // Knowledge Bases
  async getAll(): Promise<KnowledgeBase[]> {
    const response = await api.get<PaginatedResponse<KnowledgeBase> | KnowledgeBase[]>('/knowledge/bases');
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
  },

  async getById(id: string): Promise<KnowledgeBase> {
    const response = await api.get<KnowledgeBase>(`/knowledge/bases/${id}`);
    return response.data;
  },

  async create(data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const response = await api.post<KnowledgeBase>('/knowledge/bases', data);
    return response.data;
  },

  async update(id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const response = await api.patch<KnowledgeBase>(`/knowledge/bases/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/knowledge/bases/${id}`);
  },

  // Documents
  async getDocuments(baseId: string): Promise<KnowledgeDocument[]> {
    const response = await api.get<PaginatedResponse<KnowledgeDocument> | KnowledgeDocument[]>(`/knowledge/bases/${baseId}/documents`);
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
  },

  async uploadDocument(baseId: string, formData: FormData): Promise<KnowledgeDocument> {
    const response = await api.post<KnowledgeDocument>(`/knowledge/bases/${baseId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteDocument(docId: string): Promise<void> {
    await api.delete(`/knowledge/documents/${docId}`);
  },

  async reprocessDocument(docId: string): Promise<void> {
    await api.post(`/knowledge/documents/${docId}/reprocess`);
  },

  async search(query: string, kbIds?: string[]): Promise<{ content: string; score: number }[]> {
    const response = await api.post('/knowledge/search', { query, kbIds });
    return response.data;
  },

  // Agent knowledge bases
  async getAgentBases(agentId: string): Promise<KnowledgeBase[]> {
    const response = await api.get<PaginatedResponse<KnowledgeBase> | KnowledgeBase[]>(`/knowledge/agents/${agentId}/knowledge-bases`);
    return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
  },
};
