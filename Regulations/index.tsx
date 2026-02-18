// Regulations Page - Search and browse legal regulations
import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Typography,
  Row,
  Col,
  Tag,
  Space,
  Empty,
  Spin,
  Modal,
  Button,
  message,
  Pagination,
} from 'antd';
import {
  SearchOutlined,
  CopyOutlined,
  FileTextOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { listRegulations, Regulation } from '../../services/regulation';

const { Title, Text, Paragraph } = Typography;

// Regulation category definitions
type RegulationCategory = 'civil' | 'criminal' | 'administrative' | 'labor' | 'commercial' | 'constitutional';

// Category configurations
const categoryConfig: Record<RegulationCategory, { color: string; text: string }> = {
  civil: { color: 'blue', text: '民法' },
  criminal: { color: 'red', text: '刑法' },
  administrative: { color: 'orange', text: '行政法' },
  labor: { color: 'green', text: '劳动法' },
  commercial: { color: 'cyan', text: '商法' },
  constitutional: { color: 'purple', text: '宪法' },
};

export const RegulationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RegulationCategory | 'all'>('all');
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch regulations from API
  const fetchRegulations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRegulations(
        searchText || undefined,
        categoryFilter !== 'all' ? categoryFilter : undefined,
        currentPage,
        pageSize
      );
      setRegulations(result.regulations);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Failed to fetch regulations:', error);
      message.error('加载法规失败');
    } finally {
      setLoading(false);
    }
  }, [searchText, categoryFilter, currentPage]);

  // Fetch on page load and when search/filter changes
  useEffect(() => {
    fetchRegulations();
  }, [fetchRegulations]);

  // Reset to page 1 when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, categoryFilter]);

  // Highlight search text
  const highlightText = (text: string, search: string): React.ReactNode => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#fff3cd', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Open regulation detail modal
  const handleRegulationClick = (reg: Regulation) => {
    setSelectedRegulation(reg);
    setDetailModalVisible(true);
  };

  // Copy regulation content
  const handleCopy = () => {
    if (selectedRegulation) {
      navigator.clipboard.writeText(selectedRegulation.content);
      message.success('已复制到剪贴板');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 4 }}>法规检索</Title>
        <Text type="secondary">共 {totalCount} 条法规</Text>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="搜索法规标题或内容..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <select
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d9d9d9' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as RegulationCategory | 'all')}
            >
              <option value="all">全部分类</option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.text}
                </option>
              ))}
            </select>
          </Col>
        </Row>
      </Card>

      {/* Regulations List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : regulations.length === 0 ? (
        <Card>
          <Empty description="未找到匹配的法规" />
        </Card>
      ) : (
        <>
          <Card>
            {regulations.map((reg) => (
              <div
                key={reg.id}
                style={{
                  padding: '16px 0',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
                onClick={() => handleRegulationClick(reg)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Space style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 500 }}>{highlightText(reg.title, searchText)}</span>
                      <Tag color={categoryConfig[reg.category].color}>{categoryConfig[reg.category].text}</Tag>
                      {reg.chapter && <Text type="secondary">{reg.chapter}</Text>}
                    </Space>
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 8, color: '#666' }}
                    >
                      {highlightText(reg.content.slice(0, 200) + '...', searchText)}
                    </Paragraph>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      施行日期: {reg.effectiveDate}
                    </Text>
                  </div>
                  <Button type="text" icon={<ExpandOutlined />} />
                </div>
              </div>
            ))}
          </Card>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={currentPage}
                total={totalCount}
                pageSize={pageSize}
                onChange={setCurrentPage}
                showSizeChanger={false}
                showTotal={(total) => `共 ${total} 条`}
              />
            </div>
          )}
        </>
      )}

      {/* Regulation Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>{selectedRegulation?.title}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy}>
            复制内容
          </Button>,
          <Button key="close" type="primary" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRegulation && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space wrap>
                <Tag color={categoryConfig[selectedRegulation.category].color}>
                  {categoryConfig[selectedRegulation.category].text}
                </Tag>
                {selectedRegulation.chapter && (
                  <Text type="secondary">{selectedRegulation.chapter}</Text>
                )}
                <Text type="secondary">施行日期: {selectedRegulation.effectiveDate}</Text>
              </Space>
            </div>
            <div
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                maxHeight: 400,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'serif',
                lineHeight: 1.8,
              }}
            >
              {selectedRegulation.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RegulationsPage;
