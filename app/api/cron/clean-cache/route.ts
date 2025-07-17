import { cleanExpiredCache } from '@/lib/cache-manager';
import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * 缓存清理API - 用于Vercel Cron Jobs
 * 
 * 使用方法：
 * 1. 在Vercel项目设置中添加Cron Job
 * 2. 配置为每天执行一次：0 2 * * * (每天凌晨2点)
 * 3. 目标URL：https://your-domain.com/api/cron/clean-cache
 * 
 * 安全性：
 * - 只允许Vercel Cron服务调用
 * - 验证请求来源
 */

export async function GET(request: Request) {
  try {
    // 验证请求来源 - 只允许Vercel Cron或本地开发环境
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // 在生产环境中验证Cron密钥
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret) {
        console.error('❌ CRON_SECRET环境变量未配置');
        return createErrorResponse(
          'Cron secret not configured',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
      
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('🚫 未授权的缓存清理请求');
        return createErrorResponse(
          'Unauthorized',
          HTTP_STATUS.UNAUTHORIZED
        );
      }
    }

    console.log('🧹 开始执行定时缓存清理任务...');
    
    // 执行缓存清理
    const result = await cleanExpiredCache();
    
    const responseData = {
      success: true,
      message: '缓存清理完成',
      timestamp: new Date().toISOString(),
      ...result
    };

    console.log('✅ 缓存清理任务完成:', responseData);
    
    return createApiResponse(responseData);

  } catch (error) {
    console.error('❌ 缓存清理任务失败:', error);
    
    return createErrorResponse(
      'Cache cleanup failed',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * 支持POST方法，用于手动触发清理
 */
export async function POST(request: Request) {
  return GET(request);
}

/**
 * 健康检查端点
 */
export async function HEAD() {
  return new Response(null, { 
    status: HTTP_STATUS.OK,
    headers: {
      'Cache-Control': 'no-cache',
    }
  });
}
