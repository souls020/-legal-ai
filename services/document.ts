// Document API Service
import { api, ApiResponse, getStoredToken } from './api';

// Document types
export interface Document {
  id: number;
  user_id: number;
  type_id: number;
  title: string;
  content: string;
  status: 'draft' | 'generated' | 'edited' | 'exported' | 'archived';
  version: number;
  ai_model?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseInfo {
  // Extracted from conversation
  case_type?: string;
  parties?: string;
  facts?: string;
  claims?: string;
  evidence?: string;
  [key: string]: string | undefined;
}

export interface GenerateParams {
  typeId: number;
  title: string;
  caseInfo: CaseInfo;
}

export interface GenerateResponse {
  document: Document;
}

// Generate a new document
export async function generateDocument(params: GenerateParams): Promise<Document> {
  const response = await api.post<ApiResponse<GenerateResponse>>('/documents/generate', params);
  if (!response.data.success) {
    throw new Error(response.data.message || '生成失败');
  }
  return response.data.data!.document;
}

// Regenerate an existing document
export async function regenerateDocument(documentId: number, caseInfo: CaseInfo): Promise<Document> {
  const response = await api.post<ApiResponse<GenerateResponse>>(`/documents/${documentId}/regenerate`, {
    caseInfo
  });
  if (!response.data.success) {
    throw new Error(response.data.message || '重新生成失败');
  }
  return response.data.data!.document;
}

// Generate document with streaming (SSE)
export type StreamingCallback = (chunk: string) => void;
export type StreamingCompleteCallback = (document: Document) => void;
export type StreamingErrorCallback = (error: string) => void;

export function generateDocumentStream(
  params: GenerateParams,
  onChunk: StreamingCallback,
  onComplete: StreamingCompleteCallback,
  onError: StreamingErrorCallback
): () => void {
  const token = getStoredToken();
  const baseURL = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${baseURL}/api/documents/generate/stream`;

  const eventSource = new EventSource(`${url}?${new URLSearchParams({
    typeId: params.typeId.toString(),
    title: params.title,
    caseInfo: JSON.stringify(params.caseInfo)
  }).toString()}`, {
    withCredentials: true
  });

  // Add authorization header via POST (EventSource doesn't support custom headers well)
  // We'll use a workaround: close the EventSource and use fetch with ReadableStream instead
  eventSource.close();

  // Use fetch with ReadableStream for SSE
  let fullContent = '';
  let abortController: AbortController | null = null;

  const startStreaming = async () => {
    abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(params),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        onError(errorData.message || '生成失败');
        return;
      }

      if (!response.body) {
        onError('无法读取响应');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            const dataLineIndex = lines.indexOf(line) + 1;
            if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data: ')) {
              const data = lines[dataLineIndex].slice(6);

              try {
                const parsed = JSON.parse(data);

                switch (eventType) {
                  case 'chunk':
                    if (parsed.content) {
                      fullContent += parsed.content;
                      onChunk(parsed.content);
                    }
                    break;
                  case 'complete':
                    if (parsed.document) {
                      onComplete(parsed.document);
                    }
                    break;
                  case 'error':
                    onError(parsed.message || '生成失败');
                    break;
                  case 'progress':
                    // Handle progress events if needed
                    break;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        onError('网络错误');
      }
    }
  };

  startStreaming();

  // Return cleanup function
  return () => {
    if (abortController) {
      abortController.abort();
    }
  };
}

// Get document by ID
export async function getDocument(documentId: number): Promise<Document> {
  const response = await api.get<ApiResponse<{ document: Document }>>(`/documents/${documentId}`);
  if (!response.data.success) {
    throw new Error(response.data.message || '获取文书失败');
  }
  return response.data.data!.document;
}

// Update document
export async function updateDocument(documentId: number, data: Partial<Pick<Document, 'title' | 'content' | 'status'>>): Promise<Document> {
  const response = await api.patch<ApiResponse<{ document: Document }>>(`/documents/${documentId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.message || '更新失败');
  }
  return response.data.data!.document;
}

// Delete document (archive)
export async function deleteDocument(documentId: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/documents/${documentId}`);
  if (!response.data.success) {
    throw new Error(response.data.message || '删除失败');
  }
}

// Duplicate document
export async function duplicateDocument(documentId: number): Promise<Document> {
  const response = await api.post<ApiResponse<{ document: Document }>>(`/documents/${documentId}/duplicate`);
  if (!response.data.success) {
    throw new Error(response.data.message || '复制失败');
  }
  return response.data.data!.document;
}

// List documents
export interface ListDocumentsParams {
  typeId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListDocumentsResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function listDocuments(params: ListDocumentsParams = {}): Promise<ListDocumentsResponse> {
  const response = await api.get<ApiResponse<ListDocumentsResponse>>('/documents', { params });
  if (!response.data.success) {
    throw new Error(response.data.message || '获取文书列表失败');
  }
  return response.data.data!;
}
