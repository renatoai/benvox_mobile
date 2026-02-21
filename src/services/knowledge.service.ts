import api from './api';
import type { KnowledgeBase, KnowledgeDocument } from '../types';

export const knowledgeService = {
  // Knowledge Bases
  async getAll(): Promise<KnowledgeBase[]> {
    const response = await api.get<KnowledgeBase[]>('/knowledge-bases');
    return response.data;
  },

  async getById(id: string): Promise<KnowledgeBase> {
    const response = await api.get<KnowledgeBase>(`/knowledge-bases/${id}`);
    return response.data;
  },

  async create(data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const response = await api.post<KnowledgeBase>('/knowledge-bases', data);
    return response.data;
  },

  async update(id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const response = await api.patch<KnowledgeBase>(`/knowledge-bases/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/knowledge-bases/${id}`);
  },

  // Documents
  async getDocuments(baseId: string): Promise<KnowledgeDocument[]> {
    const response = await api.get<KnowledgeDocument[]>(`/knowledge-bases/${baseId}/documents`);
    return response.data;
  },

  async addDocument(baseId: string, data: { title: string; content?: string; file?: File }): Promise<KnowledgeDocument> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.content) formData.append('content', data.content);
    if (data.file) formData.append('file', data.file);
    
    const response = await api.post<KnowledgeDocument>(`/knowledge-bases/${baseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteDocument(baseId: string, docId: string): Promise<void> {
    await api.delete(`/knowledge-bases/${baseId}/documents/${docId}`);
  },

  async search(baseId: string, query: string): Promise<{ content: string; score: number }[]> {
    const response = await api.post(`/knowledge-bases/${baseId}/search`, { query });
    return response.data;
  },
};
