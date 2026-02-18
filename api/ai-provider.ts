// AI Provider Abstraction Layer
// Supports Wenxin (ERNIE-4.0) and Tongyi (Qwen) with automatic fallback to mock

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICallOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

// ============================================================
// Configuration
// ============================================================

const AI_CONFIG = {
  provider: (process.env.AI_PROVIDER || 'wenxin') as 'wenxin' | 'tongyi',
  wenxin: {
    apiKey: process.env.WENXIN_API_KEY || '',
    secretKey: process.env.WENXIN_SECRET_KEY || '',
    chatEndpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-4.0-turbo-128k',
    tokenEndpoint: 'https://aip.baidubce.com/oauth/2.0/token',
  },
  tongyi: {
    apiKey: process.env.TONGYI_API_KEY || '',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max',
  },
};

export function getProviderName(): string {
  return AI_CONFIG.provider;
}

// ============================================================
// Wenxin (ERNIE) Access Token Management
// ============================================================

let wenxinAccessToken: string | null = null;
let wenxinTokenExpiry: number = 0;

async function getWenxinAccessToken(): Promise<string | null> {
  if (wenxinAccessToken && Date.now() < wenxinTokenExpiry) {
    return wenxinAccessToken;
  }

  const { apiKey, secretKey, tokenEndpoint } = AI_CONFIG.wenxin;
  if (!apiKey || !secretKey) return null;

  try {
    const url = `${tokenEndpoint}?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      console.error('[Wenxin] Token request failed:', response.status);
      return null;
    }

    const data = await response.json() as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (data.error) {
      console.error('[Wenxin] Token error:', data.error, data.error_description);
      return null;
    }

    wenxinAccessToken = data.access_token || null;
    wenxinTokenExpiry = Date.now() + ((data.expires_in || 2592000) - 300) * 1000;
    console.log('[Wenxin] Access token obtained, expires in', data.expires_in, 'seconds');
    return wenxinAccessToken;
  } catch (error) {
    console.error('[Wenxin] Token request error:', error);
    return null;
  }
}

// ============================================================
// Wenxin API Calls
// ============================================================

async function callWenxinApi(options: AICallOptions): Promise<string | null> {
  const token = await getWenxinAccessToken();
  if (!token) return null;

  const { chatEndpoint } = AI_CONFIG.wenxin;
  const url = `${chatEndpoint}?access_token=${token}`;

  // Wenxin requires system message to be a separate field
  const systemMessage = options.messages.find(m => m.role === 'system');
  const chatMessages = options.messages.filter(m => m.role !== 'system');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
        system: systemMessage?.content || undefined,
        temperature: options.temperature ?? 0.6,
        max_output_tokens: options.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Wenxin] API error:', response.status, errText);
      return null;
    }

    const data = await response.json() as {
      result?: string;
      error_code?: number;
      error_msg?: string;
    };

    if (data.error_code) {
      console.error('[Wenxin] API error:', data.error_code, data.error_msg);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('[Wenxin] API call failed:', error);
    return null;
  }
}

async function callWenxinApiStream(
  options: AICallOptions,
  onChunk: (chunk: string) => void
): Promise<string | null> {
  const token = await getWenxinAccessToken();
  if (!token) return null;

  const { chatEndpoint } = AI_CONFIG.wenxin;
  const url = `${chatEndpoint}?access_token=${token}`;

  const systemMessage = options.messages.find(m => m.role === 'system');
  const chatMessages = options.messages.filter(m => m.role !== 'system');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
        system: systemMessage?.content || undefined,
        temperature: options.temperature ?? 0.6,
        max_output_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Wenxin] Stream API error:', response.status, errText);
      return null;
    }

    if (!response.body) {
      console.error('[Wenxin] No response body for stream');
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr) as {
            result?: string;
            is_end?: boolean;
            error_code?: number;
          };
          if (parsed.result) {
            fullContent += parsed.result;
            onChunk(parsed.result);
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    return fullContent || null;
  } catch (error) {
    console.error('[Wenxin] Stream API call failed:', error);
    return null;
  }
}

// ============================================================
// Tongyi (Qwen) API Calls
// ============================================================

async function callTongyiApi(options: AICallOptions): Promise<string | null> {
  const { apiKey, endpoint, model } = AI_CONFIG.tongyi;
  if (!apiKey) return null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Tongyi] API error:', response.status, errText);
      return null;
    }

    const data = await response.json() as {
      choices?: Array<{ message: { content: string } }>;
      error?: { message: string };
    };

    if (data.error) {
      console.error('[Tongyi] API error:', data.error.message);
      return null;
    }

    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('[Tongyi] API call failed:', error);
    return null;
  }
}

async function callTongyiApiStream(
  options: AICallOptions,
  onChunk: (chunk: string) => void
): Promise<string | null> {
  const { apiKey, endpoint, model } = AI_CONFIG.tongyi;
  if (!apiKey) return null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.6,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Tongyi] Stream API error:', response.status, errText);
      return null;
    }

    if (!response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    return fullContent || null;
  } catch (error) {
    console.error('[Tongyi] Stream API call failed:', error);
    return null;
  }
}

// ============================================================
// Mock Fallback (no API key configured)
// ============================================================

function generateMockContent(messages: ChatMessage[]): string {
  const userContent = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n');

  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  const isCivil = userContent.includes('民事');
  const isCriminal = userContent.includes('刑事');
  const category = isCriminal ? '刑事' : isCivil ? '民事' : '民事';

  return `${category}起诉状

致：人民法院

原告：[原告姓名]，[性别]，[出生日期]，[民族]，住[地址]
身份证号码：[身份证号]
联系电话：[电话号码]

被告：[被告姓名]，[性别]，[出生日期]，[民族]，住[地址]
身份证号码：[身份证号]
联系电话：[电话号码]

诉讼请求：

一、请求判令被告[具体请求一]；
二、请求判令被告[具体请求二]；
三、本案诉讼费用由被告承担。

事实与理由：

[此处为AI根据案件信息生成的事实与理由部分。当前为演示模式，请配置 WENXIN_API_KEY 和 WENXIN_SECRET_KEY 以启用真实AI生成。]

根据《中华人民共和国民法典》相关规定及《中华人民共和国民事诉讼法》第一百二十二条之规定，特向贵院提起诉讼，恳请贵院依法支持原告的全部诉讼请求。

此致

[管辖法院名称]人民法院

具状人：[原告姓名]
${dateStr}

附：
1. 原告身份证复印件一份
2. 相关证据材料

【注意：当前为演示模式，请在 .env 文件中配置文心一言 API Key 以启用真实AI生成】`;
}

function generateMockChatReply(messages: ChatMessage[]): string {
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

  if (userMsgCount <= 1) {
    return `感谢您的描述。为了帮您生成专业的法律文书，我需要了解更多信息：

1. **当事人信息**：请提供原告和被告的基本信息（姓名、性别、身份证号、住址、联系方式）
2. **案件事实**：请详细描述事件的经过

请先告诉我当事人的详细信息。

【演示模式：请配置 WENXIN_API_KEY 启用真实AI对话】`;
  }
  if (userMsgCount === 2) {
    return `好的，当事人信息已记录。接下来请告诉我：

1. **案件事实经过**：具体发生了什么事？时间、地点、经过
2. **您的诉讼请求**：您希望法院如何判决？`;
  }
  if (userMsgCount === 3) {
    return `明白了。请问您的具体**诉讼请求**是什么？例如：
- 要求赔偿金额
- 要求履行合同
- 要求解除合同
- 其他请求`;
  }
  return `信息已收集完毕。您现在可以选择文书类型并点击"生成文书"按钮来生成法律文书了。

如果需要补充信息，请继续输入。`;
}

// ============================================================
// Public Router API
// ============================================================

function isApiKeyConfigured(): boolean {
  if (AI_CONFIG.provider === 'wenxin') {
    return !!(AI_CONFIG.wenxin.apiKey && AI_CONFIG.wenxin.secretKey);
  }
  return !!AI_CONFIG.tongyi.apiKey;
}

export async function callAI(options: AICallOptions): Promise<string | null> {
  if (!isApiKeyConfigured()) {
    console.log(`[AI][${AI_CONFIG.provider}] No API key configured, using mock mode`);
    return generateMockContent(options.messages);
  }

  console.log(`[AI] Calling ${AI_CONFIG.provider} API...`);
  if (AI_CONFIG.provider === 'wenxin') {
    return callWenxinApi(options);
  }
  return callTongyiApi(options);
}

export async function callAIStream(
  options: AICallOptions,
  onChunk: (chunk: string) => void
): Promise<string | null> {
  if (!isApiKeyConfigured()) {
    console.log(`[AI][${AI_CONFIG.provider}] No API key configured, using mock stream mode`);
    const mockContent = generateMockContent(options.messages);
    const chunkSize = 20;
    for (let i = 0; i < mockContent.length; i += chunkSize) {
      onChunk(mockContent.slice(i, i + chunkSize));
      await new Promise(r => setTimeout(r, 25));
    }
    return mockContent;
  }

  console.log(`[AI] Calling ${AI_CONFIG.provider} stream API...`);
  if (AI_CONFIG.provider === 'wenxin') {
    return callWenxinApiStream(options, onChunk);
  }
  return callTongyiApiStream(options, onChunk);
}

export async function callAIChat(messages: ChatMessage[]): Promise<string | null> {
  if (!isApiKeyConfigured()) {
    return generateMockChatReply(messages);
  }

  if (AI_CONFIG.provider === 'wenxin') {
    return callWenxinApi({ messages, temperature: 0.7, maxTokens: 2048 });
  }
  return callTongyiApi({ messages, temperature: 0.7, maxTokens: 2048 });
}

export async function callAIChatStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void
): Promise<string | null> {
  if (!isApiKeyConfigured()) {
    const reply = generateMockChatReply(messages);
    const chunkSize = 8;
    for (let i = 0; i < reply.length; i += chunkSize) {
      onChunk(reply.slice(i, i + chunkSize));
      await new Promise(r => setTimeout(r, 30));
    }
    return reply;
  }

  const options: AICallOptions = { messages, temperature: 0.7, maxTokens: 2048 };
  if (AI_CONFIG.provider === 'wenxin') {
    return callWenxinApiStream(options, onChunk);
  }
  return callTongyiApiStream(options, onChunk);
}
