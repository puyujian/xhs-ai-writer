import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { HTTP_STATUS } from '@/lib/constants';
import { CACHE_CONFIG } from '@/lib/cache-manager';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 健康检查API
 * 
 * 功能：
 * - 检查服务状态
 * - 检查环境变量配置
 * - 检查AI模型配置
 * - 检查缓存系统状态
 * 
 * 路由：GET /api/health
 */

export async function GET() {
  try {
    const startTime = Date.now();

    // 1. 检查环境变量配置
    const envCheck = {
      aiConfigured: !!process.env.THIRD_PARTY_API_URL && !!process.env.THIRD_PARTY_API_KEY,
      xhsCookieConfigured: !!process.env.XHS_COOKIE,
      cacheEnabled: process.env.ENABLE_CACHE !== 'false',
      scrapingEnabled: process.env.ENABLE_SCRAPING !== 'false',
      debugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true',
      environment: process.env.NODE_ENV || 'development',
    };

    // 2. 检查AI模型配置
    const modelConfig = {
      models: process.env.AI_MODEL_NAME?.split(',').map(m => m.trim()) || [],
      apiUrl: process.env.THIRD_PARTY_API_URL ? '已配置' : '未配置',
    };

    // 3. 检查缓存系统状态
    let cacheStatus = {
      enabled: envCheck.cacheEnabled,
      directory: CACHE_CONFIG.CACHE_DIR,
      expiryHours: CACHE_CONFIG.CACHE_EXPIRY_HOURS,
      accessible: false,
      fileCount: 0,
      totalSize: 0,
    };

    try {
      // 检查缓存目录是否可访问
      await fs.access(CACHE_CONFIG.CACHE_DIR);
      cacheStatus.accessible = true;

      // 统计缓存文件
      const files = await fs.readdir(CACHE_CONFIG.CACHE_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      cacheStatus.fileCount = jsonFiles.length;

      // 计算总大小
      let totalSize = 0;
      for (const file of jsonFiles) {
        const stats = await fs.stat(path.join(CACHE_CONFIG.CACHE_DIR, file));
        totalSize += stats.size;
      }
      cacheStatus.totalSize = Math.round(totalSize / 1024); // KB
    } catch (error) {
      // 缓存目录不存在或不可访问
      cacheStatus.accessible = false;
    }

    // 4. 系统信息
    const systemInfo = {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
      },
    };

    // 5. 计算响应时间
    const responseTime = Date.now() - startTime;

    // 6. 判断整体健康状态
    const isHealthy = envCheck.aiConfigured && 
                     (envCheck.scrapingEnabled ? envCheck.xhsCookieConfigured : true);

    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: '2.2',
      environment: envCheck,
      models: modelConfig,
      cache: cacheStatus,
      system: systemInfo,
      checks: {
        aiService: envCheck.aiConfigured ? '✅ 正常' : '❌ 未配置',
        xhsService: envCheck.scrapingEnabled 
          ? (envCheck.xhsCookieConfigured ? '✅ 正常' : '⚠️ 未配置')
          : '⏭️ 已禁用',
        cacheSystem: cacheStatus.enabled 
          ? (cacheStatus.accessible ? '✅ 正常' : '⚠️ 不可访问')
          : '⏭️ 已禁用',
      }
    };

    return createApiResponse(response, HTTP_STATUS.OK);

  } catch (error) {
    console.error('健康检查失败:', error);
    return createErrorResponse(
      'Health check failed',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
