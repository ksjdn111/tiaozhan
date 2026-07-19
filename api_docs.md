# API 接口文档

## 基本信息

- **Base URL**: `http://119.29.221.173:5000/api`（或通过前端代理 `/api`）
- **认证方式**: `Authorization: Bearer <access_token>`
- **响应格式**: `{"code": 0, ...}` 成功，`{"code": 1, "message": "..."}` 错误
- **Content-Type**: `application/json`

---

## 一、系统

### 1.1 健康检查

```
GET /api/health
```

无需认证。返回服务运行状态。

**响应示例：**
```json
{"code": 0, "message": "ok"}
```

---

## 二、认证 (/api/auth)

### 2.1 注册

```
POST /api/auth/register
```

无需认证。

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "Abc12345!",
  "username": "myusername"
}
```

**响应：**
```json
{"code": 0, "message": "注册成功,请查看邮箱验证码"}
```

### 2.2 登录

```
POST /api/auth/login
```

无需认证。

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "Abc12345!"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJFUzI1NiIs...",
    "user_id": "52be74cf-542f-45a4-adc8-d201d8f9f0fa",
    "email": "user@example.com"
  }
}
```

### 2.3 获取个人资料

```
GET /api/auth/profile
```

需认证。

**响应：**
```json
{
  "code": 0,
  "data": {
    "id": "52be74cf-...",
    "username": "myusername",
    "avatar_url": "https://...",
    "bio": "Hello!",
    "created_at": "2026-07-17T10:02:23+00:00"
  }
}
```

### 2.4 更新个人资料

```
PUT /api/auth/profile
```

需认证。

**请求体（至少一项）：**
```json
{
  "username": "newname",
  "avatar_url": "https://...",
  "bio": "新简介"
}
```

**响应：**
```json
{"code": 0, "message": "更新成功"}
```

### 2.5 检查用户名

```
GET /api/auth/check-username?username=myusername
```

无需认证。

**响应：**
```json
{"code": 0, "data": {"exists": false}}
```

### 2.6 获取公开资料

```
GET /api/auth/public-profile/{user_id}
```

无需认证。

**路径参数：** `user_id` - UUID 格式用户 ID

**响应：**
```json
{"code": 0, "data": {"id": "...", "username": "...", "avatar_url": "...", "bio": "..."}}
```

---

## 三、挑战 (/api/challenge)

### 3.1 获取今日挑战

```
GET /api/challenge/today
```

需认证。如有待办挑战直接返回，否则随机分配一个新挑战。

