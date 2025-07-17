# 🚀 部署指南

本文档将指导您如何将AI小红书爆款文案生成器部署到各种平台。

## 📋 部署前准备

### 1. 环境变量配置
确保您已经准备好以下必需的环境变量：

```env
# 必填 - AI服务配置
THIRD_PARTY_API_URL="https://your-api-provider.com/v1"
THIRD_PARTY_API_KEY="your_api_key_here"
AI_MODEL_NAME="gemini-2.5-flash"

# 可选 - 小红书数据抓取
XHS_COOKIE="your_xiaohongshu_cookie_here"

# 可选 - 缓存配置
ENABLE_CACHE=true
```

### 2. 依赖检查
确保您的环境满足以下要求：
- Node.js 18+
- 支持Serverless Functions的部署平台

## 🌐 Vercel部署（推荐）

Vercel是最简单的部署方式，完美支持Next.js应用。

### 方法一：通过Vercel Dashboard

1. **导入项目**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 选择 "Import Git Repository"
   - 输入仓库URL：`https://github.com/EBOLABOY/xhs-ai-writer`

2. **配置环境变量**
   - 在项目设置中找到 "Environment Variables"
   - 添加所有必需的环境变量（参考上面的列表）

3. **部署**
   - 点击 "Deploy" 按钮
   - 等待部署完成（通常2-3分钟）

### 方法二：通过Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel
vercel login

# 部署项目
vercel

# 设置环境变量
vercel env add THIRD_PARTY_API_URL
vercel env add THIRD_PARTY_API_KEY
vercel env add AI_MODEL_NAME
# ... 添加其他环境变量

# 重新部署以应用环境变量
vercel --prod
```

## 🐳 Docker部署

### 1. 创建Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

### 2. 构建和运行

```bash
# 构建Docker镜像
docker build -t xhs-ai-writer .

# 运行容器
docker run -p 3000:3000 \
  -e THIRD_PARTY_API_URL="your_api_url" \
  -e THIRD_PARTY_API_KEY="your_api_key" \
  -e AI_MODEL_NAME="gemini-2.5-flash" \
  xhs-ai-writer
```

## ☁️ 其他云平台部署

### Netlify

1. 连接GitHub仓库
2. 设置构建命令：`npm run build`
3. 设置发布目录：`.next`
4. 配置环境变量
5. 部署

### Railway

1. 连接GitHub仓库
2. 选择Next.js模板
3. 配置环境变量
4. 自动部署

### Heroku

```bash
# 安装Heroku CLI
# 登录Heroku
heroku login

# 创建应用
heroku create your-app-name

# 设置环境变量
heroku config:set THIRD_PARTY_API_URL="your_api_url"
heroku config:set THIRD_PARTY_API_KEY="your_api_key"
heroku config:set AI_MODEL_NAME="gemini-2.5-flash"

# 部署
git push heroku master
```

## 🔧 部署后配置

### 1. 域名配置
- 在部署平台中配置自定义域名
- 确保HTTPS证书正确配置

### 2. 性能优化
- 启用CDN加速
- 配置缓存策略
- 监控应用性能

### 3. 安全配置
- 定期更新依赖
- 监控安全漏洞
- 配置访问限制（如需要）

## 🐛 常见问题

### Q: 部署后API调用失败
A: 检查环境变量是否正确配置，特别是API密钥和URL。

### Q: 小红书数据抓取不工作
A: 确保XHS_COOKIE配置正确且未过期。Cookie需要定期更新。

### Q: 构建失败
A: 检查Node.js版本是否为18+，确保所有依赖正确安装。

### Q: 应用启动慢
A: 启用缓存功能（ENABLE_CACHE=true）可以显著提升响应速度。

## 📞 技术支持

如果您在部署过程中遇到问题，请：

1. 检查本文档的常见问题部分
2. 查看项目的GitHub Issues
3. 提交新的Issue描述您的问题

---

🎉 恭喜！您的AI小红书爆款文案生成器现在已经成功部署并可以为用户提供服务了！
