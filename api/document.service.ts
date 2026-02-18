import { getDb, dbRun, dbGet, dbAll, saveDb } from '../db/index.js';
import type { Document, InsertDocument } from '../db/types.js';
import { callAI, callAIStream, getProviderName, type ChatMessage } from './ai-provider.js';
import { buildDocumentGenerationMessages } from './prompt-engine.js';

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

// Generate document with streaming (for SSE)
export async function generateDocumentStream(
  userId: number,
  typeId: number,
  title: string,
  caseInfo: Record<string, unknown>,
  onChunk: (chunk: string) => void
): Promise<GenerateResult> {
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

  // Allow free demo generation when no subscription exists
  if (subscription) {
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
  }

  // Build AI messages using prompt engine
  const conversationHistory = (caseInfo._conversationHistory as ChatMessage[] | undefined) || undefined;
  const messages = buildDocumentGenerationMessages(typeId, caseInfo, conversationHistory);

  // Generate content using streaming AI API
  const content = await callAIStream({ messages, maxTokens: 4096, temperature: 0.6 }, onChunk);

  if (!content) {
    return { success: false, error: 'AI生成失败，请重试' };
  }

  // Create document
  dbRun(
    `INSERT INTO documents (user_id, type_id, title, content, status, ai_model)
     VALUES (?, ?, ?, ?, 'generated', ?)`,
    [userId, typeId, title, content, getProviderName()]
  );

  const docId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // Update usage (only if subscription exists)
  if (subscription) {
    dbRun(
      `UPDATE subscriptions SET used_generations = used_generations + 1, today_generations = today_generations + 1
       WHERE id = ?`,
      [subscription.id]
    );
  }

  // Record usage
  dbRun(
    `INSERT INTO usage_records (user_id, subscription_id, document_id, action_type, quota_used, ai_model)
     VALUES (?, ?, ?, 'generate', 1, ?)`,
    [userId, subscription?.id || null, docId, getProviderName()]
  );

  await saveDb();

  // Get created document
  const document = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ?',
    [docId]
  );

  return { success: true, document: document || undefined };
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

  // Allow free demo generation when no subscription exists
  if (subscription) {
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
  }

  // Build AI messages using prompt engine
  const conversationHistory = (caseInfo._conversationHistory as ChatMessage[] | undefined) || undefined;
  const messages = buildDocumentGenerationMessages(typeId, caseInfo, conversationHistory);

  // Generate content using AI
  const content = await callAI({ messages, maxTokens: 4096, temperature: 0.6 });

  if (!content) {
    return { success: false, error: 'AI生成失败，请重试' };
  }

  // Create document
  dbRun(
    `INSERT INTO documents (user_id, type_id, title, content, status, ai_model)
     VALUES (?, ?, ?, ?, 'generated', ?)`,
    [userId, typeId, title, content, getProviderName()]
  );

  const docId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // Update usage (only if subscription exists)
  if (subscription) {
    dbRun(
      `UPDATE subscriptions SET used_generations = used_generations + 1, today_generations = today_generations + 1
       WHERE id = ?`,
      [subscription.id]
    );
  }

  // Record usage
  dbRun(
    `INSERT INTO usage_records (user_id, subscription_id, document_id, action_type, quota_used, ai_model)
     VALUES (?, ?, ?, 'generate', 1, ?)`,
    [userId, subscription?.id || null, docId, getProviderName()]
  );

  await saveDb();

  // Get created document
  const document = dbGet<Document>(
    'SELECT * FROM documents WHERE id = ?',
    [docId]
  );

  return { success: true, document: document || undefined };
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

  // Regenerate using prompt engine
  const messages = buildDocumentGenerationMessages(document.type_id || 1, caseInfo);
  const content = await callAI({ messages, maxTokens: 4096, temperature: 0.6 });

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
