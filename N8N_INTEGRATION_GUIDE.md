# n8n 集成指南 - 小红书爆款文案生成器

本文档详细介绍如何在 n8n 中集成小红书爆款文案生成器，实现自动化内容创作工作流。

## 📋 目录

1. [什么是 n8n](#什么是-n8n)
2. [集成概述](#集成概述)
3. [快速开始](#快速开始)
4. [详细配置步骤](#详细配置步骤)
5. [完整工作流示例](#完整工作流示例)
6. [响应数据处理](#响应数据处理)
7. [高级用法](#高级用法)
8. [常见问题排查](#常见问题排查)
9. [最佳实践](#最佳实践)

---

## 什么是 n8n

[n8n](https://n8n.io/) 是一个开源的工作流自动化工具，类似于 Zapier 和 Make（原 Integromat），但具有以下优势：

- **开源免费**：可自部署，无节点数量限制
- **可视化编辑**：拖拽式界面，无需编程
- **灵活扩展**：支持 400+ 内置集成和自定义 HTTP 请求
- **数据隐私**：支持本地部署，数据完全掌控

**典型应用场景：**
- 定时生成小红书文案并保存到数据库
- 监听表单提交自动生成内容并发送邮件
- 结合 Notion/Airtable 实现内容管理自动化
- 集成第三方 API 构建复杂业务流程

---

## 集成概述

### API 端点信息

**基础 URL：** `https://your-domain.vercel.app/api/generate-combined`（替换为你的实际部署域名）

**请求方法：** `POST`

**请求格式：** `application/json`

**响应格式：** `text/event-stream`（SSE 流式传输）

### 核心功能

- ✅ 分析小红书热门笔记（可选，需配置 `XHS_COOKIE`）
- ✅ 基于用户素材生成高质量内容
- ✅ 应用 11 大降低 AIGC 检测率策略（v2.2）
- ✅ 自动过滤敏感词（105+ 词库）
- ✅ 流式响应，实时返回内容

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `keyword` | string | ✅ | 关键词（如"护肤"、"健身器材"） |
| `user_info` | string | ✅ | 用户素材信息（产品特点、使用体验等） |

**示例请求体：**
```json
{
  "keyword": "护肤精华液",
  "user_info": "产品名称：玻尿酸精华液\n主要成分：2%玻尿酸、烟酰胺\n功效：深度补水、淡化细纹\n价格：199元/30ml\n使用体验：质地清爽不油腻，吸收快，用了一周皮肤明显水润"
}
```

---

## 快速开始

### 前置条件

1. **已部署的 API 服务**
   - 确保服务已部署到 Vercel 或其他平台
   - 记录 API 地址（如 `https://xhs-ai-writer.vercel.app`）

2. **n8n 环境**
   - 选项 A：使用 [n8n Cloud](https://n8n.io/cloud/)（推荐新手）
   - 选项 B：本地安装 n8n（适合自定义需求）
     ```bash
     # Docker 方式
     docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
     
     # npm 方式
     npm install n8n -g
     n8n start
     ```

3. **环境变量配置**
   - 确保 API 服务的 `.env.local` 已正确配置：
     - `THIRD_PARTY_API_URL`（AI 服务地址）
     - `THIRD_PARTY_API_KEY`（AI API 密钥）
     - `AI_MODEL_NAME`（模型名称，如 `gemini-2.5-pro`）
     - `XHS_COOKIE`（可选，用于爬取小红书数据）
     - `ENABLE_SCRAPING`（可选，`true`/`false`）

---

## 详细配置步骤

### 方法一：使用 HTTP Request 节点（推荐）

#### 步骤 1：添加 HTTP Request 节点

1. 在 n8n 编辑器中拖拽 **HTTP Request** 节点到画布
2. 双击节点打开配置面板

#### 步骤 2：配置请求基础信息

**认证设置：**
- **Authentication:** `None`（API 不需要身份验证）

**请求方法：**
- **Method:** `POST`

**请求 URL：**
- **URL:** `https://your-domain.vercel.app/api/generate-combined`
  - ⚠️ 替换为你的实际部署域名

**请求头设置：**
- 点击 **Headers** → **Add Header**
  ```
  Name: Content-Type
  Value: application/json
  ```

#### 步骤 3：配置请求体

**Body Content Type:**
- 选择 **JSON**

**JSON Body:**
```json
{
  "keyword": "{{ $json.keyword }}",
  "user_info": "{{ $json.user_info }}"
}
```

**💡 说明：**
- `{{ $json.keyword }}` 和 `{{ $json.user_info }}` 是 n8n 变量引用
- 这些值来自上一个节点的输出
- 如需固定值测试，可直接写：
  ```json
  {
    "keyword": "护肤精华液",
    "user_info": "产品名称：玻尿酸精华液..."
  }
  ```

#### 步骤 4：处理流式响应

由于 API 返回的是 SSE（Server-Sent Events）流式数据，需要特殊处理：

**选项 A：使用 Function 节点解析流式响应**

1. 在 HTTP Request 节点后添加 **Function** 节点
2. 配置如下代码：

```javascript
// Function 节点：解析 SSE 流式响应
const responseText = items[0].json.body; // 获取原始响应文本

// 解析 SSE 格式数据
const lines = responseText.split('\n');
let fullContent = '';

for (const line of lines) {
  if (line.startsWith('data: ')) {
    const dataStr = line.substring(6); // 去掉 "data: " 前缀
    
    if (dataStr === '[DONE]') {
      break; // 流式传输结束
    }
    
    try {
      const data = JSON.parse(dataStr);
      if (data.content) {
        fullContent += data.content; // 拼接内容
      } else if (data.error) {
        throw new Error(data.error); // 处理错误
      }
    } catch (e) {
      console.error('解析错误:', e.message);
    }
  }
}

// 返回解析后的完整内容
return [{
  json: {
    generatedContent: fullContent,
    timestamp: new Date().toISOString()
  }
}];
```

**选项 B：使用 Code 节点（更灵活）**

如果需要更复杂的处理逻辑，可以使用 **Code** 节点：

```javascript
// Code 节点：高级 SSE 处理示例
const items = $input.all();
const responseText = items[0].json.body;

// 解析 SSE 流
const parseSSE = (text) => {
  const lines = text.split('\n');
  const chunks = [];
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const dataStr = line.substring(6);
      if (dataStr === '[DONE]') break;
      
      try {
        const data = JSON.parse(dataStr);
        if (data.content) chunks.push(data.content);
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
  
  return chunks.join('');
};

const fullContent = parseSSE(responseText);

// 正则解析生成的内容结构
const titleMatch = fullContent.match(/## 1\. 标题创作([\s\S]*?)(?=## 2\.)/);
const bodyMatch = fullContent.match(/## 2\. 正文创作([\s\S]*?)(?=## 3\.)/);
const tagsMatch = fullContent.match(/## 3\. 标签创作([\s\S]*?)(?=## 4\.)/);
const imagePromptMatch = fullContent.match(/## 4\. AI绘画提示词([\s\S]*?)$/);

return [{
  json: {
    rawContent: fullContent,
    title: titleMatch ? titleMatch[1].trim() : '',
    body: bodyMatch ? bodyMatch[1].trim() : '',
    tags: tagsMatch ? tagsMatch[1].trim() : '',
    imagePrompt: imagePromptMatch ? imagePromptMatch[1].trim() : '',
    timestamp: new Date().toISOString()
  }
}];
```

---

### 方法二：使用 Webhook 触发（外部调用）

如果你希望从外部系统（如网站表单、其他应用）触发 n8n 工作流：

#### 步骤 1：添加 Webhook 节点

1. 拖拽 **Webhook** 节点到画布
2. 配置：
   - **HTTP Method:** `POST`
   - **Path:** `xiaohongshu-generator`（自定义路径）
   - **Response Mode:** `When Last Node Finishes`

3. 保存工作流，n8n 会生成一个 Webhook URL：
   ```
   https://your-n8n-instance.com/webhook/xiaohongshu-generator
   ```

#### 步骤 2：添加 HTTP Request 节点

按照【方法一】的步骤配置，但参数引用改为：
```json
{
  "keyword": "{{ $json.body.keyword }}",
  "user_info": "{{ $json.body.user_info }}"
}
```

#### 步骤 3：添加响应节点

添加 **Respond to Webhook** 节点，返回处理结果：
```json
{
  "success": true,
  "content": "{{ $json.generatedContent }}"
}
```

---

## 完整工作流示例

### 示例 1：定时生成内容并保存到 Google Sheets

**场景：**每天自动生成一篇小红书文案并保存到 Google 表格。

**工作流节点：**

```
1. Schedule Trigger（定时触发器）
   └─> 每天上午 10:00 执行
   
2. Set（设置输入数据）
   └─> 设置 keyword 和 user_info
   
3. HTTP Request（调用 API）
   └─> 生成内容
   
4. Function（解析响应）
   └─> 提取标题、正文、标签
   
5. Google Sheets（保存数据）
   └─> 追加一行到表格
```

**详细配置：**

**节点 1：Schedule Trigger**
- **Trigger Interval:** `Days`
- **Days Between Triggers:** `1`
- **Trigger at Hour:** `10`
- **Trigger at Minute:** `0`

**节点 2：Set**
```json
{
  "keyword": "减肥食谱",
  "user_info": "产品：低卡代餐奶昔\n热量：每份仅150卡\n口味：巧克力、香草、草莓\n体验：饱腹感强，坚持一周瘦了3斤"
}
```

**节点 3：HTTP Request**
- 按照前面的步骤配置

**节点 4：Function**
- 使用前面提供的解析代码

**节点 5：Google Sheets**
- **Operation:** `Append`
- **Document:** 选择你的表格
- **Sheet:** 选择工作表
- **Columns:** 映射字段
  - Column A: `{{ $json.title }}`
  - Column B: `{{ $json.body }}`
  - Column C: `{{ $json.tags }}`
  - Column D: `{{ $json.timestamp }}`

---

### 示例 2：从 Notion 数据库读取产品信息并生成文案

**场景：**从 Notion 数据库读取待创作的产品列表，批量生成文案并更新回 Notion。

**工作流节点：**

```
1. Manual Trigger（手动触发）
   
2. Notion（读取数据库）
   └─> 获取所有状态为"待创作"的产品
   
3. Loop Over Items（循环处理）
   
4. HTTP Request（生成文案）
   └─> 为每个产品生成内容
   
5. Function（解析响应）
   
6. Notion（更新页面）
   └─> 将生成的内容写回 Notion
```

**详细配置：**

**节点 2：Notion - Read Database**
- **Operation:** `Get All`
- **Database:** 选择你的产品数据库
- **Filters:** `Status = "待创作"`

**节点 4：HTTP Request**
```json
{
  "keyword": "{{ $json.关键词 }}",
  "user_info": "{{ $json.产品详情 }}"
}
```

**节点 6：Notion - Update Page**
- **Page ID:** `{{ $json.id }}`
- **Properties:**
  - `生成的标题`: `{{ $json.title }}`
  - `正文内容`: `{{ $json.body }}`
  - `标签`: `{{ $json.tags }}`
  - `状态`: `已完成`

---

### 示例 3：Webhook + Slack 通知工作流

**场景：**通过 Webhook 接收生成请求，生成完成后发送 Slack 通知。

**工作流节点：**

```
1. Webhook Trigger（接收请求）
   
2. HTTP Request（生成文案）
   
3. Function（解析响应）
   
4. Slack（发送通知）
   
5. Respond to Webhook（返回响应）
```

**节点 4：Slack**
- **Resource:** `Message`
- **Operation:** `Post`
- **Channel:** `#content-team`
- **Text:**
  ```
  ✅ 小红书文案已生成完成！
  
  关键词：{{ $json.keyword }}
  标题预览：{{ $json.title.substring(0, 50) }}...
  
  查看完整内容 👉 [链接]
  ```

---

## 响应数据处理

### 原始 SSE 响应格式

API 返回的原始响应是 Server-Sent Events 格式：

```
data: {"content":"## 1. "}
data: {"content":"标题"}
data: {"content":"创作\n\n"}
...
data: [DONE]
```

### 完整内容结构

拼接所有 `content` 后，完整内容包含 4 个部分：

```markdown
## 1. 标题创作

标题1：🔥 30天瘦10斤！我的减肥食谱大公开
标题2：姐妹们！这个代餐奶昔真的绝了
标题3：低卡又好喝｜150卡代餐实测分享

## 2. 正文创作

说实话，我一开始对代餐这种东西是拒绝的...
（正文内容，450-750字）

## 3. 标签创作

#减肥食谱 #代餐奶昔 #低卡饮食 #健康瘦身 #减脂期必备
#巧克力味 #饱腹感强 #轻松瘦身 #夏日减肥 #好喝不胖

## 4. AI绘画提示词

A delicious chocolate protein shake in a clear glass...
（英文绘画提示词）
```

### 数据提取方法

**方法 1：正则表达式提取（推荐）**

```javascript
const content = '...'; // 完整内容

// 提取各部分
const sections = {
  title: content.match(/## 1\. 标题创作([\s\S]*?)(?=## 2\.)/)?.[1].trim() || '',
  body: content.match(/## 2\. 正文创作([\s\S]*?)(?=## 3\.)/)?.[1].trim() || '',
  tags: content.match(/## 3\. 标签创作([\s\S]*?)(?=## 4\.)/)?.[1].trim() || '',
  imagePrompt: content.match(/## 4\. AI绘画提示词([\s\S]*?)$/)?.[1].trim() || ''
};

// 进一步处理标题（提取多个标题）
const titleLines = sections.title.split('\n').filter(line => line.trim());
sections.titles = titleLines.map(line => line.replace(/^标题\d+[：:]\s*/, ''));

// 处理标签（提取数组）
sections.tagArray = sections.tags.match(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g) || [];
```

**方法 2：Split 方法提取**

```javascript
const parts = content.split(/## \d+\. /);
// parts[1] = 标题创作\n\n标题1：...
// parts[2] = 正文创作\n\n说实话...
// parts[3] = 标签创作\n\n#减肥...
// parts[4] = AI绘画提示词\n\nA delicious...

const sections = {
  title: parts[1]?.split('\n\n')[1] || '',
  body: parts[2]?.split('\n\n').slice(1).join('\n\n') || '',
  tags: parts[3]?.split('\n\n')[1] || '',
  imagePrompt: parts[4]?.split('\n\n').slice(1).join('\n\n') || ''
};
```

---

## 高级用法

### 1. 批量生成内容

使用 **Split In Batches** 节点处理大量数据：

```
1. 数据源（如 Google Sheets）
   └─> 读取 100 个产品
   
2. Split In Batches
   └─> 每批处理 5 个（避免 API 限流）
   
3. Loop Over Items
   └─> 逐个生成内容
   
4. Wait
   └─> 每批之间等待 5 秒
   
5. 保存结果
```

**配置 Split In Batches：**
- **Batch Size:** `5`
- **Options:** 启用 `Reset` 选项

### 2. 错误处理和重试

添加 **Error Trigger** 节点捕获错误：

```
主工作流（正常执行）
   ↓ 失败
Error Trigger（错误处理）
   ├─> Function（记录错误）
   ├─> Slack（发送告警）
   └─> HTTP Request（重试 API 调用）
```

**Error Trigger 配置：**
```javascript
// Function 节点：格式化错误信息
const error = $json.error;
return [{
  json: {
    errorMessage: error.message,
    errorTime: new Date().toISOString(),
    retryCount: $json.retryCount || 0
  }
}];
```

### 3. 条件分支（根据关键词类型调整参数）

使用 **IF** 节点根据不同条件执行不同逻辑：

```
1. Trigger
   
2. IF（判断关键词分类）
   ├─> TRUE: 美妆类关键词
   │   └─> HTTP Request（使用美妆专用提示词）
   └─> FALSE: 其他类别
       └─> HTTP Request（使用通用提示词）
```

**IF 节点配置：**
- **Condition:** `{{ $json.keyword }}` - `contains` - `护肤|美妆|化妆品`

### 4. 内容质量检查

添加质量检查节点，确保生成内容符合标准：

```javascript
// Function 节点：内容质量检查
const content = $json.body;

// 检查字数
const wordCount = content.length;
const isLengthValid = wordCount >= 450 && wordCount <= 750;

// 检查是否包含敏感词
const sensitiveWords = ['首先', '其次', '总之', '综上所述'];
const hasSensitiveWords = sensitiveWords.some(word => content.includes(word));

// 检查 Emoji 使用
const emojiCount = (content.match(/[\uD800-\uDFFF]./g) || []).length;
const hasEmoji = emojiCount > 0;

return [{
  json: {
    ...items[0].json,
    qualityCheck: {
      isLengthValid,
      wordCount,
      hasSensitiveWords,
      hasEmoji,
      passed: isLengthValid && !hasSensitiveWords && hasEmoji
    }
  }
}];
```

### 5. 多语言支持（生成英文内容）

如果需要生成英文内容（如 Instagram 文案）：

```json
{
  "keyword": "skincare serum",
  "user_info": "Product: Hyaluronic Acid Serum\nBenefits: Deep hydration, anti-aging\nPrice: $29.99\nExperience: Lightweight, absorbs quickly, visible results in 2 weeks"
}
```

注意：提示词主要针对中文小红书优化，英文内容生成效果可能需要调整。

---

## 常见问题排查

### 问题 1：HTTP Request 返回 404 错误

**原因：**API 地址错误或服务未部署

**解决：**
1. 检查 URL 是否正确：`https://your-domain.vercel.app/api/generate-combined`
2. 在浏览器中访问 API 根路径，确认服务正常
3. 确认 HTTP 方法为 `POST`，而非 `GET`

### 问题 2：返回 400 Bad Request

**原因：**请求参数缺失或格式错误

**排查步骤：**
1. 检查请求体是否包含 `keyword` 和 `user_info`
2. 确认 Content-Type 为 `application/json`
3. 检查 JSON 格式是否正确（无多余逗号、引号匹配）

**调试方法：**
在 HTTP Request 节点后添加 **Edit Fields** 节点，查看实际发送的数据：
```json
{
  "sentData": "{{ $json }}"
}
```

### 问题 3：返回 500 Internal Server Error

**原因：**服务端错误（AI API 调用失败、环境变量缺失等）

**解决：**
1. 检查 API 服务的日志（Vercel Dashboard → Deployments → Logs）
2. 确认环境变量配置正确：
   - `THIRD_PARTY_API_URL`
   - `THIRD_PARTY_API_KEY`
   - `AI_MODEL_NAME`
3. 检查 AI 服务商的 API 配额是否用尽
4. 如果启用了爬取功能，检查 `XHS_COOKIE` 是否过期

### 问题 4：响应内容为空或不完整

**原因：**流式响应解析失败

**解决：**
1. 在 Function 节点中添加调试日志：
   ```javascript
   console.log('原始响应:', items[0].json.body);
   ```
2. 检查是否正确处理了 SSE 格式（`data: ` 前缀、`[DONE]` 标记）
3. 增加超时时间（API 生成时间通常 30-60 秒）

**HTTP Request 节点超时设置：**
- **Options** → **Timeout** → 设置为 `120000`（120 秒）

### 问题 5：n8n 提示"Too Many Requests"

**原因：**API 频率限制或 n8n 限流

**解决：**
1. 添加 **Wait** 节点，在批量请求间增加延迟：
   ```
   - Amount: 5
   - Unit: Seconds
   ```
2. 减小 **Split In Batches** 的批次大小
3. 检查 API 服务商的频率限制（如 Gemini API 每分钟请求数）

### 问题 6：生成内容包含 AI 味浓重的词汇

**原因：**提示词策略可能需要调整

**临时解决：**
在 Function 节点中添加后处理逻辑：
```javascript
const content = $json.body;

// 替换 AI 味词汇
const replacements = {
  '首先': '先说',
  '其次': '然后',
  '总之': '反正',
  '综上所述': '说实话',
  '非常': '超级'
};

let cleanedContent = content;
for (const [old, newWord] of Object.entries(replacements)) {
  cleanedContent = cleanedContent.replace(new RegExp(old, 'g'), newWord);
}

return [{ json: { ...items[0].json, body: cleanedContent } }];
```

**长期解决：**
联系 API 管理员调整 `lib/prompts.ts` 中的提示词策略。

---

## 最佳实践

### 1. 环境变量管理

在 n8n 中使用环境变量存储敏感信息：

**n8n Cloud:**
- 进入 **Settings** → **Environments**
- 添加变量：`API_BASE_URL`、`API_KEY` 等
- 在节点中引用：`{{ $env.API_BASE_URL }}`

**自部署 n8n:**
```bash
# docker-compose.yml
environment:
  - API_BASE_URL=https://your-domain.vercel.app
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=your-password
```

### 2. 工作流版本管理

- 定期导出工作流 JSON 备份（**Settings** → **Export Workflow**）
- 使用 Git 管理工作流版本（将 JSON 文件提交到仓库）
- 在工作流名称中包含版本号（如 `XHS Generator v2.2`）

### 3. 监控和日志

**添加日志节点：**
```javascript
// Function 节点：记录执行日志
const logEntry = {
  timestamp: new Date().toISOString(),
  keyword: $json.keyword,
  success: !!$json.body,
  contentLength: $json.body?.length || 0
};

// 将日志发送到外部服务（如 Logstash、Datadog）
return [{ json: logEntry }];
```

**配置告警：**
- 使用 **IF** 节点检测错误条件
- 通过 **Slack**、**Email** 或 **Telegram** 发送告警

### 4. 性能优化

**缓存策略：**
- 对于相同关键词，缓存生成结果（使用 Redis 或 n8n 内存存储）
- 设置缓存过期时间（如 24 小时）

**并发控制：**
- 使用 **Split In Batches** 限制并发请求数
- 避免同时发送大量请求导致 API 限流

**异步处理：**
- 对于长时间任务，使用 Webhook + 后台执行模式
- 生成完成后通过回调通知客户端

### 5. 数据安全

- ✅ 使用 HTTPS 确保传输安全
- ✅ 不要在工作流中硬编码 API 密钥（使用环境变量）
- ✅ 定期更新 `XHS_COOKIE`（如果使用爬取功能）
- ✅ 限制 Webhook 访问（添加身份验证头）

**Webhook 安全示例：**
```javascript
// Function 节点：验证请求签名
const receivedSignature = $json.headers['x-signature'];
const expectedSignature = 'your-secret-key';

if (receivedSignature !== expectedSignature) {
  throw new Error('Unauthorized request');
}

return items;
```

### 6. 内容审核流程

添加人工审核环节：

```
1. 生成内容
   
2. 保存到 Notion/Airtable（状态：待审核）
   
3. 发送 Slack 通知审核人员
   
4. Webhook（接收审核结果）
   ├─> 批准：发布到小红书
   └─> 拒绝：重新生成
```

---

## 附录

### A. 完整的 n8n 工作流 JSON 示例

以下是一个可直接导入的工作流示例（基础版本）：

```json
{
  "name": "小红书文案生成器",
  "nodes": [
    {
      "parameters": {},
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "keyword",
              "value": "护肤精华液"
            },
            {
              "name": "user_info",
              "value": "产品名称：玻尿酸精华液\n主要成分：2%玻尿酸、烟酰胺\n功效：深度补水、淡化细纹\n价格：199元/30ml\n使用体验：质地清爽不油腻，吸收快，用了一周皮肤明显水润"
            }
          ]
        }
      },
      "name": "Set",
      "type": "n8n-nodes-base.set",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "url": "https://your-domain.vercel.app/api/generate-combined",
        "method": "POST",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "keyword",
              "value": "={{ $json.keyword }}"
            },
            {
              "name": "user_info",
              "value": "={{ $json.user_info }}"
            }
          ]
        },
        "options": {
          "timeout": 120000
        }
      },
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [650, 300]
    },
    {
      "parameters": {
        "functionCode": "const responseText = items[0].json.body;\nconst lines = responseText.split('\\n');\nlet fullContent = '';\n\nfor (const line of lines) {\n  if (line.startsWith('data: ')) {\n    const dataStr = line.substring(6);\n    if (dataStr === '[DONE]') break;\n    try {\n      const data = JSON.parse(dataStr);\n      if (data.content) fullContent += data.content;\n    } catch (e) {}\n  }\n}\n\nreturn [{ json: { generatedContent: fullContent, timestamp: new Date().toISOString() } }];"
      },
      "name": "Parse Response",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [850, 300]
    }
  ],
  "connections": {
    "Start": {
      "main": [[{ "node": "Set", "type": "main", "index": 0 }]]
    },
    "Set": {
      "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]]
    },
    "HTTP Request": {
      "main": [[{ "node": "Parse Response", "type": "main", "index": 0 }]]
    }
  }
}
```

**导入方法：**
1. 复制上述 JSON
2. 在 n8n 中点击 **+ Add Workflow** → **Import from File/URL**
3. 粘贴 JSON 并导入
4. 修改 HTTP Request 节点中的 URL 为你的实际域名
5. 保存并执行

### B. 相关资源

**官方文档：**
- [n8n 官方文档](https://docs.n8n.io/)
- [HTTP Request 节点文档](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Function 节点文档](https://docs.n8n.io/code-examples/methods-variables-functions/)

**社区资源：**
- [n8n 社区论坛](https://community.n8n.io/)
- [n8n 工作流模板](https://n8n.io/workflows/)

**API 文档：**
- 参考项目根目录的 `API_DOCUMENTATION.md`

### C. 技术支持

遇到问题？请按以下顺序排查：

1. **检查 API 服务状态**
   - 访问 `https://your-domain.vercel.app/api/health`（如果有健康检查端点）
   - 查看 Vercel Dashboard 的日志

2. **查看 n8n 执行日志**
   - 点击工作流执行记录
   - 查看每个节点的输入输出数据

3. **启用调试模式**
   - 在 API 服务中设置 `ENABLE_DEBUG_LOGGING=true`
   - 在 n8n Function 节点中添加 `console.log()` 输出

4. **联系支持**
   - GitHub Issues: [项目仓库]
   - Email: [支持邮箱]

---

## 更新日志

**v1.0 - 2024-11-08**
- 初始版本发布
- 支持基础的 HTTP Request 集成
- 提供 3 个完整工作流示例

---

**文档版本：** v1.0  
**更新日期：** 2024-11-08  
**适用 API 版本：** v2.2

**祝你使用愉快！🚀**
