import { cleanupOldUsageRecords } from '@/lib/usage-limiter';
import { HTTP_STATUS } from '@/lib/constants';

export async function GET() {
  try {
    const result = await cleanupOldUsageRecords();
    
    console.log('🧹 使用记录清理完成:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: '使用记录清理完成',
      ...result
    }), {
      status: HTTP_STATUS.OK,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('清理使用记录失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '清理使用记录失败'
    }), {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}