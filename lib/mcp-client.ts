/**
 * MCP (Model Context Protocol) 客户端
 * 用于调用小红书MCP服务获取数据
 */

import { ProcessedNote } from './types';
import { CONFIG } from './constants';

// MCP配置
const MCP_CONFIG = {
  // MCP服务地址列表，支持多个地址轮询（逗号分隔）
  // 示例: "http://server1:18060/mcp,http://server2:18060/mcp"
  URLS: (process.env.XHS_MCP_URL || 'http://118.178.106.244:18060/mcp')
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0),
  // 请求超时时间（增加到30秒，适应网络延迟）
  TIMEOUT: 30000,
  // 每个地址的重试次数
  MAX_RETRIES_PER_URL: 2,
  // 重试延迟（毫秒）
  RETRY_DELAY: 1000,
};

// MCP JSON-RPC 请求接口
interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

// MCP JSON-RPC 响应接口
interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Session信息
interface SessionInfo {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  serverInfo: Record<string, unknown>;
}

// MCP客户端类
class MCPClient {
  private requestId = 0;
  private sessionId: string | null = null;
  private currentUrlIndex = 0; // 当前使用的URL索引
  private urlHealthStatus: Map<string, { isHealthy: boolean; lastCheck: number }> = new Map(); // 每个URL的健康状态

  /**
   * 获取当前使用的URL
   */
  private getCurrentUrl(): string {
    return MCP_CONFIG.URLS[this.currentUrlIndex];
  }

  /**
   * 切换到下一个URL
   */
  private switchToNextUrl(): boolean {
    const nextIndex = (this.currentUrlIndex + 1) % MCP_CONFIG.URLS.length;
    if (nextIndex === this.currentUrlIndex && MCP_CONFIG.URLS.length > 1) {
      // 已经轮询了一圈
      return false;
    }
    this.currentUrlIndex = nextIndex;
    this.sessionId = null; // 切换URL后需要重新初始化会话
    console.log(`🔄 切换到MCP服务地址 [${this.currentUrlIndex + 1}/${MCP_CONFIG.URLS.length}]: ${this.getCurrentUrl()}`);
    return true;
  }

