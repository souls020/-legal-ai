// Regulations Page - Search and browse legal regulations
import { useState, useMemo, useEffect } from 'react';
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

const { Title, Text, Paragraph } = Typography;

// Regulation category definitions
type RegulationCategory = 'civil' | 'criminal' | 'administrative' | 'labor' | 'commercial' | 'constitutional';

interface Regulation {
  id: number;
  title: string;
  content: string;
  category: RegulationCategory;
  chapter?: string;
  effectiveDate: string;
}

// Mock regulations data
const mockRegulations: Regulation[] = [
  {
    id: 1,
    title: '中华人民共和国民法典',
    content: `第一编 总则

第一章 基本规定

第一条 为了保护民事主体的合法权益，调整民事关系，维护社会和经济秩序，适应中国特色社会主义发展要求，弘扬社会主义核心价值观，根据宪法，制定本法。

第二条 民法调整平等主体的自然人、法人和非法人组织之间的人身关系和财产关系。

第三条 民事主体的人身权利、财产权利以及其他合法权益受法律保护，任何组织或者个人不得侵犯。

第四条 民事主体在民事活动中的法律地位一律平等。

第五条 民事主体从事民事活动，应当遵循自愿原则，按照自己的意思设立、变更、终止民事法律关系。

第六条 民事主体从事民事活动，应当遵循公平原则，合理确定各方的权利和义务。

第七条 民事主体从事民事活动，应当遵循诚信原则，秉持诚实，恪守承诺。

第八条 民事主体从事民事活动，不得违反法律，不得违背公序良俗。

第九条 民事主体从事民事活动，应当有利于节约资源、保护生态环境。

第十条 处理民事纠纷，应当依照法律；法律没有规定的，适用习惯，但是不得违背公序良俗。

第十一条 其他法律对民事关系有特别规定的，依照其规定。

第十二条 中华人民共和国领域内的民事活动，适用中华人民共和国法律。法律另有规定的，依照其规定。`,
    category: 'civil',
    chapter: '第一编 总则',
    effectiveDate: '2021-01-01',
  },
  {
    id: 2,
    title: '中华人民共和国刑法',
    content: `第一编 总则

第一章 刑法的任务、基本原则和适用范围

第一条 为了惩罚犯罪，保护人民，根据宪法，结合我国同犯罪作斗争的具体经验及实际情况，制定本法。

第二条 中华人民共和国刑法的任务，是用刑罚同一切犯罪行为作斗争，以保卫国家安全，保卫人民民主专政的政权和社会主义制度，保护国有财产和劳动群众集体所有的财产，保护公民私人所有的财产，保护公民的人身权利、民主权利和其他权利，维护社会秩序、经济秩序，保障社会主义建设事业的顺利进行。

第三条 法律明文规定为犯罪行为的，依照法律定罪处刑；法律没有明文规定为犯罪行为的，不得定罪处刑。

第四条 对任何人犯罪，在适用法律上一律平等。不允许任何人有超越法律的特权。

第五条 刑罚的轻重，应当与犯罪分子所犯罪行和承担的刑事责任相适应。

第六条 凡在中华人民共和国领域内犯罪的，除法律有特别规定的以外，都适用本法。

凡在中华人民共和国船舶或者航空器内犯罪的，也适用本法。

犯罪的行为或者结果有一项发生在中华人民共和国领域内的，就认为是在中华人民共和国领域内犯罪。`,
    category: 'criminal',
    chapter: '第一编 总则',
    effectiveDate: '2021-03-01',
  },
  {
    id: 3,
    title: '中华人民共和国劳动合同法',
    content: `第一章 总则

第一条 为了完善劳动合同制度，明确劳动合同双方当事人的权利和义务，保护劳动者的合法权益，构建和发展和谐稳定的劳动关系，制定本法。

第二条 中华人民共和国境内的企业、个体经济组织、民办非企业单位等组织（以下称用人单位）与劳动者建立劳动关系，订立、履行、变更、解除或者终止劳动合同，适用本法。

国家机关、事业单位、社会团体和与其建立劳动关系的劳动者，订立、履行、变更、解除或者终止劳动合同，依照本法执行。

第三条 订立劳动合同，应当遵循合法、公平、平等自愿、协商一致、诚实信用的原则。

依法订立的劳动合同具有约束力，用人单位与劳动者应当履行劳动合同约定的义务。

第四条 用人单位应当依法建立和完善劳动规章制度，保障劳动者享有劳动权利、履行劳动义务。

用人单位在制定、修改或者决定有关劳动报酬、工作时间、休息休假、劳动安全卫生、保险福利、职工培训、劳动纪律以及劳动定额管理等直接涉及劳动者切身利益的规章制度或者重大事项时，应当经职工代表大会或者全体职工讨论，提出方案和意见，与工会或者职工代表平等协商确定。

第五条 县级以上人民政府劳动行政部门会同工会和企业方面代表，建立健全协调劳动关系三方机制，共同研究解决有关劳动关系的重大问题。

第六条 工会应当帮助、指导劳动者与用人单位依法订立和履行劳动合同，并与用人单位建立集体协商机制，维护劳动者的合法权益。`,
    category: 'labor',
    chapter: '第一章 总则',
    effectiveDate: '2012-12-28',
  },
  {
    id: 4,
    title: '中华人民共和国行政处罚法',
    content: `第一章 总则

第一条 为了规范行政处罚的设定和实施，保障和监督行政机关有效实施行政管理，维护公共利益和社会秩序，保护公民、法人或者其他组织的合法权益，根据宪法，制定本法。

第二条 行政处罚的设定和实施，适用本法。

第三条 公民、法人或者其他组织违反行政管理秩序的行为，应当给予行政处罚的，依照本法由法律、法规或者规章规定，并由行政机关依照本法规定的程序实施。

第四条 行政处罚遵循公正、公开的原则。

设定和实施行政处罚必须以事实为依据，与违法行为的事实、性质、情节以及社会危害程度相当。

对违法行为给予行政处罚的规定必须公布；未经公布的，不得作为行政处罚的依据。

第五条 实施行政处罚，纠正违法行为，应当坚持处罚与教育相结合，教育公民、法人或者其他组织自觉守法。

第六条 公民、法人或者其他组织对行政机关所给予的行政处罚，享有陈述权、申辩权；对行政处罚不服的，有权依法申请行政复议或者提起行政诉讼。

公民、法人或者其他组织因行政机关违法给予行政处罚受到损害的，有权依法提出赔偿要求。`,
    category: 'administrative',
    chapter: '第一章 总则',
    effectiveDate: '2021-07-15',
  },
  {
    id: 5,
    title: '中华人民共和国公司法',
    content: `第一章 总则

第一条 为了规范公司的组织和行为，保护公司、股东和债权人的合法权益，维护社会经济秩序，促进社会主义市场经济的发展，制定本法。

第二条 本法所称公司，是指依照本法在中国境内设立的有限责任公司和股份有限公司。

第三条 公司是企业法人，有独立的法人财产，享有法人财产权。公司以其全部财产对公司的债务承担责任。

有限责任公司的股东以其认缴的出资额为限对公司承担责任；股份有限公司的股东以其认购的股份为限对公司承担责任。

第四条 公司股东依法享有资产收益、参与重大决策和选择管理者等权利。

第五条 公司从事经营活动，必须遵守法律、行政法规，遵守社会公德、商业道德，诚实守信，接受政府和社会公众的监督，承担社会责任。

第六条 设立公司，应当依法向公司登记机关申请设立登记。符合本法规定的设立条件的，由公司登记机关分别登记为有限责任公司或者股份有限公司；不符合本法规定的设立条件的，不得登记为有限责任公司或者股份有限公司。

法律、行政法规规定设立公司必须报经批准的，应当在公司登记前依法办理批准手续。

第七条 依法设立的公司，由公司登记机关发给公司营业执照。公司营业执照签发日期为公司成立日期。

公司营业执照应当载明公司的名称、住所、注册资本、经营范围、法定代表人姓名等事项。

公司营业执照记载的事项发生变更的，公司应当依法办理变更登记，由公司登记机关换发营业执照。`,
    category: 'commercial',
    chapter: '第一章 总则',
    effectiveDate: '2014-03-01',
  },
];

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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Simulate loading
  useEffect(() => {
    setTimeout(() => {
      setRegulations(mockRegulations);
      setLoading(false);
    }, 500);
  }, []);

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

  // Filter regulations based on search and filters
  const filteredRegulations = useMemo(() => {
    return regulations.filter((reg) => {
      const matchesSearch =
        reg.title.toLowerCase().includes(searchText.toLowerCase()) ||
        reg.content.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || reg.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchText, categoryFilter, regulations]);

  // Pagination
  const paginatedRegulations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRegulations.slice(start, start + pageSize);
  }, [filteredRegulations, currentPage]);

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
        <Text type="secondary">共 {filteredRegulations.length} 条法规</Text>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="搜索法规标题或内容..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <select
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d9d9d9' }}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as RegulationCategory | 'all');
                setCurrentPage(1);
              }}
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
      ) : filteredRegulations.length === 0 ? (
        <Card>
          <Empty description="未找到匹配的法规" />
        </Card>
      ) : (
        <>
          <Card>
            {paginatedRegulations.map((reg) => (
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
          {filteredRegulations.length > pageSize && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={currentPage}
                total={filteredRegulations.length}
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
