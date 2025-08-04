/**
 * 历史记录相关的TypeScript类型定义
 * 用于小红书AI文案生成器的历史记录功能
 */

/**
 * 历史记录项接口
 * 包含生成的完整内容和元数据
 */
export interface HistoryItem {
  /** 唯一标识符，使用UUID格式 */
  id: string;
  
  /** 创建时间戳，Unix时间戳格式 */
  timestamp: number;
  
  /** 用户输入的关键词 */
  keyword: string;
  
  /** 用户输入的原始素材信息 */
  userInfo: string;
  
  // 生成的7个内容部分
  /** 生成的标题内容 */
  generatedTitles: string;
  
  /** 生成的正文内容 */
  generatedBody: string;
  
  /** 生成的关键词标签数组 */
  generatedTags: string[];
  
  /** 生成的AI绘画提示词 */
  generatedImagePrompt: string;
  
  /** 生成的首评关键词引导 */
  generatedSelfComment: string;
  
  /** 生成的发布策略建议 */
  generatedStrategy: string;
  
  /** 生成的增长Playbook */
  generatedPlaybook: string;
}

/**
 * 历史记录管理器配置接口
 */
export interface HistoryManagerConfig {
  /** localStorage存储键名 */
  storageKey: string;
  
  /** 最大保存记录数量 */
  maxItems: number;
  
  /** 是否自动保存生成的内容 */
  autoSave: boolean;
}

/**
 * 历史记录搜索选项接口
 */
export interface HistorySearchOptions {
  /** 搜索关键词 */
  keyword?: string;
  
  /** 开始时间戳 */
  startTime?: number;
  
  /** 结束时间戳 */
  endTime?: number;
  
  /** 搜索结果数量限制 */
  limit?: number;
}

/**
 * 历史记录导出选项接口
 */
export interface HistoryExportOptions {
  /** 导出格式 */
  format: 'json' | 'text' | 'markdown';
  
  /** 是否包含元数据 */
  includeMetadata: boolean;
  
  /** 要导出的记录ID数组，如果为空则导出所有 */
  itemIds?: string[];
}

/**
 * 历史记录统计信息接口
 */
export interface HistoryStats {
  /** 总记录数 */
  totalItems: number;
  
  /** 本地存储使用的字节数 */
  storageSize: number;
  
  /** 最早记录的时间戳 */
  oldestTimestamp?: number;
  
  /** 最新记录的时间戳 */
  newestTimestamp?: number;
  
  /** 最常用的关键词（前5个） */
  topKeywords: Array<{ keyword: string; count: number }>;
}