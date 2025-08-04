import { NextRequest } from 'next/server';
import { checkUsageLimit } from '@/lib/usage-limiter';
import { HTTP_STATUS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    // 获取客户端IP地址
    const clientIP = request.headers.get('x-forwarded-for') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('cf-connecting-ip')
      || '127.0.0.1';

    const usageStatus = await checkUsageLimit(clientIP);

    return new Response(JSON.stringify(usageStatus), {
      status: HTTP_STATUS.OK,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('获取使用状态失败:', error);
    return new Response(
      JSON.stringify({ error: '获取使用状态失败' }), 
      { 
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}