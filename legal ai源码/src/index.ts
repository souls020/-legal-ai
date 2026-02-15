import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema } from './db/schema.js';
import { registerHandler, loginHandler, wechatLoginHandler, logoutHandler, forgotPasswordHandler, resetPasswordHandler, getCurrentUserHandler, updateProfileHandler } from './auth/auth.routes.js';
import { authMiddleware } from './auth/auth.middleware.js';
import { generateHandler, regenerateHandler, getDocumentHandler, listDocumentsHandler, updateDocumentHandler, deleteDocumentHandler, duplicateDocumentHandler } from './api/document.routes.js';
import { exportHandler, batchExportHandler, getExportOptionsHandler } from './api/export.routes.js';
import { listTemplatesHandler, getTemplateHandler, toggleFavoriteHandler, listRegulationsHandler } from './api/template.routes.js';
import { getSubscriptionHandler, listPlansHandler, getUsageHandler } from './api/subscription.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/wechat-login', wechatLoginHandler);
app.post('/api/auth/logout', logoutHandler);
app.post('/api/auth/forgot-password', forgotPasswordHandler);
app.post('/api/auth/reset-password', resetPasswordHandler);

// Protected routes
app.get('/api/auth/me', authMiddleware, getCurrentUserHandler);
app.put('/api/auth/profile', authMiddleware, updateProfileHandler);

// Document routes
app.post('/api/documents/generate', authMiddleware, generateHandler);
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

// Regulation routes
app.get('/api/regulations', authMiddleware, listRegulationsHandler);

// Subscription routes
app.get('/api/subscription', authMiddleware, getSubscriptionHandler);
app.get('/api/subscription/plans', authMiddleware, listPlansHandler);
app.get('/api/subscription/usage', authMiddleware, getUsageHandler);

// Serve frontend static files in production
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// API 404 handler: return JSON for unmatched API routes
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// SPA fallback: all non-API routes serve index.html
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start server
async function start() {
  try {
    await initSchema();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`Frontend served from ${clientDistPath}`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
