// Profile Page - User profile and settings
import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Tabs,
  Avatar,
  Upload,
  message,
  Table,
  Tag,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  LockOutlined,
  UploadOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface SessionInfo {
  id: string;
  device: string;
  location: string;
  lastActive: string;
}

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // Mock sessions data
  const [sessions, setSessions] = useState<SessionInfo[]>([
    { id: '1', device: 'Chrome on MacOS', location: '北京', lastActive: '现在' },
    { id: '2', device: 'Safari on iPhone', location: '上海', lastActive: '2小时前' },
  ]);

  const handleProfileUpdate = async (_values: { name?: string; bio?: string }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success('个人信息更新成功');
    } catch {
      message.error('更新失败，请重试');
    }
  };

  const handlePasswordChange = async (_values: { oldPassword: string; newPassword: string }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch {
      message.error('密码修改失败');
    }
  };

  const handleLogoutOtherDevices = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSessions((prev) => prev.filter((s) => s.id === '1'));
      message.success('已退出其他设备');
    } catch {
      message.error('操作失败');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      message.success('已退出登录');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sessionColumns = [
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '最后活动',
      dataIndex: 'lastActive',
      key: 'lastActive',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SessionInfo) =>
        record.id !== '1' ? (
          <Popconfirm
            title="确定要退出该设备吗？"
            onConfirm={() => {
              setSessions((prev) => prev.filter((s) => s.id !== record.id));
              message.success('已退出该设备');
            }}
          >
            <Button type="link" danger size="small">
              退出
            </Button>
          </Popconfirm>
        ) : (
          <Tag color="success">当前设备</Tag>
        ),
    },
  ];

  return (
    <div>
      <Title level={2}>个人中心</Title>

      <Tabs defaultActiveKey="profile" tabPosition="left">
        <TabPane
          tab={
            <span>
              <UserOutlined />
              基本信息
            </span>
          }
          key="profile"
        >
          <Card title="基本信息">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleProfileUpdate}
              initialValues={{
                name: user?.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-4) : '',
                phone: user?.phone || '',
              }}
            >
              <Form.Item label="头像" name="avatar">
                <Upload
                  showUploadList={false}
                  beforeUpload={() => false}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      message.success('头像上传成功');
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar size={80} icon={<UserOutlined />} />
                    <div>
                      <Button icon={<UploadOutlined />}>更换头像</Button>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        支持 JPG、PNG 格式，大小不超过 2MB
                      </Text>
                    </div>
                  </div>
                </Upload>
              </Form.Item>

              <Form.Item label="手机号" name="phone">
                <Input prefix={<PhoneOutlined />} disabled />
              </Form.Item>

              <Form.Item label="昵称" name="name">
                <Input placeholder="请输入昵称" />
              </Form.Item>

              <Form.Item label="个人简介" name="bio">
                <Input.TextArea rows={3} placeholder="介绍一下自己..." />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SafetyCertificateOutlined />
              账号安全
            </span>
          }
          key="security"
        >
          <Card title="修改密码" style={{ marginBottom: 24 }}>
            <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
              <Form.Item
                label="当前密码"
                name="oldPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
              </Form.Item>

              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6位' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
              </Form.Item>

              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="登录设备管理">
            <Table dataSource={sessions} columns={sessionColumns} rowKey="id" pagination={false} />
            <div style={{ marginTop: 16 }}>
              <Popconfirm title="确定要退出其他所有设备吗？" onConfirm={handleLogoutOtherDevices}>
                <Button danger>退出其他所有设备</Button>
              </Popconfirm>
            </div>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CreditCardOutlined />
              会员套餐
            </span>
          }
          key="subscription"
        >
          <Card title="当前套餐" style={{ marginBottom: 24 }}>
            <Row gutter={24}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary">当前套餐</Text>
                  <Title level={4} style={{ margin: '4px 0' }}>
                    免费套餐
                  </Title>
                </div>
                <div>
                  <Text type="secondary">有效期至</Text>
                  <div style={{ fontSize: 16 }}>2024-12-31</div>
                </div>
              </Col>
              <Col span={12}>
                <Button type="primary" size="large">
                  升级套餐
                </Button>
              </Col>
            </Row>
          </Card>

          <Card title="使用情况">
            <Row gutter={24}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>12</div>
                  <div style={{ color: '#999' }}>本月已生成</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>38</div>
                  <div style={{ color: '#999' }}>本月剩余额度</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#722ed1' }}>3</div>
                  <div style={{ color: '#999' }}>今日已生成</div>
                </div>
              </Col>
            </Row>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <LogoutOutlined />
              退出登录
            </span>
          }
          key="logout"
        >
          <Card>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Title level={4}>确定要退出登录吗？</Title>
              <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                退出后您需要重新登录才能使用全部功能
              </Paragraph>
              <Popconfirm title="确定退出登录？" onConfirm={handleLogout}>
                <Button type="primary" danger size="large" icon={<LogoutOutlined />}>
                  退出登录
                </Button>
              </Popconfirm>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
