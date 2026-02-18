// Documents Page - Document list/grid view
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Select,
  Button,
  Typography,
  Row,
  Col,
  Tag,
  Space,
  Empty,
  Spin,
  List,
  Badge,
  Checkbox,
  message,
} from 'antd';
import {
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  DownOutlined,
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ExportModal, type ExportOptions } from '../../components/ExportModal';
import { exportDocument } from '../../utils/export';

const { Title, Text } = Typography;
const { Option } = Select;

// Document type and status definitions
type DocStatus = 'draft' | 'pending' | 'completed' | 'archived';

interface Document {
  id: number;
  title: string;
  type: string;
  status: DocStatus;
  updatedAt: string;
  createdAt: string;
}

// Mock documents for demo
const mockDocuments: Document[] = [
  { id: 1, title: '民事起诉状 - 张三诉李四', type: '民事', status: 'completed', updatedAt: '2024-01-15 14:30', createdAt: '2024-01-10' },
  { id: 2, title: '劳动合同解除通知书', type: '劳动', status: 'completed', updatedAt: '2024-01-14 09:15', createdAt: '2024-01-08' },
  { id: 3, title: '房屋租赁合同', type: '民事', status: 'draft', updatedAt: '2024-01-12 16:45', createdAt: '2024-01-12' },
  { id: 4, title: '离婚协议书', type: '民事', status: 'pending', updatedAt: '2024-01-10 11:20', createdAt: '2024-01-05' },
  { id: 5, title: '借款合同纠纷起诉状', type: '民事', status: 'completed', updatedAt: '2024-01-08 08:00', createdAt: '2024-01-02' },
  { id: 6, title: '交通事故责任认定书异议申请', type: '交通', status: 'archived', updatedAt: '2024-01-05 10:30', createdAt: '2023-12-28' },
  { id: 7, title: '商标侵权起诉状', type: '知识产权', status: 'draft', updatedAt: '2024-01-03 15:00', createdAt: '2024-01-03' },
  { id: 8, title: '股权转让协议', type: '商事', status: 'completed', updatedAt: '2024-01-01 09:45', createdAt: '2023-12-20' },
];

// Status configurations
const statusConfig: Record<DocStatus, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  pending: { color: 'processing', text: '待处理' },
  completed: { color: 'success', text: '已完成' },
  archived: { color: 'warning', text: '已归档' },
};

