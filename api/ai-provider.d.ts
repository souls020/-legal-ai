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
export declare function getProviderName(): string;
export declare function callAI(options: AICallOptions): Promise<string | null>;
export declare function callAIStream(options: AICallOptions, onChunk: (chunk: string) => void): Promise<string | null>;
export declare function callAIChat(messages: ChatMessage[]): Promise<string | null>;
export declare function callAIChatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string | null>;
//# sourceMappingURL=ai-provider.d.ts.map