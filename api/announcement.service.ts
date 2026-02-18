// Announcement Service - API functions for announcement management
import { dbAll, dbGet, saveDb } from '../db/schema.js';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 0 | 1 | 2;
  status: 'active' | 'inactive' | 'draft';
  start_date: string;
  end_date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementWithPriority extends Announcement {
  priorityLabel: string;
  isImportant: boolean;
  isExpired: boolean;
  isFuture: boolean;
}

// Get priority label in Chinese
const getPriorityLabel = (priority: number): string => {
  switch (priority) {
    case 2: return '重要';
    case 1: return '一般';
    default: return '普通';
  }
};

// Check if announcement is expired
const isExpired = (endDate: string | null): boolean => {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
};

// Check if announcement is future (not started yet)
const isFuture = (startDate: string | null): boolean => {
  if (!startDate) return false;
  return new Date(startDate) > new Date();
};

// Convert to frontend announcement with computed fields
const convertToFrontendAnnouncement = (announcement: Announcement): AnnouncementWithPriority => {
  return {
    ...announcement,
    priorityLabel: getPriorityLabel(announcement.priority),
    isImportant: announcement.priority === 2,
    isExpired: isExpired(announcement.end_date),
    isFuture: isFuture(announcement.start_date),
  };
};

// List active announcements
export const listAnnouncements = async (
  limit: number = 10
): Promise<AnnouncementWithPriority[]> => {
  try {
    const now = new Date().toISOString().split('T')[0];

    const announcements = dbAll<Announcement>(`
      SELECT * FROM announcements
      WHERE status = 'active'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      ORDER BY priority DESC, created_at DESC
      LIMIT ?
    `, [now, now, limit]);

    return announcements.map(convertToFrontendAnnouncement);
  } catch (error) {
    console.error('Failed to list announcements:', error);
    return [];
  }
};

// Get announcement by ID
export const getAnnouncementById = async (
  id: number
): Promise<AnnouncementWithPriority | null> => {
  try {
    const announcement = dbGet<Announcement>(
      'SELECT * FROM announcements WHERE id = ?',
      [id]
    );

    if (!announcement) return null;
    return convertToFrontendAnnouncement(announcement);
  } catch (error) {
    console.error('Failed to get announcement:', error);
    return null;
  }
};

// Create announcement (admin function)
export const createAnnouncement = async (
  data: {
    title: string;
    content?: string;
    priority?: 0 | 1 | 2;
    status?: 'active' | 'inactive' | 'draft';
    start_date?: string;
    end_date?: string;
    created_by?: number;
  }
): Promise<AnnouncementWithPriority | null> => {
  try {
    const now = new Date().toISOString();

    // Use dbRun helper
    const db = await import('../db/schema.js');
    db.dbRun(`
      INSERT INTO announcements (title, content, priority, status, start_date, end_date, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.title,
      data.content || '',
      data.priority || 0,
      data.status || 'active',
      data.start_date || null,
      data.end_date || null,
      data.created_by || null,
      now,
      now,
    ]);

    await db.saveDb();

    // Get the last inserted ID
    const result = db.dbGet<{ id: number }>('SELECT last_insert_rowid() as id');
    if (result) {
      return getAnnouncementById(result.id);
    }
    return null;
  } catch (error) {
    console.error('Failed to create announcement:', error);
    return null;
  }
};

// Update announcement (admin function)
export const updateAnnouncement = async (
  id: number,
  data: {
    title?: string;
    content?: string;
    priority?: 0 | 1 | 2;
    status?: 'active' | 'inactive' | 'draft';
    start_date?: string;
    end_date?: string;
  }
): Promise<AnnouncementWithPriority | null> => {
  try {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      values.push(data.priority);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(data.start_date);
    }
    if (data.end_date !== undefined) {
      updates.push('end_date = ?');
      values.push(data.end_date);
    }

    if (updates.length === 0) {
      return getAnnouncementById(id);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const db = await import('../db/schema.js');
    db.dbRun(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, values);
    await db.saveDb();

    return getAnnouncementById(id);
  } catch (error) {
    console.error('Failed to update announcement:', error);
    return null;
  }
};

// Delete announcement (admin function)
export const deleteAnnouncement = async (id: number): Promise<boolean> => {
  try {
    const db = await import('../db/schema.js');
    db.dbRun('DELETE FROM announcements WHERE id = ?', [id]);
    await db.saveDb();
    return true;
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    return false;
  }
};
