import { Request, Response } from 'express';
import { getDb, dbGet, dbAll } from '../db/index.js';
import { AuthRequest } from '../auth/auth.middleware.js';

export async function getSubscriptionHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const db = await getDb();
    const subscription = dbGet(
      `SELECT s.*, sp.name as plan_name, sp.features
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = ? AND s.status = 'active'`,
      [userId]
    );

    if (!subscription) {
      return res.json({ success: true, data: { hasSubscription: false } });
    }

    res.json({ success: true, data: { hasSubscription: true, subscription } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

export async function listPlansHandler(_req: Request, res: Response) {
  try {
    const db = await getDb();
    const plans = dbAll(
      'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order, price'
    );

    res.json({ success: true, data: { plans } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

export async function getUsageHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: '未登录' });

    const db = await getDb();
    const usage = dbGet(
      `SELECT COUNT(*) as total_generated,
       SUM(CASE WHEN action_type = 'generate' THEN 1 ELSE 0 END) as generations,
       SUM(CASE WHEN action_type = 'regenerate' THEN 1 ELSE 0 END) as regenerations,
       SUM(CASE WHEN action_type = 'export' THEN 1 ELSE 0 END) as exports
       FROM usage_records WHERE user_id = ?`,
      [userId]
    );

    const today = new Date().toISOString().split('T')[0];
    const todayUsage = dbGet(
      `SELECT COUNT(*) as today_count FROM usage_records
       WHERE user_id = ? AND date(created_at) = ?`,
      [userId, today]
    );

    res.json({
      success: true,
      data: {
        usage: {
          total: (usage as { total_generated?: number })?.total_generated || 0,
          today: (todayUsage as { today_count?: number })?.today_count || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}
