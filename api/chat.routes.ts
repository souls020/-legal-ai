// Chat Routes - AI multi-turn conversation for case information collection
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.middleware.js';
import { callAIChat, callAIChatStream, ChatMessage } from './ai-provider.js';
import { buildChatMessages } from './prompt-engine.js';
import { dbGet } from '../db/index.js';

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  documentTypeId: z.number().int().positive().optional(),
});

// Non-streaming chat message
export async function chatMessageHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const data = chatSchema.parse(req.body);

    // Get document type name if provided
    let documentTypeName: string | undefined;
    if (data.documentTypeId) {
      const docType = dbGet<{ name: string }>(
        'SELECT name FROM document_types WHERE id = ?',
        [data.documentTypeId]
      );
      documentTypeName = docType?.name;
    }

    // Build messages with system prompt
    const messages = buildChatMessages(
      data.messages as ChatMessage[],
      documentTypeName
    );

    const reply = await callAIChat(messages);

    if (!reply) {
      return res.status(500).json({ success: false, message: 'AI 回复失败，请重试' });
    }

    res.json({
      success: true,
      data: { reply },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Chat message error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Streaming chat message (SSE)
export async function chatMessageStreamHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const data = chatSchema.parse(req.body);

    let documentTypeName: string | undefined;
    if (data.documentTypeId) {
      const docType = dbGet<{ name: string }>(
        'SELECT name FROM document_types WHERE id = ?',
        [data.documentTypeId]
      );
      documentTypeName = docType?.name;
    }

    const messages = buildChatMessages(
      data.messages as ChatMessage[],
      documentTypeName
    );

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, eventData: string) => {
      res.write(`event: ${event}\ndata: ${eventData}\n\n`);
    };

    req.on('close', () => {
      console.log('Chat stream client disconnected');
    });

    const reply = await callAIChatStream(messages, (chunk) => {
      sendEvent('chunk', JSON.stringify({ content: chunk }));
    });

    if (!reply) {
      sendEvent('error', JSON.stringify({ message: 'AI 回复失败' }));
    } else {
      sendEvent('complete', JSON.stringify({ reply }));
    }

    res.end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.errors[0].message })}\n\n`);
    } else {
      console.error('Chat stream error:', error);
      res.write(`event: error\ndata: ${JSON.stringify({ message: '服务器错误' })}\n\n`);
    }
    res.end();
  }
}
