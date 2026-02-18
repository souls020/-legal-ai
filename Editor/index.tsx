// Document Editor Page - A4 preview with rich text editing
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Space,
  Divider,
  Tag,
  Drawer,
  List,
  Input,
  message,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  BoldOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  HistoryOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { ExportModal, type ExportOptions } from '../../components/ExportModal';
import { exportDocument } from '../../utils/export';

const { Text } = Typography;
const { TextArea } = Input;

// Document types
type DocStatus = 'draft' | 'pending' | 'completed' | 'archived';

interface DocumentVersion {
  id: number;
  version: number;
  content: string;
  savedAt: string;
  auto: boolean;
}

// Mock document data
const mockDocument = {
  id: 1,
  title: '民事起诉状 - 张三诉李四',
  type: '民事',
  status: 'draft' as DocStatus,
  content: `民事起诉状

原告：张三，男，1980年1月1日出生，汉族，身份证号：110101198001010001，住北京市朝阳区XX路XX号。

被告：李四，男，1975年5月15日出生，汉族，身份证号：110101197505150002，住北京市海淀区XX路XX号。

诉讼请求：
1. 判令被告偿还借款本金人民币50万元；
2. 判令被告支付逾期还款利息（自2023年1月1日起至实际还款之日止，按年利率6%计算）；
3. 判令被告承担本案诉讼费用。

事实与理由：
原、被告双方系朋友关系。2022年1月1日，被告因资金周转需要向原告借款人民币50万元，约定于2022年12月31日前还清，并出具借条一张。借款到期后，经原告多次催要，被告均以各种理由推脱，至今未还。

综上，被告的行为已严重损害原告的合法权益，故诉至法院，请求依法支持原告的诉讼请求。

此致
北京市朝阳区人民法院

起诉人：张三
2024年1月15日`,
  updatedAt: '2024-01-15 14:30',
  createdAt: '2024-01-10',
};

// Mock version history
const mockVersions: DocumentVersion[] = [
  { id: 1, version: 3, content: mockDocument.content, savedAt: '2024-01-15 14:30', auto: false },
  { id: 2, version: 2, content: mockDocument.content, savedAt: '2024-01-15 14:00', auto: true },
  { id: 3, version: 1, content: '民事起诉状\n\n原告：张三...', savedAt: '2024-01-10 10:00', auto: false },
];

// Status configurations
const statusConfig: Record<DocStatus, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  pending: { color: 'processing', text: '待处理' },
  completed: { color: 'success', text: '已完成' },
  archived: { color: 'warning', text: '已归档' },
};

