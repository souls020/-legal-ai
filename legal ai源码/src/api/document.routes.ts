import { Request, Response } from 'express';
import { z } from 'zod';
import { generateDocument, regenerateDocument, getDocumentById, listDocuments, updateDocument, deleteDocument, duplicateDocument } from './document.service.js';
import { AuthRequest } from '../auth/auth.middleware.js';

// Validation schemas
const generateSchema = z.object({
  typeId: z.number().int().positive(),
  title: z.string().min(1, '标题不能为空').max(200, '标题最长200字符'),
  caseInfo: z.record(z.unknown())
});

const regenerateSchema = z.object({
  caseInfo: z.record(z.unknown())
});

const updateSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最长200字符').optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'generated', 'edited', 'exported', 'archived']).optional()
});

const listSchema = z.object({
  typeId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

// Generate document
export async function generateHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const data = generateSchema.parse(req.body);
    const result = await generateDocument({
      userId,
      typeId: data.typeId,
      title: data.title,
      caseInfo: data.caseInfo
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.status(201).json({
      success: true,
      message: '生成成功',
      data: { document: result.document }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Generate document error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Regenerate document
export async function regenerateHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ success: false, message: '无效的文书ID' });
    }

    const data = regenerateSchema.parse(req.body);
    const result = await regenerateDocument(userId, documentId, data.caseInfo);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: '重新生成成功',
      data: { document: result.document }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Regenerate document error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Get document by ID
export async function getDocumentHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ success: false, message: '无效的文书ID' });
    }

    const document = await getDocumentById(documentId, userId);

    if (!document) {
      return res.status(404).json({ success: false, message: '文书不存在' });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// List documents
export async function listDocumentsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const data = listSchema.parse(req.query);
    const result = await listDocuments(userId, {
      typeId: data.typeId,
      status: data.status,
      page: data.page,
      limit: data.limit
    });

    res.json({
      success: true,
      data: {
        documents: result.documents,
        pagination: {
          page: data.page,
          limit: data.limit,
          total: result.total,
          pages: Math.ceil(result.total / data.limit)
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('List documents error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Update document
export async function updateDocumentHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ success: false, message: '无效的文书ID' });
    }

    const data = updateSchema.parse(req.body);
    const document = await updateDocument(documentId, userId, data);

    if (!document) {
      return res.status(404).json({ success: false, message: '文书不存在' });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: { document }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Update document error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Delete document
export async function deleteDocumentHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ success: false, message: '无效的文书ID' });
    }

    const success = await deleteDocument(documentId, userId);

    if (!success) {
      return res.status(404).json({ success: false, message: '文书不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Duplicate document
export async function duplicateDocumentHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ success: false, message: '无效的文书ID' });
    }

    const document = await duplicateDocument(documentId, userId);

    if (!document) {
      return res.status(404).json({ success: false, message: '文书不存在' });
    }

    res.status(201).json({
      success: true,
      message: '复制成功',
      data: { document }
    });
  } catch (error) {
    console.error('Duplicate document error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}
