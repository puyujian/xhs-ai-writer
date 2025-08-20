/**
 * 数据存储管理模块
 * 基于项目的Serverless架构，提供高效的数据存储和查询方案
 * 支持文件存储、内存缓存和可选的外部数据库集成
 */

import { promises as fs } from 'fs';
import path from 'path';
import { XhsNoteDetail } from './types';

// 避免循环依赖，直接定义类型
export interface NoteContentAnalysis {
  basicInfo: {
    noteId: string;
    title: string;
    contentLength: number;
    imageCount: number;
    hasVideo: boolean;
    createTime: string;
    category: string;
  };
  contentQuality: {
    titleScore: number;
    contentScore: number;
    structureScore: number;
    overallScore: number;
    strengths: string[];
    improvements: string[];
  };
  engagement: {
    likeRate: number;
    commentRate: number;
    shareRate: number;
    favoriteRate: number;
    engagementScore: number;
    viralPotential: 'low' | 'medium' | 'high';
  };
  keywords: {
    primaryKeywords: string[];
    secondaryKeywords: string[];
    hashtags: string[];
    mentions: string[];
  };
  features: {
    contentType: 'tutorial' | 'review' | 'lifestyle' | 'shopping' | 'other';
    tone: 'professional' | 'casual' | 'humorous' | 'emotional';
    targetAudience: string;
    callToAction: string[];
  };
}

export interface CommentSentimentAnalysis {
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    totalComments: number;
  };
  hotTopics: Array<{
    topic: string;
    frequency: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    keywords: string[];
  }>;
  userFeedback: {
    commonPraises: string[];
    commonComplaints: string[];
    suggestions: string[];
    questions: string[];
  };
  interactionQuality: {
    averageCommentLength: number;
    meaningfulComments: number;
    spamComments: number;
    qualityScore: number;
  };
}

export interface ComprehensiveInsights {
  performanceSummary: {
    overallRating: 'excellent' | 'good' | 'average' | 'poor';
    keySuccessFactors: string[];
    improvementAreas: string[];
    benchmarkComparison: string;
  };
  audienceInsights: {
    primaryAudience: string;
    audienceNeeds: string[];
    contentPreferences: string[];
    engagementPatterns: string[];
  };
  optimizationSuggestions: {
    titleOptimization: string[];
    contentOptimization: string[];
    engagementOptimization: string[];
    timingOptimization: string;
  };
  creativeInspiration: {
    similarTopics: string[];
    trendingElements: string[];
    contentAngles: string[];
    formatSuggestions: string[];
  };
}

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * 数据存储配置
 */
const STORAGE_CONFIG = {
  // 基础存储目录
  BASE_DIR: path.join(process.cwd(), 'data'),
  NOTES_DIR: path.join(process.cwd(), 'data', 'notes'),
  ANALYSIS_DIR: path.join(process.cwd(), 'data', 'analysis'),
  INSIGHTS_DIR: path.join(process.cwd(), 'data', 'insights'),
  INDEX_DIR: path.join(process.cwd(), 'data', 'indexes'),
  
  // 缓存配置
  CACHE_EXPIRY: {
    NOTE_DETAIL: 24 * 60 * 60 * 1000, // 24小时
    ANALYSIS: 12 * 60 * 60 * 1000,    // 12小时
    INSIGHTS: 6 * 60 * 60 * 1000,     // 6小时
    INDEX: 1 * 60 * 60 * 1000,        // 1小时
  },
  
  // 批量处理配置
  BATCH_SIZE: 50,
  MAX_CONCURRENT: 5,
};

/**
 * 存储的数据结构接口
 */
export interface StoredNoteData {
  noteId: string;
  noteDetail: XhsNoteDetail;
  analysis?: NoteContentAnalysis;
  commentAnalysis?: CommentSentimentAnalysis;
  insights?: ComprehensiveInsights;
  timestamp: number;
  lastUpdated: number;
}

/**
 * 索引数据结构
 */
export interface DataIndex {
  noteId: string;
  title: string;
  category: string;
  keywords: string[];
  score: number;
  timestamp: number;
  filePath: string;
}

/**
 * 查询选项接口
 */
export interface QueryOptions {
  category?: string;
  keywords?: string[];
  minScore?: number;
  maxScore?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'score' | 'timestamp' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 数据存储管理器
 */
export class DataStorageManager {
  private memoryCache = new Map<string, { data: any; timestamp: number; type: string }>();
  private indexCache: DataIndex[] | null = null;
  private indexCacheTimestamp = 0;

