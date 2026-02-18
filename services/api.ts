// API Client with JWT Authentication
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '../utils/env';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// Token storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Get stored tokens
export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// Store tokens
export const storeTokens = (token: string, refreshToken?: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

// Clear tokens
export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Check if token exists
export const hasToken = (): boolean => {
  return !!getStoredToken();
};

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: env.api.baseUrl,
    timeout: env.api.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getStoredToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response) => {
      console.log('[API] Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
      return response;
    },
    async (error: AxiosError<ApiResponse>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = getStoredRefreshToken();
        if (refreshToken) {
          try {
            console.log('[API] Attempting to refresh token...');
            const refreshResponse = await axios.post(
              `${env.api.baseUrl}/auth/refresh`,
              { refreshToken }
            );

            if (refreshResponse.data.success) {
              const { token } = refreshResponse.data.data;
              storeTokens(token);
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return client(originalRequest);
            }
          } catch (refreshError) {
            console.error('[API] Token refresh failed:', refreshError);
            clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token, redirect to login
          console.log('[API] No refresh token available, redirecting to login...');
          clearTokens();
          window.location.href = '/login';
        }
      }

      // Handle other errors
      const errorMessage = error.response?.data?.message || error.message || '请求失败';
      console.error('[API] Error:', errorMessage);

      return Promise.reject(new Error(errorMessage));
    }
  );

  return client;
};

// Export API client instance
export const api = createApiClient();
