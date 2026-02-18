// Chat Service - AI multi-turn conversation
import { api, ApiResponse, getStoredToken } from './api';

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatReplyResponse {
  reply: string;
}

// Send chat message (non-streaming)
export async function sendChatMessage(
  messages: ChatMessagePayload[],
  documentTypeId?: number
): Promise<string> {
  const response = await api.post<ApiResponse<ChatReplyResponse>>('/chat/message', {
    messages,
    documentTypeId,
  });
  if (response.data.success && response.data.data) {
    return response.data.data.reply;
  }
  throw new Error(response.data.message || '发送失败');
}

// Send chat message with streaming (SSE via fetch)
export function sendChatMessageStream(
  messages: ChatMessagePayload[],
  documentTypeId: number | undefined,
  onChunk: (chunk: string) => void,
  onComplete: (fullReply: string) => void,
  onError: (error: string) => void
): () => void {
  const token = getStoredToken();
  const baseURL = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${baseURL}/api/chat/message/stream`;

  let abortController: AbortController | null = new AbortController();

  const run = async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, documentTypeId }),
        signal: abortController!.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        onError((errData as { message?: string }).message || '请求失败');
        return;
      }

      if (!response.body) {
        onError('无法读取响应');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              switch (currentEvent) {
                case 'chunk':
                  if (parsed.content) onChunk(parsed.content);
                  break;
                case 'complete':
                  if (parsed.reply) onComplete(parsed.reply);
                  break;
                case 'error':
                  onError(parsed.message || '发生错误');
                  break;
              }
            } catch {
              // ignore
            }
            currentEvent = '';
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        onError('网络错误');
      }
    }
  };

  run();

  return () => {
    abortController?.abort();
    abortController = null;
  };
}

// Document types service
export interface DocumentType {
  id: number;
  name: string;
  description: string;
}

export interface DocumentTypesGrouped {
  [category: string]: DocumentType[];
}

interface DocumentTypesResponse {
  types: Array<DocumentType & { category: string }>;
  grouped: DocumentTypesGrouped;
}

export async function fetchDocumentTypes(): Promise<DocumentTypesResponse> {
  const response = await api.get<ApiResponse<DocumentTypesResponse>>('/document-types');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return { types: [], grouped: {} };
}
