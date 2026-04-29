
export enum Screen {
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  INTEGRATIONS = 'INTEGRATIONS',
  CHAT = 'CHAT'
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  language?: string;
  website?: string;
  industry?: string;
  business_summary?: string;
  ideal_customer?: string;
  unique_value?: string;
  main_product_interest?: string;
  additional_context?: string;
  onboarding_completed: boolean;
  image_upload_preference?: 'auto' | 'manual';
  use_automated_references?: boolean;
  use_manual_references?: boolean;
  created_at?: string;
  phone?: string;
  role?: 'admin' | 'user'; // This is remapped from 'rol' in DB if needed, or renamed to 'rol'
  rol?: 'admin' | 'user';
  admin_permissions?: string[];
}

export interface UserChannel {
  id: string;
  user_id: string;
  channel_name: string;
}

export interface Objective {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sort_order: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  avatar_url?: string;
  color?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  industry?: string;
  website?: string;
  business_summary?: string;
  ideal_customer?: string;
  unique_value?: string;
  social_links?: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface ProjectFolder {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  project_id?: string;
  objective_id: string;
  title: string;
  is_archived: boolean;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
  linked_chat_id?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  agent_id?: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
}

export interface MemoryResource {
  id: string;
  user_id: string;
  project_id?: string;
  chat_id?: string;
  title: string;
  content: string;
  summary?: string;
  resource_type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'link' | 'markdown' | 'analisis_imagenes' | 'brand_asset' | 'chart';
  memory_category?: string;
  tags?: string[];
  is_pinned: boolean;
  user_confirmed: boolean;
  embedding?: number[];
  created_at: string;
}

export interface Report {
  id: string;
  chat_id: string;
  title: string;
  content: string;
  created_at: string;
}

export enum OnboardingStep {
  WELCOME = 0,
  COMPANY = 1,
  TEAM_INTRO = 2,
  AGENT_ANKOR = 3,
  AGENT_INDEXA = 4,
  AGENT_SIRA = 5,
  AGENT_NEXO = 6,
  AGENT_KRONOS = 7,
  TEAM_OUTRO = 8,
  DETAILS = 9,
  FINISH = 10
}
