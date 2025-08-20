/**
 * 增强版缓存管理模块
 * 提供多层缓存机制、智能预加载、压缩存储和批量处理
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { ProcessedNote } from './types';
import { CACHE_CONFIG as BASE_CACHE_CONFIG } from './cache-manager';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * 增强版缓存配置
 */
const ENHANCED_CACHE_CONFIG = {
  ...BASE_CACHE_CONFIG,

  // 多层缓存配置
  MEMORY_CACHE_SIZE: 100, // 内存缓存最大条目数
  MEMORY_CACHE_TTL: 30 * 60 * 1000, // 内存缓存30分钟TTL

  // 预加载配置
  PRELOAD_ENABLED: process.env.ENABLE_CACHE_PRELOAD !== 'false',
  PRELOAD_POPULAR_KEYWORDS: ['穿搭', '美妆', '护肤', '减肥', '学习', '工作', '旅行', '美食'],
  PRELOAD_BATCH_SIZE: 5,

  // 压缩配置
  COMPRESSION_ENABLED: process.env.ENABLE_CACHE_COMPRESSION !== 'false',
  COMPRESSION_THRESHOLD: 10 * 1024, // 10KB以上启用压缩

  // 批量处理配置
  BATCH_WRITE_SIZE: 10,
  BATCH_WRITE_INTERVAL: 5000, // 5秒批量写入间隔

  // 性能优化配置
  ASYNC_CLEANUP: true,
  LAZY_LOADING: true,
  CACHE_WARMING: true,
} as const;

/**
 * 内存缓存项接口
 */
interface MemoryCacheItem {
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  compressed: boolean;
}

/**
 * 批量写入队列项接口
 */
interface BatchWriteItem {
  key: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

/**
 * 增强版缓存管理器
 */
export class EnhancedCacheManager {
  private memoryCache = new Map<string, MemoryCacheItem>();
  private batchWriteQueue: BatchWriteItem[] = [];
  private batchWriteTimer: NodeJS.Timeout | null = null;
  private preloadInProgress = false;
  private cacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    compressionSaved: 0,
  };

  constructor() {
    this.initializeCache();
  }

  /**
   * 初始化缓存系统
   */
  private async initializeCache(): Promise<void> {
    try {
      await this.ensureCacheDir();
      
      if (ENHANCED_CACHE_CONFIG.CACHE_WARMING) {
        await this.warmupCache();
      }
      
      if (ENHANCED_CACHE_CONFIG.PRELOAD_ENABLED) {
        this.schedulePreload();
      }
      
      // 启动定期清理
      this.scheduleCleanup();
      
      if (debugLoggingEnabled) {
        console.log('✅ 增强版缓存管理器初始化完成');
      }
    } catch (error) {
      console.error('缓存管理器初始化失败:', error);
    }
  }

