import { z } from 'zod';
import { exportDocument, batchExport, getExportOptions } from './export.service.js';
// Validation schemas
const exportSchema = z.object({
    format: z.enum(['docx', 'pdf', 'txt']).default('docx'),
    includeHeader: z.boolean().optional(),
    includeFooter: z.boolean().optional(),
    pageNumbers: z.boolean().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().min(8).max(72).optional(),
    lineHeight: z.number().min(1).max(3).optional()
});
const batchExportSchema = z.object({
    documentIds: z.array(z.number().int().positive()).min(1).max(20),
    format: z.enum(['docx', 'pdf', 'txt']).default('docx')
});
// Export single document
export async function exportHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: '未登录' });
        }
        const documentId = parseInt(req.params.id);
        if (isNaN(documentId)) {
            return res.status(400).json({ success: false, message: '无效的文书ID' });
        }
        const data = exportSchema.parse(req.query);
        const result = await exportDocument(documentId, userId, {
            format: data.format,
            includeHeader: data.includeHeader,
            includeFooter: data.includeFooter,
            pageNumbers: data.pageNumbers,
            fontFamily: data.fontFamily,
            fontSize: data.fontSize,
            lineHeight: data.lineHeight
        });
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
        res.send(result.content);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: error.errors[0].message });
        }
        console.error('Export document error:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
}
// Batch export documents
export async function batchExportHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: '未登录' });
        }
        const data = batchExportSchema.parse(req.body);
        const result = await batchExport(data.documentIds, userId, data.format);
        res.json({
            success: result.success,
            data: {
                documents: result.documents,
                summary: {
                    total: result.documents.length,
                    success: result.documents.filter(d => d.success).length,
                    failed: result.documents.filter(d => !d.success).length
                }
            }
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: error.errors[0].message });
        }
        console.error('Batch export error:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
}
// Get export options
export async function getExportOptionsHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: '未登录' });
        }
        const documentId = parseInt(req.params.id);
        if (isNaN(documentId)) {
            return res.status(400).json({ success: false, message: '无效的文书ID' });
        }
        const options = await getExportOptions(documentId, userId);
        if (!options) {
            return res.status(404).json({ success: false, message: '文书不存在' });
        }
        res.json({
            success: true,
            data: options
        });
    }
    catch (error) {
        console.error('Get export options error:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
}
//# sourceMappingURL=export.routes.js.map