# Prompt 日志

## 说明

本文档记录了使用 AI 辅助编程过程中所有的 Prompt 及对应的功能和文件变更。每条记录标注了 Prompt 内容、AI 返回的关键输出以及对应的功能模块和文件。

---

## 1. 项目初始化

**Prompt:** 创建一个每日挑战打卡应用，支持随机分配挑战、记录完成情况

**对应功能:** 项目框架搭建

**涉及文件:**
- `backend/app.py`, `backend/config.py`, `backend/schema.sql`, `backend/requirements.txt`
- `frontend/package.json`, `frontend/next.config.js`,
  `frontend/src/app/layout.tsx`

**AI 输出摘要:** 生成了 Flask + Next.js 项目骨架、数据库 schema、Antd 主题配置

---

## 2. 用户认证系统

**Prompt:** 实现邮箱密码注册登录，用 Supabase Auth

**对应功能:** 注册、登录、个人资料、用户名唯一检查

**涉及文件:**
- `backend/routes/auth.py` — 注册/登录/资料 CRUD
- `frontend/src/app/login/page.tsx` — 登录注册页 UI
- `frontend/src/lib/supabase.ts` — Supabase 客户端
- `frontend/src/lib/auth.ts` — Token 获取工具

**AI 输出摘要:** 实现了完整的 auth 流程，包括密码强度校验、Supabase session 管理、用户名唯一性检查

---

## 3. 每日挑战系统

**Prompt:** 实现每日挑战的分配、完成、跳过、自定义

**对应功能:** 挑战核心功能

**涉及文件:**
- `backend/routes/challenges.py` — 挑战 API
- `frontend/src/app/(main)/dashboard/page.tsx` — 挑战页面 UI

**AI 输出摘要:** 完成了挑战随机分配、完成打卡、跳过、自定义挑战的完整流程

---

## 4. 徽章系统

**Prompt:** 添加成就徽章系统，根据完成情况自动解锁

**对应功能:** 徽章与统计

**涉及文件:**
- `backend/routes/badges.py` — 徽章 API + 统计
- `backend/schema.sql` — 徽章表和种子数据
- `frontend/src/app/(main)/profile/page.tsx` — 徽章展示

**AI 输出摘要:** 实现了 12 个成就徽章，涵盖连续天数、完成数、分类完成等条件，完成挑战时自动检测并弹窗

---

## 5. 好友系统

**Prompt:** 添加好友系统，支持搜索、添加、删除好友和聊天

**对应功能:** 好友与聊天

**涉及文件:**
- `backend/routes/friends.py` — 好友 API + 消息 API
- `backend/schema.sql` — friends 表、messages 表
- `frontend/src/app/(main)/friends/page.tsx` — 好友列表
- `frontend/src/app/(main)/friends/chat/page.tsx` — 聊天页面

**AI 输出摘要:** 实现了完整的好友关系链：搜索用户 → 发送请求 → 接受/拒绝 → 好友列表 → 聊天

---

## 6. 广场动态

**Prompt:** 实现广场功能，用户可以发帖、点赞、评论

**对应功能:** 广场 Feed

**涉及文件:**
- `backend/routes/feed.py` — 广场 API
- `frontend/src/app/(main)/feed/page.tsx` — 广场列表页
- `frontend/src/app/(main)/feed/[id]/page.client.tsx` — 帖子详情页

**AI 输出摘要:** 完成了动态发布、多图上传、点赞、评论（含回复嵌套）、搜索等功能

---

## 7. 个人页面

**Prompt:** 实现个人主页，显示统计、徽章、历史记录、帖子/点赞/评论

**对应功能:** 个人中心

**涉及文件:**
- `frontend/src/app/(main)/profile/page.tsx` — 个人页 UI

**AI 输出摘要:** 实现了个资展示、三 Tab 统计卡片（帖子/点赞/评论数量）、历史记录、徽章墙、通知中心

---

## 8. 通知系统

**Prompt:** 添加通知功能，当有人点赞或评论我的帖子时通知我

**对应功能:** 通知

**涉及文件:**
- `backend/routes/feed.py`（`get_notifications` 函数）— 通知 API

**AI 输出摘要:** 实现了点赞和评论的聚合通知，按时间排序，点击可跳转到对应帖子

---

## 9. 聊天图片支持

**Prompt:** 聊天也要能发图片

**对应功能:** 聊天图片

**涉及文件:**
- `frontend/src/app/(main)/friends/chat/page.tsx` — 聊天发图 UI
- `backend/routes/friends.py`（`send_message` 函数）— 消息支持 photo_url

**AI 输出摘要:** 聊天输入框旁加图片上传按钮，消息支持图文混排

---

## 10. 评论图片与评论点赞

**Prompt:** 评论也要能发图片，还要能点赞评论

**对应功能:** 评论增强

**涉及文件:**
- `backend/routes/feed.py`（`add_comment`/`comment_like` 函数）
- `frontend/src/app/(main)/feed/[id]/page.client.tsx` — 评论图片上传 + 点赞按钮
- `backend/schema.sql` — `comments.photo_url`、`comments.like_count`、`comment_likes` 表

