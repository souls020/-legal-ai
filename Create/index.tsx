// AI Chat Interface for Document Generation
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Typography,
  Button,
  Input,
  Space,
  Card,
  Spin,
  Empty,
  Tooltip,
  message,
  Popconfirm,
  Progress,
  Select,
} from 'antd';
import {
  SendOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  UserOutlined,
  RobotOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';
import { regenerateDocument, generateDocumentStream, CaseInfo } from '../../services/document';
import { sendChatMessageStream, fetchDocumentTypes, ChatMessagePayload, DocumentTypesGrouped } from '../../services/chat';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Generated document type
interface GeneratedDocument {
  id?: number;
  title: string;
  content: string;
  type: string;
  typeId?: number;
  generatedAt: string;
}

// Extract case information from conversation messages
const extractCaseInfo = (messages: ChatMessage[]): CaseInfo => {
  const userMessages = messages.filter(m => m.role === 'user' && !m.isStreaming);

  const caseInfo: CaseInfo = {};

  // Group messages by approximate topic based on message count
  // This is a simple heuristic - in production, could use NLP
  userMessages.forEach((msg, index) => {
    const content = msg.content;

    if (index === 0 || content.includes('案件类型') || content.includes('民事') || content.includes('刑事') || content.includes('行政')) {
      caseInfo.case_type = content;
    } else if (content.includes('原告') || content.includes('被告') || content.includes('当事人') || content.includes('姓名') || content.includes('身份证')) {
      caseInfo.parties = content;
    } else if (content.includes('事实') || content.includes('经过') || content.includes('发生') || content.includes('原因')) {
      caseInfo.facts = content;
    } else if (content.includes('诉讼请求') || content.includes('请求') || content.includes('希望') || content.includes('判决')) {
      caseInfo.claims = content;
    } else if (content.includes('证据') || content.includes('材料') || content.includes('证明')) {
      caseInfo.evidence = content;
    } else {
      // If no clear category, append to facts or create new field
      if (!caseInfo.facts) {
        caseInfo.facts = content;
      } else {
        caseInfo.facts += '\n' + content;
      }
    }
  });

  // If we have limited info, include all user messages as facts
  if (!caseInfo.case_type && userMessages.length > 0) {
    caseInfo.case_type = userMessages[0]?.content || '';
  }
  if (!caseInfo.parties && userMessages.length > 1) {
    caseInfo.parties = userMessages[1]?.content || '';
  }
  if (!caseInfo.facts && userMessages.length > 2) {
    caseInfo.facts = userMessages.slice(2).map(m => m.content).join('\n\n');
  }

  return caseInfo;
};

// Preset questions for case information collection
const PRESET_QUESTIONS = [
  { key: 'case_type', label: '案件类型', question: '请告诉我这是什么类型的案件？例如：民事、刑事、行政等' },
  { key: 'parties', label: '当事人信息', question: '请告诉我案件中的当事人信息（原告、被告等）' },
  { key: 'facts', label: '案件事实', question: '请详细描述案件的基本事实经过' },
  { key: 'claims', label: '诉讼请求', question: '您的诉讼请求是什么？希望法院如何判决？' },
  { key: 'evidence', label: '证据材料', question: '您有哪些证据材料支持您的主张？' },
];

// AI initial greeting
const AI_GREETING = `您好！我是您的法律文书智能助手。

为了帮助您生成专业的法律文书，请您提供以下信息：

• 案件的基本情况
• 当事人信息
• 案件事实经过
• 您的诉讼请求
• 相关证据材料

您可以点击下方的问题开始，或者直接输入您的案件信息。`;

// Check if we have enough information to generate document
const hasEnoughInfo = (messages: ChatMessage[]): boolean => {
  const userMessages = messages.filter(m => m.role === 'user' && !m.isStreaming);
  return userMessages.length >= 3;
};

export const CreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: AI_GREETING,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Document types (loaded from API)
  const [documentTypes, setDocumentTypes] = useState<Array<{ value: number; label: string }>>([]);
  const [documentTypesGrouped, setDocumentTypesGrouped] = useState<DocumentTypesGrouped>({});
  const [selectedDocType, setSelectedDocType] = useState<number>(1);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [remainingRegenerations, setRemainingRegenerations] = useState(3);
  const [streamingContent, setStreamingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load document types from API
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const result = await fetchDocumentTypes();
        const flatTypes = result.types.map(t => ({ value: t.id, label: t.name }));
        setDocumentTypes(flatTypes);
        setDocumentTypesGrouped(result.grouped);
        if (flatTypes.length > 0) setSelectedDocType(flatTypes[0].value);
      } catch {
        console.error('Failed to load document types');
      }
    };
    loadTypes();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup streaming timeout on unmount
  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  // Generate unique ID
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Simulate streaming response
  const simulateStreamingResponse = useCallback((fullResponse: string) => {
    const messageId = generateId();
    let currentIndex = 0;

    // Add placeholder message
    setMessages(prev => [...prev, {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    setIsStreaming(true);

    const streamInterval = setInterval(() => {
      currentIndex += Math.random() * 10 + 5;
      if (currentIndex >= fullResponse.length) {
        currentIndex = fullResponse.length;
        clearInterval(streamInterval);

        // Update final message
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: fullResponse, isStreaming: false }
            : msg
        ));
        setIsStreaming(false);
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: fullResponse.slice(0, Math.floor(currentIndex)) }
            : msg
        ));
      }
    }, 50);
  }, []);

  // Handle sending message - calls real AI API
  const handleSendMessage = async (content?: string) => {
    const text = content || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);

    // Build message history for API
    const allMessages = [...messages, userMessage];
    const chatHistory: ChatMessagePayload[] = allMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Create placeholder for streaming response
    const replyId = generateId();
    setMessages(prev => [...prev, {
      id: replyId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      sendChatMessageStream(
        chatHistory,
        selectedDocType || undefined,
        (chunk) => {
          setMessages(prev => prev.map(msg =>
            msg.id === replyId ? { ...msg, content: msg.content + chunk } : msg
          ));
        },
        (_fullReply) => {
          setMessages(prev => prev.map(msg =>
            msg.id === replyId ? { ...msg, isStreaming: false } : msg
          ));
          setIsStreaming(false);
          setIsLoading(false);
        },
        (error) => {
          console.error('Chat error:', error);
          setMessages(prev => prev.map(msg =>
            msg.id === replyId
              ? { ...msg, content: msg.content || `抱歉，回复失败：${error}`, isStreaming: false }
              : msg
          ));
          setIsStreaming(false);
          setIsLoading(false);
        }
      );
    } catch (error) {
      message.error('发送消息失败，请重试');
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  // Handle edit message
  const handleEditMessage = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      setInputValue(msg.content);
      // Remove the message and subsequent ones
      const index = messages.findIndex(m => m.id === messageId);
      setMessages(prev => prev.slice(0, index));
    }
  };

  // Handle delete message
  const handleDeleteMessage = (messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      setMessages(prev => prev.slice(0, index));
    }
  };

  // Save generated document reference - document is already saved during generation
  const saveDocumentToDatabase = async (_doc: GeneratedDocument): Promise<number> => {
    // Document is already saved in the backend during generation
    // Just return the ID from the generated document
    return _doc.id || 0;
  };

  // Handle generate document with streaming support
  const handleGenerateDocument = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setStreamingContent('');

    try {
      // Extract case info from conversation
      const caseInfo = extractCaseInfo(messages);

      // Get document type name
      const docType = documentTypes.find(t => t.value === selectedDocType);
      const title = docType?.label || '法律文书';

      // Show progress steps
      setGenerationProgress(10);

      // Include conversation history for AI context
      const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
      (caseInfo as Record<string, unknown>)._conversationHistory = conversationHistory;

      // Use streaming API
      const cleanup = generateDocumentStream(
        {
          typeId: selectedDocType,
          title,
          caseInfo
        },
        // onChunk - called for each chunk of content
        (chunk) => {
          setStreamingContent(prev => prev + chunk);
          // Update progress based on content length (rough estimate)
          const currentLength = streamingContent.length + chunk.length;
          if (currentLength > 500) {
            setGenerationProgress(60);
          } else if (currentLength > 200) {
            setGenerationProgress(40);
          }
        },
        // onComplete - called when generation is complete
        (doc) => {
          setGenerationProgress(100);

          // Set generated document
          const generatedDoc: GeneratedDocument = {
            id: doc.id,
            title: doc.title,
            content: streamingContent || doc.content,
            type: docType?.label || '法律文书',
            typeId: doc.type_id,
            generatedAt: doc.created_at,
          };

          setGeneratedDocument(generatedDoc);
          setPreviewModalVisible(true);
          setIsGenerating(false);
          setGenerationProgress(0);

          message.success('文书生成成功！');

          // Show desktop notification if running in Electron
          if (window.electronAPI?.showNotification) {
            window.electronAPI.showNotification(
              '文书生成完成',
              `已成功生成：${generatedDoc.title}`
            );
          }
        },
        // onError - called when there's an error
        (error) => {
          console.error('Document generation error:', error);
          message.error(error || '文书生成失败，请重试');
          setIsGenerating(false);
          setGenerationProgress(0);
        }
      );

      // Store cleanup function ref for later
      (window as unknown as { _streamCleanup?: () => void })._streamCleanup = cleanup;

    } catch (error) {
      console.error('Document generation error:', error);
      const errorMessage = error instanceof Error ? error.message : '文书生成失败，请重试';
      message.error(errorMessage);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Handle confirm and navigate to editor
  const handleConfirmDocument = async () => {
    if (!generatedDocument) return;

    try {
      // Save to database
      const docId = await saveDocumentToDatabase(generatedDocument);

      // Store generated content in sessionStorage
      sessionStorage.setItem('generatedDocument', generatedDocument.content);
      sessionStorage.setItem('generatedDocumentId', String(docId));
      sessionStorage.setItem('generatedDocumentTitle', generatedDocument.title);

      message.success('文书已保存');

      // Navigate to editor
      navigate('/documents/new');
    } catch (error) {
      message.error('保存失败，请重试');
    }
  };

  // Handle regenerate document
  const handleRegenerateDocument = async () => {
    if (remainingRegenerations <= 0) {
      message.warning('今日重新生成次数已用完');
      return;
    }

    if (!generatedDocument?.id) {
      message.error('无法重新生成，请先生成新文书');
      return;
    }

    setRegenerateLoading(true);
    setPreviewModalVisible(false);

    try {
      // Extract case info from conversation
      const caseInfo = extractCaseInfo(messages);

      // Call backend API to regenerate document
      const doc = await regenerateDocument(generatedDocument.id, caseInfo);

      const docType = documentTypes.find(t => t.value === selectedDocType);

      // Set regenerated document
      const regeneratedDoc: GeneratedDocument = {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        type: docType?.label || '法律文书',
        typeId: doc.type_id,
        generatedAt: doc.updated_at,
      };

      setGeneratedDocument(regeneratedDoc);
      setPreviewModalVisible(true);

      setRemainingRegenerations(prev => prev - 1);
      message.success(`已重新生成，剩余 ${remainingRegenerations - 1} 次机会`);
    } catch (error) {
      console.error('Document regeneration error:', error);
      const errorMessage = error instanceof Error ? error.message : '重新生成失败，请重试';
      message.error(errorMessage);
      setPreviewModalVisible(true); // Re-show modal on error
    } finally {
      setRegenerateLoading(false);
    }
  };

  // Handle edit from preview
  const handleEditFromPreview = () => {
    setPreviewModalVisible(false);
    // Navigate to editor with current generated content
    if (generatedDocument) {
      sessionStorage.setItem('generatedDocument', generatedDocument.content);
      sessionStorage.setItem('generatedDocumentTitle', generatedDocument.title);
      navigate('/documents/new');
    }
  };

  // Render message bubble
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', maxWidth: '80%' }}>
          {/* Avatar */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isUser ? '#1890ff' : '#52c41a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginLeft: isUser ? 8 : 0,
            marginRight: isUser ? 0 : 8,
            flexShrink: 0,
          }}>
            {isUser ? <UserOutlined /> : <RobotOutlined />}
          </div>

          {/* Message content */}
          <div style={{
            background: isUser ? '#1890ff' : '#f5f5f5',
            color: isUser ? '#fff' : '#333',
            padding: '12px 16px',
            borderRadius: 12,
            borderTopRightRadius: isUser ? 4 : 12,
            borderTopLeftRadius: isUser ? 12 : 4,
            position: 'relative',
          }}>
            {msg.isStreaming ? (
              <span>
                {msg.content}
                <Spin indicator={<LoadingOutlined style={{ marginLeft: 8 }} spin />} size="small" />
              </span>
            ) : (
              <Paragraph
                style={{ color: isUser ? '#fff' : '#333', marginBottom: 0, whiteSpace: 'pre-wrap' }}
                copyable={!isUser ? { text: msg.content } : false}
              >
                {msg.content}
              </Paragraph>
            )}

            {/* Action buttons for user messages */}
            {isUser && !msg.isStreaming && (
              <div style={{ position: 'absolute', right: 8, top: 8, opacity: 0 }}>
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditMessage(msg.id)}
                    style={{ color: isUser ? 'rgba(255,255,255,0.7)' : undefined }}
                  />
                </Tooltip>
                <Popconfirm
                  title="确定删除此消息吗？"
                  onConfirm={() => handleDeleteMessage(msg.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      style={{ color: isUser ? 'rgba(255,255,255,0.7)' : undefined }}
                    />
                  </Tooltip>
                </Popconfirm>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render preset questions
  const renderPresetQuestions = () => {
    const userMessageCount = messages.filter(m => m.role === 'user' && !m.isStreaming).length;
    const visibleQuestions = PRESET_QUESTIONS.slice(0, userMessageCount + 2);

    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>快速提问：</Text>
        <Space wrap>
          {visibleQuestions.map((q) => (
            <Button
              key={q.key}
              onClick={() => handleSendMessage(q.question)}
              disabled={isLoading || isStreaming}
            >
              {q.label}
            </Button>
          ))}
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          AI 文书生成
        </Title>
        <Text type="secondary">与 AI 助手对话，生成专业法律文书</Text>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>正在生成法律文书...</Text>
              <Progress
                percent={generationProgress}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {generationProgress < 20 && '分析案件信息...'}
                {generationProgress >= 20 && generationProgress < 40 && '匹配法律模板...'}
                {generationProgress >= 40 && generationProgress < 60 && '生成文书内容...'}
                {generationProgress >= 60 && generationProgress < 80 && '格式化文档...'}
                {generationProgress >= 80 && generationProgress < 100 && '完成中...'}
                {generationProgress === 100 && '即将完成！'}
              </Text>
            </Space>
          </div>
        </Card>
      )}

      {/* Chat container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
      }}>
        {/* Messages area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          background: '#fafafa',
        }}>
          {messages.length === 0 && (
            <Empty description="开始与 AI 助手对话" />
          )}
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Preset questions */}
        {!isStreaming && !isGenerating && (
          <div style={{ padding: '0 16px' }}>
            {renderPresetQuestions()}
          </div>
        )}

        {/* Input area */}
        <div style={{
          padding: 16,
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
        }}>
          {hasEnoughInfo(messages) && !isStreaming && !isGenerating ? (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space wrap>
                  <Text>文书类型：</Text>
                  <Select
                    value={selectedDocType}
                    onChange={setSelectedDocType}
                    style={{ width: 240 }}
                    showSearch
                    optionFilterProp="label"
                    placeholder="选择文书类型"
                    options={documentTypes}
                  />
                </Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={handleGenerateDocument}
                >
                  生成法律文书
                </Button>
                <Text type="secondary">
                  已收集足够信息
                </Text>
              </Space>
            </div>
          ) : null}

          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="输入您的案件信息... (Shift+Enter 换行)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={isLoading || isStreaming || isGenerating}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSendMessage()}
              loading={isLoading || isStreaming}
              disabled={!inputValue.trim() || isGenerating}
            >
              发送
            </Button>
          </Space.Compact>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        visible={previewModalVisible}
        document={generatedDocument}
        onConfirm={handleConfirmDocument}
        onRegenerate={handleRegenerateDocument}
        onEdit={handleEditFromPreview}
        loading={isLoading}
        regenerateLoading={regenerateLoading}
        remainingRegenerations={remainingRegenerations}
      />
    </div>
  );
};

export default CreatePage;
