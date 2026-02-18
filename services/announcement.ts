// Announcement Service - API functions for announcement management
import { api, ApiResponse } from './api';

// Backend announcement type from API
export interface BackendAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: 0 | 1 | 2;
  status: string;
  start_date: string;
  end_date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Frontend announcement type with computed fields
export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 0 | 1 | 2;
  priorityLabel: string;
  isImportant: boolean;
  isExpired: boolean;
  isFuture: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
}

// Convert backend announcement to frontend format
const convertToFrontendAnnouncement = (backend: BackendAnnouncement): Announcement => {
  const now = new Date();
  const startDate = backend.start_date ? new Date(backend.start_date) : null;
  const endDate = backend.end_date ? new Date(backend.end_date) : null;

  return {
    id: backend.id,
    title: backend.title,
    content: backend.content,
    priority: backend.priority,
    priorityLabel: backend.priority === 2 ? '重要' : backend.priority === 1 ? '一般' : '普通',
    isImportant: backend.priority === 2,
    isExpired: endDate ? endDate < now : false,
    isFuture: startDate ? startDate > now : false,
    startDate: backend.start_date || '',
    endDate: backend.end_date || '',
    createdAt: backend.created_at,
  };
};

// List announcements response
interface ListAnnouncementsResponse {
  announcements: BackendAnnouncement[];
  total: number;
}

// List announcements
export const listAnnouncements = async (
  limit: number = 10
): Promise<{ announcements: Announcement[]; total: number }> => {
  try {
    const response = await api.get<ApiResponse<ListAnnouncementsResponse>>(
      `/announcements?limit=${limit}`
    );

    if (response.data.success && response.data.data) {
      const announcements = response.data.data.announcements.map(convertToFrontendAnnouncement);
      return {
        announcements,
        total: response.data.data.total,
      };
    }
    return { announcements: [], total: 0 };
  } catch (error) {
    console.error('Failed to list announcements:', error);
    return { announcements: [], total: 0 };
  }
};

// Get announcement by ID
export const getAnnouncement = async (
  id: number
): Promise<Announcement | null> => {
  try {
    const response = await api.get<ApiResponse<BackendAnnouncement>>(
      `/announcements/${id}`
    );

    if (response.data.success && response.data.data) {
      return convertToFrontendAnnouncement(response.data.data);
    }
    return null;
  } catch (error) {
    console.error('Failed to get announcement:', error);
    return null;
  }
};
