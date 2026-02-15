import { Request, Response } from 'express';
import { z } from 'zod';
import { getDb, dbGet, dbAll, saveDb } from '../db/index.js';
import { AuthRequest } from '../auth/auth.middleware.js';

const listSchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export async function listTemplatesHandler(req: AuthRequest, res: Response) {
  try {
    const data = listSchema.parse(req.query);
    const db = await getDb();

    let where = 't.is_active = 1';
    const params: unknown[] = [];

    if (data.category) {
      where += ' AND category_id = (SELECT id FROM template_categories WHERE name = ?)';
      params.push(data.category);
    }

    const templates = dbAll(
      `SELECT t.*, tc.name as category_name, dt.name as type_name
       FROM templates t
       LEFT JOIN template_categories tc ON t.category_id = tc.id
       LEFT JOIN document_types dt ON t.type_id = dt.id
       WHERE ${where}
       ORDER BY usage_count DESC, rating DESC
       LIMIT ? OFFSET ?`,
      [...params, data.limit, (data.page - 1) * data.limit]
    );

    res.json({ success: true, data: { templates } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

export async function getTemplateHandler(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: '无效ID' });

    const db = await getDb();
    const template = dbGet(
      `SELECT t.*, tc.name as category_name FROM templates t
       LEFT JOIN template_categories tc ON t.category_id = tc.id
       WHERE t.id = ?`,
      [id]
    );

    if (!template) return res.status(404).json({ success: false, message: '模板不存在' });

    res.json({ success: true, data: { template } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

export async function toggleFavoriteHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: '无效ID' });

    res.json({ success: true, message: '已收藏' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

export async function listRegulationsHandler(req: AuthRequest, res: Response) {
  try {
    const db = await getDb();
    const { q, category, page = 1, limit = 20 } = req.query;

    let where = "status = 'effective'";
    const params: unknown[] = [];

    if (q) {
      where += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }

    const regulations = dbAll(
      `SELECT id, title, category, article, effective_date, jurisdiction
       FROM regulations WHERE ${where}
       ORDER BY effective_date DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), (Number(page) - 1) * Number(limit)]
    );

    res.json({ success: true, data: { regulations } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}