// Type colors
const typeColors: Record<string, string> = {
  '民事': 'blue',
  '劳动': 'green',
  '交通': 'orange',
  '知识产权': 'purple',
  '商事': 'cyan',
};

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [batchExportVisible, setBatchExportVisible] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);

  // Simulate loading
  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  // Filter documents based on search and status
  const filteredDocuments = useMemo(() => {
    return mockDocuments.filter((doc) => {
      const matchesSearch = doc.title.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchText, statusFilter]);

  const handleCreate = () => {
    navigate('/create');
  };

  const handleCardClick = (docId: number) => {
    navigate(`/documents/${docId}`);
  };

  // Batch export handlers
  const handleBatchExportClick = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的文书');
      return;
    }
    setBatchExportVisible(true);
  };

  const handleBatchExport = async (options: ExportOptions) => {
    setBatchExporting(true);
    setBatchExportVisible(false);

    const selectedDocs = mockDocuments.filter(doc => selectedRowKeys.includes(doc.id));

    for (const doc of selectedDocs) {
      try {
        // Use mock content for demo - in production, fetch full content from API
        await exportDocument(doc.title, doc.title, options);
        message.success(`已导出: ${doc.title}`);
      } catch (error) {
        message.error(`导出失败: ${doc.title}`);
        console.error('Export error:', error);
      }
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setSelectedRowKeys([]);
    setBatchExporting(false);
    message.success(`批量导出完成，共导出 ${selectedDocs.length} 份文书`);
  };

  // Actions for list view dropdown
  const getListActions = (doc: Document) => [
    <Button
      type="text"
      icon={<EditOutlined />}
      onClick={(e) => {
        e.stopPropagation();
        handleCardClick(doc.id);
      }}
    >
      编辑
    </Button>,
    <Button type="text" danger icon={<DeleteOutlined />}>
      删除
    </Button>,
  ];

  // Grid view card component
  const renderGridCard = (doc: Document) => {
    const isSelected = selectedRowKeys.includes(doc.id);
    return (
      <Col xs={24} sm={12} md={8} lg={6} key={doc.id}>
        <Card
          hoverable
          onClick={() => handleCardClick(doc.id)}
          style={{
            height: '100%',
            borderColor: isSelected ? '#1890ff' : undefined,
            borderWidth: isSelected ? 2 : 1,
          }}
          bodyStyle={{ paddingBottom: 8 }}
          actions={[
            <EditOutlined key="edit" onClick={(e) => { e.stopPropagation(); handleCardClick(doc.id); }} />,
            <DeleteOutlined key="delete" onClick={(e) => e.stopPropagation()} />,
          ]}
        >
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
          }}>
            <Checkbox
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRowKeys([...selectedRowKeys, doc.id]);
                } else {
                  setSelectedRowKeys(selectedRowKeys.filter(id => id !== doc.id));
                }
              }}
            />
          </div>
          <Card.Meta
            avatar={
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: typeColors[doc.type] ? `var(--ant-color-${typeColors[doc.type]}-6, #1890ff)` : '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileTextOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
            }
            title={
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.title}>
                {doc.title}
              </div>
            }
            description={
              <div>
                <Space size={4} style={{ marginBottom: 8 }}>
                  <Tag color={typeColors[doc.type] || 'default'}>{doc.type}</Tag>
                  <Tag color={statusConfig[doc.status].color}>{statusConfig[doc.status].text}</Tag>
                </Space>
                <div style={{ fontSize: 12, color: '#999' }}>
                  更新于 {doc.updatedAt}
                </div>
              </div>
            }
          />
        </Card>
      </Col>
    );
  };

  // List view item component
  const renderListItem = (doc: Document) => {
    const isSelected = selectedRowKeys.includes(doc.id);
    return (
      <List.Item
        onClick={() => handleCardClick(doc.id)}
        style={{
          cursor: 'pointer',
          padding: '16px 24px',
          background: isSelected ? '#e6f7ff' : undefined,
        }}
        actions={getListActions(doc)}
      >
        <List.Item.Meta
          avatar={
            <Checkbox
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRowKeys([...selectedRowKeys, doc.id]);
                } else {
                  setSelectedRowKeys(selectedRowKeys.filter(id => id !== doc.id));
                }
              }}
            />
          }
          title={
            <Space>
              <span>{doc.title}</span>
              <Tag color={statusConfig[doc.status].color} style={{ marginLeft: 8 }}>
                {statusConfig[doc.status].text}
              </Tag>
            </Space>
          }
          description={
            <Space size={16}>
              <Tag color={typeColors[doc.type] || 'default'}>{doc.type}</Tag>
              <Text type="secondary">更新于 {doc.updatedAt}</Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>我的文书</Title>
          <Text type="secondary">共 {filteredDocuments.length} 份文书</Text>
          {selectedRowKeys.length > 0 && (
            <Text type="secondary" style={{ marginLeft: 16 }}>
              已选择 {selectedRowKeys.length} 份文书
            </Text>
          )}
        </div>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleBatchExportClick}
              loading={batchExporting}
            >
              批量导出 ({selectedRowKeys.length})
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建文书
          </Button>
        </Space>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜索文书标题..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="文书状态"
              value={statusFilter}
              onChange={setStatusFilter}
              suffixIcon={<DownOutlined />}
            >
              <Option value="all">全部状态</Option>
              <Option value="draft">
                <Badge status="default" text="草稿" />
              </Option>
              <Option value="pending">
                <Badge status="processing" text="待处理" />
              </Option>
              <Option value="completed">
                <Badge status="success" text="已完成" />
              </Option>
              <Option value="archived">
                <Badge status="warning" text="已归档" />
              </Option>
            </Select>
          </Col>
          <Col xs={24} md={10} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Text type="secondary">视图:</Text>
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('grid')}
              />
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('list')}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Documents Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <Empty description="暂无匹配的文书">
            <Button type="primary" onClick={handleCreate}>
              创建文书
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <Row gutter={[16, 16]}>
              {filteredDocuments.map(renderGridCard)}
            </Row>
          ) : (
            <Card>
              <List
                dataSource={filteredDocuments}
                renderItem={renderListItem}
              />
            </Card>
          )}
        </>
      )}

      {/* Batch Export Modal */}
      <ExportModal
        visible={batchExportVisible}
        onCancel={() => setBatchExportVisible(false)}
        onExport={handleBatchExport}
        documentTitle="批量导出"
        loading={batchExporting}
      />
    </div>
  );
};

export default DocumentsPage;
