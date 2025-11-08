import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { HTTP_STATUS } from '@/lib/constants';
import { 
  getCacheData, 
  getFallbackCacheData, 
  cleanExpiredCache,
  CACHE_CONFIG,
  CacheData 
} from '@/lib/cache-manager';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 缓存管理API
 * 
 * 功能：
 * - GET /api/cache - 查询所有缓存或指定关键词的缓存
 * - DELETE /api/cache - 删除指定关键词的缓存或清理所有过期缓存
 * 
 * 路由：GET/DELETE /api/cache
 */

/**
 * 获取缓存信息
 * 
 * 查询参数：
 * - keyword: 可选，指定要查询的关键词
 * - includeData: 可选，是否包含完整数据（默认false）
 * 
 * 示例：
 * - GET /api/cache - 获取所有缓存列表
 * - GET /api/cache?keyword=护肤 - 获取指定关键词的缓存信息
 * - GET /api/cache?keyword=护肤&includeData=true - 获取指定关键词的完整缓存数据
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const includeData = searchParams.get('includeData') === 'true';

    // 检查缓存是否启用
    const cacheEnabled = process.env.ENABLE_CACHE !== 'false';
    if (!cacheEnabled) {
      return createApiResponse({
        success: false,
        message: '缓存功能已禁用',
        cacheEnabled: false,
      });
    }

    // 如果指定了关键词，返回该关键词的缓存信息
    if (keyword) {
      const cacheData = await getCacheData(keyword);
      
      if (!cacheData) {
        // 尝试获取备用缓存
        const fallbackData = await getFallbackCacheData(keyword);
        
        return createApiResponse({
          success: false,
          message: `关键词 "${keyword}" 的缓存不存在或已过期`,
          keyword,
          fallbackAvailable: !!fallbackData,
        });
      }

      // 构建返回数据
      const responseData: any = {
        success: true,
        keyword: cacheData.keyword,
        category: cacheData.category,
        source: cacheData.source,
        timestamp: cacheData.timestamp,
        createdAt: new Date(cacheData.timestamp).toISOString(),
        expiresAt: new Date(cacheData.timestamp + CACHE_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
        metadata: cacheData.metadata,
        notesCount: cacheData.processedNotes.length,
      };

      // 如果请求包含完整数据，添加笔记列表
      if (includeData) {
        responseData.processedNotes = cacheData.processedNotes;
        responseData.data = cacheData.data;
      }

      return createApiResponse(responseData);
    }

    // 如果没有指定关键词，返回所有缓存的列表
    try {
      await fs.access(CACHE_CONFIG.CACHE_DIR);
    } catch {
      return createApiResponse({
        success: true,
        message: '缓存目录不存在',
        cacheEnabled: true,
        totalCaches: 0,
        caches: [],
      });
    }

    const files = await fs.readdir(CACHE_CONFIG.CACHE_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const cacheList = [];
    let totalSize = 0;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(CACHE_CONFIG.CACHE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const cacheData: CacheData = JSON.parse(content);
        const stats = await fs.stat(filePath);

        const isExpired = Date.now() - cacheData.timestamp > CACHE_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

        cacheList.push({
          keyword: cacheData.keyword,
          category: cacheData.category,
          source: cacheData.source,
          notesCount: cacheData.processedNotes.length,
          createdAt: new Date(cacheData.timestamp).toISOString(),
          expiresAt: new Date(cacheData.timestamp + CACHE_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
          isExpired,
          size: Math.round(stats.size / 1024), // KB
          metadata: cacheData.metadata,
        });

        totalSize += stats.size;
      } catch (error) {
        // 跳过损坏的缓存文件
        continue;
      }
    }

    // 按创建时间倒序排序
    cacheList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return createApiResponse({
      success: true,
      cacheEnabled: true,
      totalCaches: cacheList.length,
      totalSize: Math.round(totalSize / 1024), // KB
      expiryHours: CACHE_CONFIG.CACHE_EXPIRY_HOURS,
      caches: cacheList,
    });

  } catch (error) {
    console.error('获取缓存信息失败:', error);
    return createErrorResponse(
      'Failed to get cache information',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * 删除缓存
 * 
 * 请求体：
 * - keyword: 可选，要删除的关键词。如果不提供，则清理所有过期缓存
 * - force: 可选，是否强制删除（即使未过期），默认false
 * 
 * 示例：
 * - DELETE /api/cache - 清理所有过期缓存
 * - DELETE /api/cache {"keyword": "护肤"} - 删除指定关键词的缓存
 * - DELETE /api/cache {"keyword": "护肤", "force": true} - 强制删除指定关键词的缓存
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { keyword, force = false } = body;

    // 检查缓存是否启用
    const cacheEnabled = process.env.ENABLE_CACHE !== 'false';
    if (!cacheEnabled) {
      return createApiResponse({
        success: false,
        message: '缓存功能已禁用',
        cacheEnabled: false,
      });
    }

    // 如果指定了关键词，删除该关键词的缓存
    if (keyword) {
      const sanitizedKeyword = keyword.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      const filePath = path.join(CACHE_CONFIG.CACHE_DIR, `${sanitizedKeyword}.json`);

      try {
        // 检查文件是否存在
        await fs.access(filePath);

        // 如果不是强制删除，检查是否过期
        if (!force) {
          const content = await fs.readFile(filePath, 'utf-8');
          const cacheData: CacheData = JSON.parse(content);
          const isExpired = Date.now() - cacheData.timestamp > CACHE_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

          if (!isExpired) {
            return createApiResponse({
              success: false,
              message: `缓存 "${keyword}" 尚未过期，如需删除请使用 force: true`,
              keyword,
              expiresAt: new Date(cacheData.timestamp + CACHE_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
            });
          }
        }

        // 删除文件
        await fs.unlink(filePath);

        return createApiResponse({
          success: true,
          message: `缓存 "${keyword}" 已删除`,
          keyword,
          forced: force,
        });

      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return createErrorResponse(
            `缓存 "${keyword}" 不存在`,
            HTTP_STATUS.NOT_FOUND
          );
        }
        throw error;
      }
    }

    // 如果没有指定关键词，清理所有过期缓存
    const result = await cleanExpiredCache();

    return createApiResponse({
      success: true,
      message: '过期缓存清理完成',
      ...result,
    });

  } catch (error) {
    console.error('删除缓存失败:', error);
    return createErrorResponse(
      'Failed to delete cache',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * 支持OPTIONS方法用于CORS预检
 */
export async function OPTIONS() {
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.PRODUCTION_URL || 'https://xhs-ai-writer.vercel.app')
    : '*';

  return new Response(null, {
    status: HTTP_STATUS.OK,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
