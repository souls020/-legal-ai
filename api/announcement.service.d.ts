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
export declare const listAnnouncements: (limit?: number) => Promise<AnnouncementWithPriority[]>;
export declare const getAnnouncementById: (id: number) => Promise<AnnouncementWithPriority | null>;
export declare const createAnnouncement: (data: {
    title: string;
    content?: string;
    priority?: 0 | 1 | 2;
    status?: "active" | "inactive" | "draft";
    start_date?: string;
    end_date?: string;
    created_by?: number;
}) => Promise<AnnouncementWithPriority | null>;
export declare const updateAnnouncement: (id: number, data: {
    title?: string;
    content?: string;
    priority?: 0 | 1 | 2;
    status?: "active" | "inactive" | "draft";
    start_date?: string;
    end_date?: string;
}) => Promise<AnnouncementWithPriority | null>;
export declare const deleteAnnouncement: (id: number) => Promise<boolean>;
//# sourceMappingURL=announcement.service.d.ts.map