export const EditorPage: React.FC = () => {
  const { id: _documentId } = useParams<{ id: string }>();
  // Note: document ID would be used to fetch document from API in production
  const navigate = useNavigate();

  const [title, setTitle] = useState(mockDocument.title);
  const [content, setContent] = useState(mockDocument.content);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [versions] = useState<DocumentVersion[]>(mockVersions);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef(content);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (saveStatus === 'unsaved') {
        handleSave(true);
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveStatus, content]);

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (newContent !== lastSavedContentRef.current) {
      setSaveStatus('unsaved');
    }
  };

  // Save document
  const handleSave = useCallback((isAutoSave = false) => {
    setSaveStatus('saving');

    // Simulate API call
    setTimeout(() => {
      lastSavedContentRef.current = content;
      setSaveStatus('saved');

      if (!isAutoSave) {
        message.success(isAutoSave ? '自动保存成功' : '保存成功');
      }
    }, 500);
  }, [content]);

  // Format text commands
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      setContent(contentRef.current.innerText);
    }
    setSaveStatus('unsaved');
  };

  // Undo/Redo with keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('undo');
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          document.execCommand('redo');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show export modal
  const handleExportClick = () => {
    setExportModalVisible(true);
  };

  // Handle export with options
  const handleExport = async (options: ExportOptions) => {
    setExporting(true);
    setExportModalVisible(false);

    try {
      await exportDocument(content, title, options);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败，请重试');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  // Restore version
  const handleRestoreVersion = (version: DocumentVersion) => {
    setContent(version.content);
    setSaveStatus('unsaved');
    setHistoryVisible(false);
    message.success(`已恢复至版本 ${version.version}`);
  };

  // Get save status display
  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text type="secondary">已保存</Text>
          </Space>
        );
      case 'saving':
        return (
          <Space>
            <SyncOutlined spin style={{ color: '#1890ff' }} />
            <Text type="secondary">保存中...</Text>
          </Space>
        );
      case 'unsaved':
        return (
          <Space>
            <ClockCircleOutlined style={{ color: '#faad14' }} />
            <Text type="secondary">未保存</Text>
          </Space>
        );
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card size="small" style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
              返回
            </Button>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaveStatus('unsaved');
              }}
              style={{ width: 300, fontWeight: 'bold' }}
              variant="borderless"
            />
            <Tag color={statusConfig[mockDocument.status].color}>
              {statusConfig[mockDocument.status].text}
            </Tag>
          </Space>

          <Space>
            {getSaveStatusDisplay()}
            <Divider type="vertical" />

            {/* Undo/Redo */}
            <Tooltip title="撤销 (Ctrl+Z)">
              <Button icon={<UndoOutlined />} onClick={() => document.execCommand('undo')} />
            </Tooltip>
            <Tooltip title="重做 (Ctrl+Y)">
              <Button icon={<RedoOutlined />} onClick={() => document.execCommand('redo')} />
            </Tooltip>

            <Divider type="vertical" />

            {/* Formatting buttons */}
            <Tooltip title="加粗">
              <Button icon={<BoldOutlined />} onClick={() => formatText('bold')} />
            </Tooltip>
            <Tooltip title="下划线">
              <Button icon={<UnderlineOutlined />} onClick={() => formatText('underline')} />
            </Tooltip>
            <Tooltip title="左对齐">
              <Button icon={<AlignLeftOutlined />} onClick={() => formatText('justifyLeft')} />
            </Tooltip>
            <Tooltip title="居中">
              <Button icon={<AlignCenterOutlined />} onClick={() => formatText('justifyCenter')} />
            </Tooltip>
            <Tooltip title="右对齐">
              <Button icon={<AlignRightOutlined />} onClick={() => formatText('justifyRight')} />
            </Tooltip>

            <Divider type="vertical" />

            <Tooltip title="版本历史">
              <Button icon={<HistoryOutlined />} onClick={() => setHistoryVisible(true)}>
                历史
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportClick}
              loading={exporting}
            >
              导出
            </Button>

            <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave(false)}>
              保存
            </Button>
          </Space>
        </div>
      </Card>

      {/* Editor and Preview */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Editor Panel */}
        <Card
          title="编辑区"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          bodyStyle={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <TextArea
            value={content}
            onChange={handleContentChange}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 0,
              padding: 24,
              fontSize: 14,
              lineHeight: 1.8,
              fontFamily: 'SimSun, Songti SC, serif',
              resize: 'none',
            }}
            placeholder="在此输入文书内容..."
          />
        </Card>

        {/* A4 Preview Panel */}
        <Card
          title="预览"
          style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          bodyStyle={{ flex: 1, overflow: 'auto', padding: 0, display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}
        >
          <div
            style={{
              width: '210mm',
              minHeight: '297mm',
              margin: '20px',
              padding: '25mm 20mm',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontFamily: 'SimSun, Songti SC, serif',
              fontSize: '12pt',
              lineHeight: 2,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {content}
          </div>
        </Card>
      </div>

      {/* Version History Drawer */}
      <Drawer
        title="版本历史"
        placement="right"
        width={400}
        open={historyVisible}
        onClose={() => setHistoryVisible(false)}
      >
        <List
          dataSource={versions}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => handleRestoreVersion(item)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>版本 {item.version}</span>
                    {item.auto && <Tag color="blue">自动保存</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary">{item.savedAt}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onExport={handleExport}
        documentTitle={title}
        loading={exporting}
      />
    </div>
  );
};

export default EditorPage;
