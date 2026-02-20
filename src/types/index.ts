export interface User {
  id_user: string;
  email: string;
  full_name: string;
  id_tenant: string;
  permissions?: string[];
}

export interface Message {
  id_message: string;
  conversation_id: string;
  text_body: string;
  from_me: boolean;
  sender_type: 'contact' | 'user' | 'agent' | 'system';
  sender_display_name?: string;
  message_type: 'text' | 'audio' | 'image' | 'document' | 'video';
  media_url?: string;
  created_at: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Conversation {
  id_conversation: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_profile_picture_url?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  channel_type: string;
}

export interface Contact {
  id_contact: string;
  name: string;
  phone_number: string;
  profile_picture_url?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