  /**
   * 获取缓存数据（多层缓存策略）
   */
  async getCacheData(
    key: string, 
    maxAge?: number,
    options: { 
      skipMemory?: boolean;
      skipDisk?: boolean;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<any> {
    const cacheKey = this.generateCacheKey(key);
    
    try {
      // 第一层：内存缓存
      if (!options.skipMemory) {
        const memoryData = this.getFromMemoryCache(cacheKey, maxAge);
        if (memoryData) {
          this.cacheStats.hits++;
          if (debugLoggingEnabled) {
            console.log(`🎯 内存缓存命中: ${key}`);
          }
          return memoryData;
        }
      }

      // 第二层：磁盘缓存
      if (!options.skipDisk) {
        const diskData = await this.getFromDiskCache(cacheKey, maxAge);
        if (diskData) {
          // 将磁盘数据加载到内存缓存
          this.setMemoryCache(cacheKey, diskData, options.priority);
          this.cacheStats.hits++;
          if (debugLoggingEnabled) {
            console.log(`💾 磁盘缓存命中: ${key}`);
          }
          return diskData;
        }
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      console.error(`获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 保存缓存数据（智能压缩和批量写入）
   */
  async saveCacheData(
    key: string,
    data: any,
    options: {
      priority?: 'high' | 'medium' | 'low';
      skipMemory?: boolean;
      skipDisk?: boolean;
      forceCompress?: boolean;
      immediate?: boolean;
    } = {}
  ): Promise<boolean> {
    const cacheKey = this.generateCacheKey(key);
    
    try {
      // 保存到内存缓存
      if (!options.skipMemory) {
        this.setMemoryCache(cacheKey, data, options.priority);
      }

      // 保存到磁盘缓存
      if (!options.skipDisk) {
        if (options.immediate) {
          await this.saveToDiskCache(cacheKey, data, options.forceCompress);
        } else {
          this.addToBatchWriteQueue(cacheKey, data, options.priority || 'medium');
        }
      }

      this.cacheStats.writes++;
      return true;
    } catch (error) {
      console.error(`保存缓存失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 批量获取缓存数据
   */
  async batchGetCacheData(keys: string[], maxAge?: number): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const promises = keys.map(async (key) => {
      const data = await this.getCacheData(key, maxAge);
      if (data) {
        results.set(key, data);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 批量保存缓存数据
   */
  async batchSaveCacheData(
    dataMap: Map<string, any>,
    options: { priority?: 'high' | 'medium' | 'low' } = {}
  ): Promise<number> {
    let successCount = 0;
    const promises = Array.from(dataMap.entries()).map(async ([key, data]) => {
      const success = await this.saveCacheData(key, data, options);
      return success ? 1 : 0;
    });

    const results = await Promise.all(promises);
    successCount = results.reduce((sum, result) => sum + result, 0);

    if (debugLoggingEnabled) {
      console.log(`📦 批量保存完成: ${successCount}/${dataMap.size}`);
    }

    return successCount;
  }

  /**
   * 预加载热门关键词缓存
   */
  async preloadPopularKeywords(): Promise<void> {
    if (this.preloadInProgress) {
      return;
    }

    this.preloadInProgress = true;
    
    try {
      const keywords = ENHANCED_CACHE_CONFIG.PRELOAD_POPULAR_KEYWORDS;
      const batchSize = ENHANCED_CACHE_CONFIG.PRELOAD_BATCH_SIZE;
      
      for (let i = 0; i < keywords.length; i += batchSize) {
        const batch = keywords.slice(i, i + batchSize);
        
        const promises = batch.map(async (keyword) => {
          const cached = await this.getCacheData(keyword);
          if (!cached) {
            // 这里可以触发数据获取逻辑
            if (debugLoggingEnabled) {
              console.log(`🔄 预加载关键词: ${keyword}`);
            }
          }
        });

        await Promise.all(promises);
        
        // 批次间延迟，避免过载
        if (i + batchSize < keywords.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (debugLoggingEnabled) {
        console.log('✅ 热门关键词预加载完成');
      }
    } catch (error) {
      console.error('预加载失败:', error);
    } finally {
      this.preloadInProgress = false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    memory: { size: number; hitRate: number };
    disk: { files: number };
    performance: { hits: number; misses: number; hitRate: number };
    compression: { saved: number };
  } {
    const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0;
    
    return {
      memory: {
        size: this.memoryCache.size,
        hitRate: hitRate
      },
      disk: {
        files: 0 // 可以异步计算
      },
      performance: {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        hitRate: hitRate
      },
      compression: {
        saved: this.cacheStats.compressionSaved
      }
    };
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      // 清理内存缓存
      const now = Date.now();
      for (const [key, item] of this.memoryCache.entries()) {
        if (now - item.timestamp > ENHANCED_CACHE_CONFIG.MEMORY_CACHE_TTL) {
          this.memoryCache.delete(key);
        }
      }

      // 清理磁盘缓存（异步执行）
      if (ENHANCED_CACHE_CONFIG.ASYNC_CLEANUP) {
        setImmediate(() => this.cleanupDiskCache());
      } else {
        await this.cleanupDiskCache();
      }

      if (debugLoggingEnabled) {
        console.log('🧹 缓存清理完成');
      }
    } catch (error) {
      console.error('缓存清理失败:', error);
    }
  }

  /**
   * 从内存缓存获取数据
   */
  private getFromMemoryCache(key: string, maxAge?: number): any {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    const now = Date.now();
    const age = now - item.timestamp;
    const ttl = maxAge || ENHANCED_CACHE_CONFIG.MEMORY_CACHE_TTL;

    if (age > ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccess = now;

    return item.data;
  }

  /**
   * 设置内存缓存
   */
  private setMemoryCache(key: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    // 如果缓存已满，清理最少使用的项
    if (this.memoryCache.size >= ENHANCED_CACHE_CONFIG.MEMORY_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    const now = Date.now();
    this.memoryCache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
      compressed: false
    });
  }

  /**
   * 从磁盘缓存获取数据
   */
  private async getFromDiskCache(key: string, maxAge?: number): Promise<any> {
    try {
      const filePath = this.getCacheFilePath(key);
      const stats = await fs.stat(filePath);
      
      if (maxAge && Date.now() - stats.mtime.getTime() > maxAge) {
        return null;
      }

      let content = await fs.readFile(filePath);
      
      // 检查是否压缩
      if (filePath.endsWith('.gz')) {
        content = await gunzipAsync(content);
      }

      return JSON.parse(content.toString());
    } catch (error) {
      return null;
    }
  }

  /**
   * 保存到磁盘缓存
   */
  private async saveToDiskCache(key: string, data: any, forceCompress = false): Promise<void> {
    const jsonData = JSON.stringify(data);
    const shouldCompress = forceCompress || 
      (ENHANCED_CACHE_CONFIG.COMPRESSION_ENABLED && jsonData.length > ENHANCED_CACHE_CONFIG.COMPRESSION_THRESHOLD);

    let content: Buffer;
    let filePath: string;

    if (shouldCompress) {
      content = await gzipAsync(jsonData);
      filePath = this.getCacheFilePath(key) + '.gz';
      this.cacheStats.compressionSaved += jsonData.length - content.length;
    } else {
      content = Buffer.from(jsonData);
      filePath = this.getCacheFilePath(key);
    }

    await fs.writeFile(filePath, content);
  }

  /**
   * 添加到批量写入队列
   */
  private addToBatchWriteQueue(key: string, data: any, priority: 'high' | 'medium' | 'low'): void {
    this.batchWriteQueue.push({
      key,
      data,
      priority,
      timestamp: Date.now()
    });

    // 启动批量写入定时器
    if (!this.batchWriteTimer) {
      this.batchWriteTimer = setTimeout(() => {
        this.processBatchWriteQueue();
      }, ENHANCED_CACHE_CONFIG.BATCH_WRITE_INTERVAL);
    }
  }

  /**
   * 处理批量写入队列
   */
  private async processBatchWriteQueue(): Promise<void> {
    if (this.batchWriteQueue.length === 0) {
      this.batchWriteTimer = null;
      return;
    }

    // 按优先级排序
    this.batchWriteQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const batch = this.batchWriteQueue.splice(0, ENHANCED_CACHE_CONFIG.BATCH_WRITE_SIZE);
    
    const promises = batch.map(item => 
      this.saveToDiskCache(item.key, item.data)
    );

    try {
      await Promise.all(promises);
      if (debugLoggingEnabled) {
        console.log(`📝 批量写入完成: ${batch.length}项`);
      }
    } catch (error) {
      console.error('批量写入失败:', error);
    }

    // 继续处理剩余队列
    this.batchWriteTimer = null;
    if (this.batchWriteQueue.length > 0) {
      this.addToBatchWriteQueue('', null, 'low'); // 触发下一轮处理
    }
  }

  /**
   * 清理最少使用的缓存项
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedScore = Infinity;

    for (const [key, item] of this.memoryCache.entries()) {
      // 计算使用分数（访问次数 + 最近访问时间权重）
      const score = item.accessCount + (Date.now() - item.lastAccess) / 1000;
      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.memoryCache.delete(leastUsedKey);
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(key: string): string {
    return createHash('md5').update(key).digest('hex');
  }

  /**
   * 获取缓存文件路径
   */
  private getCacheFilePath(key: string): string {
    return path.join(BASE_CACHE_CONFIG.CACHE_DIR, `${key}.json`);
  }

  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(ENHANCED_CACHE_CONFIG.CACHE_DIR, { recursive: true });
    } catch (error) {
      console.error('创建缓存目录失败:', error);
    }
  }

  /**
   * 缓存预热
   */
  private async warmupCache(): Promise<void> {
    // 可以在这里实现缓存预热逻辑
    if (debugLoggingEnabled) {
      console.log('🔥 缓存预热完成');
    }
  }

  /**
   * 调度预加载
   */
  private schedulePreload(): void {
    // 延迟5秒后开始预加载，避免启动时过载
    setTimeout(() => {
      this.preloadPopularKeywords();
    }, 5000);
  }

  /**
   * 调度清理
   */
  private scheduleCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 12 * 60 * 60 * 1000); // 12小时清理一次
  }

  /**
   * 清理磁盘缓存
   */
  private async cleanupDiskCache(): Promise<void> {
    try {
      const files = await fs.readdir(ENHANCED_CACHE_CONFIG.CACHE_DIR);
      const now = Date.now();
      const maxAge = ENHANCED_CACHE_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.json') && !file.endsWith('.json.gz')) continue;
        
        const filePath = path.join(ENHANCED_CACHE_CONFIG.CACHE_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('磁盘缓存清理失败:', error);
    }
  }
}

// 导出单例实例
export const enhancedCacheManager = new EnhancedCacheManager();
