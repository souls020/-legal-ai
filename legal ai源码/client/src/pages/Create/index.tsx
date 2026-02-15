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
  title: string;
  content: string;
  type: string;
  generatedAt: string;
}

// Generate a mock legal document based on conversation
const generateMockDocument = (_messages: ChatMessage[]): GeneratedDocument => {
  // Messages are used to determine context, but we generate consistent mock content
  return {
    title: '民事起诉状',
    type: '民事',
    content: `民事起诉状

原告：张三，男，1980年1月1日出生，汉族，身份证号：110101198001010001，住北京市朝阳区XX路XX号，联系电话：138XXXXXXXX。

被告：李四，男，1975年5月15日出生，汉族，身份证号：110101197505150002，住北京市海淀区XX路XX号。

诉讼请求：
1. 判令被告偿还借款本金人民币50万元；
2. 判令被告支付逾期还款利息（自2023年1月1日起至实际还款之日止，按年利率6%计算）；
3. 判令被告承担本案诉讼费用。

事实与理由：
原、被告双方系朋友关系。2022年1月1日，被告因资金周转需要向原告借款人民币50万元，约定于2022年12月31日前还清，并出具借条一张。借款到期后，经原告多次催要，被告均以各种理由推脱，至今未还。

综上所述，被告的行为已严重损害原告的合法权益。为维护原告的合法权益，特向贵院提起诉讼，恳请依法判决支持原告的诉讼请求。

此致
北京市朝阳区人民法院

起诉人：张三
${new Date().toLocaleDateString('zh-CN')}`,
    generatedAt: new Date().toISOString(),
  };
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

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [remainingRegenerations, setRemainingRegenerations] = useState(3);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle sending message
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

    try {
      // Simulate AI response (in real app, call API here)
      await new Promise(resolve => setTimeout(resolve, 500));

      let response = '';
      const userMessageCount = messages.filter(m => m.role === 'user').length + 1;

      // Generate contextual response based on message count
      switch (userMessageCount) {
        case 1:
          response = '感谢您提供的信息。为了更好地帮助您，请问案件的详细情况是怎样的？具体发生了什么事件？';
          break;
        case 2:
          response = '明白了。请告诉我案件中的当事人详细信息，包括他们的姓名、身份证号（如有）、联系方式等。';
          break;
        case 3:
          response = '好的，我已经了解了基本情况和当事人信息。请问您的诉讼请求是什么？您希望法院如何判决？';
          break;
        case 4:
          response = '了解了您的诉讼请求。那么您有哪些证据材料可以支持您的主张？请简要说明。';
          break;
        case 5:
          response = `好的，我已经收集了足够的案件信息：

• 案件类型：${text}
• 当事人信息：已提供
• 案件事实：已提供
• 诉讼请求：已提供
• 证据材料：已提供

信息收集完成！您可以点击下方的"生成文书"按钮，我将为您生成专业的法律文书。
`;
          break;
        default:
          response = '您还有其他需要补充的信息吗？如果已经足够，请点击"生成文书"按钮。';
      }

      simulateStreamingResponse(response);
    } catch (error) {
      message.error('发送消息失败，请重试');
    } finally {
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

  // Save generated document to database (mock)
  const saveDocumentToDatabase = async (_doc: GeneratedDocument): Promise<number> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return mock document ID
    return Math.floor(Math.random() * 10000) + 1;
  };

  // Handle generate document with progress indicator
  const handleGenerateDocument = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate generation progress
      const progressSteps = [
        { progress: 20, message: '分析案件信息...' },
        { progress: 40, message: '匹配法律模板...' },
        { progress: 60, message: '生成文书内容...' },
        { progress: 80, message: '格式化文档...' },
        { progress: 100, message: '完成！' },
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setGenerationProgress(step.progress);
      }

      // Generate the document
      const doc = generateMockDocument(messages);
      setGeneratedDocument(doc);
      setPreviewModalVisible(true);

      message.success('文书生成成功！');
    } catch (error) {
      message.error('文书生成失败，请重试');
    } finally {
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

    setRegenerateLoading(true);
    setPreviewModalVisible(false);

    try {
      // Simulate regeneration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate new document
      const newDoc = generateMockDocument(messages);
      setGeneratedDocument(newDoc);
      setPreviewModalVisible(true);

      setRemainingRegenerations(prev => prev - 1);
      message.success(`已重新生成，剩余 ${remainingRegenerations - 1} 次机会`);
    } catch (error) {
      message.error('重新生成失败，请重试');
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
              <Button
                type="primary"
                size="large"
                icon={<FileTextOutlined />}
                onClick={handleGenerateDocument}
              >
                生成法律文书
              </Button>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                已收集足够信息
              </Text>
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
