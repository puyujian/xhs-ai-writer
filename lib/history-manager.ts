/**
 * 历史记录管理器
 * 负责历史记录的存储、检索、搜索和管理
 */

import { 
  HistoryItem, 
  HistoryManagerConfig, 
  HistorySearchOptions, 
  HistoryExportOptions,
  HistoryStats 
} from './history-types';

/**
 * 生成UUID的简单实现
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 历史记录管理器类
 */
export class HistoryManager {
  private config: HistoryManagerConfig;

  constructor(config?: Partial<HistoryManagerConfig>) {
    this.config = {
      storageKey: 'xhs-ai-writer-history',
      maxItems: 50,
      autoSave: true,
      ...config
    };
  }

  /**
   * 检查localStorage是否可用
   */
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取所有历史记录
   */
  getHistory(): HistoryItem[] {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage不可用，无法加载历史记录');
      return [];
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return [];
      
      const items: HistoryItem[] = JSON.parse(stored);
      
      // 按时间戳降序排序（最新的在前）
      return items.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('解析历史记录数据失败:', error);
      return [];
    }
  }

  /**
   * 保存历史记录项
   */
  saveHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage不可用，无法保存历史记录');
      return false;
    }

    try {
      const existingHistory = this.getHistory();
      
      // 创建新的历史记录项
      const newItem: HistoryItem = {
        id: generateId(),
        timestamp: Date.now(),
        ...item
      };

      // 添加到历史记录开头
      const updatedHistory = [newItem, ...existingHistory];

      // 如果超过最大数量限制，删除最旧的记录
      if (updatedHistory.length > this.config.maxItems) {
        updatedHistory.splice(this.config.maxItems);
      }

      // 保存到localStorage
      localStorage.setItem(this.config.storageKey, JSON.stringify(updatedHistory));
      
      console.log(`✅ 历史记录已保存: ${item.keyword}`);
      return true;
    } catch (error) {
      console.error('保存历史记录失败:', error);
      return false;
    }
  }

  /**
   * 搜索历史记录
   */
  searchHistory(options: HistorySearchOptions): HistoryItem[] {
    const allHistory = this.getHistory();
    
    let filteredHistory = allHistory;

    // 按关键词搜索
    if (options.keyword) {
      const searchTerm = options.keyword.toLowerCase();
      filteredHistory = filteredHistory.filter(item => 
        item.keyword.toLowerCase().includes(searchTerm) ||
        item.userInfo.toLowerCase().includes(searchTerm) ||
        item.generatedTitles.toLowerCase().includes(searchTerm) ||
        item.generatedBody.toLowerCase().includes(searchTerm)
      );
    }

    // 按时间范围过滤
    if (options.startTime) {
      filteredHistory = filteredHistory.filter(item => item.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      filteredHistory = filteredHistory.filter(item => item.timestamp <= options.endTime!);
    }

    // 限制结果数量
    if (options.limit && options.limit > 0) {
      filteredHistory = filteredHistory.slice(0, options.limit);
    }

    return filteredHistory;
  }

  /**
   * 删除指定的历史记录项
   */
  deleteHistoryItem(id: string): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage不可用，无法删除历史记录');
      return false;
    }

    try {
      const existingHistory = this.getHistory();
      const updatedHistory = existingHistory.filter(item => item.id !== id);
      
      if (updatedHistory.length === existingHistory.length) {
        console.warn(`未找到ID为 ${id} 的历史记录`);
        return false;
      }

      localStorage.setItem(this.config.storageKey, JSON.stringify(updatedHistory));
      
      console.log(`✅ 历史记录已删除: ${id}`);
      return true;
    } catch (error) {
      console.error('删除历史记录失败:', error);
      return false;
    }
  }

  /**
   * 清空所有历史记录
   */
  clearAllHistory(): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage不可用，无法清空历史记录');
      return false;
    }

    try {
      localStorage.removeItem(this.config.storageKey);
      console.log('✅ 所有历史记录已清空');
      return true;
    } catch (error) {
      console.error('清空历史记录失败:', error);
      return false;
    }
  }

  /**
   * 导出历史记录
   */
  exportHistory(options: HistoryExportOptions): string {
    const itemsToExport = options.itemIds 
      ? this.getHistory().filter(item => options.itemIds!.includes(item.id))
      : this.getHistory();

    switch (options.format) {
      case 'json':
        return JSON.stringify(
          options.includeMetadata ? itemsToExport : itemsToExport.map(({ id, timestamp, ...rest }) => rest),
          null,
          2
        );

      case 'text':
        return itemsToExport.map(item => {
          const date = new Date(item.timestamp).toLocaleString('zh-CN');
          return [
            `=== ${item.keyword} (${date}) ===`,
            `原始素材：${item.userInfo}`,
            `生成标题：${item.generatedTitles}`,
            `正文内容：${item.generatedBody}`,
            `关键词标签：${item.generatedTags.join(', ')}`,
            `AI绘画提示词：${item.generatedImagePrompt}`,
            `首评引导：${item.generatedSelfComment}`,
            `发布策略：${item.generatedStrategy}`,
            `增长Playbook：${item.generatedPlaybook}`,
            ''
          ].join('\n');
        }).join('\n');

      case 'markdown':
        return itemsToExport.map(item => {
          const date = new Date(item.timestamp).toLocaleString('zh-CN');
          return [
            `## ${item.keyword}`,
            `*生成时间: ${date}*`,
            '',
            '### 原始素材',
            item.userInfo,
            '',
            '### 生成标题',
            item.generatedTitles,
            '',
            '### 正文内容',
            item.generatedBody,
            '',
            '### 关键词标签',
            item.generatedTags.map(tag => `- #${tag}`).join('\n'),
            '',
            '### AI绘画提示词',
            item.generatedImagePrompt,
            '',
            '### 首评引导',
            item.generatedSelfComment,
            '',
            '### 发布策略',
            item.generatedStrategy,
            '',
            '### 增长Playbook',
            item.generatedPlaybook,
            '',
            '---',
            ''
          ].join('\n');
        }).join('\n');

      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  /**
   * 获取历史记录统计信息
   */
  getStats(): HistoryStats {
    const history = this.getHistory();
    
    if (history.length === 0) {
      return {
        totalItems: 0,
        storageSize: 0,
        topKeywords: []
      };
    }

    // 计算存储大小
    let storageSize = 0;
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      storageSize = stored ? new Blob([stored]).size : 0;
    } catch {
      storageSize = 0;
    }

    // 统计关键词使用频率
    const keywordCount = new Map<string, number>();
    history.forEach(item => {
      const count = keywordCount.get(item.keyword) || 0;
      keywordCount.set(item.keyword, count + 1);
    });

    // 获取使用最多的关键词（前5个）
    const topKeywords = Array.from(keywordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));

    return {
      totalItems: history.length,
      storageSize,
      oldestTimestamp: history[history.length - 1]?.timestamp,
      newestTimestamp: history[0]?.timestamp,
      topKeywords
    };
  }

  /**
   * 获取单个历史记录项
   */
  getHistoryItem(id: string): HistoryItem | null {
    const history = this.getHistory();
    return history.find(item => item.id === id) || null;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<HistoryManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建默认实例
export const historyManager = new HistoryManager();