**响应：**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "user_id": "...",
    "challenge_id": 5,
    "date": "2026-07-20",
    "status": "pending",
    "note": null,
    "photo_url": null,
    "created_at": "...",
    "challenge": {
      "id": 5,
      "title": "晨跑15分钟",
      "description": "早起去户外慢跑15分钟",
      "category": "运动",
      "difficulty": 2
    }
  }
}
```

### 3.2 完成挑战

```
POST /api/challenge/complete
```

需认证。

**请求体：**
```json
{
  "daily_challenge_id": 1,
  "note": "今天跑得很开心",
  "photo_url": "https://..."
}
```

**响应：**
```json
{"code": 0, "message": "挑战完成！", "new_badges": []}
```

### 3.3 跳过挑战

```
POST /api/challenge/skip
```

需认证。

**请求体：**
```json
{"daily_challenge_id": 1}
```

**响应：**
```json
{"code": 0, "message": "已跳过"}
```

### 3.4 创建自定义挑战

```
POST /api/challenge/custom
```

需认证。

**请求体：**
```json
{
  "title": "我的自定义挑战",
  "description": "描述内容",
  "category": "运动",
  "difficulty": 3
}
```

**响应：**
```json
{"code": 0, "message": "自定义挑战已创建", "data": {...}}
```

### 3.5 获取挑战历史

```
GET /api/challenge/history?page=1&size=20
```

需认证。

**查询参数：** `page`（默认1）, `size`（默认20）

---

## 四、广场动态 (/api/feed)

### 4.1 发布动态

```
POST /api/feed/create
```

需认证。

**请求体：**
```json
{
  "note": "今天分享一个好消息！",
  "photo_url": "[\"https://...\", \"https://...\"]"
}
```

**响应：**
```json
{"code": 0, "message": "发布成功", "data": {...}}
```

### 4.2 获取动态列表

```
GET /api/feed/list?page=1&size=20
```

需认证。

### 4.3 获取动态详情

```
GET /api/feed/detail/{dc_id}
```

需认证。

**路径参数：** `dc_id` - 动态 ID（整数）

### 4.4 点赞/取消点赞

```
POST /api/feed/like
```

需认证。

**请求体：**
```json
{"daily_challenge_id": 1}
```

**响应：**
```json
{"code": 0, "message": "点赞成功", "liked": true}
```

### 4.5 评论点赞/取消点赞

```
POST /api/feed/comment-like
```

需认证。

**请求体：**
```json
{"comment_id": 1}
```

**响应：**
```json
{"code": 0, "liked": true}
```

### 4.6 发表评论

```
POST /api/feed/comment
```

需认证。

**请求体：**
```json
{
  "daily_challenge_id": 1,
  "content": "写得真好！",
  "parent_id": null,
  "photo_url": "https://..."
}
```

### 4.7 删除动态

```
DELETE /api/feed/delete-post/{dc_id}
```

需认证，仅作者可删除。

### 4.8 删除评论

```
DELETE /api/feed/delete-comment/{comment_id}
```

需认证，仅作者可删除。

### 4.9 我的动态

```
GET /api/feed/my-posts
```

需认证。返回最近 50 条。

### 4.10 我的点赞

```
GET /api/feed/my-likes
```

需认证。返回最近 50 条。

### 4.11 我的评论

```
GET /api/feed/my-comments
```

需认证。返回最近 50 条。

### 4.12 通知列表

```
GET /api/feed/notifications
```

需认证。返回点赞和评论通知，最多 30 条。

---

## 五、徽章 (/api/badges)

### 5.1 徽章列表

```
GET /api/badges/list
```

无需认证。返回所有徽章定义。

### 5.2 我的徽章

```
GET /api/badges/user
```

需认证。返回用户已获得的徽章。

### 5.3 统计信息

```
GET /api/badges/stats
```

需认证。

**响应：**
```json
{
  "code": 0,
  "data": {
    "total_days": 10,
    "total_completed": 8,
    "total_likes_received": 5,
    "streak": 3
  }
}
```

### 5.4 用户公开徽章

```
GET /api/badges/user/{target_id}
```

无需认证。返回指定用户的所有徽章及获得状态。

---

## 六、好友 (/api/friends)

### 6.1 发送好友请求

```
POST /api/friends/request
```

需认证。

**请求体：**
```json
{"target_user_id": "user-uuid-here"}
```

### 6.2 处理好友请求

```
POST /api/friends/respond
```

需认证，仅接收方可操作。

**请求体：**
```json
{"request_id": 1, "accept": true}
```

### 6.3 好友列表

```
GET /api/friends/list
```

需认证。返回好友信息及最近一条消息。

### 6.4 删除好友

```
POST /api/friends/delete
```

需认证。

**请求体：**
```json
{"friend_id": "user-uuid-here"}
```

### 6.5 待处理请求

```
GET /api/friends/requests
```

需认证。

### 6.6 搜索用户

```
GET /api/friends/search?q=username
```

需认证。

### 6.7 检查好友状态

```
GET /api/friends/check/{target_id}
```

需认证。返回 `none` / `pending` / `accepted` / `self`。

### 6.8 发送消息

```
POST /api/friends/messages/send
```

需认证。

**请求体：**
```json
{
  "receiver_id": "user-uuid-here",
  "content": "你好！",
  "photo_url": "https://..."
}
```

### 6.9 获取聊天记录

```
GET /api/friends/messages/{friend_id}
```

需认证。

### 6.10 对话列表

```
GET /api/friends/conversations
```

需认证。

### 6.11 未读计数

```
GET /api/friends/unread-count
```

需认证。

**响应：**
```json
{
  "code": 0,
  "data": {
    "friend_requests": 2,
    "unread_messages": 5,
    "total": 7
  }
}
```

---

## 附：状态码说明

| code | 含义 |
|------|------|
| 0 | 成功 |
| 1 | 业务错误（具体看 message） |
| 401 | 未授权（token 缺失或无效） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
