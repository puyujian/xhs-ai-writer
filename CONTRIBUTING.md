# 🤝 贡献指南

感谢您对AI小红书爆款文案生成器项目的关注！我们欢迎所有形式的贡献。

## 🎯 贡献方式

### 🐛 报告Bug
- 使用GitHub Issues报告问题
- 提供详细的错误描述和复现步骤
- 包含环境信息（操作系统、Node.js版本等）

### 💡 功能建议
- 在Issues中提出新功能建议
- 详细描述功能需求和使用场景
- 讨论实现方案的可行性

### 📝 代码贡献
- Fork项目到您的GitHub账户
- 创建功能分支进行开发
- 提交Pull Request

### 📚 文档改进
- 改进README、API文档等
- 添加使用示例和最佳实践
- 翻译文档到其他语言

## 🛠️ 开发环境设置

### 1. 克隆项目
```bash
git clone https://github.com/EBOLABOY/xhs-ai-writer.git
cd xhs-ai-writer
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
```bash
cp .env.example .env.local
# 编辑 .env.local 填入真实配置
```

### 4. 启动开发服务器
```bash
npm run dev
```

## 📋 代码规范

### TypeScript
- 使用严格的TypeScript配置
- 为所有函数和组件添加类型注解
- 避免使用`any`类型

### 代码风格
- 使用ESLint和Prettier进行代码格式化
- 遵循React和Next.js最佳实践
- 保持代码简洁和可读性

### 提交规范
使用约定式提交格式：
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

类型说明：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(ai): 添加敏感词过滤功能

- 实现105+敏感词库
- 支持实时流式过滤
- 提供智能替换策略

Closes #123
```

## 🧪 测试

### 运行测试
```bash
npm run test
```

### 添加测试
- 为新功能添加单元测试
- 确保测试覆盖率不降低
- 测试文件命名：`*.test.ts` 或 `*.spec.ts`

## 📦 Pull Request流程

### 1. 准备工作
- 确保您的分支基于最新的main分支
- 运行所有测试确保通过
- 更新相关文档

### 2. 创建PR
- 提供清晰的PR标题和描述
- 说明变更的原因和影响
- 链接相关的Issues

### 3. 代码审查
- 响应审查者的反馈
- 及时更新代码
- 保持讨论的专业性

### 4. 合并
- 所有检查通过后将被合并
- 合并后分支将被删除

## 🏗️ 项目架构

### 目录结构
```
├── app/                 # Next.js App Router
│   ├── api/            # API路由
│   ├── globals.css     # 全局样式
│   ├── layout.tsx      # 根布局
│   └── page.tsx        # 主页面
├── components/         # React组件
│   └── ui/            # UI组件库
├── lib/               # 工具库
│   ├── ai-manager.ts  # AI服务管理
│   ├── prompts.ts     # AI提示词
│   ├── sensitive-words.ts # 敏感词过滤
│   └── utils.ts       # 通用工具
├── public/            # 静态资源
└── data/              # 数据文件
```

### 核心模块

#### AI管理器 (`lib/ai-manager.ts`)
- 统一管理AI服务调用
- 实现重试机制和错误处理
- 支持流式响应

#### 提示词系统 (`lib/prompts.ts`)
- 分析专家：公式化拆解热门笔记
- 创作专家：生成人味十足的内容
- 模块化设计，易于维护

#### 敏感词过滤 (`lib/sensitive-words.ts`)
- 105+敏感词库
- 智能替换策略
- 实时流式过滤

## 🎨 设计原则

### 用户体验优先
- 响应式设计
- 流畅的交互体验
- 清晰的错误提示

### 代码质量
- 模块化设计
- 类型安全
- 易于测试和维护

### 性能优化
- 智能缓存机制
- 流式数据处理
- 最小化API调用

## 🔒 安全考虑

### 敏感信息保护
- 不在代码中硬编码API密钥
- 使用环境变量管理配置
- 定期更新依赖

### 内容安全
- 实时敏感词过滤
- 输入验证和清理
- 防止恶意内容生成

## 📞 联系方式

- GitHub Issues: 技术问题和功能建议
- Email: 紧急问题联系
- 讨论区: 一般性讨论和交流

## 📄 许可证

本项目采用MIT许可证。贡献代码即表示您同意将您的贡献以相同许可证发布。

---

再次感谢您的贡献！让我们一起打造更好的AI内容生成工具！ 🚀
