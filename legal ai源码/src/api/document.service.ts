import { getDb, dbRun, dbGet, dbAll, saveDb } from '../db/index.js';
import type { Document, InsertDocument } from '../db/types.js';

// AI API configuration
const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'wenxin', // 'wenxin' or 'tongyi'
  wenxin: {
    apiKey: process.env.WENXIN_API_KEY || '',
    secretKey: process.env.WENXIN_SECRET_KEY || '',
    endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat'
  },
  tongyi: {
    apiKey: process.env.TONGYI_API_KEY || '',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  },
  timeout: 30000 // 30 seconds
};

export interface GenerateParams {
  userId: number;
  typeId: number;
  title: string;
  caseInfo: Record<string, unknown>;
}

export interface GenerateResult {
  success: boolean;
  document?: Document;
  error?: string;
}

// Generate document using AI
export async function generateDocument(params: GenerateParams): Promise<GenerateResult> {
  const { userId, typeId, title, caseInfo } = params;
  const db = await getDb();

  // Get user subscription and check quotas
  const subscription = dbGet<{
    id: number;
    plan_id: number;
    monthly_generations: number;
    used_generations: number;
    daily_generations: number;
    today_generations: number;
    expires_at: string;
  }>(
    `SELECT id, plan_id, monthly_generations, used_generations, today_generations, daily_generations, expires_at
     FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now')`,
    [userId]
  );

  if (!subscription) {
    return { success: false, error: '请先购买订阅套餐' };
  }

  // Check monthly quota
  if (subscription.used_generations >= subscription.monthly_generations) {
    return { success: false, error: '本月生成次数已用完，请升级套餐' };
  }

  // Check daily quota
  const today = new Date().toISOString().split('T')[0];
  const todayUsage = dbGet<{ count: number }>(
    `SELECT COUNT(*) as count FROM usage_records
     WHERE user_id = ? AND action_type = 'generate'
     AND date(created_at) = ?`,
    [userId, today]
  );

  if ((todayUsage?.count || 0) >= subscription.daily_generations) {
    return { success: false, error: '今日生成次数已用完，请明天再试' };
  }

  // Build AI prompt
  const prompt = buildPrompt(typeId, caseInfo);

  // Generate content using AI (placeholder - integrate real API)
  const content = await callAIApi(prompt);

  if (!content) {
    return { success: false, error: 'AI生成失败，请重试' };
  }

  // Create document
  dbRun(
    `INSERT INTO documents (user_id, type_id, title, content, status, ai_model)
     VALUES (?, ?, ?, ?, 'generated', ?)`,
    [userId, typeId, title, content, AI_CONFIG.provider]
  );

  const docId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // Update usage
  dbRun(
    `UPDATE subscriptions SET used_generations = used_generations + 1, today_generations = today_generations + 1
     WHERE id = ?`,
    [subscription.id]
  );

  // Record usage
  dbRun(
    `INSERT INTO usage_records (user_id, subscription_id, document_id, action_type, quota_used, ai_model)
     VALUES (?, ?, ?, 'generate', 1, ?)`,
    [userId, subscription.id, docId, AI_CONFIG.provider]
  );

  await saveDb();

  // Get created document
  const document = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ?',
    [docId]
  );

  return { success: true, document: document || undefined };
}

// Build AI prompt based on document type
function buildPrompt(typeId: number, caseInfo: Record<string, unknown>): string {
  // Get document type info
  const docType = dbGet<{ name: string; category: string }>(
    'SELECT name, category FROM document_types WHERE id = ?',
    [typeId]
  );

  const typeName = docType?.name || '法律文书';
  const category = docType?.category || '民事';

  // Build structured prompt
  return `请生成一份专业的中国${category}类${typeName}。

案件信息：
${Object.entries(caseInfo).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

要求：
1. 格式规范，符合中国法律文书标准格式
2. 内容完整，包含必要的法律要件
3. 语言专业、严谨
4. 引用相关法律法规条款（如适用）
5. 包含标题、当事人信息、诉求/请求、事实与理由、落款等必要部分

请直接输出文书内容，不要包含解释说明。`;
}

// Call AI API (placeholder - implement real integration)
async function callAIApi(prompt: string): Promise<string | null> {
  // Placeholder implementation - return sample document
  // In production, integrate with Baidu Wenxin or Alibaba Tongyi

  // Simulated delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return placeholder content
  return `民事起诉状

原告：${prompt.includes('原告') ? 'XXX' : '【原告姓名】'}
性别：男/女
民族：汉族
出生日期：XXXX年XX月XX日
身份证号码：XXXXXXXXXXXXXXXXXX
住所地：XXXXXX
联系电话：XXXXXXXXXXX

被告：${prompt.includes('被告') ? 'XXX' : '【被告姓名】'}
性别：男/女
民族：汉族
住所地：XXXXXX

诉讼请求：
1. 请求判令被告XXXXX
2. 请求判令被告承担本案诉讼费用

事实与理由：
原告与被告因XXXX纠纷，经协商未能达成一致意见。为维护原告合法权益，特向贵院提起诉讼，恳请依法支持原告的全部诉讼请求。

此致
XXXXXX人民法院

具状人：【原告签名】
XXXX年XX月XX日

附件：
1. 原告身份证复印件一份
2. 证据材料若干`;
}

