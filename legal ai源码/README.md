# 法律文书智能生成器

AI法律文书智能生成全栈平台，包含后端 API 和前端 Web 界面。

## 技术栈

### 后端
- **运行时**: Node.js + TypeScript (ES2022)
- **数据库**: sql.js (嵌入式 SQLite)
- **Web 框架**: Express.js
- **验证**: Zod
- **认证**: JWT + bcrypt

### 前端
- **框架**: React 18 + TypeScript
- **UI 组件**: Ant Design 5
- **状态管理**: Zustand
- **路由**: React Router DOM 6
- **HTTP 客户端**: Axios
- **构建工具**: Vite 5

## 项目结构

```
legal-doc-generator/
├── src/                  # 后端源码
│   ├── api/              # API 路由和服务
│   ├── auth/             # 认证模块
│   ├── db/               # 数据库层
│   ├── types/            # 类型声明
│   └── index.ts          # 后端入口
├── client/               # 前端源码
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   │   ├── Login/    # 登录页
│   │   │   ├── Register/ # 注册页
│   │   │   ├── Home/     # 首页（仪表盘）
│   │   │   ├── Create/   # AI 文书生成（对话界面）
│   │   │   ├── Documents/# 文书列表
│   │   │   ├── Editor/   # 文书编辑器（A4预览）
│   │   │   ├── Templates/# 模板库
│   │   │   ├── Regulations/ # 法规检索
│   │   │   └── Profile/  # 个人中心
│   │   ├── components/   # 通用组件
│   │   ├── layouts/      # 布局组件
│   │   ├── services/     # API 服务层
│   │   ├── stores/       # 状态管理
│   │   ├── utils/        # 工具函数
│   │   └── App.tsx       # 前端入口
│   ├── vite.config.ts    # Vite 配置
│   ├── tsconfig.json     # 前端 TS 配置
│   └── package.json      # 前端依赖
├── package.json          # 后端依赖 + 全局脚本
└── tsconfig.json         # 后端 TS 配置
```

## 快速启动

```bash
# 1. 安装所有依赖（后端 + 前端）
npm run install:all

# 2. 启动开发服务器（同时启动前端和后端）
npm run dev
```

启动后：
- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:3000
- 前端开发服务器已配置代理，`/api` 请求自动转发到后端

## 可用脚本

```bash
# 开发
npm run dev           # 同时启动前端和后端开发服务器
npm run dev:server    # 仅启动后端
npm run dev:client    # 仅启动前端

# 构建
npm run build         # 构建前端和后端
npm run build:server  # 仅构建后端
npm run build:client  # 仅构建前端

# 生产环境运行（需要先 build）
npm start             # 启动后端并服务前端静态文件

# 数据库
npm run db:migrate    # 运行数据库迁移
npm run db:seed       # 填充种子数据

# 其他
npm run typecheck     # TypeScript 类型检查
npm test              # 运行测试
```

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 手机号 + 密码登录 |
| `/register` | 注册页 | 用户注册 |
| `/` | 首页 | 仪表盘、快捷操作、最近文书 |
| `/create` | 创建文书 | AI 对话式文书生成 |
| `/documents` | 文书列表 | 网格/列表视图、搜索筛选 |
| `/documents/:id` | 文书编辑器 | 富文本编辑 + A4预览 |
| `/templates` | 模板库 | 浏览和使用文书模板 |
| `/regulations` | 法规检索 | 搜索和浏览法律法规 |
| `/profile` | 个人中心 | 用户资料、安全设置、会员信息 |

## API 端点

### 认证 (Auth)
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 手机号密码登录
- `POST /api/auth/wechat-login` - 微信登录
- `POST /api/auth/logout` - 退出登录
- `POST /api/auth/forgot-password` - 忘记密码
- `POST /api/auth/reset-password` - 重置密码
- `GET /api/auth/me` - 获取当前用户
- `PUT /api/auth/profile` - 更新用户资料

### 文书 (Documents)
- `POST /api/documents/generate` - AI 生成文书
- `POST /api/documents/:id/regenerate` - 重新生成
- `GET /api/documents` - 列出文书
- `GET /api/documents/:id` - 获取文书详情
- `PUT /api/documents/:id` - 更新文书
- `DELETE /api/documents/:id` - 删除文书
- `POST /api/documents/:id/duplicate` - 复制文书

### 导出 (Export)
- `GET /api/documents/:id/export?format=docx|pdf|txt` - 导出文书
- `GET /api/documents/:id/export/options` - 获取导出选项
- `POST /api/documents/export/batch` - 批量导出

### 模板 (Templates)
- `GET /api/templates` - 列出模板
- `GET /api/templates/:id` - 获取模板详情
- `POST /api/templates/:id/favorite` - 收藏模板

### 法规 (Regulations)
- `GET /api/regulations` - 搜索法规

### 订阅 (Subscription)
- `GET /api/subscription` - 获取订阅状态
- `GET /api/subscription/plans` - 获取套餐列表
- `GET /api/subscription/usage` - 获取使用统计

## 环境变量

```env
# 后端配置
PORT=3000
JWT_SECRET=your-secret-key
AI_PROVIDER=wenxin  # 或 tongyi
WENXIN_API_KEY=
WENXIN_SECRET_KEY=
TONGYI_API_KEY=

# 前端配置（在 client/.env 中配置）
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=30000
VITE_APP_NAME=法律文书智能生成器
VITE_APP_VERSION=1.0.0
VITE_ENABLE_LOGGING=true
```

## 数据库

数据库文件位于 `src/data/legal_docs.db`，使用 sql.js 嵌入式数据库，无需额外安装数据库软件。

## 生产部署

```bash
# 构建所有资源
npm run build

# 启动生产服务器（后端同时服务前端静态文件）
npm start
# 访问 http://localhost:3000 即可使用完整应用
```
