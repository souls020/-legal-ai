// Export Modal Component - Export document to various formats
import {
  Modal,
  Radio,
  Slider,
  Form,
  Select,
  Typography,
  Space,
  Divider,
  Alert,
} from 'antd';
import {
  FileWordOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

// Export format types
export type ExportFormat = 'docx' | 'pdf' | 'txt';

// Export options interface
export interface ExportOptions {
  format: ExportFormat;
  fontSize: number;
  lineHeight: number;
  fontFamily: 'SimSun' | 'SimHei' | 'Arial';
  margins: 'normal' | 'narrow' | 'wide';
  fileName?: string;
}

// Default export options
const defaultOptions: ExportOptions = {
  format: 'docx',
  fontSize: 12,
  lineHeight: 1.5,
  fontFamily: 'SimSun',
  margins: 'normal',
};

// Props interface
interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  onExport: (options: ExportOptions) => void;
  documentTitle: string;
  loading?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onCancel,
  onExport,
  documentTitle,
  loading = false,
}) => {
  const [form] = Form.useForm<ExportOptions>();

  // Font size marks
  const fontSizeMarks = {
    10: '10pt',
    12: '12pt',
    14: '14pt',
    16: '16pt',
    18: '18pt',
    20: '20pt',
  };

  // Line height marks
  const lineHeightMarks: Record<number, string> = {
    1: '1.0',
    1.5: '1.5',
    2: '2.0',
    2.5: '2.5',
  };

  // Handle export
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onExport({
        ...values,
        fileName: documentTitle,
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileWordOutlined style={{ color: '#1890ff' }} />
          <span>导出文书</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={520}
      okText="导出"
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={defaultOptions}
        preserve={false}
      >
        {/* Format Selection */}
        <Form.Item
          name="format"
          label="导出格式"
          rules={[{ required: true, message: '请选择导出格式' }]}
        >
          <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Radio.Button
                value="docx"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  height: 'auto',
                  padding: '16px',
                }}
              >
                <Space>
                  <FileWordOutlined style={{ fontSize: 24, color: '#2b579a' }} />
                  <div style={{ textAlign: 'left' }}>
                    <Text strong>Word 文档 (.docx)</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      适用于编辑和进一步修改
                    </Text>
                  </div>
                </Space>
              </Radio.Button>

              <Radio.Button
                value="pdf"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  height: 'auto',
                  padding: '16px',
                }}
              >
                <Space>
                  <FilePdfOutlined style={{ fontSize: 24, color: '#f5222d' }} />
                  <div style={{ textAlign: 'left' }}>
                    <Text strong>PDF 文档 (.pdf)</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      适用于打印和正式提交
                    </Text>
                  </div>
                </Space>
              </Radio.Button>

              <Radio.Button
                value="txt"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  height: 'auto',
                  padding: '16px',
                }}
              >
                <Space>
                  <FileTextOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <div style={{ textAlign: 'left' }}>
                    <Text strong>纯文本 (.txt)</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      适用于简单文本编辑
                    </Text>
                  </div>
                </Space>
              </Radio.Button>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Divider />

        {/* Font Family */}
        <Form.Item
          name="fontFamily"
          label="字体"
          tooltip="选择文档正文字体"
        >
          <Select>
            <Option value="SimSun">宋体 (SimSun)</Option>
            <Option value="SimHei">黑体 (SimHei)</Option>
            <Option value="Arial">Arial</Option>
          </Select>
        </Form.Item>

        {/* Font Size */}
        <Form.Item
          name="fontSize"
          label={
            <Space>
              <span>字号</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                (pt)
              </Text>
            </Space>
          }
          tooltip="选择文档正文字号"
        >
          <Slider
            min={10}
            max={20}
            step={1}
            marks={fontSizeMarks}
            tooltip={{ formatter: (value) => `${value}pt` }}
          />
        </Form.Item>

        {/* Line Height */}
        <Form.Item
          name="lineHeight"
          label={
            <Space>
              <span>行距</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                (倍)
              </Text>
            </Space>
          }
          tooltip="选择文档行距"
        >
          <Slider
            min={1}
            max={2.5}
            step={0.25}
            marks={lineHeightMarks}
            tooltip={{ formatter: (value) => `${value}倍` }}
          />
        </Form.Item>

        {/* Page Margins */}
        <Form.Item
          name="margins"
          label="页边距"
          tooltip="选择页面边距样式"
        >
          <Select>
            <Option value="narrow">紧凑 (上下 1.5cm，左右 2cm)</Option>
            <Option value="normal">标准 (上下 2.5cm，左右 3.17cm)</Option>
            <Option value="wide">宽松 (上下 3cm，左右 4cm)</Option>
          </Select>
        </Form.Item>

        {/* Preview Info */}
        <Alert
          message={
            <Text type="secondary">
              文书标题: <Text strong>{documentTitle}</Text>
            </Text>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Form>
    </Modal>
  );
};

export default ExportModal;