// Regenerate document (with limit)
export async function regenerateDocument(userId: number, documentId: number, caseInfo: Record<string, unknown>): Promise<GenerateResult> {
  const db = await getDb();

  // Check if document belongs to user
  const document = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId]
  );

  if (!document) {
    return { success: false, error: '文书不存在' };
  }

  // Check regeneration limit (3 per day)
  const today = new Date().toISOString().split('T')[0];
  const regenCount = dbGet<{ count: number }>(
    `SELECT COUNT(*) as count FROM usage_records
     WHERE user_id = ? AND action_type = 'regenerate'
     AND date(created_at) = ?`,
    [userId, today]
  );

  if ((regenCount?.count || 0) >= 3) {
    return { success: false, error: '今日重新生成次数已用完（3次/天）' };
  }

  // Regenerate
  const prompt = buildPrompt(document.type_id || 1, caseInfo);
  const content = await callAIApi(prompt);

  if (!content) {
    return { success: false, error: 'AI生成失败，请重试' };
  }

  // Update document
  dbRun(
    `UPDATE documents SET content = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [content, documentId]
  );

  // Record usage
  dbRun(
    `INSERT INTO usage_records (user_id, document_id, action_type, quota_used)
     VALUES (?, ?, 'regenerate', 0)`,
    [userId, documentId]
  );

  await saveDb();

  const updatedDoc = dbGet<Document>('SELECT * FROM documents WHERE id = ?', [documentId]);

  return { success: true, document: updatedDoc };
}

// Get document by ID
export async function getDocumentById(documentId: number, userId: number): Promise<Document | null> {
  const db = await getDb();
  const doc = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId]
  );
  return doc || null;
}

// List documents
export async function listDocuments(userId: number, options?: {
  typeId?: number;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ documents: Document[]; total: number }> {
  const db = await getDb();
  const { typeId, status, page = 1, limit = 20 } = options || {};

  let where = 'user_id = ?';
  const params: unknown[] = [userId];

  if (typeId) {
    where += ' AND type_id = ?';
    params.push(typeId);
  }

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  // Get total
  const totalResult = dbGet<{ count: number }>(
    `SELECT COUNT(*) as count FROM documents WHERE ${where}`,
    params
  );

  // Get documents
  const documents = dbAll<Document>(
    `SELECT * FROM documents WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  return {
    documents,
    total: totalResult?.count || 0
  };
}

// Update document
export async function updateDocument(documentId: number, userId: number, data: Partial<Pick<Document, 'title' | 'content' | 'status'>>): Promise<Document | null> {
  const db = await getDb();

  // Check ownership
  const existing = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId]
  );

  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) {
    fields.push('content = ?'); values.push(data.content);
    fields.push('version = version + 1');
  }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

  if (fields.length === 0) return existing;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(documentId);

  dbRun(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, values);

  // Create version record if content changed
  if (data.content !== undefined) {
    dbRun(
      `INSERT INTO document_versions (document_id, content, title, version, change_summary)
       VALUES (?, ?, ?, ?, ?)`,
      [documentId, data.content, existing.title, existing.version + 1, '用户编辑']
    );
  }

  await saveDb();

  const updated = dbGet<Document>('SELECT * FROM documents WHERE id = ?', [documentId]);
  return updated || null;
}

// Delete document
export async function deleteDocument(documentId: number, userId: number): Promise<boolean> {
  const db = await getDb();

  const existing = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId]
  );

  if (!existing) return false;

  // Soft delete
  dbRun("UPDATE documents SET status = 'archived' WHERE id = ?", [documentId]);

  await saveDb();

  return true;
}

// Duplicate document
export async function duplicateDocument(documentId: number, userId: number): Promise<Document | null> {
  const db = await getDb();

  const existing = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ? AND user_id = ?',
    [documentId, userId]
  );

  if (!existing) return null;

  dbRun(
    `INSERT INTO documents (user_id, type_id, title, content, status, version)
     VALUES (?, ?, ?, ?, 'draft', 1)`,
    [userId, existing.type_id, `${existing.title}（副本）`, existing.content]
  );

  const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  await saveDb();

  const doc = dbGet<Document>('SELECT * FROM documents WHERE id = ?', [newId]);
  return doc || null;
}
