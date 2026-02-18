import { getDb, dbRun, dbGet, saveDb } from '../db/index.js';
// Export document to specified format
export async function exportDocument(documentId, userId, options) {
    const db = await getDb();
    // Get document
    const document = dbGet('SELECT d.*, dt.name as type_name FROM documents d LEFT JOIN document_types dt ON d.type_id = dt.id WHERE d.id = ? AND d.user_id = ?', [documentId, userId]);
    if (!document) {
        return { success: false, error: '文书不存在' };
    }
    if (!document.content) {
        return { success: false, error: '文书内容为空' };
    }
    // Track usage
    dbRun('INSERT INTO usage_records (user_id, document_id, action_type, quota_used) VALUES (?, ?, ?, 0)', [userId, documentId, 'export']);
    await saveDb();
    const filename = `${document.title}_${new Date().toISOString().split('T')[0]}`;
    switch (options.format) {
        case 'txt':
            return exportAsText(document, filename);
        case 'docx':
            return exportAsDocx(document, filename);
        case 'pdf':
            return exportAsPdf(document, filename);
        default:
            return { success: false, error: '不支持的导出格式' };
    }
}
// Export as plain text
function exportAsText(document, filename) {
    const content = formatDocumentAsText(document);
    const buffer = Buffer.from(content, 'utf-8');
    return {
        success: true,
        filename: `${filename}.txt`,
        content: buffer,
        mimeType: 'text/plain; charset=utf-8'
    };
}
// Format document as plain text
function formatDocumentAsText(document) {
    let content = '';
    if (document.title) {
        content = content + document.title + '\n';
        const line = '='.repeat(document.title.length);
        content = content + line + '\n\n';
    }
    content = content + document.content;
    return content;
}
// Export as DOCX (simplified - using HTML to DOCX conversion)
async function exportAsDocx(document, filename) {
    try {
        // Create HTML-based DOCX content
        const htmlContent = formatDocumentAsHtml(document);
        // Simple HTML file that Word can open
        const docxContent = createHtmlDocx(document, htmlContent);
        const buffer = Buffer.from(docxContent, 'utf-8');
        return {
            success: true,
            filename: `${filename}.docx`,
            content: buffer,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
    }
    catch (error) {
        console.error('DOCX export error:', error);
        return { success: false, filename: '', content: Buffer.from(''), mimeType: '', error: 'DOCX导出失败' };
    }
}
// Format document as HTML
function formatDocumentAsHtml(document) {
    let html = '';
    if (document.title) {
        html = html + '<h1 style="text-align: center; font-size: 18pt; margin-bottom: 20pt;">' + escapeHtml(document.title) + '</h1>';
    }
    // Convert line breaks to paragraphs
    const paragraphs = (document.content || '').split('\n\n');
    for (const para of paragraphs) {
        if (para.trim()) {
            if (para.startsWith('原告：') || para.startsWith('被告：') || para.startsWith('第三人：')) {
                html = html + '<p style="margin: 10pt 0; text-indent: 24pt;">' + escapeHtml(para) + '</p>';
            }
            else if (para.startsWith('诉讼请求：') || para.startsWith('事实与理由：') || para.startsWith('此致') || para.startsWith('具状人：')) {
                html = html + '<p style="margin: 12pt 0; font-weight: bold;">' + escapeHtml(para) + '</p>';
            }
            else if (para.startsWith('附件：')) {
                html = html + '<p style="margin: 10pt 0;">' + escapeHtml(para) + '</p>';
            }
            else {
                html = html + '<p style="margin: 10pt 0; text-indent: 24pt; line-height: 1.5;">' + escapeHtml(para) + '</p>';
            }
        }
    }
    return html;
}
// Create HTML-based DOCX file
function createHtmlDocx(document, bodyHtml) {
    const title = document.title || '法律文书';
    const date = new Date().toLocaleDateString('zh-CN');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<?mso-application progid="Word.Document"?>\n' +
        '<html xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
        '      xmlns:w="urn:schemas-microsoft-com:office:word"\n' +
        '      xmlns="http://www.w3.org/TR/REC-html40">\n' +
        '<head>\n' +
        '  <meta charset="UTF-8">\n' +
        '  <title>' + title + '</title>\n' +
        '  <style>\n' +
        '    body { font-family: "SimSun", "宋体", serif; font-size: 12pt; line-height: 1.5; margin: 2.54cm; }\n' +
        '    h1 { text-align: center; font-size: 18pt; margin-bottom: 20pt; }\n' +
        '    p { margin: 10pt 0; text-indent: 24pt; line-height: 1.5; }\n' +
        '  </style>\n' +
        '</head>\n' +
        '<body>\n' +
        bodyHtml + '\n' +
        '<p style="text-align: right; margin-top: 40pt;">日期：' + date + '</p>\n' +
        '</body>\n' +
        '</html>';
}
// Export as PDF (placeholder - in production use puppeteer or pdfkit)
async function exportAsPdf(document, filename) {
    try {
        // For PDF export, we create a printable HTML that can be converted
        const htmlContent = formatDocumentAsPrintHtml(document);
        const buffer = Buffer.from(htmlContent, 'utf-8');
        return {
            success: true,
            filename: filename + '.pdf',
            content: buffer,
            mimeType: 'application/pdf'
        };
    }
    catch (error) {
        console.error('PDF export error:', error);
        return { success: false, filename: '', content: Buffer.from(''), mimeType: '', error: 'PDF导出失败' };
    }
}
// Format for print/PDF
function formatDocumentAsPrintHtml(document) {
    const title = document.title || '法律文书';
    const date = new Date().toLocaleDateString('zh-CN');
    return '<!DOCTYPE html>\n' +
        '<html lang="zh-CN">\n' +
        '<head>\n' +
        '  <meta charset="UTF-8">\n' +
        '  <title>' + title + '</title>\n' +
        '  <style>\n' +
        '    @page { size: A4; margin: 2.54cm; }\n' +
        '    body { font-family: "SimSun", "宋体", serif; font-size: 12pt; line-height: 2; }\n' +
        '    h1 { text-align: center; font-size: 22pt; margin-bottom: 30pt; }\n' +
        '    .content { white-space: pre-wrap; }\n' +
        '    .footer { text-align: right; margin-top: 40pt; }\n' +
        '  </style>\n' +
        '</head>\n' +
        '<body>\n' +
        '  <h1>' + title + '</h1>\n' +
        '  <div class="content">' + escapeHtml(document.content || '') + '</div>\n' +
        '  <div class="footer">日期：' + date + '</div>\n' +
        '</body>\n' +
        '</html>';
}
// Escape HTML special characters
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Batch export documents
export async function batchExport(documentIds, userId, format) {
    const results = [];
    for (const docId of documentIds) {
        const result = await exportDocument(docId, userId, { format });
        results.push({
            id: docId,
            success: result.success,
            filename: result.filename,
            error: result.error
        });
    }
    return {
        success: results.every(r => r.success),
        documents: results
    };
}
// Get document types for export options
export async function getExportOptions(documentId, userId) {
    const db = await getDb();
    const document = dbGet('SELECT id, title, content FROM documents WHERE id = ? AND user_id = ?', [documentId, userId]);
    if (!document)
        return null;
    const formats = [];
    if (document.content) {
        formats.push('txt');
        formats.push('docx');
        formats.push('pdf');
    }
    return {
        availableFormats: formats,
        filename: document.title + '_' + new Date().toISOString().split('T')[0]
    };
}
//# sourceMappingURL=export.service.js.map