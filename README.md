# 随机挑战生成器 (Random Challenge Generator)

一个基于每日挑战的社交打卡应用。用户每天收到随机挑战，完成后可以在广场分享动态、添加好友、聊天互动。

## 线上地址（如果打不开需要关闭加速器）

- **前端**: http://119.29.221.173:19191
- **后端 API**: http://119.29.221.173:5000/api

## 演示视频

[随机挑战生成器演示视频](https://pan.baidu.com/s/1wreGPvIz-7xW-7HHi31KIg?pwd=f4g7) 提取码: f4g7

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 14 (React 18, App Router), TypeScript, Ant Design 5 |
| **后端** | Python 3, Flask, Supabase-py |
| **数据库** | Supabase (PostgreSQL), Row Level Security |
| **存储** | Supabase Storage (图片/头像) |
| **认证** | Supabase Auth (邮箱密码 + JWT) |
| **部署** | Windows Server 2022, 计划任务自启, Nginx |

## 核心功能

- **每日挑战** — 每天随机分配挑战，支持自定义挑战
- **打卡记录** — 完成挑战可写备注、上传图片证明
- **徽章系统** — 根据连续天数、完成数等条件自动解锁成就徽章
- **社交广场** — 发布动态，支持多图上传、点赞、评论（含图片评论）
- **好友系统** — 搜索用户、发送好友请求、管理好友
- **即时聊天** — 与好友实时聊天，支持发送图片
- **个人主页** — 查看统计、徽章、历史记录
- **通知中心** — 点赞和评论提醒

## 项目结构

```
tiaozhan/
├── backend/                  # Python Flask 后端
│   ├── app.py                # 应用入口
│   ├── config.py             # 环境配置
│   ├── schema.sql            # 数据库 DDL + 种子数据
│   ├── requirements.txt      # Python 依赖
│   ├── routes/
│   │   ├── auth.py           # 注册/登录/资料
│   │   ├── challenges.py     # 挑战 CRUD
│   │   ├── feed.py           # 广场动态/评论/点赞/通知
│   │   ├── badges.py         # 徽章 & 统计
│   │   └── friends.py        # 好友/消息/搜索
│   ├── services/
│   │   └── supabase_client.py # Supabase 客户端封装
│   └── utils/
│       └── auth.py           # JWT 鉴权中间件
├── frontend/                 # Next.js 前端
│   └── src/
│       ├── lib/              # 工具库 (auth, api, supabase)
│       └── app/
│           ├── layout.tsx     # 根布局 (Antd 主题)
│           ├── login/         # 登录注册页
│           └── (main)/        # 主布局 + 4 个 Tab 页
│               ├── dashboard/ # 今日挑战页
│               ├── feed/      # 广场动态页 + 详情
│               ├── friends/   # 好友列表页 + 聊天
│               └── profile/   # 个人中心页
├── api_docs.md               # API 接口文档
└── prompt_log.md             # AI 开发日志
```

## 本地安装

### 前置要求

- Node.js 18+
- Python 3.10+
- Supabase 项目（免费套餐即可）

### 后端

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

创建 `backend/.env`：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
DB_PASSWORD=your-db-password
FLASK_PORT=5000
```

启动：

```bash
python app.py
```

### 前端

```bash
cd frontend
npm install
```

创建 `frontend/.env.local`：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

启动开发服务器：

```bash
npm run dev
```

生产构建：

```bash
npm run build
npm start
```

### 数据库

在 Supabase SQL Editor 执行 `backend/schema.sql` 创建所有表、RLS 策略和种子数据。

### 存储桶

在 Supabase Storage 创建以下公开桶：

- `proofs` — 挑战证明、评论图片、聊天图片
- `avatars` — 用户头像

## API 概览

共 40 个接口，完整文档见 [api_docs.md](./api_docs.md)。

| 分类 | 前缀 | 数量 |
|------|------|:----:|
| 认证 | `/api/auth` | 6 |
| 挑战 | `/api/challenge` | 5 |
| 广场 | `/api/feed` | 12 |
| 徽章 | `/api/badges` | 4 |
| 好友 | `/api/friends` | 11 |
| 系统 | `/api` | 2 |
| **合计** | | **40** |
