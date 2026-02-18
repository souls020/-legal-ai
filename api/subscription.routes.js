import { getDb, dbGet, dbAll } from '../db/index.js';
export async function getSubscriptionHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: '未登录' });
        const db = await getDb();
        const subscription = dbGet(`SELECT s.*, sp.name as plan_name, sp.features
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = ? AND s.status = 'active'`, [userId]);
        if (!subscription) {
            return res.json({ success: true, data: { hasSubscription: false } });
        }
        res.json({ success: true, data: { hasSubscription: true, subscription } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
}
export async function listPlansHandler(_req, res) {
    try {
        const db = await getDb();
        const plans = dbAll('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order, price');
        res.json({ success: true, data: { plans } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
}
export async function getUsageHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: '未登录' });
        const db = await getDb();
        const usage = dbGet(`SELECT COUNT(*) as total_generated,
       SUM(CASE WHEN action_type = 'generate' THEN 1 ELSE 0 END) as generations,
       SUM(CASE WHEN action_type = 'regenerate' THEN 1 ELSE 0 END) as regenerations,
       SUM(CASE WHEN action_type = 'export' THEN 1 ELSE 0 END) as exports
       FROM usage_records WHERE user_id = ?`, [userId]);
        const today = new Date().toISOString().split('T')[0];
        const todayUsage = dbGet(`SELECT COUNT(*) as today_count FROM usage_records
       WHERE user_id = ? AND date(created_at) = ?`, [userId, today]);
        res.json({
            success: true,
            data: {
                usage: {
                    total: usage?.total_generated || 0,
                    today: todayUsage?.today_count || 0
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
}
export async function changePlanHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: '未登录' });
        const { planId } = req.body;
        if (!planId) {
            return res.status(400).json({ success: false, message: '请选择套餐' });
        }
        const db = await getDb();
        // Check if plan exists
        const plan = dbGet('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);
        if (!plan) {
            return res.status(400).json({ success: false, message: '套餐不存在' });
        }
        // Check if user already has subscription
        const existingSub = dbGet('SELECT * FROM subscriptions WHERE user_id = ? AND status = ?', [userId, 'active']);
        const now = new Date().toISOString();
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        if (existingSub) {
            // Update existing subscription
            db.run(`UPDATE subscriptions SET plan_id = ?, updated_at = ? WHERE user_id = ?`, [planId, now, userId]);
        }
        else {
            // Create new subscription
            db.run(`INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at, monthly_generations, used_generations, daily_generations, today_generations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userId, planId, 'active', now, expiresAt.toISOString(), 0, 0, 0, 0]);
        }
        // Get updated subscription
        const subscription = dbGet(`SELECT s.*, sp.name as plan_name, sp.features, sp.monthly_quota, sp.daily_quota
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = ? AND s.status = 'active'`, [userId]);
        res.json({ success: true, data: { subscription } });
    }
    catch (error) {
        console.error('Change plan error:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
}
//# sourceMappingURL=subscription.routes.js.map