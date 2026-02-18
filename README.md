# 法律文书智能生成器

AI法律文书智能生成平台后端 API。

## 技术栈

- **运行时**: Node.js + TypeScript (ES2022)
- **数据库**: sql.js (嵌入式 SQLite)
- **Web 框架**: Express.js
- **验证**: Zod
- **认证**: JWT + bcrypt

## 项目结构

```
src/
├── api/              # API 路由和服务
│   ├── document.service.ts
│   ├── document.routes.ts
│   ├── export.service.ts
│   ├── export.routes.ts
│   ├── template.routes.ts
│   └── subscription.routes.ts
├── auth/             # 认证模块
│   ├── auth.service.ts
│   ├── auth.routes.ts
│   └── auth.middleware.ts
├── db/               # 数据库层
│   ├── schema.ts     # 数据库表定义
│   ├── types.ts      # TypeScript 类型
│   └── migrate.ts    # 迁移脚本
├── types/            # 类型声明
└── index.ts         # 应用入口
```

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

## 启动方式

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 运行迁移
npm run db:migrate

# 类型检查
npm run typecheck

# 构建
npm run build
```

## 环境变量

```env
PORT=3000
JWT_SECRET=your-secret-key
AI_PROVIDER=wenxin  # 或 tongyi
WENXIN_API_KEY=
WENXIN_SECRET_KEY=
TONGYI_API_KEY=
```

## 数据库

数据库文件位于 `src/data/legal_docs.db`，使用 sql.js 嵌入式数据库。
