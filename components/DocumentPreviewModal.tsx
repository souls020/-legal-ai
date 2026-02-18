// Document Preview Modal - Show generated document before final confirmation
import { useState } from 'react';
import { Modal, Button, Typography, Space, Progress, Divider, Card, Tag, Spin } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface GeneratedDocument {
  title: string;
  content: string;
  type: string;
  generatedAt: string;
}

interface DocumentPreviewModalProps {
  visible: boolean;
  document: GeneratedDocument | null;
  onConfirm: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
  loading: boolean;
  regenerateLoading: boolean;
  remainingRegenerations: number;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  visible,
  document,
  onConfirm,
  onRegenerate,
  onEdit,
  loading,
  regenerateLoading,
  remainingRegenerations,
}) => {
  const [previewContent, setPreviewContent] = useState<string>('');

  // Update preview when document changes
  if (document && previewContent !== document.content) {
    setPreviewContent(document.content);
  }

  // Reset preview when modal closes
  if (!visible && previewContent) {
    setPreviewContent('');
  }

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>文书预览</span>
        </Space>
      }
      open={visible}
      onCancel={() => {}}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={onEdit}
              disabled={loading}
            >
              编辑内容
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={onRegenerate}
              loading={regenerateLoading}
              disabled={remainingRegenerations <= 0 || loading}
            >
              重新生成 ({remainingRegenerations}次)
            </Button>
          </Space>
          <Space>
            <Button onClick={() => {}} disabled={loading}>
              暂不生成
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={onConfirm}
              loading={loading}
            >
              确认并打开编辑器
            </Button>
          </Space>
        </div>
      }
      width={900}
      style={{ top: 20 }}
    >
      {document ? (
        <div>
          {/* Document Info */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text strong style={{ fontSize: 16 }}>{document.title}</Text>
                <Tag color="blue">{document.type}</Tag>
              </Space>
              <Text type="secondary">
                生成时间: {new Date(document.generatedAt).toLocaleString('zh-CN')}
              </Text>
            </div>
          </Card>

          {/* Regenerate Info */}
          {remainingRegenerations < 3 && (
            <div style={{ marginBottom: 16 }}>
              <Progress
                percent={(remainingRegenerations / 3) * 100}
                format={() => `剩余 ${remainingRegenerations}/3 次重新生成机会`}
                size="small"
                status={remainingRegenerations === 0 ? 'exception' : 'active'}
              />
            </div>
          )}

          {/* A4 Preview */}
          <div
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              padding: 0,
              background: '#fff',
              maxHeight: '60vh',
              overflow: 'auto',
            }}
          >
            <div
              style={{
                width: '210mm',
                minHeight: '297mm',
                margin: '20px',
                padding: '25mm 20mm',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontFamily: 'SimSun, Songti SC, serif',
                fontSize: '12pt',
                lineHeight: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <Paragraph style={{ marginBottom: 0 }} copyable={{ text: previewContent }}>
                {previewContent}
              </Paragraph>
            </div>
          </div>

          <Divider />

          {/* Actions Info */}
          <Text type="secondary">
            您可以点击"重新生成"获得新的版本，或点击"编辑内容"手动修改后再确认。
          </Text>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在生成文书...</Text>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DocumentPreviewModal;
