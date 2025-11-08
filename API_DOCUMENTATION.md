# 🚀 API接口调用文档

本文档提供项目所有API接口的详细说明和使用示例。

## 📋 目录

- [基础信息](#基础信息)
- [健康检查API](#健康检查api)
- [缓存管理API](#缓存管理api)
- [内容生成API](#内容生成api)
- [缓存清理API](#缓存清理api)
- [错误处理](#错误处理)

---

## 基础信息

### Base URL

- **开发环境**: `http://localhost:3000`
- **生产环境**: `https://your-domain.vercel.app`

### 通用响应格式

所有API都遵循统一的响应格式：

**成功响应**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": {...},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应**:
```json
{
  "error": "错误描述",
  "details": "详细信息（可选）",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### CORS支持

所有API都支持CORS（跨域资源共享）：
- 开发环境：允许所有来源 (`*`)
- 生产环境：仅允许配置的域名

---

## 健康检查API

### 1. 获取服务健康状态

**接口**: `GET /api/health`

**功能**: 检查服务运行状态、环境配置、缓存系统和系统资源使用情况。

#### 请求示例

```bash
# cURL
curl -X GET http://localhost:3000/api/health

# JavaScript (fetch)
fetch('http://localhost:3000/api/health')
  .then(res => res.json())
  .then(data => console.log(data));

# JavaScript (axios)
axios.get('http://localhost:3000/api/health')
  .then(res => console.log(res.data));
```

#### 响应示例

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "responseTime": "15ms",
  "version": "2.2",
  "environment": {
    "aiConfigured": true,
    "xhsCookieConfigured": true,
    "cacheEnabled": true,
    "scrapingEnabled": true,
    "debugLogging": false,
    "environment": "production"
  },
  "models": {
    "models": ["gemini-2.5-pro", "gemini-2.5-flash"],
    "apiUrl": "已配置"
  },
  "cache": {
    "enabled": true,
    "directory": "/home/project/data/cache",
    "expiryHours": 6,
    "accessible": true,
    "fileCount": 15,
    "totalSize": 1234
  },
  "system": {
    "uptime": 3600,
    "nodeVersion": "v20.11.0",
    "platform": "linux",
    "memory": {
      "used": 150,
      "total": 512
    }
  },
  "checks": {
    "aiService": "✅ 正常",
    "xhsService": "✅ 正常",
    "cacheSystem": "✅ 正常"
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | 服务状态：`healthy`（正常）或 `degraded`（降级） |
| `timestamp` | string | 响应时间戳（ISO 8601格式） |
| `responseTime` | string | API响应时间 |
| `version` | string | 应用版本号 |
| `environment` | object | 环境变量配置状态 |
| `models` | object | AI模型配置信息 |
| `cache` | object | 缓存系统状态 |
| `system` | object | 系统资源使用情况 |
| `checks` | object | 各个服务的健康检查结果 |

#### 使用场景

- **监控告警**: 定期调用此接口监控服务状态
- **部署验证**: 部署后验证服务是否正常启动
- **问题排查**: 快速定位配置或环境问题

---

## 缓存管理API

### 2. 查询缓存列表

**接口**: `GET /api/cache`

**功能**: 获取所有缓存文件的列表信息。

#### 请求示例

```bash
# cURL
curl -X GET http://localhost:3000/api/cache

# JavaScript (fetch)
fetch('http://localhost:3000/api/cache')
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 响应示例

```json
{
  "success": true,
  "cacheEnabled": true,
  "totalCaches": 15,
  "totalSize": 2048,
  "expiryHours": 6,
  "caches": [
    {
      "keyword": "护肤",
      "category": "护肤",
      "source": "scraped",
      "notesCount": 40,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "expiresAt": "2024-01-01T16:00:00.000Z",
      "isExpired": false,
      "size": 156,
      "metadata": {
        "totalNotes": 40,
        "avgInteraction": 1250,
        "topAuthors": ["作者1", "作者2", "作者3"]
      }
    }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalCaches` | number | 缓存文件总数 |
| `totalSize` | number | 缓存总大小（KB） |
| `expiryHours` | number | 缓存过期时间（小时） |
| `caches` | array | 缓存文件详细信息列表 |
| `caches[].keyword` | string | 缓存的关键词 |
| `caches[].category` | string | 所属分类 |
| `caches[].source` | string | 数据来源：`scraped`（爬取）或 `fallback`（备用） |
| `caches[].notesCount` | number | 笔记数量 |
| `caches[].isExpired` | boolean | 是否已过期 |
| `caches[].size` | number | 文件大小（KB） |

---

### 3. 查询指定关键词缓存

**接口**: `GET /api/cache?keyword={keyword}`

**功能**: 获取指定关键词的缓存详细信息。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 是 | 要查询的关键词 |
| `includeData` | boolean | 否 | 是否包含完整数据（默认false） |

#### 请求示例

```bash
# cURL - 仅获取基本信息
curl -X GET "http://localhost:3000/api/cache?keyword=护肤"

# cURL - 获取完整数据
curl -X GET "http://localhost:3000/api/cache?keyword=护肤&includeData=true"

# JavaScript
fetch('http://localhost:3000/api/cache?keyword=护肤')
  .then(res => res.json())
  .then(data => console.log(data));

# JavaScript - 包含完整数据
fetch('http://localhost:3000/api/cache?keyword=护肤&includeData=true')
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 响应示例（基本信息）

```json
{
  "success": true,
  "keyword": "护肤",
  "category": "护肤",
  "source": "scraped",
  "timestamp": 1704110400000,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "expiresAt": "2024-01-01T16:00:00.000Z",
  "metadata": {
    "totalNotes": 40,
    "avgInteraction": 1250,
    "topAuthors": ["作者1", "作者2", "作者3"]
  },
  "notesCount": 40
}
```

#### 响应示例（包含完整数据）

```json
{
  "success": true,
  "keyword": "护肤",
  "category": "护肤",
  "source": "scraped",
  "timestamp": 1704110400000,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "expiresAt": "2024-01-01T16:00:00.000Z",
  "metadata": {
    "totalNotes": 40,
    "avgInteraction": 1250,
    "topAuthors": ["作者1", "作者2", "作者3"]
  },
  "notesCount": 40,
  "processedNotes": [
    {
      "title": "笔记标题",
      "desc": "笔记描述",
      "interact_info": {
        "liked_count": 1000,
        "comment_count": 50,
        "collected_count": 200
      },
      "note_id": "note123",
      "user_info": {
        "nickname": "用户昵称"
      }
    }
  ],
  "data": "完整的格式化数据..."
}
```

#### 缓存不存在时的响应

```json
{
  "success": false,
  "message": "关键词 \"护肤\" 的缓存不存在或已过期",
  "keyword": "护肤",
  "fallbackAvailable": true,
  "fallbackKeyword": "面膜"
}
```

---

### 4. 删除指定缓存

**接口**: `DELETE /api/cache`

**功能**: 删除指定关键词的缓存文件。

#### 请求体参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 是 | 要删除的关键词 |
| `force` | boolean | 否 | 是否强制删除（即使未过期），默认false |

#### 请求示例

```bash
# cURL - 删除已过期的缓存
curl -X DELETE http://localhost:3000/api/cache \
  -H "Content-Type: application/json" \
  -d '{"keyword": "护肤"}'

# cURL - 强制删除缓存（无论是否过期）
curl -X DELETE http://localhost:3000/api/cache \
  -H "Content-Type: application/json" \
  -d '{"keyword": "护肤", "force": true}'

# JavaScript
fetch('http://localhost:3000/api/cache', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ keyword: '护肤' })
})
  .then(res => res.json())
  .then(data => console.log(data));

# JavaScript - 强制删除
fetch('http://localhost:3000/api/cache', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ keyword: '护肤', force: true })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 成功响应

```json
{
  "success": true,
  "message": "缓存 \"护肤\" 已删除",
  "keyword": "护肤",
  "forced": false
}
```

#### 缓存未过期时的响应（force=false）

```json
{
  "success": false,
  "message": "缓存 \"护肤\" 尚未过期，如需删除请使用 force: true",
  "keyword": "护肤",
  "expiresAt": "2024-01-01T16:00:00.000Z"
}
```

#### 缓存不存在时的响应

```json
{
  "error": "缓存 \"护肤\" 不存在",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

### 5. 清理所有过期缓存

**接口**: `DELETE /api/cache`

**功能**: 自动清理所有过期的缓存文件。

#### 请求示例

```bash
# cURL
curl -X DELETE http://localhost:3000/api/cache \
  -H "Content-Type: application/json" \
  -d '{}'

# JavaScript
fetch('http://localhost:3000/api/cache', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 响应示例

```json
{
  "success": true,
  "message": "过期缓存清理完成",
  "cleanedCount": 5,
  "totalFiles": 15,
  "cacheEnabled": true
}
```

---

## 内容生成API

### 6. 生成小红书内容

**接口**: `POST /api/generate-combined`

**功能**: 基于关键词和用户素材，生成完整的小红书内容（标题、正文、标签、AI绘画提示词）。

#### 请求体参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 是 | 主题关键词 |
| `user_info` | string | 是 | 用户提供的原始素材信息 |

#### 请求示例

```bash
# cURL
curl -X POST http://localhost:3000/api/generate-combined \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "护肤",
    "user_info": "产品：XX牌玻尿酸精华\n特点：质地清爽，吸收快，主打深层补水\n我的感受：用了一周，感觉皮肤没那么干了，上妆也更服帖\n目标人群：20-30岁的年轻女性，混合皮或干皮\n价格：199元，性价比很高"
  }'

# JavaScript (fetch)
fetch('http://localhost:3000/api/generate-combined', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: '护肤',
    user_info: '产品：XX牌玻尿酸精华\n特点：质地清爽，吸收快，主打深层补水\n我的感受：用了一周，感觉皮肤没那么干了，上妆也更服帖\n目标人群：20-30岁的年轻女性，混合皮或干皮\n价格：199元，性价比很高'
  })
})
  .then(async res => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('生成完成');
          } else {
            const json = JSON.parse(data);
            console.log(json.content);
          }
        }
      }
    }
  });

# JavaScript (axios) - 流式处理
axios.post('http://localhost:3000/api/generate-combined', {
  keyword: '护肤',
  user_info: '...'
}, {
  responseType: 'stream',
  onDownloadProgress: (progressEvent) => {
    console.log(progressEvent);
  }
});
```

#### 响应格式（Server-Sent Events）

此API使用**流式响应**（SSE），逐步返回生成的内容。

**响应头**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**数据格式**:
```
data: {"content":"## 1. 爆款标题创作\n"}

data: {"content":"### 标题1："}

data: {"content":"平价护肤好物"}

...

data: [DONE]
```

#### 生成内容结构

生成的完整内容包含以下4个部分：

```markdown
## 1. 爆款标题创作
### 标题1：...
### 标题2：...
### 标题3：...

## 2. 正文内容
【开头钩子】
...正文内容...
【结尾互动】

## 3. 热门标签
#标签1 #标签2 #标签3 ...

## 4. AI绘画提示词
...Midjourney/Stable Diffusion提示词...
```

#### 错误响应

```json
{
  "error": "错误描述",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 客户端处理示例

```javascript
async function generateContent(keyword, userInfo) {
  const response = await fetch('/api/generate-combined', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, user_info: userInfo })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          console.log('✅ 生成完成');
          return fullContent;
        } else {
          try {
            const json = JSON.parse(data);
            if (json.content) {
              fullContent += json.content;
              // 实时更新UI
              updateUI(fullContent);
            }
            if (json.error) {
              console.error('❌ 生成错误:', json.error);
              throw new Error(json.error);
            }
          } catch (e) {
            console.error('解析错误:', e);
          }
        }
      }
    }
  }
}
```

---

## 缓存清理API

### 7. 定时清理过期缓存

**接口**: `GET /api/cron/clean-cache` 或 `POST /api/cron/clean-cache`

**功能**: 清理所有过期的缓存文件（用于定时任务）。

#### 安全认证

此接口需要Bearer Token认证（生产环境）：

```bash
Authorization: Bearer YOUR_CRON_SECRET
```

在Vercel中配置 `CRON_SECRET` 环境变量。

#### 请求示例

```bash
# cURL
curl -X GET http://localhost:3000/api/cron/clean-cache \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# JavaScript
fetch('http://localhost:3000/api/cron/clean-cache', {
  headers: {
    'Authorization': 'Bearer YOUR_CRON_SECRET'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 成功响应

```json
{
  "success": true,
  "message": "缓存清理完成",
  "timestamp": "2024-01-01T02:00:00.000Z",
  "cleanedCount": 5,
  "totalFiles": 15,
  "cacheEnabled": true
}
```

#### Vercel Cron Jobs配置

在 `vercel.json` 中配置定时任务：

```json
{
  "crons": [
    {
      "path": "/api/cron/clean-cache",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## 错误处理

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（需要认证） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 常见错误码

#### 1. 缺少必需参数

```json
{
  "error": "缺少必需参数",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**解决方法**: 检查请求体是否包含所有必需参数。

#### 2. 缓存功能已禁用

```json
{
  "success": false,
  "message": "缓存功能已禁用",
  "cacheEnabled": false
}
```

**解决方法**: 在环境变量中设置 `ENABLE_CACHE=true`。

#### 3. AI服务未配置

```json
{
  "error": "AI服务未配置",
  "details": "请检查环境变量配置",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**解决方法**: 检查 `THIRD_PARTY_API_URL` 和 `THIRD_PARTY_API_KEY` 是否正确配置。

#### 4. 小红书Cookie未配置

```json
{
  "error": "小红书数据获取配置错误",
  "details": "请检查环境变量配置",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**解决方法**: 
- 如果需要抓取真实数据，配置 `XHS_COOKIE` 环境变量
- 如果不需要抓取，设置 `ENABLE_SCRAPING=false`

---

## 最佳实践

### 1. 健康检查监控

建议每5分钟调用一次健康检查接口，监控服务状态：

```javascript
setInterval(async () => {
  const health = await fetch('/api/health').then(r => r.json());
  if (health.status !== 'healthy') {
    // 发送告警
    sendAlert(health);
  }
}, 5 * 60 * 1000);
```

### 2. 缓存管理策略

- **定期清理**: 每天凌晨2点自动清理过期缓存（使用Cron Jobs）
- **监控缓存大小**: 当缓存总大小超过1GB时，手动清理旧缓存
- **查看缓存命中率**: 定期查看缓存列表，了解缓存使用情况

### 3. 流式内容处理

处理流式响应时，注意以下几点：

- **错误处理**: 捕获并处理流式传输中的错误
- **超时控制**: 设置合理的超时时间（建议60秒）
- **UI反馈**: 实时更新UI，提供良好的用户体验
- **中断恢复**: 允许用户中断生成并重新开始

### 4. 并发控制

避免同时发起多个内容生成请求，建议：

- 在前端维护请求队列
- 等待当前请求完成后再发起新请求
- 提供"取消"按钮，允许用户中断长时间运行的请求

---

## 环境变量配置

确保以下环境变量正确配置：

```env
# AI服务配置（必填）
THIRD_PARTY_API_URL="https://your-api-provider.com/v1"
THIRD_PARTY_API_KEY="your_api_key_here"
AI_MODEL_NAME="gemini-2.5-pro,gemini-2.5-flash"

# 小红书数据抓取（可选）
XHS_COOKIE="your_xiaohongshu_cookie_here"

# 功能开关
ENABLE_CACHE=true           # 缓存开关
ENABLE_SCRAPING=true        # 爬取开关
ENABLE_DEBUG_LOGGING=false  # 调试日志

# 生产环境配置
PRODUCTION_URL="https://your-domain.vercel.app"
CRON_SECRET="your_random_secret"  # Cron Jobs认证密钥
```

---

## 技术支持

如有问题，请联系：

- **小红书**: [关注作者](https://www.xiaohongshu.com/user/profile/5e141963000000000100158e)
- **GitHub Issues**: 提交问题和建议

---

**最后更新时间**: 2024-01-01  
**API版本**: v2.2