  constructor() {
    this.ensureDirectories();
  }

  /**
   * 确保存储目录存在
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      STORAGE_CONFIG.BASE_DIR,
      STORAGE_CONFIG.NOTES_DIR,
      STORAGE_CONFIG.ANALYSIS_DIR,
      STORAGE_CONFIG.INSIGHTS_DIR,
      STORAGE_CONFIG.INDEX_DIR,
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.warn(`创建目录失败: ${dir}`, error);
      }
    }
  }

  /**
   * 保存笔记详情数据
   */
  async saveNoteDetail(noteId: string, noteDetail: XhsNoteDetail): Promise<boolean> {
    try {
      const filePath = path.join(STORAGE_CONFIG.NOTES_DIR, `${noteId}.json`);
      const data: StoredNoteData = {
        noteId,
        noteDetail,
        timestamp: Date.now(),
        lastUpdated: Date.now(),
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      // 更新内存缓存
      this.memoryCache.set(`note_${noteId}`, {
        data,
        timestamp: Date.now(),
        type: 'note'
      });

      // 更新索引
      await this.updateIndex(noteId, noteDetail);

      if (debugLoggingEnabled) {
        console.log(`✅ 笔记详情已保存: ${noteId}`);
      }

      return true;
    } catch (error) {
      console.error(`保存笔记详情失败: ${noteId}`, error);
      return false;
    }
  }

  /**
   * 保存分析结果
   */
  async saveAnalysis(
    noteId: string,
    analysis: NoteContentAnalysis,
    commentAnalysis?: CommentSentimentAnalysis
  ): Promise<boolean> {
    try {
      const filePath = path.join(STORAGE_CONFIG.ANALYSIS_DIR, `${noteId}_analysis.json`);
      const data = {
        noteId,
        analysis,
        commentAnalysis,
        timestamp: Date.now(),
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      // 更新内存缓存
      this.memoryCache.set(`analysis_${noteId}`, {
        data,
        timestamp: Date.now(),
        type: 'analysis'
      });

      if (debugLoggingEnabled) {
        console.log(`✅ 分析结果已保存: ${noteId}`);
      }

      return true;
    } catch (error) {
      console.error(`保存分析结果失败: ${noteId}`, error);
      return false;
    }
  }

  /**
   * 保存综合洞察
   */
  async saveInsights(noteId: string, insights: ComprehensiveInsights): Promise<boolean> {
    try {
      const filePath = path.join(STORAGE_CONFIG.INSIGHTS_DIR, `${noteId}_insights.json`);
      const data = {
        noteId,
        insights,
        timestamp: Date.now(),
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      // 更新内存缓存
      this.memoryCache.set(`insights_${noteId}`, {
        data,
        timestamp: Date.now(),
        type: 'insights'
      });

      if (debugLoggingEnabled) {
        console.log(`✅ 综合洞察已保存: ${noteId}`);
      }

      return true;
    } catch (error) {
      console.error(`保存综合洞察失败: ${noteId}`, error);
      return false;
    }
  }

  /**
   * 获取笔记详情
   */
  async getNoteDetail(noteId: string): Promise<StoredNoteData | null> {
    // 先检查内存缓存
    const cached = this.getFromMemoryCache(`note_${noteId}`, STORAGE_CONFIG.CACHE_EXPIRY.NOTE_DETAIL);
    if (cached) {
      return cached;
    }

    try {
      const filePath = path.join(STORAGE_CONFIG.NOTES_DIR, `${noteId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data: StoredNoteData = JSON.parse(content);

      // 检查数据是否过期
      if (Date.now() - data.timestamp < STORAGE_CONFIG.CACHE_EXPIRY.NOTE_DETAIL) {
        // 更新内存缓存
        this.memoryCache.set(`note_${noteId}`, {
          data,
          timestamp: Date.now(),
          type: 'note'
        });
        return data;
      }

      return null; // 数据已过期
    } catch (error) {
      if (debugLoggingEnabled) {
        console.log(`笔记详情不存在: ${noteId}`);
      }
      return null;
    }
  }

  /**
   * 获取分析结果
   */
  async getAnalysis(noteId: string): Promise<{ analysis: NoteContentAnalysis; commentAnalysis?: CommentSentimentAnalysis } | null> {
    // 先检查内存缓存
    const cached = this.getFromMemoryCache(`analysis_${noteId}`, STORAGE_CONFIG.CACHE_EXPIRY.ANALYSIS);
    if (cached) {
      return cached;
    }

    try {
      const filePath = path.join(STORAGE_CONFIG.ANALYSIS_DIR, `${noteId}_analysis.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // 检查数据是否过期
      if (Date.now() - data.timestamp < STORAGE_CONFIG.CACHE_EXPIRY.ANALYSIS) {
        // 更新内存缓存
        this.memoryCache.set(`analysis_${noteId}`, {
          data,
          timestamp: Date.now(),
          type: 'analysis'
        });
        return data;
      }

      return null; // 数据已过期
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取综合洞察
   */
  async getInsights(noteId: string): Promise<{ insights: ComprehensiveInsights } | null> {
    // 先检查内存缓存
    const cached = this.getFromMemoryCache(`insights_${noteId}`, STORAGE_CONFIG.CACHE_EXPIRY.INSIGHTS);
    if (cached) {
      return cached;
    }

    try {
      const filePath = path.join(STORAGE_CONFIG.INSIGHTS_DIR, `${noteId}_insights.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // 检查数据是否过期
      if (Date.now() - data.timestamp < STORAGE_CONFIG.CACHE_EXPIRY.INSIGHTS) {
        // 更新内存缓存
        this.memoryCache.set(`insights_${noteId}`, {
          data,
          timestamp: Date.now(),
          type: 'insights'
        });
        return data;
      }

      return null; // 数据已过期
    } catch (error) {
      return null;
    }
  }

  /**
   * 查询笔记数据
   */
  async queryNotes(options: QueryOptions = {}): Promise<DataIndex[]> {
    const index = await this.getIndex();
    let results = [...index];

    // 应用过滤条件
    if (options.category) {
      results = results.filter(item => item.category === options.category);
    }

    if (options.keywords && options.keywords.length > 0) {
      results = results.filter(item => 
        options.keywords!.some(keyword => 
          item.keywords.includes(keyword) || 
          item.title.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    if (options.minScore !== undefined) {
      results = results.filter(item => item.score >= options.minScore!);
    }

    if (options.maxScore !== undefined) {
      results = results.filter(item => item.score <= options.maxScore!);
    }

    if (options.dateRange) {
      const startTime = options.dateRange.start.getTime();
      const endTime = options.dateRange.end.getTime();
      results = results.filter(item => 
        item.timestamp >= startTime && item.timestamp <= endTime
      );
    }

    // 排序
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';
    
    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'timestamp':
        default:
          comparison = a.timestamp - b.timestamp;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 分页
    const offset = options.offset || 0;
    const limit = options.limit || results.length;
    
    return results.slice(offset, offset + limit);
  }

  /**
   * 批量保存笔记数据
   */
  async batchSaveNotes(notes: Array<{ noteId: string; noteDetail: XhsNoteDetail }>): Promise<number> {
    let successCount = 0;
    const batches = this.chunkArray(notes, STORAGE_CONFIG.BATCH_SIZE);

    for (const batch of batches) {
      const promises = batch.map(async ({ noteId, noteDetail }) => {
        const success = await this.saveNoteDetail(noteId, noteDetail);
        return success ? 1 : 0;
      });

      const results = await Promise.all(promises);
      successCount += results.reduce((sum, result) => sum + result, 0);
    }

    if (debugLoggingEnabled) {
      console.log(`✅ 批量保存完成: ${successCount}/${notes.length}`);
    }

    return successCount;
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<void> {
    const now = Date.now();
    
    try {
      // 清理过期的笔记数据
      const noteFiles = await fs.readdir(STORAGE_CONFIG.NOTES_DIR);
      for (const file of noteFiles) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(STORAGE_CONFIG.NOTES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        if (now - data.timestamp > STORAGE_CONFIG.CACHE_EXPIRY.NOTE_DETAIL) {
          await fs.unlink(filePath);
          if (debugLoggingEnabled) {
            console.log(`🗑️ 清理过期笔记数据: ${file}`);
          }
        }
      }

      // 清理内存缓存
      for (const [key, value] of this.memoryCache.entries()) {
        const expiry = STORAGE_CONFIG.CACHE_EXPIRY[value.type.toUpperCase() as keyof typeof STORAGE_CONFIG.CACHE_EXPIRY] || STORAGE_CONFIG.CACHE_EXPIRY.NOTE_DETAIL;
        if (now - value.timestamp > expiry) {
          this.memoryCache.delete(key);
        }
      }

      if (debugLoggingEnabled) {
        console.log('✅ 过期数据清理完成');
      }
    } catch (error) {
      console.error('清理过期数据失败:', error);
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    totalNotes: number;
    totalAnalyses: number;
    totalInsights: number;
    memoryCache: number;
    diskUsage: string;
  }> {
    try {
      const noteFiles = await fs.readdir(STORAGE_CONFIG.NOTES_DIR);
      const analysisFiles = await fs.readdir(STORAGE_CONFIG.ANALYSIS_DIR);
      const insightFiles = await fs.readdir(STORAGE_CONFIG.INSIGHTS_DIR);

      return {
        totalNotes: noteFiles.filter(f => f.endsWith('.json')).length,
        totalAnalyses: analysisFiles.filter(f => f.endsWith('.json')).length,
        totalInsights: insightFiles.filter(f => f.endsWith('.json')).length,
        memoryCache: this.memoryCache.size,
        diskUsage: '计算中...' // 可以添加磁盘使用量计算
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return {
        totalNotes: 0,
        totalAnalyses: 0,
        totalInsights: 0,
        memoryCache: this.memoryCache.size,
        diskUsage: '未知'
      };
    }
  }

  /**
   * 从内存缓存获取数据
   */
  private getFromMemoryCache(key: string, expiry: number): any {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < expiry) {
      return cached.data;
    }
    return null;
  }

  /**
   * 更新索引
   */
  private async updateIndex(noteId: string, noteDetail: XhsNoteDetail): Promise<void> {
    try {
      const indexPath = path.join(STORAGE_CONFIG.INDEX_DIR, 'notes_index.json');
      let index: DataIndex[] = [];

      // 读取现有索引
      try {
        const content = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(content);
      } catch (error) {
        // 索引文件不存在，创建新的
      }

      // 更新或添加索引项
      const existingIndex = index.findIndex(item => item.noteId === noteId);
      const newIndexItem: DataIndex = {
        noteId,
        title: noteDetail.title,
        category: this.categorizeNote(noteDetail),
        keywords: this.extractKeywords(noteDetail),
        score: this.calculateScore(noteDetail),
        timestamp: Date.now(),
        filePath: path.join(STORAGE_CONFIG.NOTES_DIR, `${noteId}.json`)
      };

      if (existingIndex >= 0) {
        index[existingIndex] = newIndexItem;
      } else {
        index.push(newIndexItem);
      }

      // 保存索引
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
      
      // 清除索引缓存
      this.indexCache = null;
    } catch (error) {
      console.error('更新索引失败:', error);
    }
  }

  /**
   * 获取索引
   */
  private async getIndex(): Promise<DataIndex[]> {
    // 检查缓存
    if (this.indexCache && Date.now() - this.indexCacheTimestamp < STORAGE_CONFIG.CACHE_EXPIRY.INDEX) {
      return this.indexCache;
    }

    try {
      const indexPath = path.join(STORAGE_CONFIG.INDEX_DIR, 'notes_index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      this.indexCache = JSON.parse(content);
      this.indexCacheTimestamp = Date.now();
      return this.indexCache;
    } catch (error) {
      return [];
    }
  }

  /**
   * 分类笔记
   */
  private categorizeNote(noteDetail: XhsNoteDetail): string {
    const content = (noteDetail.title + ' ' + noteDetail.content).toLowerCase();
    
    if (content.includes('教程') || content.includes('攻略') || content.includes('方法')) {
      return 'tutorial';
    } else if (content.includes('测评') || content.includes('推荐') || content.includes('好用')) {
      return 'review';
    } else if (content.includes('穿搭') || content.includes('生活') || content.includes('日常')) {
      return 'lifestyle';
    } else if (content.includes('购物') || content.includes('种草') || content.includes('好物')) {
      return 'shopping';
    }
    
    return 'other';
  }

  /**
   * 提取关键词
   */
  private extractKeywords(noteDetail: XhsNoteDetail): string[] {
    const text = noteDetail.title + ' ' + noteDetail.content;
    // 简单的关键词提取逻辑，可以后续优化
    const keywords = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * 计算评分
   */
  private calculateScore(noteDetail: XhsNoteDetail): number {
    const totalInteractions = noteDetail.likeNum + noteDetail.cmtNum + noteDetail.shareNum + noteDetail.favNum;
    const impressions = noteDetail.impNum || 1;
    return Math.min(10, (totalInteractions / impressions) * 100);
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// 导出单例实例
export const dataStorage = new DataStorageManager();
