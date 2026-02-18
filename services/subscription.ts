// Subscription Service
import { api, ApiResponse } from './api';

// Types matching backend response
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
  plan_name: string;
  features: string | null;
  monthly_quota?: number;
  daily_quota?: number;
}

export interface UsageStats {
  total: number;
  today: number;
}

export interface SubscriptionResponse {
  hasSubscription: boolean;
  subscription?: Subscription;
}

export interface PlansResponse {
  plans: SubscriptionPlan[];
}

export interface UsageResponse {
  usage: UsageStats;
}

// Get current subscription
export const getSubscription = async (): Promise<SubscriptionResponse> => {
  const response = await api.get<ApiResponse<SubscriptionResponse>>('/subscription');
  const { data } = response;

  if (data.success && data.data) {
    return data.data;
  }

  throw new Error(data.message || '获取订阅信息失败');
};

// Get available plans
export const listPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get<ApiResponse<PlansResponse>>('/subscription/plans');
  const { data } = response;

  if (data.success && data.data) {
    return data.data.plans;
  }

  throw new Error(data.message || '获取套餐列表失败');
};

// Get usage statistics
export const getUsage = async (): Promise<UsageStats> => {
  const response = await api.get<ApiResponse<UsageResponse>>('/subscription/usage');
  const { data } = response;

  if (data.success && data.data) {
    return data.data.usage;
  }

  throw new Error(data.message || '获取使用统计失败');
};

// Change subscription plan
export const changePlan = async (planId: number): Promise<Subscription> => {
  const response = await api.post<ApiResponse<{ subscription: Subscription }>>('/subscription/change', { planId });
  const { data } = response;

  if (data.success && data.data) {
    return data.data.subscription;
  }

  throw new Error(data.message || '更换套餐失败');
};
