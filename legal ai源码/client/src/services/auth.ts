// Authentication Service
import { api, ApiResponse, storeTokens, clearTokens } from './api';

// User types
export interface User {
  id: number;
  phone: string;
  email?: string;
  status: 'active' | 'inactive' | 'banned';
  created_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  name?: string;
  avatar?: string;
  default_role: 'user' | 'lawyer' | 'admin';
  bio?: string;
  last_login_at?: string;
}

export interface LoginParams {
  phone: string;
  password: string;
}

export interface RegisterParams {
  phone: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Login
export const login = async (params: LoginParams): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', params);
  const { data } = response;

  if (data.success && data.data) {
    const { token, refreshToken, user } = data.data;
    storeTokens(token, refreshToken);
    return { token, refreshToken, user };
  }

  throw new Error(data.message || '登录失败');
};

// Register
export const register = async (params: RegisterParams): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', params);
  const { data } = response;

  if (data.success && data.data) {
    const { token, refreshToken, user } = data.data;
    storeTokens(token, refreshToken);
    return { token, refreshToken, user };
  }

  throw new Error(data.message || '注册失败');
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('[Auth] Logout error:', error);
  } finally {
    clearTokens();
  }
};

// Get current user
export const getCurrentUser = async (): Promise<{ user: User; profile?: UserProfile }> => {
  const response = await api.get<ApiResponse<{ user: User; profile?: UserProfile }>>('/auth/me');
  const { data } = response;

  if (data.success && data.data) {
    return data.data;
  }

  throw new Error(data.message || '获取用户信息失败');
};

// Update profile
export const updateProfile = async (params: {
  name?: string;
  avatar?: string;
  bio?: string;
}): Promise<UserProfile> => {
  const response = await api.put<ApiResponse<{ profile: UserProfile }>>('/auth/profile', params);
  const { data } = response;

  if (data.success && data.data) {
    return data.data.profile;
  }

  throw new Error(data.message || '更新失败');
};

// Check if logged in
export const isLoggedIn = (): boolean => {
  const token = localStorage.getItem('auth_token');
  if (!token) return false;

  // Check token expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
};
