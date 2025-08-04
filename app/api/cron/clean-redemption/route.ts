import { cleanupExpiredCodes } from '@/lib/redemption-manager';
import { HTTP_STATUS } from '@/lib/constants';

export async function GET() {
  try {
    const result = await cleanupExpiredCodes();
    
    console.log('🧹 兑换码清理完成:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: '兑换码清理完成',
      ...result
    }), {
      status: HTTP_STATUS.OK,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('清理兑换码失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '清理兑换码失败'
    }), {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}