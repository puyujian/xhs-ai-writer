import { NextRequest } from 'next/server';
import { generateRedemptionCode } from '@/lib/redemption-manager';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { value, adminKey, description } = await request.json();

    // 验证参数
    if (!value || !adminKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '缺少必需参数 (value, adminKey)' 
        }),
        { 
          status: HTTP_STATUS.BAD_REQUEST,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 验证value类型和范围
    if (typeof value !== 'number' || value <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '兑换码价值必须是正整数' 
        }),
        { 
          status: HTTP_STATUS.BAD_REQUEST,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 生成兑换码
    const result = await generateRedemptionCode(
      value, 
      adminKey, 
      description || 'admin'
    );

    if (!result.success) {
      const status = result.message.includes('权限') ? HTTP_STATUS.UNAUTHORIZED : HTTP_STATUS.BAD_REQUEST;
      return new Response(
        JSON.stringify(result),
        { 
          status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎫 管理员生成兑换码: ${result.code}, 价值: ${value} 次`);

    return new Response(
      JSON.stringify({
        ...result,
        generatedAt: new Date().toISOString()
      }),
      {
        status: HTTP_STATUS.OK,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('生成兑换码API错误:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: '服务器内部错误' 
      }),
      { 
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}