# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 14 + TypeScript 的小红书AI文案生成器，使用双重专家系统（分析专家+创作专家）生成爆款文案内容。

## 常用开发命令

```bash
# 开发环境启动
npm run dev

# 构建生产版本  
npm run build

# 生产环境启动
npm start

# 代码检查
npm run lint
```

## 核心架构

### 双重专家系统
- **分析专家** (`lib/prompts.ts` - `getAnalysisPrompt`): 分析热门笔记，提取爆款公式
- **创作专家** (`lib/prompts.ts` - `getGenerationPrompt`): 基于公式生成人味十足的文案内容

### API 路由架构
- `/api/analyze-hot-posts/route.ts`: 小红书热门内容抓取分析
- `/api/generate-stream/route.ts`: 流式AI文案生成
- `/api/admin/cookie-status/route.ts`: 管理后台Cookie状态检查

### 核心管理器模块 (`lib/`)
- `ai-manager.ts`: 多模型降级策略的AI调用管理
- `cache-manager.ts`: 6小时缓存机制，支持分类存储
- `cookie-manager.ts`: 小红书Cookie管理和验证
- `history-manager.ts`: 生成历史记录管理
- `error-handler.ts`: 结构化错误处理
- `sensitive-words.ts`: 105+敏感词实时过滤

### 内容解析流程
1. 热门笔记分析 → 提取公式化模板
2. AI流式生成 → 四部分内容（标题/正文/标签/配图）
3. 实时安全过滤 → 敏感词替换
4. 格式验证 → 完整性检查

## 环境变量配置

必需的环境变量（.env.local）:
```env
THIRD_PARTY_API_URL="https://your-api-provider.com/v1"
THIRD_PARTY_API_KEY="your_api_key_here" 
AI_MODEL_NAME="gemini-2.5-pro,gemini-2.5-flash"
ENABLE_CACHE=true
XHS_COOKIE="your_xiaohongshu_cookie_here"
```

## 特殊功能

### 多模型降级策略
AI_MODEL_NAME 支持逗号分隔多个模型，自动降级重试确保高可用性。

### 缓存系统
使用文件缓存（`data/cache/`）存储小红书数据，6小时过期，支持跨分类备用缓存。

### 流式生成
使用 ReadableStream 实现实时内容生成显示，包含多阶段加载提示。

### 内容安全
三重安全保障：格式稳定性 + 内容安全性 + 验证完整性。

## 开发注意事项

- Cookie 必须有效才能进行小红书数据抓取
- API 密钥配置错误会导致AI生成失败
- 缓存目录 `data/cache/` 需要写权限
- 敏感词过滤在生成过程中实时进行
- 所有错误都经过 `error-handler.ts` 统一处理
