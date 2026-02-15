// User types
export interface User {
  id: number;
  phone: string;
  email: string | null;
  password_hash: string | null;
  wechat_openid: string | null;
  wechat_unionid: string | null;
  status: 'active' | 'inactive' | 'banned';
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  name: string | null;
  avatar: string | null;
  default_role: 'user' | 'lawyer' | 'admin';
  bio: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Document types
export interface DocumentType {
  id: number;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

export interface Template {
  id: number;
  type_id: number | null;
  category_id: number | null;
  name: string;
  content: string;
  variables: string | null;
  usage_count: number;
  rating: number;
  is_official: number;
  is_active: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// Insert types
export interface InsertUser {
  phone: string;
  email?: string;
  password_hash?: string;
  wechat_openid?: string;
  wechat_unionid?: string;
}

export interface InsertUserProfile {
  user_id: number;
  name?: string;
  avatar?: string;
  default_role?: 'user' | 'lawyer' | 'admin';
  bio?: string;
}

export interface InsertSession {
  user_id: number;
  token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface InsertDocumentType {
  name: string;
  category: string;
  description?: string;
  icon?: string;
}

export interface InsertTemplateCategory {
  name: string;
  parent_id?: number;
  sort_order?: number;
}

export interface InsertTemplate {
  type_id?: number;
  category_id?: number;
  name: string;
  content: string;
  variables?: string;
  is_official?: number;
  created_by?: number;
}

// Document types
export interface Document {
  id: number;
  user_id: number;
  type_id: number | null;
  title: string;
  content: string | null;
  status: 'draft' | 'generated' | 'edited' | 'exported' | 'archived';
  version: number;
  ai_model: string | null;
  ai_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentDraft {
  id: number;
  user_id: number;
  document_id: number | null;
  content: string;
  auto_saved: number;
  last_saved_at: string;
  created_at: string;
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  content: string;
  title: string | null;
  changed_by: number | null;
  change_summary: string | null;
  version: number;
  created_at: string;
}

export interface DocumentHistory {
  id: number;
  user_id: number;
  type_id: number | null;
  document_id: number | null;
  title_preview: string | null;
  action: string;
  created_at: string;
}

// Subscription types
export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  monthly_quota: number;
  daily_quota: number;
  features: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_id: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  starts_at: string;
  expires_at: string;
  monthly_generations: number;
  used_generations: number;
  daily_generations: number;
  today_generations: number;
  auto_renew: number;
  payment_method: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: number;
  user_id: number;
  subscription_id: number | null;
  document_id: number | null;
  action_type: 'generate' | 'regenerate' | 'export' | 'template_use';
  quota_used: number;
  ai_model: string | null;
  created_at: string;
}

// Insert types
export interface InsertDocument {
  user_id: number;
  type_id?: number;
  title: string;
  content?: string;
  status?: 'draft' | 'generated' | 'edited' | 'exported' | 'archived';
  ai_model?: string;
  ai_prompt?: string;
}

export interface InsertDocumentDraft {
  user_id: number;
  document_id?: number;
  content: string;
  auto_saved?: number;
}

export interface InsertDocumentVersion {
  document_id: number;
  content: string;
  title?: string;
  changed_by?: number;
  change_summary?: string;
  version: number;
}

export interface InsertDocumentHistory {
  user_id: number;
  type_id?: number;
  document_id?: number;
  title_preview?: string;
  action?: string;
}

export interface InsertSubscriptionPlan {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  monthly_quota?: number;
  daily_quota?: number;
  features?: string;
  is_active?: number;
  sort_order?: number;
}

export interface InsertSubscription {
  user_id: number;
  plan_id: number;
  status?: 'active' | 'paused' | 'cancelled' | 'expired';
  starts_at: string;
  expires_at: string;
  monthly_generations?: number;
  daily_generations?: number;
  auto_renew?: number;
  payment_method?: string;
  payment_id?: string;
}

export interface InsertUsageRecord {
  user_id: number;
  subscription_id?: number;
  document_id?: number;
  action_type: 'generate' | 'regenerate' | 'export' | 'template_use';
  quota_used?: number;
  ai_model?: string;
}

// Regulation types
export interface RegulationCategory {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

export interface Regulation {
  id: number;
  title: string;
  category_id: number | null;
  category: string | null;
  content: string;
  chapter: string | null;
  article: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  jurisdiction: string;
  status: 'effective' | 'repealed' | 'amended' | 'expired';
  source_name: string | null;
  source_url: string | null;
  version: number;
  last_updated: string;
  created_at: string;
}

export interface RegulationVersion {
  id: number;
  regulation_id: number;
  version_number: number;
  content_snapshot: string;
  change_type: 'amendment' | 'repeal' | 'new_version' | null;
  change_description: string | null;
  effective_from: string | null;
  changed_at: string;
}

// Insert types
export interface InsertRegulationCategory {
  name: string;
  parent_id?: number;
  sort_order?: number;
}

export interface InsertRegulation {
  title: string;
  category_id?: number;
  category?: string;
  content: string;
  chapter?: string;
  article?: string;
  effective_date?: string;
  expiry_date?: string;
  jurisdiction?: string;
  status?: 'effective' | 'repealed' | 'amended' | 'expired';
  source_name?: string;
  source_url?: string;
}

export interface InsertRegulationVersion {
  regulation_id: number;
  version_number: number;
  content_snapshot: string;
  change_type?: 'amendment' | 'repeal' | 'new_version';
  change_description?: string;
  effective_from?: string;
}
