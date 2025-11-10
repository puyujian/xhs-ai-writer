/**
 * MCP (Model Context Protocol) 客户端
 * 用于调用小红书MCP服务获取数据
 */

import { ProcessedNote } from './types';
import { CONFIG } from './constants';

// MCP配置
const MCP_CONFIG = {
  // MCP服务地址，可通过环境变量配置
  URL: process.env.XHS_MCP_URL || 'http://118.178.106.244:18060/mcp',
  // 请求超时时间
  TIMEOUT: CONFIG.REQUEST_TIMEOUT,
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

  /**
   * 初始化MCP会话并获取Session ID
   */
  private async initialize(): Promise<string> {
    console.log('🔄 开始初始化MCP会话...');
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

      console.log(`📡 发送初始化请求到: ${MCP_CONFIG.URL}`);
      const response = await fetch(MCP_CONFIG.URL, {
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

      console.log('✅ MCP会话初始化成功');
      return sessionId;
    } catch (error) {
      console.error('❌ MCP初始化失败:', error);
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

    const response = await fetch(MCP_CONFIG.URL, {
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
   * 调用MCP工具
   */
  private async callTool<T = unknown>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
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

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MCP_CONFIG.TIMEOUT);

        const response = await fetch(MCP_CONFIG.URL, {
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
          console.warn(`⚠️ MCP工具调用返回错误: ${message}`);
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

        return data.result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('MCP请求超时');
        }
        if (error instanceof Error && error.message.includes('invalid during session initialization')) {
          console.warn('⚠️ MCP会话未完成初始化，将重新初始化后重试...');
          this.sessionId = null;
          continue;
        }
        throw error;
      }
    }

    throw new Error('MCP请求失败: 无法完成会话初始化');
  }

  /**
   * 搜索小红书内容
   */
  async searchFeeds(keyword: string): Promise<ProcessedNote[]> {
    console.log(`🔍 通过MCP搜索关键词: ${keyword}`);

    // 调用search_feeds工具
    const result = await this.callTool<{
      content: Array<{
        type: string;
        text?: string;
      }>;
    }>('search_feeds', { keyword });

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
}

// 导出单例
export const mcpClient = new MCPClient();

/**
 * 使用MCP获取小红书热门笔记数据
 */
export async function fetchHotPostsViaMCP(keyword: string): Promise<{ 
  summary: string; 
  notes: ProcessedNote[] 
}> {
  try {
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

    return { summary, notes };
  } catch (error) {
    console.error('MCP获取数据失败:', error);
    throw new Error(`通过MCP获取小红书数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
