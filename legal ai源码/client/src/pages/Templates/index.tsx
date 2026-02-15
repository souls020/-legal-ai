// Templates Page - Template library with grid layout, categories, and favorites
import { useState, useMemo, useEffect } from 'react';
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

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Template category definitions
type TemplateCategory = 'civil' | 'criminal' | 'administrative' | 'labor' | 'commercial' | 'intellectual';

// Template interface
interface Template {
  id: number;
  name: string;
  description: string;
  category: TemplateCategory;
  usageCount: number;
  rating: number;
  isFavorite: boolean;
  preview?: string;
}

// Category configurations
const categoryConfig: Record<TemplateCategory, { color: string; text: string; icon: string }> = {
  civil: { color: 'blue', text: '民事', icon: '⚖️' },
  criminal: { color: 'red', text: '刑事', icon: '🔨' },
  administrative: { color: 'orange', text: '行政', icon: '📋' },
  labor: { color: 'green', text: '劳动', icon: '👔' },
  commercial: { color: 'cyan', text: '商事', icon: '📈' },
  intellectual: { color: 'purple', text: '知识产权', icon: '💡' },
};

// Mock templates data
const mockTemplates: Template[] = [
  {
    id: 1,
    name: '民事起诉状',
    description: '用于民事案件原告向人民法院提起诉讼的书面请求。适用于合同纠纷、侵权纠纷、婚姻家庭等各类民事案件。',
    category: 'civil',
    usageCount: 12580,
    rating: 4.8,
    isFavorite: true,
    preview: '民事起诉状\n\n原告：______，男/女，______年______月______日出生，______族，住所地______。',
  },
  {
    id: 2,
    name: '答辩状',
    description: '被告在收到起诉状副本后，针对原告的诉讼请求进行反驳或答辩的书面材料。',
    category: 'civil',
    usageCount: 8920,
    rating: 4.6,
    isFavorite: false,
  },
  {
    id: 3,
    name: '离婚协议书',
    description: '夫妻双方自愿离婚，就子女抚养、财产分割、债务处理等事项达成一致的书面协议。',
    category: 'civil',
    usageCount: 15670,
    rating: 4.9,
    isFavorite: true,
  },
  {
    id: 4,
    name: '房屋租赁合同',
    description: '出租人将房屋出租给承租人使用，承租人支付租金的书面协议。',
    category: 'civil',
    usageCount: 23450,
    rating: 4.7,
    isFavorite: false,
  },
  {
    id: 5,
    name: '刑事辩护词',
    description: '辩护人在刑事案件中为被告人进行辩护的书面意见。',
    category: 'criminal',
    usageCount: 3450,
    rating: 4.5,
    isFavorite: false,
  },
  {
    id: 6,
    name: '取保候审申请书',
    description: '犯罪嫌疑人或被告人及其近亲属申请变更强制措施为取保候审的书面申请。',
    category: 'criminal',
    usageCount: 5670,
    rating: 4.4,
    isFavorite: false,
  },
  {
    id: 7,
    name: '行政复议申请书',
    description: '公民、法人或其他组织对行政机关的具体行政行为不服，向行政复议机关申请复查的书面申请。',
    category: 'administrative',
    usageCount: 2340,
    rating: 4.3,
    isFavorite: false,
  },
  {
    id: 8,
    name: '行政起诉状',
    description: '公民、法人或其他组织对行政机关的行政行为不服，向人民法院提起行政诉讼的书面请求。',
    category: 'administrative',
    usageCount: 1890,
    rating: 4.2,
    isFavorite: false,
  },
  {
    id: 9,
    name: '劳动合同解除通知书',
    description: '用人单位或劳动者解除劳动合同的书面通知，需符合法定条件和程序。',
    category: 'labor',
    usageCount: 18920,
    rating: 4.8,
    isFavorite: true,
  },
  {
    id: 10,
    name: '劳动仲裁申请书',
    description: '劳动者或用人单位向劳动仲裁委员会申请仲裁的书面请求。',
    category: 'labor',
    usageCount: 12340,
    rating: 4.6,
    isFavorite: false,
  },
  {
    id: 11,
    name: '股权转让协议',
    description: '股东之间或股东向股东以外的人转让股权的书面协议。',
    category: 'commercial',
    usageCount: 6780,
    rating: 4.7,
    isFavorite: false,
  },
  {
    id: 12,
    name: '公司章程修正案',
    description: '公司股东会或股东大会对公司章程内容进行修改的书面文件。',
    category: 'commercial',
    usageCount: 3450,
    rating: 4.5,
    isFavorite: false,
  },
  {
    id: 13,
    name: '商标侵权起诉状',
    description: '商标注册人对侵犯其商标专用权的行为向人民法院提起诉讼的书面请求。',
    category: 'intellectual',
    usageCount: 2340,
    rating: 4.4,
    isFavorite: false,
  },
  {
    id: 14,
    name: '著作权许可使用合同',
    description: '著作权人与使用人就作品的使用权达成的书面协议。',
    category: 'intellectual',
    usageCount: 4560,
    rating: 4.6,
    isFavorite: false,
  },
  {
    id: 15,
    name: '民间借贷合同',
    description: '自然人之间、自然人与法人或其他组织之间借款的书面协议。',
    category: 'civil',
    usageCount: 34560,
    rating: 4.7,
    isFavorite: false,
  },
];

export const TemplatesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Simulate loading
  useEffect(() => {
    setTimeout(() => {
      setTemplates(mockTemplates);
      setLoading(false);
    }, 500);
  }, []);

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
      grouped[template.category].push(template);
    });

    return grouped;
  }, [filteredTemplates]);

  // Toggle favorite
  const handleToggleFavorite = (templateId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
      )
    );
    message.success('收藏成功');
  };

  // Open template detail modal
  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setDetailModalVisible(true);
  };

  // Use template to create document
  const handleUseTemplate = (template: Template) => {
    message.info(`正在使用模板 "${template.name}" 创建文书...`);
    // In production, navigate to create page with template ID
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
    const config = categoryConfig[template.category];
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
            icon={selectedTemplate?.isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
            onClick={() => selectedTemplate && handleToggleFavorite(selectedTemplate.id, {} as React.MouseEvent)}
          >
            {selectedTemplate?.isFavorite ? '已收藏' : '收藏'}
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
                <Tag color={categoryConfig[selectedTemplate.category].color}>
                  {categoryConfig[selectedTemplate.category].text}
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
