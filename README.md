# 🔥 AI小红书爆款文案生成器

> **从"通用模型"到"小红书爆款专家"的革命性升级**
> 智能分析热门笔记，一键生成人味十足的爆款文案

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![小红书](https://img.shields.io/badge/小红书-关注作者-red)](https://www.xiaohongshu.com/user/profile/5e141963000000000100158e)

## ✨ 核心特性

### 🧠 双重专家系统
- **🔬 分析专家**: 公式化拆解热门笔记，提取可套用的爆款公式
- **🎨 创作专家**: 注入真情实感，去除AI味，打造人味十足的内容

### 🛡️ 三重安全保障
- **📋 格式稳定性**: 强化Prompt约束 + 后端内容清洗
- **🚨 内容安全性**: 105+敏感词库 + 实时流式过滤
- **✅ 验证完整性**: 多层验证逻辑 + 智能错误恢复

### 🎯 完整内容生态
- **📊 爆款标题**: 基于真实数据的标题公式（情感共鸣型、实用价值型、好奇悬念型）
- **📝 正文内容**: 5种开头钩子 + 结构化正文 + 5种结尾策略
- **🏷️ 智能标签**: 核心词+场景词+人群词+内容类型词的科学组合
- **🎨 配图提示**: 基于封面风格分析的AI绘画提示词

### 🚀 用户体验升级
- **📱 响应式设计**: 完美适配桌面端和移动端
- **⚡ 流式生成**: 实时显示创作过程，多阶段加载反馈
- **📋 独立复制**: 每个内容模块都有专属复制按钮
- **🎭 引导优化**: 三步流程引导 + 详细输入模板

## 🛠️ 技术栈

### 前端技术
- **框架**: Next.js 15 + React 18 + TypeScript 5
- **样式**: Tailwind CSS 3 + 自定义Shadcn/ui组件
- **状态管理**: React Hooks + 实时流式状态
- **UI增强**: 渐变设计 + 响应式布局 + 动画效果

### 后端技术
- **API**: Next.js API Routes (Serverless Functions)
- **AI集成**: OpenAI兼容接口 + 智能重试机制
- **数据处理**: 流式传输 + 实时内容过滤
- **缓存系统**: 文件缓存 + 智能降级策略

### 安全与稳定性
- **内容安全**: 敏感词过滤 + 实时安全检查
- **格式稳定**: Prompt强化 + 后端内容清洗
- **错误处理**: 结构化错误 + 智能重试机制

## 快速开始

### 1. 环境要求

- Node.js 18+ 
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 环境变量配置

复制 `.env.local` 文件并填入真实配置：

```env
# 第三方AI服务的接入点URL (通常以 /v1 结尾)
THIRD_PARTY_API_URL="https://your-api-provider.com/v1"

# 第三方AI服务API密钥
THIRD_PARTY_API_KEY="your_api_key_here"

# AI模型名称（支持多模型降级，用逗号分隔）
AI_MODEL_NAME="gemini-2.5-pro,gemini-2.5-flash"

# 缓存功能开关 (true=启用, false=禁用)
ENABLE_CACHE=true

# 小红书Cookie（可选，用于真实数据抓取）
XHS_COOKIE="your_xiaohongshu_cookie_here"
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用

## 📖 使用说明

### 🎯 第一步：输入主题关键词
- 填写具体的主题关键词（如：`春季敏感肌护肤`、`职场穿搭技巧`、`平价美妆好物`）
- 关键词越具体，分析越精准

### ✍️ 第二步：提供原始素材
使用我们提供的模板，输入详细信息：
```
产品：XX牌新款玻尿酸精华
特点：质地清爽，吸收快，主打深层补水
我的感受：用了一周，感觉皮肤没那么干了，上妆也更服帖
目标人群：20-30岁的年轻女性，混合皮或干皮
价格：199元，性价比很高
```

### 🚀 第三步：AI智能创作
1. **分析阶段**: AI分析该关键词的热门笔记，提取爆款公式
2. **创作阶段**: 基于公式和您的素材，生成人味十足的内容

### 📋 第四步：一键复制使用
获得完整的小红书内容包：
- 🎯 **3个爆款标题** - 不同风格，任您选择
- 📝 **正文内容** - 结构清晰，真情实感
- 🏷️ **热门标签** - 科学组合，提升曝光
- 🎨 **配图提示** - AI绘画提示词，图文并茂

## 部署到Vercel

1. 将代码推送到GitHub仓库
2. 在Vercel中导入项目
3. 配置环境变量（与本地.env.local相同）
4. 一键部署完成

## 📡 API 调用与集成

- ✅ 默认提供 `POST /api/generate-combined` 生成内容的流式接口
- ✅ 新增 `GET /api/health` 用于服务健康检查与监控
- ✅ 新增 `GET/DELETE /api/cache` 便捷管理缓存数据
- 📘 详细接口说明、请求示例与错误码请参考仓库根目录的 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- 🔗 **n8n 工作流集成**：完整的 n8n 集成指南请查看 [N8N_INTEGRATION_GUIDE.md](./N8N_INTEGRATION_GUIDE.md)

## 项目结构

```
├── app/
│   ├── api/
│   │   ├── analyze-hot-posts/    # 热门分析API（已废弃）
│   │   ├── generate-combined/    # 内容生成API（主API）
│   │   ├── health/               # 健康检查API（新增）
│   │   ├── cache/                # 缓存管理API（新增）
│   │   └── cron/clean-cache/     # 定时清理缓存
│   ├── globals.css              # 全局样式
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 主页面
├── components/
│   └── ui/                      # UI组件库
├── lib/
│   ├── prompts.ts               # AI提示词管理
│   ├── ai-manager.ts            # AI交互管理
│   ├── cache-manager.ts         # 缓存系统
│   ├── sensitive-words.ts       # 敏感词过滤
│   └── utils.ts                 # 工具函数
├── .env.local                   # 环境变量
├── API_DOCUMENTATION.md         # API接口文档（新增）
└── README.md
```

## 🤖 多模型降级策略

### 智能模型切换
应用支持多模型降级策略，确保服务的高可用性：

- **配置方式**: 在 `AI_MODEL_NAME` 中用逗号分隔多个模型
- **降级逻辑**: 优先使用第一个模型 → 失败后自动切换到备用模型
- **重试机制**: 每个模型都有独立的重试次数（默认2次）
- **智能恢复**: 下次请求会重新从第一个模型开始尝试

### 配置示例

```env
# 单模型配置
AI_MODEL_NAME="gemini-2.5-pro"

# 多模型降级配置（推荐）
AI_MODEL_NAME="gemini-2.5-pro,gemini-2.5-flash"

# 更多模型配置
AI_MODEL_NAME="gpt-4,gemini-2.5-pro,gemini-2.5-flash"
```

### 降级流程
1. 🎯 **主模型尝试**: 使用第一个模型（如 `gemini-2.5-pro`）
2. 🔄 **重试机制**: 如果失败，重试2次（带指数退避）
3. 🔀 **模型切换**: 主模型所有重试失败后，切换到备用模型
4. ✅ **成功恢复**: 备用模型成功后，下次请求重新从主模型开始

## 缓存功能说明

### 缓存机制
应用内置了智能缓存系统，可以显著提升响应速度并减少对小红书API的请求频率：

- **缓存策略**: 优先使用有效缓存 → 尝试实时抓取 → 降级到同分类备用缓存
- **缓存时效**: 6小时（可在 `lib/cache-manager.ts` 中调整）
- **存储位置**: `data/cache/` 目录（自动创建）
- **分类管理**: 按关键词分类存储，支持跨关键词的备用缓存

### 缓存开关配置

在 `.env.local` 中设置 `ENABLE_CACHE` 环境变量：

```env
# 启用缓存（默认，推荐）
ENABLE_CACHE=true

# 禁用缓存（每次都重新抓取，响应较慢但数据最新）
ENABLE_CACHE=false
```

### 使用建议

- **开发环境**: 建议启用缓存，提升开发效率
- **生产环境**: 根据需求选择，启用缓存可减少API调用成本
- **数据敏感场景**: 如需确保数据实时性，可禁用缓存

## 注意事项

- 请确保API密钥的安全性，不要将其提交到公共仓库
- **必须配置有效的API密钥和小红书Cookie**，否则服务将无法正常工作
- 建议使用支持JSON格式输出的AI模型以获得最佳效果
- 缓存文件包含抓取的数据，请注意数据隐私保护

## 🔧 核心技术亮点

### 🧠 双重专家系统架构

#### 分析专家 (`getAnalysisPrompt`)
```typescript
// 公式化拆解热门笔记
{
  "titleFormulas": {
    "suggestedFormulas": ["数字+卖点+人群", "场景+解决方案+情感词"],
    "commonKeywords": ["高频词汇"],
    "avoidWords": ["过时网络用语"]
  },
  "contentStructure": {
    "openingHooks": ["5种开头钩子策略"],
    "bodyTemplate": "痛点→产品→细节→感受→建议",
    "endingHooks": ["5种结尾互动策略"]
  },
  "coverStyleAnalysis": {
    "commonStyles": ["杂志风拼贴", "全身镜穿搭", "左右对比图"],
    "suggestion": "最适合的封面风格建议"
  }
}
```

#### 创作专家 (`getGenerationPrompt`)
- **人设注入**: 从"AI助手"转变为"和闺蜜分享好物的朋友"
- **AI味清除**: 禁用"首先"、"其次"、"yyds"、"绝绝子"等机械化表达
- **真情实感**: 使用"天啊！"、"我挖到宝了！"、"真的栓Q！"等生活化感叹
- **细节升级**: 从"很好看"到"阳光下波光粼粼的感觉，绝了"

### 🛡️ 三重安全保障系统

#### 1. 格式稳定性
```typescript
// 后端内容清洗
let contentStarted = false;
const startMarker = "## 1. 爆款标题创作";
// 自动过滤AI前置解释文字
```

#### 2. 内容安全性
```typescript
// 105+敏感词库 + 实时过滤
const sensitiveWords = [
  "最", "第一", "治疗", "疗效", "秒杀", "100%有效"
  // ... 8大类敏感词汇
];
// 智能替换：'最' → '很', '治疗' → '改善'
```

#### 3. 验证完整性
```typescript
// 多层验证逻辑
validateTitleFormulas(titleFormulas, errors);
validateContentStructure(contentStructure, errors);
validateTagStrategy(tagStrategy, errors);
```

### ⚡ 智能内容解析引擎
- **四部分解析**: 自动提取标题、正文、标签、AI绘画提示词
- **正则表达式匹配**: 支持多种格式变体的智能识别
- **实时流式解析**: React useEffect实时监听并分割内容
- **备用降级策略**: 正则失败时自动使用固定标记匹配

### 🎨 用户体验优化
- **多阶段加载**: `🔍 正在分析热门笔记...` → `✅ 分析完成！正在生成文案...`
- **独立复制功能**: 每个内容模块都有专属复制按钮
- **渐变视觉设计**: 粉红到红色的现代化渐变效果
- **响应式布局**: 完美适配桌面端和移动端

## 👨‍💻 关于作者

这个项目由小红书博主精心打造，专注于AI工具开发和内容创作技巧分享。

### 📱 关注作者小红书
**[点击关注 →](https://www.xiaohongshu.com/user/profile/5e141963000000000100158e)**

在我的小红书账号，你可以获得：
- 🔥 **最新AI工具使用技巧**
- 📝 **小红书运营实战经验**
- 💡 **爆款文案创作心得**
- 🚀 **内容创作工具推荐**

### 💬 交流与反馈
- 如果这个工具对你有帮助，欢迎在小红书私信交流
- 有任何使用问题或改进建议，也可以通过小红书联系我
- 期待看到你用这个工具创作出的爆款内容！

---

## 许可证

MIT License
