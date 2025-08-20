/**
 * 缓存管理模块
 * 负责爬取数据的本地缓存存储和读取
 */

import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';
import os from 'os';
import { ProcessedNote } from './types';

// 缓存配置
export const CACHE_CONFIG = {
  // 首选缓存目录（可通过环境变量覆盖）
  PREFERRED_CACHE_DIR: process.env.CACHE_DIR || path.join(process.cwd(), 'data', 'cache'),
  // 缓存有效期（小时）
  CACHE_EXPIRY_HOURS: 6,
  // 最大缓存文件数量
  MAX_CACHE_FILES: 100,
  // 支持的关键词分类
  CATEGORIES: ['护肤', '美妆', '穿搭', '美食', '旅行', '健身', '数码', '家居', '宠物', '读书'] as const,
} as const;

/**
 * 检查是否启用缓存功能
 */
function isCacheEnabled(): boolean {
  const cacheEnabled = process.env.ENABLE_CACHE;
  // 默认启用缓存，除非明确设置为 'false'
  return cacheEnabled !== 'false';
}

export type CacheCategory = typeof CACHE_CONFIG.CATEGORIES[number];

/**
 * 缓存数据结构
 */
export interface CacheData {
  keyword: string;
  category: CacheCategory;
  data: string; // 原始爬取内容
  processedNotes: ProcessedNote[];
  timestamp: number;
  source: 'scraped' | 'fallback';
  metadata: {
    totalNotes: number;
    avgInteraction: number;
    topAuthors: string[];
  };
}

/**
 * 确保缓存目录存在（首选目录不可写时自动回退到临时目录）
 * {{ AURA-X: Modify - 适配Serverless只读文件系统(/var/task)导致的mkdir失败；递归创建并回退到TMPDIR。Confirmed via 寸止 }}
 */
let currentCacheDir: string | null = null; // 当前生效的缓存目录（可能为回退目录）

