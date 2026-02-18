import express from 'express';
import cors from 'cors';
import { initSchema } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { registerHandler, loginHandler, wechatLoginHandler, logoutHandler, forgotPasswordHandler, resetPasswordHandler, getCurrentUserHandler, updateProfileHandler, refreshTokenHandler } from './auth/auth.routes.js';
import { authMiddleware } from './auth/auth.middleware.js';
import { generateHandler, regenerateHandler, generateStreamHandler, getDocumentHandler, listDocumentsHandler, updateDocumentHandler, deleteDocumentHandler, duplicateDocumentHandler } from './api/document.routes.js';
import { exportHandler, batchExportHandler, getExportOptionsHandler } from './api/export.routes.js';
import { listTemplatesHandler, getTemplateHandler, toggleFavoriteHandler, listRegulationsHandler, listDocumentTypesHandler } from './api/template.routes.js';
import { chatMessageHandler, chatMessageStreamHandler } from './api/chat.routes.js';
import { getSubscriptionHandler, listPlansHandler, getUsageHandler, changePlanHandler } from './api/subscription.routes.js';
import announcementRoutes from './api/announcement.routes.js';
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Auth routes
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/wechat-login', wechatLoginHandler);
app.post('/api/auth/logout', logoutHandler);
app.post('/api/auth/refresh', refreshTokenHandler);
app.post('/api/auth/forgot-password', forgotPasswordHandler);
app.post('/api/auth/reset-password', resetPasswordHandler);
// Protected routes
app.get('/api/auth/me', authMiddleware, getCurrentUserHandler);
app.put('/api/auth/profile', authMiddleware, updateProfileHandler);
// Document routes
app.post('/api/documents/generate', authMiddleware, generateHandler);
app.post('/api/documents/generate/stream', authMiddleware, generateStreamHandler);
app.post('/api/documents/:id/regenerate', authMiddleware, regenerateHandler);
app.get('/api/documents', authMiddleware, listDocumentsHandler);
app.get('/api/documents/:id', authMiddleware, getDocumentHandler);
app.put('/api/documents/:id', authMiddleware, updateDocumentHandler);
app.delete('/api/documents/:id', authMiddleware, deleteDocumentHandler);
app.post('/api/documents/:id/duplicate', authMiddleware, duplicateDocumentHandler);
// Export routes
app.get('/api/documents/:id/export', authMiddleware, exportHandler);
app.get('/api/documents/:id/export/options', authMiddleware, getExportOptionsHandler);
app.post('/api/documents/export/batch', authMiddleware, batchExportHandler);
// Template routes
app.get('/api/templates', authMiddleware, listTemplatesHandler);
app.get('/api/templates/:id', authMiddleware, getTemplateHandler);
app.post('/api/templates/:id/favorite', authMiddleware, toggleFavoriteHandler);
// Document types route (public - for document type selector)
app.get('/api/document-types', listDocumentTypesHandler);
// Regulation routes
app.get('/api/regulations', authMiddleware, listRegulationsHandler);
// Chat routes (AI multi-turn conversation)
app.post('/api/chat/message', authMiddleware, chatMessageHandler);
app.post('/api/chat/message/stream', authMiddleware, chatMessageStreamHandler);
// Subscription routes
app.get('/api/subscription', authMiddleware, getSubscriptionHandler);
app.get('/api/subscription/plans', authMiddleware, listPlansHandler);
app.get('/api/subscription/usage', authMiddleware, getUsageHandler);
app.post('/api/subscription/change', authMiddleware, changePlanHandler);
// Announcement routes (public - for homepage)
app.use('/api/announcements', announcementRoutes);
// Start server
async function start() {
    try {
        await initSchema();
        console.log('Database initialized');
        await seedDatabase();
        console.log('Database seeded');
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map