**AI 输出摘要:** 评论支持单图上传、点赞，后端新增 comment_likes 表

---

## 11. 图片放大查看

**Prompt:** 所有图片点击要可以放大查看

**对应功能:** Lightbox

**涉及文件:**
- `frontend/src/app/(main)/feed/page.tsx` — 广场图片放大
- `frontend/src/app/(main)/feed/[id]/page.client.tsx` — 详情图片放大
- `frontend/src/app/(main)/friends/chat/page.tsx` — 聊天图片放大

**AI 输出摘要:** 用 Antd Modal 实现图片点击放大查看

---

## 12. 好友列表显示0 bug 修复

**Prompt:** 好友列表总是显示0，查一下为什么，给一个账号测试

**对应功能:** 好友列表 Bug 修复

**涉及文件:**
- `backend/routes/friends.py` — 查询 messages 时 SELECT 漏了 `receiver_id`
- `backend/utils/auth.py` — token 过期时也返回 user_id
- `backend/services/supabase_client.py` — 过期 token 降级为 service_role
- `frontend/src/lib/auth.ts` — `getToken()` 优先 refreshSession

**AI 输出摘要:** 发现两个 bug：(1) messages 查询 SELECT 没包含 receiver_id 导致 KeyError；(2) token 过期时 get_current_user 直接返回 None。已修复

---

## 13. 图片上传不显示

**Prompt:** 为什么评论区发的图片还是显示不出来

**对应功能:** Storage 桶修复

**涉及文件:**
- `frontend/src/app/(main)/feed/[id]/page.client.tsx` — 桶名改为 proofs
- `frontend/src/app/(main)/feed/page.tsx` — 桶名改为 proofs
- `frontend/src/app/(main)/friends/chat/page.tsx` — 桶名改为 proofs

**AI 输出摘要:** 发现 `challenge-photos` 存储桶不存在，所有图片上传静默失败，改为使用 `proofs` 桶

---

## 14. 发帖报错修复

**Prompt:** 广场点发布帖子报错

**对应功能:** 广场发帖修复

**涉及文件:**
- `backend/routes/feed.py` — 新建 `/feed/create` 端点
- `frontend/src/app/(main)/feed/page.tsx` — 改为调新接口

**AI 输出摘要:** 原来前端发 `challenge_id: 0` 到 `/challenge/complete`，后端需要 `daily_challenge_id`。新建了独立的发帖端点

---

## 15. 评论图片报错

**Prompt:** local variable 'photo_url' referenced before assignment

**对应功能:** 评论图片 Bug 修复

**涉及文件:**
- `backend/routes/feed.py` — 调整 `photo_url` 变量顺序

**AI 输出摘要:** `photo_url = data.get('photo_url')` 在验证语句之后才执行，但验证语句已经引用了 `photo_url`，调整顺序即可

---

## 16. 删除帖子刷新又出现

**Prompt:** 点了删除的帖子再刷新又出现了

**对应功能:** RLS 策略缺失

**涉及文件:**
- `backend/schema.sql` — 缺少 `daily_challenges` 的 DELETE 策略

**AI 输出摘要:** JWT 有效时 RLS 拦截了 DELETE 操作（没有 DELETE 策略），需补 `CREATE POLICY "daily_challenges_delete"`

---

## 17. 项目清理

**Prompt:** 帮我把本地没用的文件删掉

**对应功能:** 项目清理

**涉及文件:**
- 删除 `deploy.ps1`, `server-deploy.ps1`, `render.yaml`, `README.md`,
  `runtime.txt`, `.vercel/`, `.env.local`(根目录), `.env.production`, `-w`, `NUL`
- 修改 `.gitignore` 添加 `.vercel/`、`out/`

**AI 输出摘要:** 清理了所有无用文件并提交

---

## 18. 计划任务设为 SYSTEM 账户

**Prompt:** 这个服务器他会自动一直运行前后端吗，我电脑关机了他还能运行吗

**对应功能:** 部署持久化

**涉及文件:**
- 服务器上执行 `schtasks /change /tn tiaozhan-backend /ru SYSTEM`
- 服务器上执行 `schtasks /change /tn tiaozhan-frontend /ru SYSTEM`

**AI 输出摘要:** 将计划任务从 InteractiveToken 改为 SYSTEM 账户运行，设置 BootTrigger，开机自启无需登录

---

## 19. Code Review

**Prompt:** 对我这个项目进行一次 Code Review，给出优化建议

**对应功能:** 代码审查

**涉及文件:** 全量审查

**AI 输出摘要:** 发现安全漏洞（JWT 签名未验证、调试端点无认证）、性能问题（N+1 查询）、代码质量问题（重复函数、any 类型），也肯定了项目架构和 UI 设计

---

## 20. 文档生成

**Prompt:** 要 README.md、API 文档、prompt_log.md、个人总结报告

**对应功能:** 项目文档

**涉及文件:**
- `README.md`, `api_docs.md`, `prompt_log.md`

**AI 输出摘要:** 生成了完整的项目文档
