// Auth Store using Zustand
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { login as loginApi, register as registerApi, logout as logoutApi, getCurrentUser, updateProfile as updateProfileApi, User, UserProfile } from '../services/auth';
import { hasToken, clearTokens } from '../services/api';

export interface AuthState {
  // State
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (phone: string, password: string, remember?: boolean) => Promise<void>;
  register: (phone: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearAuth: () => void;
}

// Create auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,

      // Login action
      login: async (phone: string, password: string, remember: boolean = false) => {
        set({ isLoading: true });
        try {
          const { user } = await loginApi({ phone, password, remember });
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Register action
      register: async (phone: string, password: string, email?: string) => {
        set({ isLoading: true });
        try {
          const { user } = await registerApi({ phone, password, email });
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true });
        try {
          await logoutApi();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
        }
      },

      // Check authentication status
      checkAuth: async (): Promise<boolean> => {
        if (!hasToken()) {
          get().clearAuth();
          return false;
        }

        set({ isLoading: true });
        try {
          const { user, profile } = await getCurrentUser();
          set({
            user,
            profile,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          get().clearAuth();
          set({ isLoading: false });
          return false;
        }
      },

      // Update profile action
      updateProfile: async (data: Partial<UserProfile>) => {
        set({ isLoading: true });
        try {
          const profile = await updateProfileApi(data);
          set({ profile, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Clear auth state
      clearAuth: () => {
        clearTokens();
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential state, not loading states
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectUserProfile = (state: AuthState) => state.profile;
