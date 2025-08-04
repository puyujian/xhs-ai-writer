import { cleanExpiredCache } from '@/lib/cache-manager';
import { cleanupOldUsageRecords } from '@/lib/usage-limiter';
import { cleanupExpiredCodes } from '@/lib/redemption-manager';
import { HTTP_STATUS } from '@/lib/constants';

export async function GET() {
  try {
    console.log('🧹 开始执行统一清理任务...');
    
    // 并行执行所有清理任务
    const [cacheResult, usageResult, redemptionResult] = await Promise.all([
      cleanExpiredCache(),
      cleanupOldUsageRecords(), 
      cleanupExpiredCodes()
    ]);
    
    const totalCleaned = cacheResult.cleanedCount + usageResult.cleanedCount + redemptionResult.cleanedCount;
    
    console.log('🧹 统一清理任务完成:', {
      cache: cacheResult,
      usage: usageResult,
      redemption: redemptionResult,
      totalCleaned
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: '统一清理任务完成',
      results: {
        cache: cacheResult,
        usage: usageResult,
        redemption: redemptionResult
      },
      summary: {
        totalCleaned,
        tasksExecuted: 3
      }
    }), {
      status: HTTP_STATUS.OK,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('统一清理任务失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '统一清理任务失败',
      details: error instanceof Error ? error.message : '未知错误'
    }), {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}