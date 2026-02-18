// Templates Page - Template library with grid layout, categories, and favorites
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
  Modal,
  Rate,
  Tabs,
  message,
} from 'antd';
import {
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
  StarOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { listTemplates, toggleTemplateFavorite, Template } from '../../services/template';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Template category definitions
type TemplateCategory = 'civil' | 'criminal' | 'administrative' | 'labor' | 'commercial' | 'intellectual';

// Category configurations
const categoryConfig: Record<TemplateCategory, { color: string; text: string; icon: string }> = {
  civil: { color: 'blue', text: '民事', icon: '⚖️' },
  criminal: { color: 'red', text: '刑事', icon: '🔨' },
  administrative: { color: 'orange', text: '行政', icon: '📋' },
  labor: { color: 'green', text: '劳动', icon: '👔' },
  commercial: { color: 'cyan', text: '商事', icon: '📈' },
  intellectual: { color: 'purple', text: '知识产权', icon: '💡' },
};

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Load templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await listTemplates(categoryFilter === 'all' ? undefined : categoryFilter);
        setTemplates(data);
      } catch (error) {
        console.error('Failed to load templates:', error);
        message.error('加载模板失败');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [categoryFilter]);

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchText.toLowerCase()) ||
        template.description.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
      const matchesFavorite = !favoritesOnly || template.isFavorite;
      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [searchText, categoryFilter, favoritesOnly, templates]);

  // Group templates by category for tab view
  const templatesByCategory = useMemo(() => {
    const grouped: Record<TemplateCategory, Template[]> = {
      civil: [],
      criminal: [],
      administrative: [],
      labor: [],
      commercial: [],
      intellectual: [],
    };

    filteredTemplates.forEach((template) => {
      const category = template.category as TemplateCategory;
      grouped[category].push(template);
    });

    return grouped;
  }, [filteredTemplates]);

  // Toggle favorite
  const handleToggleFavorite = async (templateId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      const newFavoriteState = await toggleTemplateFavorite(templateId);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId ? { ...t, isFavorite: newFavoriteState } : t
        )
      );
      message.success(newFavoriteState ? '收藏成功' : '取消收藏');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      message.error('操作失败');
    }
  };

  // Open template detail modal
  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setDetailModalVisible(true);
  };

  // Use template to create document
  const handleUseTemplate = (template: Template) => {
    message.success(`正在使用模板 "${template.name}" 创建文书...`);
    // Navigate to create page with template ID
    navigate(`/create?templateId=${template.id}&templateName=${encodeURIComponent(template.name)}`);
  };

  // Format usage count
  const formatUsageCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toString();
  };

  // Render template card
  const renderTemplateCard = (template: Template) => {
    const config = categoryConfig[template.category as TemplateCategory];
    return (
      <Col xs={24} sm={12} md={8} lg={6} key={template.id}>
        <Card
          hoverable
          onClick={() => handleTemplateClick(template)}
          style={{ height: '100%' }}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ marginBottom: 12 }}>
            <Space>
              <span style={{ fontSize: 20 }}>{config.icon}</span>
              <Tag color={config.color}>{config.text}</Tag>
            </Space>
          </div>

          <Card.Meta
            title={
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                {template.name}
              </div>
            }
            description={
              <div>
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 12, color: '#666', fontSize: 13 }}
                >
                  {template.description}
                </Paragraph>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <EyeOutlined style={{ marginRight: 4 }} />
                      {formatUsageCount(template.usageCount)}
                    </Text>
                    <Rate
                      disabled
                      defaultValue={template.rating}
                      style={{ fontSize: 12 }}
                    />
                  </Space>
                  <Button
                    type="text"
                    icon={
                      template.isFavorite ? (
                        <HeartFilled style={{ color: '#ff4d4f' }} />
                      ) : (
                        <HeartOutlined />
                      )
                    }
                    onClick={(e) => handleToggleFavorite(template.id, e)}
                  >
                    {template.isFavorite ? '已收藏' : '收藏'}
                  </Button>
                </div>
              </div>
            }
          />
        </Card>
      </Col>
    );
  };

  // Tab items for category view
  const tabItems: TabsProps['items'] = Object.entries(categoryConfig).map(([key, config]) => {
    const categoryKey = key as TemplateCategory;
    const categoryTemplates = templatesByCategory[categoryKey];

    return {
      key: categoryKey,
      label: (
        <span>
          {config.icon} {config.text} ({categoryTemplates.length})
        </span>
      ),
      children: (
        <>
          {categoryTemplates.length === 0 ? (
            <Empty description={`暂无${config.text}类模板`} />
          ) : (
            <Row gutter={[16, 16]}>
              {categoryTemplates.map(renderTemplateCard)}
            </Row>
          )}
        </>
      ),
    };
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>模板库</Title>
          <Text type="secondary">共 {filteredTemplates.length} 个模板</Text>
        </div>
        <Space>
          <Button
            type={favoritesOnly ? 'primary' : 'default'}
            icon={favoritesOnly ? <HeartFilled /> : <HeartOutlined />}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            {favoritesOnly ? '只看收藏' : '显示收藏'}
          </Button>
        </Space>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜索模板名称或描述..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="模板分类"
              value={categoryFilter}
              onChange={setCategoryFilter}
              suffixIcon={<SearchOutlined />}
            >
              <Option value="all">全部分类</Option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    <span>{config.text}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Templates Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <Empty description="暂无匹配的模板">
            {favoritesOnly ? (
              <Button type="primary" onClick={() => setFavoritesOnly(false)}>
                显示全部模板
              </Button>
            ) : (
              <Button type="primary" onClick={() => setSearchText('')}>
                清除搜索
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Card>
          <Tabs defaultActiveKey="all" items={[
            {
              key: 'all',
              label: '全部',
              children: (
                <Row gutter={[16, 16]}>
                  {filteredTemplates.map(renderTemplateCard)}
                </Row>
              ),
            },
            ...tabItems,
          ]} />
        </Card>
      )}

      {/* Template Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>{selectedTemplate?.name}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="favorite"
            icon={(templates.find(t => t.id === selectedTemplate?.id)?.isFavorite) ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
            onClick={() => selectedTemplate && handleToggleFavorite(selectedTemplate.id)}
          >
            {(templates.find(t => t.id === selectedTemplate?.id))?.isFavorite ? '已收藏' : '收藏'}
          </Button>,
          <Button
            key="use"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              if (selectedTemplate) {
                handleUseTemplate(selectedTemplate);
                setDetailModalVisible(false);
              }
            }}
          >
            使用此模板
          </Button>,
        ]}
        width={720}
      >
        {selectedTemplate && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color={categoryConfig[selectedTemplate.category as TemplateCategory].color}>
                  {categoryConfig[selectedTemplate.category as TemplateCategory].text}
                </Tag>
                <Text type="secondary">
                  <EyeOutlined style={{ marginRight: 4 }} />
                  使用次数: {formatUsageCount(selectedTemplate.usageCount)}
                </Text>
                <Text type="secondary">
                  <StarOutlined style={{ marginRight: 4 }} />
                  评分: {selectedTemplate.rating}
                </Text>
              </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>模板描述</Text>
              <Text>{selectedTemplate.description}</Text>
            </div>

            {selectedTemplate.preview && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>模板预览</Text>
                <Card
                  size="small"
                  style={{
                    background: '#f5f5f5',
                    fontFamily: 'serif',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedTemplate.preview}
                </Card>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TemplatesPage;
