// Auth & User
export interface User {
  id_user?: string;
  id_app_user?: string;
  email: string;
  full_name: string;
  id_tenant: string;
  avatar_url?: string;
  permissions?: string[];
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

// Messages & Conversations
export interface Message {
  id_message: string;
  conversation_id: string;
  text_body: string;
  from_me: boolean;
  sender_type: 'contact' | 'user' | 'agent' | 'system';
  sender_display_name?: string;
  message_type: 'text' | 'audio' | 'image' | 'document' | 'video' | 'interactive' | 'button';
  media_url?: string;
  caption?: string;
  created_at: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Conversation {
  id_conversation: string;
  id_contact: string;
  id_channel: string;
  id_tenant: string;
  status: 'open' | 'closed' | 'pending';
  priority?: string;
  
  // Contact info (joined)
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_avatar_url?: string;
  
  // Channel info (joined)
  channel_name?: string;
  channel_type?: string;
  channel_avatar_url?: string;
  
  // Assignment
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_agent_id?: string;
  assigned_to_agent_name?: string;
  assignment_type?: string;
  
  // Pipeline/Stage
  id_pipeline?: string;
  id_stage?: string;
  
  // Timestamps
  last_message_at?: string;
  created_at: string;
  updated_at?: string;
  closed_at?: string;
  
  // Legacy fields for compatibility
  contact_id?: string;
  contact_profile_picture_url?: string;
  last_message?: string;
  unread_count?: number;
  stage_id?: string;
  stage_name?: string;
  funnel_id?: string;
  funnel_name?: string;
}

// Contacts
export interface Contact {
  id_contact: string;
  name: string;
  phone_number: string;
  email?: string;
  profile_picture_url?: string;
  notes?: string;
  tags?: Tag[];
  created_at: string;
  updated_at?: string;
}

// Channels
export interface Channel {
  id_channel: string;
  name: string;
  type: 'whatsapp' | 'telegram' | 'instagram' | 'messenger';
  phone_number?: string;
  status: 'connected' | 'disconnected' | 'pending';
  is_default: boolean;
  created_at: string;
}

// Funnels/Pipelines & Stages
export interface Funnel {
  id_funnel?: string;
  id_pipeline?: string;
  id_tenant?: string;
  name: string;
  description?: string;
  version?: number;
  is_published?: boolean;
  is_active?: boolean;
  is_default?: boolean;
  stage_count?: number | string;
  stages?: FunnelStage[];
  created_at: string;
  updated_at?: string;
  published_at?: string;
}

export interface FunnelStage {
  id_funnel_stage?: string;
  id_stage?: string;
  funnel_id?: string;
  pipeline_id?: string;
  name: string;
  color?: string;
  position: number;
  contacts_count?: number;
  workflows?: Workflow[];
}

// Workflows & Automations
export interface Workflow {
  id_workflow: string;
  name: string;
  stage_id?: string;
  is_primary: boolean;
  is_active: boolean;
  trigger_type?: string;
  nodes?: WorkflowNode[];
  created_at: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position: { x: number; y: number };
}

// AI Agents
export interface AiAgent {
  id_ai_agent: string;
  name: string;
  instructions?: string;
  model?: string;
  temperature?: number;
  greeting_enabled?: boolean;
  greeting_message?: string;
  is_active: boolean;
  allowed_actions?: string[];
  created_at: string;
}

// Tags
export interface Tag {
  id_tag: string;
  name: string;
  color: string;
  description?: string;
}

// Tasks
export interface Task {
  id_task: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  contact_id?: string;
  contact_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
}

// Knowledge Base
export interface KnowledgeBase {
  id_knowledge_base: string;
  name: string;
  description?: string;
  documents_count?: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id_knowledge_document: string;
  knowledge_base_id: string;
  title: string;
  content?: string;
  file_url?: string;
  file_type?: string;
  chunks_count?: number;
  created_at: string;
}

// Settings
export interface TenantSettings {
  show_sender_name_attendant?: string;
  show_sender_name_agent?: string;
  show_sender_name_robot?: string;
  default_attendant_title?: string;
  default_agent_title?: string;
  default_system_user_name?: string;
  assistant_instructions?: string;
  tts_provider?: string;
  tts_openai_voice?: string;
}

// App Users (team members)
export interface AppUser {
  id_app_user: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'attendant';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}