  /**
   * 健康检查：测试指定MCP服务是否可达
   */
  private async healthCheck(url: string): Promise<boolean> {
    const now = Date.now();
    const cached = this.urlHealthStatus.get(url);

    // 5分钟内检查过，直接返回缓存结果
    if (cached && now - cached.lastCheck < 5 * 60 * 1000) {
      return cached.isHealthy;
    }

    try {
      console.log(`🏥 执行MCP健康检查: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒快速检查

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'health-check',
          method: 'ping',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const isHealthy = response.ok || response.status < 500;
      this.urlHealthStatus.set(url, { isHealthy, lastCheck: now });

      console.log(`✅ MCP健康检查完成 [${url}]: ${isHealthy ? '健康' : '不健康'}`);
      return isHealthy;
    } catch (error) {
      console.warn(`⚠️ MCP健康检查失败 [${url}]:`, error instanceof Error ? error.message : '未知错误');
      this.urlHealthStatus.set(url, { isHealthy: false, lastCheck: now });
      return false;
    }
  }

  /**
   * 检查所有URL的健康状态，返回第一个健康的URL索引
   */
  private async findHealthyUrl(): Promise<number | null> {
    console.log(`🔍 检查 ${MCP_CONFIG.URLS.length} 个MCP服务地址的健康状态...`);

    // 从当前索引开始检查
    for (let i = 0; i < MCP_CONFIG.URLS.length; i++) {
      const index = (this.currentUrlIndex + i) % MCP_CONFIG.URLS.length;
      const url = MCP_CONFIG.URLS[index];
      const isHealthy = await this.healthCheck(url);

      if (isHealthy) {
        if (index !== this.currentUrlIndex) {
          this.currentUrlIndex = index;
          this.sessionId = null; // 切换URL后需要重新初始化会话
          console.log(`✅ 找到健康的MCP服务 [${index + 1}/${MCP_CONFIG.URLS.length}]: ${url}`);
        }
        return index;
      }
    }

    console.error('❌ 所有MCP服务地址都不可用');
    return null;
  }

  /**
   * 初始化MCP会话并获取Session ID
   */
  private async initialize(): Promise<string> {
    const currentUrl = this.getCurrentUrl();
    console.log(`🔄 开始初始化MCP会话 [${this.currentUrlIndex + 1}/${MCP_CONFIG.URLS.length}]: ${currentUrl}`);

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'xhs-ai-writer',
          version: '2.2.0',
        },
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MCP_CONFIG.TIMEOUT);

      console.log(`📡 发送初始化请求到: ${currentUrl}`);
      const response = await fetch(currentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`MCP初始化失败: HTTP ${response.status}`);
      }

      // 从响应头获取Session ID
      const sessionId = response.headers.get('Mcp-Session-Id');
      console.log(`🔑 获取到Session ID: ${sessionId ? sessionId.substring(0, 10) + '...' : 'null'}`);

      if (!sessionId) {
        throw new Error('MCP服务器未返回Session ID');
      }

      const data: MCPResponse<SessionInfo> = await response.json();

      if (data.error) {
        throw new Error(`MCP初始化失败: ${data.error.message}`);
      }

      // 发送initialized通知
      console.log('📨 发送initialized通知...');
      await this.sendNotification('notifications/initialized', sessionId);

      // 等待一小段时间确保服务器处理完初始化
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`✅ MCP会话初始化成功 [${currentUrl}]`);
      return sessionId;
    } catch (error) {
      console.error(`❌ MCP初始化失败 [${currentUrl}]:`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('MCP初始化超时');
      }
      throw error;
    }
  }

  /**
   * 发送MCP通知
   */
  private async sendNotification(method: string, sessionId: string, params?: Record<string, unknown>): Promise<void> {
    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const currentUrl = this.getCurrentUrl();
    const response = await fetch(currentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      throw new Error(`MCP通知发送失败: HTTP ${response.status}`);
    }
  }

  /**
   * 调用MCP工具（带URL轮询和重试）
   */
  private async callTool<T = unknown>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
    // 遍历所有URL
    for (let urlAttempt = 0; urlAttempt < MCP_CONFIG.URLS.length; urlAttempt++) {
      const currentUrl = this.getCurrentUrl();

      // 对每个URL进行重试
      for (let attempt = 0; attempt < MCP_CONFIG.MAX_RETRIES_PER_URL; attempt++) {
        try {
          if (!this.sessionId) {
            this.sessionId = await this.initialize();
          }

          const request: MCPRequest = {
            jsonrpc: '2.0',
            id: this.requestId++,
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: args,
            },
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), MCP_CONFIG.TIMEOUT);

          const response = await fetch(currentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Mcp-Session-Id': this.sessionId,
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`MCP请求失败: HTTP ${response.status}`);
          }

          const data: MCPResponse<T> = await response.json();

          if (data.error) {
            const message = data.error.message || 'Unknown error';
            console.warn(`⚠️ MCP工具调用返回错误 [${currentUrl}]: ${message}`);
            if (message.includes('invalid during session initialization')) {
              console.warn('🔁 MCP会话可能失效，准备重新初始化...');
              this.sessionId = null;
              continue;
            }
            throw new Error(`MCP工具调用失败: ${message}`);
          }

          if (!data.result) {
            throw new Error('MCP返回结果为空');
          }

          // 成功返回结果
          return data.result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          console.warn(`⚠️ MCP工具调用失败 [${currentUrl}] (尝试 ${attempt + 1}/${MCP_CONFIG.MAX_RETRIES_PER_URL}): ${errorMessage}`);

          if (error instanceof Error && error.name === 'AbortError') {
            console.warn('⏱️ MCP请求超时');
          }

          if (error instanceof Error && error.message.includes('invalid during session initialization')) {
            console.warn('⚠️ MCP会话未完成初始化，将重新初始化后重试...');
            this.sessionId = null;
            continue;
          }

          // 如果是最后一次重试，尝试切换URL
          if (attempt === MCP_CONFIG.MAX_RETRIES_PER_URL - 1) {
            break; // 跳出重试循环，进入下一个URL
          }

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, MCP_CONFIG.RETRY_DELAY * (attempt + 1)));
        }
      }

      // 当前URL所有重试都失败，尝试切换到下一个URL
      if (urlAttempt < MCP_CONFIG.URLS.length - 1) {
        console.warn(`⚠️ 当前MCP服务 [${currentUrl}] 不可用，切换到下一个...`);
        this.switchToNextUrl();
      }
    }

    throw new Error('MCP请求失败: 所有服务地址都不可用');
  }

  /**
   * 搜索小红书内容（带健康检查和自动切换）
   */
  async searchFeeds(keyword: string): Promise<ProcessedNote[]> {
    console.log(`🔍 通过MCP搜索关键词: ${keyword}`);
    console.log(`📋 可用MCP服务地址: ${MCP_CONFIG.URLS.length} 个`);

    // 先进行健康检查，找到可用的URL
    const healthyUrlIndex = await this.findHealthyUrl();
    if (healthyUrlIndex === null) {
      throw new Error('MCP服务不可用，所有地址都无法连接，请检查服务状态或配置');
    }

    try {
      // 调用search_feeds工具（内部已包含URL轮询和重试）
      const result = await this.callTool<{
        content: Array<{
          type: string;
          text?: string;
        }>;
      }>('search_feeds', { keyword });

      // 解析数据
      return await this.parseSearchResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ MCP搜索失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 解析MCP搜索结果
   */
  private async parseSearchResult(result: {
    content: Array<{
      type: string;
      text?: string;
    }>;
  }): Promise<ProcessedNote[]> {
    // 解析MCP返回的内容
    const textContent = result.content.find(c => c.type === 'text')?.text;
    if (!textContent) {
      throw new Error('MCP返回数据格式错误：缺少文本内容');
    }

    // 尝试解析JSON格式的数据
    try {
      const parsedData = JSON.parse(textContent);

      // 处理MCP返回的数据，转换为ProcessedNote格式
      // MCP返回格式: { feeds: [...], count: number }
      if (parsedData.feeds && Array.isArray(parsedData.feeds)) {
        const notes: ProcessedNote[] = [];

        for (const item of parsedData.feeds) {
          // 过滤出笔记类型的内容
          if (item.modelType !== 'note') continue;

          const noteCard = item.noteCard || {};
          const title = noteCard.displayTitle || noteCard.title || '无标题';
          const desc = noteCard.desc || '无描述';
          const interactInfo = noteCard.interactInfo || {
            likedCount: '0',
            commentCount: '0',
            collectedCount: '0',
          };
          const userInfo = noteCard.user || { nickname: '未知用户' };

          // 将字符串数字转换为数字
          const parseCount = (count: string | number): number => {
            if (typeof count === 'number') return count;
            return parseInt(count.replace(/[^0-9]/g, '') || '0', 10);
          };

          notes.push({
            title,
            desc,
            interact_info: {
              liked_count: parseCount(interactInfo.likedCount),
              comment_count: parseCount(interactInfo.commentCount),
              collected_count: parseCount(interactInfo.collectedCount),
            },
            note_id: item.id || '',
            user_info: {
              nickname: userInfo.nickname || userInfo.nickName || '未知用户',
            },
          });
        }

        console.log(`✅ MCP返回 ${notes.length} 条笔记数据`);
        return notes;
      } else {
        throw new Error('MCP返回数据格式不符合预期');
      }
    } catch (parseError) {
      console.error('解析MCP返回数据失败:', parseError);
      console.error('原始数据:', textContent.substring(0, 500));
      throw new Error('解析MCP返回数据失败');
    }
  }

  /**
   * 获取MCP服务健康状态（所有URL）
   */
  public getHealthStatus(): {
    currentUrl: string;
    currentUrlIndex: number;
    totalUrls: number;
    urlStatuses: Array<{ url: string; isHealthy: boolean; lastCheck: number }>;
  } {
    const urlStatuses = MCP_CONFIG.URLS.map(url => {
      const status = this.urlHealthStatus.get(url);
      return {
        url,
        isHealthy: status?.isHealthy ?? true, // 未检查过的默认为健康
        lastCheck: status?.lastCheck ?? 0,
      };
    });

    return {
      currentUrl: this.getCurrentUrl(),
      currentUrlIndex: this.currentUrlIndex,
      totalUrls: MCP_CONFIG.URLS.length,
      urlStatuses,
    };
  }
}

// 导出单例
export const mcpClient = new MCPClient();

/**
 * 使用MCP获取小红书热门笔记数据（支持多地址轮询）
 */
export async function fetchHotPostsViaMCP(keyword: string): Promise<{
  summary: string;
  notes: ProcessedNote[]
}> {
  try {
    // 检查MCP服务健康状态
    const healthStatus = mcpClient.getHealthStatus();
    console.log(`📊 MCP服务状态: 当前使用 [${healthStatus.currentUrlIndex + 1}/${healthStatus.totalUrls}] ${healthStatus.currentUrl}`);

    // 显示所有URL的健康状态
    const unhealthyUrls = healthStatus.urlStatuses.filter(s => !s.isHealthy && s.lastCheck > 0);
    if (unhealthyUrls.length > 0) {
      console.warn(`⚠️ 检测到 ${unhealthyUrls.length} 个不健康的MCP服务，将自动切换到可用服务`);
    }

    const notes = await mcpClient.searchFeeds(keyword);

    if (notes.length === 0) {
      throw new Error('未获取到任何笔记数据');
    }

    // 格式化为字符串（与原有格式保持一致）
    let summary = `关键词"${keyword}"的热门笔记分析（通过MCP获取，共${notes.length}篇）：\n\n`;
    notes.forEach((post: ProcessedNote, index: number) => {
      summary += `${index + 1}. 标题：${post.title}\n`;
      summary += `   描述：${post.desc.substring(0, 100)}${post.desc.length > 100 ? '...' : ''}\n`;
      summary += `   互动：点赞${post.interact_info.liked_count} 评论${post.interact_info.comment_count} 收藏${post.interact_info.collected_count}\n`;
      summary += `   作者：${post.user_info.nickname}\n\n`;
    });

    console.log(`✅ 成功通过MCP获取 ${notes.length} 条笔记数据 [使用: ${healthStatus.currentUrl}]`);
    return { summary, notes };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('❌ MCP获取数据失败:', errorMessage);

    // 提供更详细的错误信息
    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      throw new Error(`MCP服务连接超时，请检查：1) MCP服务是否启动 2) 网络连接是否正常 3) 防火墙设置 4) 或配置多个备用地址`);
    } else if (errorMessage.includes('不可用') || errorMessage.includes('所有地址都无法连接')) {
      throw new Error(`所有MCP服务地址都不可用，建议：1) 检查所有MCP服务状态 2) 验证XHS_MCP_URL配置 3) 或设置ENABLE_SCRAPING=false使用无数据模式`);
    } else {
      throw new Error(`通过MCP获取小红书数据失败: ${errorMessage}`);
    }
  }
}