async function ensureCacheDir(): Promise<void> {
  // 已初始化则直接返回
  if (currentCacheDir) return;

  const debug = process.env.ENABLE_DEBUG_LOGGING === 'true';
  const candidates = [
    // 优先使用项目工作目录（或通过环境变量覆盖）
    CACHE_CONFIG.PREFERRED_CACHE_DIR,
    // 只读环境（如Vercel /var/task）下回退到可写的临时目录
    path.join(process.env.TMPDIR || os.tmpdir(), 'xhs-ai-writer', 'cache'),
  ];

  let lastError: unknown = null;
  for (const dir of candidates) {
    try {
      // 递归创建目录
      await fs.mkdir(dir, { recursive: true });
      // 验证写权限
      await fs.access(dir, fsConstants.W_OK);
      currentCacheDir = dir;
      if (debug) console.log(`💾 缓存目录已就绪: ${dir}`);
      return;
    } catch (e) {
      lastError = e;
      if (debug) console.warn(`⚠️ 缓存目录不可用，尝试下一个: ${dir} -> ${e instanceof Error ? e.message : e}`);
    }
  }

  // 若所有候选目录均不可用，则抛出错误（调用方捕获后不中断主流程）
  throw new Error(`无法创建可写的缓存目录。最后错误: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/**
 * 生成缓存文件路径
 */
function getCacheFilePath(keyword: string): string {
  const sanitizedKeyword = keyword.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const baseDir = currentCacheDir || CACHE_CONFIG.PREFERRED_CACHE_DIR;
  return path.join(baseDir, `${sanitizedKeyword}.json`);
}

/**
 * 获取关键词对应的分类
 */
function getKeywordCategory(keyword: string): CacheCategory {
  const categoryMap: Record<string, CacheCategory> = {
    '护肤': '护肤',
    '面膜': '护肤',
    '精华': '护肤',
    '防晒': '护肤',
    '洁面': '护肤',
    '美妆': '美妆',
    '口红': '美妆',
    '粉底': '美妆',
    '眼影': '美妆',
    '化妆': '美妆',
    '穿搭': '穿搭',
    '服装': '穿搭',
    '搭配': '穿搭',
    '时尚': '穿搭',
    '美食': '美食',
    '料理': '美食',
    '烘焙': '美食',
    '餐厅': '美食',
    '旅行': '旅行',
    '旅游': '旅行',
    '景点': '旅行',
    '攻略': '旅行',
    '健身': '健身',
    '运动': '健身',
    '瑜伽': '健身',
    '减肥': '健身',
  };

  // 检查关键词是否直接匹配
  if (categoryMap[keyword]) {
    return categoryMap[keyword];
  }

  // 检查关键词是否包含某个分类的关键字
  for (const [key, category] of Object.entries(categoryMap)) {
    if (keyword.includes(key)) {
      return category;
    }
  }

  // 默认返回护肤分类
  return '护肤';
}

/**
 * 检查缓存是否有效
 */
function isCacheValid(timestamp: number): boolean {
  const now = Date.now();
  const expiryTime = CACHE_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
  return (now - timestamp) < expiryTime;
}

/**
 * 保存缓存数据
 */
export async function saveCacheData(
  keyword: string,
  data: string,
  processedNotes: ProcessedNote[],
  source: 'scraped' | 'fallback' = 'scraped'
): Promise<void> {
  // 检查是否启用缓存
  if (!isCacheEnabled()) {
    console.log('📝 缓存功能已禁用，跳过保存');
    return;
  }

  try {
    await ensureCacheDir();

    const category = getKeywordCategory(keyword);
    const metadata = {
      totalNotes: processedNotes.length,
      avgInteraction: processedNotes.length > 0 
        ? Math.round(processedNotes.reduce((sum, note) => 
            sum + note.interact_info.liked_count + note.interact_info.comment_count + note.interact_info.collected_count, 0
          ) / processedNotes.length)
        : 0,
      topAuthors: processedNotes
        .slice(0, 5)
        .map(note => note.user_info.nickname)
        .filter(Boolean)
    };

    const cacheData: CacheData = {
      keyword,
      category,
      data,
      processedNotes,
      timestamp: Date.now(),
      source,
      metadata
    };

    const filePath = getCacheFilePath(keyword);
    await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2), 'utf-8');
    
    console.log(`✅ 缓存已保存: ${keyword} (${processedNotes.length}条笔记)`);
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

/**
 * 读取缓存数据
 */
export async function getCacheData(keyword: string): Promise<CacheData | null> {
  // 检查是否启用缓存
  if (!isCacheEnabled()) {
    console.log('📝 缓存功能已禁用，跳过读取');
    return null;
  }

  try {
    const filePath = getCacheFilePath(keyword);
    const content = await fs.readFile(filePath, 'utf-8');
    const cacheData: CacheData = JSON.parse(content);

    if (isCacheValid(cacheData.timestamp)) {
      console.log(`📖 使用有效缓存: ${keyword}`);
      return cacheData;
    } else {
      console.log(`⏰ 缓存已过期: ${keyword}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ 读取缓存失败: ${keyword}`);
    return null;
  }
}

/**
 * 获取同分类的备用缓存数据
 */
export async function getFallbackCacheData(keyword: string): Promise<CacheData | null> {
  // 检查是否启用缓存
  if (!isCacheEnabled()) {
    console.log('📝 缓存功能已禁用，跳过备用缓存');
    return null;
  }

  try {
    await ensureCacheDir();
    const category = getKeywordCategory(keyword);
    const baseDir = currentCacheDir || CACHE_CONFIG.PREFERRED_CACHE_DIR;
    const files = await fs.readdir(baseDir);

    // 查找同分类的有效缓存文件
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(baseDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const cacheData: CacheData = JSON.parse(content);

        if (cacheData.category === category && isCacheValid(cacheData.timestamp)) {
          console.log(`🔄 使用同分类备用缓存: ${cacheData.keyword} -> ${keyword}`);

          // 创建一个修改过的副本，标记为fallback
          return {
            ...cacheData,
            keyword, // 使用当前请求的关键词
            source: 'fallback',
            data: cacheData.data.replace(new RegExp(cacheData.keyword, 'g'), keyword)
          };
        }
      } catch (error) {
        continue; // 跳过损坏的缓存文件
      }
    }

    console.log(`❌ 未找到分类"${category}"的备用缓存`);
    return null;
  } catch (error) {
    console.error('获取备用缓存失败:', error);
    return null;
  }
}

/**
 * 清理过期缓存
 */
export async function cleanExpiredCache(): Promise<{
  cleanedCount: number;
  totalFiles: number;
  cacheEnabled: boolean;
}> {
  // 检查是否启用缓存
  if (!isCacheEnabled()) {
    console.log('📝 缓存功能已禁用，跳过清理');
    return {
      cleanedCount: 0,
      totalFiles: 0,
      cacheEnabled: false
    };
  }

  try {
    await ensureCacheDir();
    const baseDir = currentCacheDir || CACHE_CONFIG.PREFERRED_CACHE_DIR;
    const files = await fs.readdir(baseDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    let cleanedCount = 0;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(baseDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const cacheData: CacheData = JSON.parse(content);

        if (!isCacheValid(cacheData.timestamp)) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      } catch (error) {
        // 删除损坏的缓存文件
        const filePath = path.join(baseDir, file);
        await fs.unlink(filePath);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期缓存文件`);
    }

    return {
      cleanedCount,
      totalFiles: jsonFiles.length,
      cacheEnabled: true
    };
  } catch (error) {
    console.error('清理缓存失败:', error);
    return {
      cleanedCount: 0,
      totalFiles: 0,
      cacheEnabled: true
    };
  }
}


