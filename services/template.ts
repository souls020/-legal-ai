// Template Service - API functions for template management
import { api, ApiResponse } from './api';

// Backend template type from API
export interface BackendTemplate {
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
  category_name?: string;
  type_name?: string;
}

// Frontend template type for UI
export interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  usageCount: number;
  rating: number;
  isFavorite: boolean;
  preview?: string;
}

// List templates response
interface ListTemplatesResponse {
  templates: BackendTemplate[];
}

// Category mapping from Chinese to English
const categoryMap: Record<string, string> = {
  '民事': 'civil',
  '刑事': 'criminal',
  '行政': 'administrative',
  '劳动': 'labor',
  '商事': 'commercial',
  '知识产权': 'intellectual',
};

// Convert backend template to frontend template
const convertToFrontendTemplate = (backend: BackendTemplate, isFavorite: boolean = false): Template => {
  return {
    id: backend.id,
    name: backend.name,
    description: backend.content.substring(0, 200) + (backend.content.length > 200 ? '...' : ''),
    category: categoryMap[backend.category_name || ''] || 'civil',
    usageCount: backend.usage_count,
    rating: backend.rating,
    isFavorite,
    preview: backend.content.substring(0, 500),
  };
};

// Get favorite template IDs from localStorage
const getFavoriteIds = (): number[] => {
  try {
    const stored = localStorage.getItem('favorite_templates');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save favorite template IDs to localStorage
const saveFavoriteIds = (ids: number[]): void => {
  localStorage.setItem('favorite_templates', JSON.stringify(ids));
};

// List templates with optional category filter
export const listTemplates = async (category?: string): Promise<Template[]> => {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') {
      // Convert English category back to Chinese for API
      const reverseCategoryMap: Record<string, string> = {
        civil: '民事',
        criminal: '刑事',
        administrative: '行政',
        labor: '劳动',
        commercial: '商事',
        intellectual: '知识产权',
      };
      params.append('category', reverseCategoryMap[category] || category);
    }
    params.append('limit', '100');

    const response = await api.get<ApiResponse<ListTemplatesResponse>>(
      `/api/templates?${params.toString()}`
    );

    if (response.data.success && response.data.data) {
      const favoriteIds = getFavoriteIds();
      return response.data.data.templates.map((t) =>
        convertToFrontendTemplate(t, favoriteIds.includes(t.id))
      );
    }
    return [];
  } catch (error) {
    console.error('Failed to list templates:', error);
    return [];
  }
};

// Get single template by ID
export const getTemplate = async (id: number): Promise<Template | null> => {
  try {
    const response = await api.get<ApiResponse<{ template: BackendTemplate }>>(
      `/api/templates/${id}`
    );

    if (response.data.success && response.data.data) {
      const favoriteIds = getFavoriteIds();
      return convertToFrontendTemplate(
        response.data.data.template,
        favoriteIds.includes(response.data.data.template.id)
      );
    }
    return null;
  } catch (error) {
    console.error('Failed to get template:', error);
    return null;
  }
};

// Toggle template favorite
export const toggleTemplateFavorite = async (id: number): Promise<boolean> => {
  try {
    const favoriteIds = getFavoriteIds();
    const isFavorite = favoriteIds.includes(id);

    let newFavoriteIds: number[];
    if (isFavorite) {
      newFavoriteIds = favoriteIds.filter((fid) => fid !== id);
    } else {
      newFavoriteIds = [...favoriteIds, id];
    }

    saveFavoriteIds(newFavoriteIds);

    // Call backend API (even though it doesn't persist, we call it for consistency)
    await api.post<ApiResponse<{ success: boolean }>>(
      `/api/templates/${id}/favorite`
    );

    return !isFavorite;
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return false;
  }
};
