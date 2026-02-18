// Home Page
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, Button, Typography, Row, Col, Statistic, Tag, Spin, Empty, Badge, Space } from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import { useAuthStore, selectUser } from '../../stores/auth';
import { listAnnouncements, Announcement } from '../../services/announcement';

const { Title, Text, Paragraph } = Typography;

// Mock recent documents for demo
interface RecentDoc {
  id: number;
  title: string;
  type: string;
  updatedAt: string;
}

const mockRecentDocs: RecentDoc[] = [
  { id: 1, title: '民事起诉状 - 张三诉李四', type: '民事', updatedAt: '2024-01-15' },
  { id: 2, title: '劳动合同解除通知书', type: '劳动', updatedAt: '2024-01-14' },
  { id: 3, title: '房屋租赁合同', type: '民事', updatedAt: '2024-01-12' },
  { id: 4, title: '离婚协议书', type: '民事', updatedAt: '2024-01-10' },
  { id: 5, title: '借款合同纠纷起诉状', type: '民事', updatedAt: '2024-01-08' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading recent documents
    setTimeout(() => {
      setRecentDocs(mockRecentDocs);
      setLoading(false);
    }, 500);

    // Load announcements from API
    const loadAnnouncements = async () => {
      try {
        const result = await listAnnouncements(10);
        setAnnouncements(result.announcements);
      } catch (error) {
        console.error('Failed to load announcements:', error);
      } finally {
        setAnnouncementsLoading(false);
      }
    };
    loadAnnouncements();
  }, []);

  const handleCreate = () => {
    navigate('/create');
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          欢迎回来，{user?.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-4) : '用户'}
        </Title>
        <Text type="secondary">法律文书智能生成器 - 让文书制作更简单</Text>
      </div>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={handleCreate} style={{ textAlign: 'center' }}>
            <Button type="primary" size="large" icon={<PlusOutlined />}>
              创建文书
            </Button>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              AI 智能生成法律文书
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/templates')} style={{ textAlign: 'center' }}>
            <Button type="default" size="large" icon={<FileTextOutlined />}>
              模板库
            </Button>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              浏览常用法律文书模板
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/regulations')} style={{ textAlign: 'center' }}>
            <Button type="default" size="large" icon={<FileSearchOutlined />}>
              法规检索
            </Button>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              快速查找相关法律法规
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="本月已生成"
              value={12}
              suffix="份"
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="本月剩余额度"
              value={38}
              suffix="份"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="累计文书"
              value={56}
              suffix="份"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Documents */}
      <Card
        title="最近文书"
        extra={<Button type="link" onClick={() => navigate('/documents')}>查看全部</Button>}
        style={{ marginBottom: 24 }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : recentDocs.length === 0 ? (
          <Empty description="暂无文书，开始创建您的第一份文书吧">
            <Button type="primary" onClick={handleCreate}>
              创建文书
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {recentDocs.slice(0, 5).map((doc) => (
              <Col xs={24} sm={12} md={8} lg={8} key={doc.id}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  style={{ height: '100%' }}
                >
                  <Card.Meta
                    avatar={
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: '#1890ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <FileTextOutlined style={{ fontSize: 20, color: '#fff' }} />
                      </div>
                    }
                    title={
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.title}
                      </div>
                    }
                    description={
                      <div>
                        <Tag color="blue" style={{ marginBottom: 8 }}>{doc.type}</Tag>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          更新于 {doc.updatedAt}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* System Announcements */}
      <Card
        title={
          <Space>
            <NotificationOutlined />
            <span>系统公告</span>
          </Space>
        }
        extra={<Button type="link" onClick={() => {}}>查看更多</Button>}
      >
        {announcementsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
          </div>
        ) : announcements.length === 0 ? (
          <Text type="secondary">暂无公告</Text>
        ) : (
          <div>
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Space>
                  {announcement.isImportant && (
                    <Badge status="error" text="重要" />
                  )}
                  {announcement.priority === 1 && !announcement.isImportant && (
                    <Badge status="warning" text="一般" />
                  )}
                  <Text strong={announcement.isImportant}>{announcement.title}</Text>
                  {announcement.isExpired && (
                    <Tag color="default">已过期</Tag>
                  )}
                  {announcement.isFuture && (
                    <Tag color="blue">即将生效</Tag>
                  )}
                </Space>
                <Text type="secondary">
                  {announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString('zh-CN') : ''}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default HomePage;
