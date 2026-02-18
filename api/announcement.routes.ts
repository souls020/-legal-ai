// Announcement Routes - API endpoints for announcement management
import { Router } from 'express';
import { listAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement } from './announcement.service.js';

const router = Router();

// List announcements (public - for homepage)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const announcements = await listAnnouncements(limit);

    res.json({
      success: true,
      data: {
        announcements,
        total: announcements.length,
      },
    });
  } catch (error) {
    console.error('Error listing announcements:', error);
    res.status(500).json({
      success: false,
      message: '获取公告列表失败',
    });
  }
});

// Get announcement by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的公告ID',
      });
    }

    const announcement = await getAnnouncementById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在',
      });
    }

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error('Error getting announcement:', error);
    res.status(500).json({
      success: false,
      message: '获取公告详情失败',
    });
  }
});

// Create announcement (admin only - for future admin panel)
router.post('/', async (req, res) => {
  try {
    const { title, content, priority, status, start_date, end_date } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: '公告标题不能为空',
      });
    }

    const announcement = await createAnnouncement({
      title,
      content,
      priority: priority as 0 | 1 | 2,
      status: status as 'active' | 'inactive' | 'draft',
      start_date,
      end_date,
    });

    if (!announcement) {
      return res.status(500).json({
        success: false,
        message: '创建公告失败',
      });
    }

    res.json({
      success: true,
      data: announcement,
      message: '公告创建成功',
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: '创建公告失败',
    });
  }
});

// Update announcement (admin only)
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的公告ID',
      });
    }

    const { title, content, priority, status, start_date, end_date } = req.body;

    const announcement = await updateAnnouncement(id, {
      title,
      content,
      priority: priority as 0 | 1 | 2,
      status: status as 'active' | 'inactive' | 'draft',
      start_date,
      end_date,
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在',
      });
    }

    res.json({
      success: true,
      data: announcement,
      message: '公告更新成功',
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: '更新公告失败',
    });
  }
});

// Delete announcement (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的公告ID',
      });
    }

    const success = await deleteAnnouncement(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '公告不存在',
      });
    }

    res.json({
      success: true,
      message: '公告删除成功',
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: '删除公告失败',
    });
  }
});

export default router;
