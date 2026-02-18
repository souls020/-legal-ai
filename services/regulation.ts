// Regulation Service - API functions for regulation management
import { api, ApiResponse } from './api';

// Backend regulation type from API
export interface BackendRegulation {
  id: number;
  title: string;
  category: string;
  article: string;
  effective_date: string;
  jurisdiction: string;
}

// Frontend regulation type for UI
export interface Regulation {
  id: number;
  title: string;
  content: string;
  category: 'civil' | 'criminal' | 'administrative' | 'labor' | 'commercial' | 'constitutional';
  chapter?: string;
  effectiveDate: string;
}

// List regulations response
interface ListRegulationsResponse {
  regulations: BackendRegulation[];
}

// Category mapping from Chinese to English
const categoryMap: Record<string, Regulation['category']> = {
  '民事': 'civil',
  '刑事': 'criminal',
  '行政': 'administrative',
  '劳动': 'labor',
  '商事': 'commercial',
  '宪法': 'constitutional',
};

// Convert backend regulation to frontend regulation
const convertToFrontendRegulation = (backend: BackendRegulation): Regulation => {
  return {
    id: backend.id,
    title: backend.title,
    content: backend.article || '',
    category: categoryMap[backend.category] || 'civil',
    effectiveDate: backend.effective_date || '',
  };
};

// List regulations with search and filters
export const listRegulations = async (
  search?: string,
  category?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ regulations: Regulation[]; total: number }> => {
  try {
    const params = new URLSearchParams();
    if (search) {
      params.append('q', search);
    }
    if (category && category !== 'all') {
      params.append('category', category);
    }
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await api.get<ApiResponse<ListRegulationsResponse>>(
      `/api/regulations?${params.toString()}`
    );

    if (response.data.success && response.data.data) {
      const regulations = response.data.data.regulations.map(convertToFrontendRegulation);
      return {
        regulations,
        total: regulations.length,
      };
    }
    return { regulations: [], total: 0 };
  } catch (error) {
    console.error('Failed to list regulations:', error);
    return { regulations: [], total: 0 };
  }
};
