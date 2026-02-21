import api from './api';

export const messagesService = {
  // Send media (image, video, audio, document)
  async sendMedia(formData: FormData) {
    const response = await api.post('/messages/send/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Send reaction
  async sendReaction(
    contactId: string,
    channelId: string,
    conversationId: string,
    messageId: string,
    emoji: string
  ) {
    const response = await api.post('/messages/send/reaction', {
      id_contact: contactId,
      id_channel: channelId,
      id_conversation: conversationId,
      message_id: messageId,
      emoji,
    });
    return response.data;
  },

  // Send template
  async sendTemplate(
    contactId: string,
    channelId: string,
    conversationId: string,
    toIdentifier: string,
    templateName: string,
    templateLanguage: string,
    templateComponents?: any[]
  ) {
    const response = await api.post('/messages/send/template', {
      id_contact: contactId,
      id_channel: channelId,
      id_conversation: conversationId,
      to_identifier: toIdentifier,
      template_name: templateName,
      template_language: templateLanguage,
      template_components: templateComponents,
    });
    return response.data;
  },

  // Send interactive (buttons/list)
  async sendInteractive(
    contactId: string,
    channelId: string,
    conversationId: string,
    toIdentifier: string,
    interactiveType: 'button' | 'list',
    body: string,
    buttons?: Array<{ id: string; title: string }>,
    sections?: Array<any>
  ) {
    const response = await api.post('/messages/send/interactive', {
      id_contact: contactId,
      id_channel: channelId,
      id_conversation: conversationId,
      to_identifier: toIdentifier,
      interactive_type: interactiveType,
      body,
      buttons,
      sections,
    });
    return response.data;
  },

  // Send location
  async sendLocation(
    contactId: string,
    channelId: string,
    conversationId: string,
    toIdentifier: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ) {
    const response = await api.post('/messages/send/location', {
      id_contact: contactId,
      id_channel: channelId,
      id_conversation: conversationId,
      to_identifier: toIdentifier,
      latitude,
      longitude,
      name,
      address,
    });
    return response.data;
  },

  // Send contact card
  async sendContact(
    contactId: string,
    channelId: string,
    conversationId: string,
    toIdentifier: string,
    contactCard: {
      name: string;
      phone?: string;
      email?: string;
      organization?: string;
    }
  ) {
    const response = await api.post('/messages/send/contact', {
      id_contact: contactId,
      id_channel: channelId,
      id_conversation: conversationId,
      to_identifier: toIdentifier,
      contact: contactCard,
    });
    return response.data;
  },

  // Search shortcuts
  async searchShortcuts(query: string) {
    try {
      const response = await api.get('/shortcuts/search', {
        params: { q: query },
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error searching shortcuts:', error);
      return [];
    }
  },

  // Use shortcut (resolve variables)
  async useShortcut(shortcutId: string, conversationId?: string) {
    const response = await api.post(`/shortcuts/${shortcutId}/use`, {
      id_conversation: conversationId,
    });
    return response.data;
  },

  // Get templates by channel
  async getTemplates(channelId: string) {
    try {
      const response = await api.get(`/channels/${channelId}/templates`);
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  },
};
