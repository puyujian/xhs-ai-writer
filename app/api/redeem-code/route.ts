import { NextRequest } from 'next/server';
import { useRedemptionCode } from '@/lib/redemption-manager';
import { addBonusUsage, checkUsageLimit } from '@/lib/usage-limiter';
import { HTTP_STATUS } from '@/lib/constants';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    // 验证参数
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: '请提供有效的兑换码' 
        }),
        { 
          status: HTTP_STATUS.BAD_REQUEST,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 获取客户端IP地址
    const clientIP = request.headers.get('x-forwarded-for') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('cf-connecting-ip')
      || '127.0.0.1';

    // 清理兑换码格式
    const cleanCode = code.trim().toUpperCase();

    // 使用兑换码
    const result = await useRedemptionCode(cleanCode, clientIP);

    if (result.success && result.addedUsage) {
      // 兑换成功，为用户添加额外使用次数
      const bonusResult = await addBonusUsage(clientIP, result.addedUsage);
      
      if (bonusResult.success) {
        // 获取更新后的使用状态
        result.newUsageStatus = bonusResult.newUsageStatus;
        console.log(`✅ 兑换码 ${cleanCode} 兑换成功，为 ${clientIP} 添加 ${result.addedUsage} 次使用机会`);
      } else {
        console.error('兑换码使用成功但添加额外次数失败:', bonusResult.message);
      }
    }

    const status = result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;

    return new Response(
      JSON.stringify(result),
      {
        status,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('兑换码使用API错误:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: '服务器内部错误' 
      }),
      { 
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}