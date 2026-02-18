// Professional Legal Prompt Engineering Engine
// Layered prompt system: System Role + Document-Type Instructions + Legal Knowledge + User Context
import { dbGet } from '../db/index.js';
// ============================================================
// System Prompt (expert role definition)
// ============================================================
const SYSTEM_PROMPT = `你是一位拥有20年以上执业经验的中国资深法律文书专家。你精通中国现行法律法规，擅长撰写各类法律文书，包括但不限于诉讼文书、合同协议、法律意见书、律师函等。

你的核心能力：
1. 精确掌握各类法律文书的标准格式和必备要素
2. 熟练引用中华人民共和国现行有效的法律法规条文（民法典、刑法、民事诉讼法、刑事诉讼法、行政诉讼法、劳动法、劳动合同法、合同法等）
3. 使用严谨专业的法言法语
4. 逻辑清晰，论证有力

你在撰写法律文书时必须遵守以下规范：
- 格式严格符合中国法律文书标准格式
- 所有法律条文引用必须准确，注明法律名称和条款编号
- 当事人信息完整规范（包含姓名/名称、身份证号/统一社会信用代码、住所等）
- 诉讼请求/申请事项逐项列举，清晰明确
- 事实与理由部分论述充分，逻辑严密
- 落款格式完整（署名、日期、附件清单）

在对话中收集案件信息时：
- 主动追问缺失的关键信息
- 用通俗语言向用户解释法律概念
- 根据案件类型识别需要收集的核心要素
- 始终用中文回复`;
// ============================================================
// Chat System Prompt (for multi-turn conversation)
// ============================================================
const CHAT_SYSTEM_PROMPT = `你是一位专业的法律文书AI助手。你的任务是通过对话了解用户的案件情况，收集生成法律文书所需的信息。

在对话中你需要：
1. 理解用户描述的案件类型和基本情况
2. 主动追问缺失的关键信息（当事人信息、案件事实、诉讼请求、证据等）
3. 用通俗易懂的语言与用户沟通，必要时解释法律概念
4. 当信息收集充分时，告知用户可以生成文书
5. 回复简洁有条理，使用要点列表

你需要收集的核心信息包括：
- 案件类型（民事/刑事/行政/商事等）
- 当事人信息（原告/被告/申请人/被申请人等的姓名、身份信息、联系方式）
- 案件事实经过（时间、地点、事件经过）
- 诉讼请求或申请事项
- 相关证据材料
- 管辖法院（如适用）

注意：始终用中文回复，保持专业但友好的语气。`;
const DOCUMENT_TYPE_PROMPTS = {
    // 民事诉讼类
    '民事起诉状': {
        structure: `文书结构要求：
1. 标题：民事起诉状
2. 当事人信息：
   - 原告：姓名（名称）、性别、出生日期、民族、职业、住所地、身份证号、联系电话
   - 被告：同上格式
   - 如有委托代理人，列明代理人信息
3. 诉讼请求：逐项编号列明具体请求
4. 事实与理由：详细叙述案件事实，引用法律条文论证
5. 此致 + 管辖法院全称
6. 具状人签名 + 日期
7. 附：证据材料清单`,
        requirements: '注意管辖法院确定规则（一般由被告住所地法院管辖），诉讼请求需具体明确可执行',
        relatedLaws: ['中华人民共和国民事诉讼法', '中华人民共和国民法典'],
    },
    '民事答辩状': {
        structure: `文书结构要求：
1. 标题：民事答辩状
2. 答辩人信息（被告方）
3. 答辩事由：因XX一案，提出答辩
4. 答辩意见：逐一针对原告诉讼请求进行答辩
5. 事实与理由：详细论述答辩理由
6. 此致 + 法院全称
7. 答辩人签名 + 日期`,
        requirements: '逐一回应原告的每项诉讼请求，可提出反驳事实和法律依据',
        relatedLaws: ['中华人民共和国民事诉讼法', '中华人民共和国民法典'],
    },
    '民事上诉状': {
        structure: `文书结构要求：
1. 标题：民事上诉状
2. 上诉人（原审原告/被告）信息
3. 被上诉人信息
4. 原审法院及案号
5. 上诉请求：明确要求撤销/变更原判
6. 上诉理由：指出一审判决的错误之处
7. 此致 + 上一级法院全称
8. 上诉人签名 + 日期`,
        requirements: '上诉期限为判决书送达之日起15日内，需明确指出一审判决认定事实或适用法律的错误',
        relatedLaws: ['中华人民共和国民事诉讼法'],
    },
    '刑事自诉状': {
        structure: `文书结构要求：
1. 标题：刑事自诉状
2. 自诉人（被害人）信息
3. 被告人信息
4. 诉讼请求：依法追究被告人刑事责任
5. 犯罪事实与证据
6. 此致 + 法院全称
7. 自诉人签名 + 日期`,
        requirements: '自诉案件范围有限，需符合刑事诉讼法第170条规定的自诉案件类型',
        relatedLaws: ['中华人民共和国刑事诉讼法', '中华人民共和国刑法'],
    },
    '刑事辩护词': {
        structure: `文书结构要求：
1. 标题：辩护词
2. 审判长、审判员/审判长、陪审员
3. 受委托/指定辩护的说明
4. 辩护意见（可从事实认定、法律适用、量刑情节等角度）
5. 综合辩护意见
6. 辩护人签名 + 日期`,
        requirements: '辩护应从事实、证据、法律适用、量刑情节等多角度展开，注意自首、立功、从犯等法定从轻减轻情节',
        relatedLaws: ['中华人民共和国刑事诉讼法', '中华人民共和国刑法'],
    },
    '取保候审申请书': {
        structure: `文书结构要求：
1. 标题：取保候审申请书
2. 申请人信息（犯罪嫌疑人/被告人或其近亲属/辩护人）
3. 被申请取保候审人信息
4. 申请事项：申请对XX取保候审
5. 申请理由：符合取保候审条件的具体理由
6. 此致 + 办案机关
7. 申请人签名 + 日期`,
        requirements: '需论证符合刑事诉讼法第67条规定的取保候审条件',
        relatedLaws: ['中华人民共和国刑事诉讼法'],
    },
    '行政起诉状': {
        structure: `文书结构要求：
1. 标题：行政起诉状
2. 原告信息
3. 被告信息（行政机关）
4. 诉讼请求：撤销/确认违法/变更行政行为，或要求行政赔偿
5. 事实与理由：详述行政行为的违法之处
6. 此致 + 法院全称
7. 原告签名 + 日期`,
        requirements: '注意起诉期限（知道或应当知道行政行为之日起6个月），被告为作出行政行为的行政机关',
        relatedLaws: ['中华人民共和国行政诉讼法'],
    },
    '行政复议申请书': {
        structure: `文书结构要求：
1. 标题：行政复议申请书
2. 申请人信息
3. 被申请人信息（行政机关）
4. 复议请求
5. 事实与理由
6. 此致 + 复议机关
7. 申请人签名 + 日期`,
        requirements: '复议期限为知道该具体行政行为之日起60日内，复议机关一般为作出行政行为的上一级机关',
        relatedLaws: ['中华人民共和国行政诉讼法'],
    },
    '强制执行申请书': {
        structure: `文书结构要求：
1. 标题：强制执行申请书
2. 申请执行人信息
3. 被执行人信息
4. 申请执行依据（生效裁判文书编号）
5. 申请执行事项
6. 事实与理由
7. 此致 + 执行法院
8. 申请人签名 + 日期`,
        requirements: '申请执行期限为2年，需附生效裁判文书副本',
        relatedLaws: ['中华人民共和国民事诉讼法'],
    },
    '仲裁申请书': {
        structure: `文书结构要求：
1. 标题：仲裁申请书
2. 申请人信息
3. 被申请人信息
4. 仲裁请求
5. 事实与理由
6. 仲裁协议/仲裁条款说明
7. 此致 + 仲裁委员会名称
8. 申请人签名 + 日期`,
        requirements: '需有有效的仲裁协议或合同中的仲裁条款',
        relatedLaws: ['中华人民共和国仲裁法'],
    },
    '劳动仲裁申请书': {
        structure: `文书结构要求：
1. 标题：劳动仲裁申请书
2. 申请人（劳动者）信息
3. 被申请人（用人单位）信息，含法定代表人
4. 仲裁请求：逐项列明（工资、补偿金、赔偿金等）
5. 事实与理由
6. 此致 + 劳动人事争议仲裁委员会
7. 申请人签名 + 日期`,
        requirements: '劳动仲裁时效为1年，从知道或应当知道权利被侵害之日起算',
        relatedLaws: ['中华人民共和国劳动法', '中华人民共和国劳动合同法'],
    },
    '法律意见书': {
        structure: `文书结构要求：
1. 标题：法律意见书
2. 致送对象
3. 受托事项说明
4. 事实概述
5. 法律分析（逐一分析各法律问题）
6. 法律意见（结论性意见）
7. 特别提示/免责声明
8. 出具单位/律师签章 + 日期`,
        requirements: '分析应全面客观，法律依据充分，结论明确',
        relatedLaws: [],
    },
    '律师函': {
        structure: `文书结构要求：
1. 标题：律师函
2. 致送对象
3. 受托说明（受XX委托...）
4. 事实陈述
5. 法律分析及要求
6. 限期回复/履行的要求
7. 律师事务所名称 + 律师签名 + 日期`,
        requirements: '语气严肃但不失专业，明确要求对方在限定期限内回应',
        relatedLaws: [],
    },
};
// Default prompt for types not explicitly configured
const DEFAULT_DOCUMENT_PROMPT = {
    structure: `文书结构要求：
1. 标题（文书名称）
2. 当事人/相关方信息
3. 正文内容（请求事项/条款内容/意见内容）
4. 事实与理由/条款详情
5. 落款（签名/盖章、日期）`,
    requirements: '确保格式规范，内容完整，法律术语准确',
    relatedLaws: [],
};
// ============================================================
// Legal Knowledge Injection
// ============================================================
function getRelatedRegulations(lawNames) {
    if (lawNames.length === 0)
        return '';
    const parts = [];
    for (const name of lawNames) {
        const reg = dbGet('SELECT title, content FROM regulations WHERE title = ? AND status = ?', [name, 'effective']);
        if (reg) {
            parts.push(`\n### ${reg.title}（相关条文摘要）\n${reg.content}`);
        }
    }
    return parts.length > 0
        ? `\n## 相关法律法规参考\n以下为可参考的法律条文，请在文书中准确引用适用条款：${parts.join('\n')}`
        : '';
}
// ============================================================
// Public API
// ============================================================
export function getChatSystemPrompt() {
    return CHAT_SYSTEM_PROMPT;
}
export function buildDocumentGenerationMessages(typeId, caseInfo, conversationHistory) {
    // Get document type info from DB
    const docType = dbGet('SELECT name, category, description FROM document_types WHERE id = ?', [typeId]);
    const typeName = docType?.name || '法律文书';
    const category = docType?.category || '民事';
    // Get type-specific prompt
    const typePrompt = DOCUMENT_TYPE_PROMPTS[typeName] || DEFAULT_DOCUMENT_PROMPT;
    // Get related legal knowledge
    const legalKnowledge = getRelatedRegulations(typePrompt.relatedLaws);
    // Build user context from caseInfo
    const info = caseInfo;
    const contextParts = [];
    if (info.case_type)
        contextParts.push(`案件类型：${info.case_type}`);
    if (info.parties)
        contextParts.push(`当事人信息：${info.parties}`);
    if (info.facts)
        contextParts.push(`案件事实：${info.facts}`);
    if (info.claims)
        contextParts.push(`诉讼请求/申请事项：${info.claims}`);
    if (info.evidence)
        contextParts.push(`证据材料：${info.evidence}`);
    const standardFields = ['case_type', 'parties', 'facts', 'claims', 'evidence'];
    for (const [k, v] of Object.entries(caseInfo)) {
        if (!standardFields.includes(k) && v) {
            contextParts.push(`${k}：${v}`);
        }
    }
    // Build conversation context from history
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
        const userMessages = conversationHistory.filter(m => m.role === 'user');
        if (userMessages.length > 0) {
            conversationContext = `\n\n## 用户在对话中提供的信息\n${userMessages.map(m => m.content).join('\n\n')}`;
        }
    }
    // Assemble the full prompt
    const userPrompt = `请生成一份专业的${category}类《${typeName}》。

## 用户提供的案件信息
${contextParts.length > 0 ? contextParts.join('\n') : '（用户未提供结构化案件信息）'}${conversationContext}

## 文书格式要求
${typePrompt.structure}

## 特别注意
${typePrompt.requirements}
${legalKnowledge}

## 输出要求
- 直接输出完整的法律文书正文内容
- 不要包含"以下是为您生成的文书"等说明性文字
- 不要使用 Markdown 格式标记
- 用户未提供的信息用[方括号占位符]标注，方便用户后续填写
- 确保文书格式完整规范，可直接使用`;
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
    ];
    return messages;
}
export function buildChatMessages(conversationHistory, documentTypeName) {
    let systemContent = CHAT_SYSTEM_PROMPT;
    if (documentTypeName) {
        systemContent += `\n\n用户计划生成的文书类型为：${documentTypeName}。请根据此文书类型的特点来引导信息收集。`;
        const typePrompt = DOCUMENT_TYPE_PROMPTS[documentTypeName];
        if (typePrompt) {
            systemContent += `\n\n该文书需要的结构：\n${typePrompt.structure}`;
        }
    }
    return [
        { role: 'system', content: systemContent },
        ...conversationHistory.filter(m => m.role !== 'system'),
    ];
}
//# sourceMappingURL=prompt-engine.js.map