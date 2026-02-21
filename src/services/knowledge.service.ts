import api from './api';
import type { KnowledgeBase, KnowledgeDocument } from '../types';

export const knowledgeService = {
  // Knowledge Bases
  async getAll(): Promise<KnowledgeBase[]> {
    const response = await api.get<KnowledgeBase[]>('/knowledge/bases');
    return response.data;
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
    const response = await api.get<KnowledgeDocument[]>(`/knowledge/bases/${baseId}/documents`);
    return response.data;
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
    const response = await api.get<KnowledgeBase[]>(`/knowledge/agents/${agentId}/knowledge-bases`);
    return response.data;
  },
};
