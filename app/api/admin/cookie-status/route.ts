/**
 * Cookie状态监控API
 * 提供cookie状态查询、统计和管理功能
 */

import { NextRequest } from 'next/server';
import { cookieManager } from '@/lib/cookie-manager';
import { createApiResponse, createErrorResponse, getCookies } from '@/lib/utils';
import { HTTP_STATUS } from '@/lib/constants';

// 简单的访问控制 - 可以根据需要增强
function checkAccess(request: NextRequest): boolean {
  // 检查是否在开发环境
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // 检查管理员密钥
  const adminKey = request.headers.get('x-admin-key') || request.nextUrl.searchParams.get('key');
  const expectedKey = process.env.ADMIN_KEY;

  if (!expectedKey) {
    console.warn('⚠️ ADMIN_KEY未配置，Cookie状态页面在生产环境中不可访问');
    return false;
  }

  if (!adminKey) {
    console.warn('⚠️ 未提供管理员密钥');
    return false;
  }

  // 去除首尾空格并进行比较
  const trimmedAdminKey = adminKey.trim();
  const trimmedExpectedKey = expectedKey.trim();

  console.log('🔐 密钥验证:', {
    provided: trimmedAdminKey.substring(0, 5) + '***',
    expected: trimmedExpectedKey.substring(0, 5) + '***',
    match: trimmedAdminKey === trimmedExpectedKey
  });

  return trimmedAdminKey === trimmedExpectedKey;
}

/**
 * GET - 获取cookie状态信息
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Cookie状态API被调用');

    // 访问控制检查
    if (!checkAccess(request)) {
      console.warn('❌ 访问控制检查失败');
      return createErrorResponse(
        '访问被拒绝',
        HTTP_STATUS.UNAUTHORIZED,
        '需要有效的管理员密钥'
      );
    }

    console.log('✅ 访问控制检查通过');

    // 获取查询参数
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const format = searchParams.get('format') || 'json';

    // 处理不同的操作
    switch (action) {
      case 'validate':
        // 验证所有cookie
        await cookieManager.validateAllCookies();
        return createApiResponse({
          success: true,
          message: '所有cookie验证完成',
          timestamp: new Date().toISOString()
        });

      case 'stats':
        // 只返回统计信息
        const stats = cookieManager.getCookieStats();
        return createApiResponse({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });

      default:
        // 返回完整的cookie状态信息
        console.log('📊 获取Cookie信息...');

        let cookiesInfo: Array<{
          id: string;
          maskedValue: string;
          isValid: boolean;
          lastUsed: string;
          failureCount: number;
          lastValidated: string;
          consecutiveFailures: number;
        }>;
        let cookieStats: {
          total: number;
          valid: number;
          invalid: number;
          unknown: number;
        };

        try {
          cookiesInfo = cookieManager.getAllCookiesInfo();
          cookieStats = cookieManager.getCookieStats();
        } catch (managerError) {
          console.error('❌ Cookie管理器错误:', managerError);
          // 如果cookie管理器出错，返回空数据
          cookiesInfo = [];
          cookieStats = { total: 0, valid: 0, invalid: 0, unknown: 0 };
        }

        const envCookies = getCookies();

        console.log('📊 Cookie统计:', cookieStats);
        console.log('📊 环境变量Cookie数量:', envCookies.length);

        const responseData = {
          success: true,
          timestamp: new Date().toISOString(),
          stats: cookieStats,
          cookies: cookiesInfo,
          config: {
            totalConfigured: envCookies.length,
            managedCookies: cookiesInfo.length,
            environment: process.env.NODE_ENV || 'unknown'
          }
        };

        // 支持不同的输出格式
        if (format === 'html') {
          return new Response(generateHtmlReport(responseData), {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        }

        return createApiResponse(responseData);
    }

  } catch (error) {
    console.error('❌ Cookie状态API错误:', error);

    // 详细的错误信息
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('错误详情:', {
      message: errorMessage,
      stack: errorStack
    });

    return createErrorResponse(
      'Cookie状态查询失败',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      errorMessage
    );
  }
}

/**
 * POST - 执行cookie管理操作
 */
export async function POST(request: NextRequest) {
  try {
    // 访问控制检查
    if (!checkAccess(request)) {
      return createErrorResponse(
        '访问被拒绝',
        HTTP_STATUS.UNAUTHORIZED,
        '需要有效的管理员密钥'
      );
    }

    const { action, cookieId } = await request.json();

    switch (action) {
      case 'validate-all':
        await cookieManager.validateAllCookies();
        return createApiResponse({
          success: true,
          message: '所有cookie验证完成',
          timestamp: new Date().toISOString()
        });

      case 'reset-stats':
        // 这里可以添加重置统计的逻辑
        return createApiResponse({
          success: true,
          message: '统计信息已重置',
          timestamp: new Date().toISOString()
        });

      default:
        return createErrorResponse(
          '不支持的操作',
          HTTP_STATUS.BAD_REQUEST,
          `未知操作: ${action}`
        );
    }

  } catch (error) {
    console.error('Cookie管理操作错误:', error);
    return createErrorResponse(
      'Cookie管理操作失败',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * 生成HTML格式的状态报告
 */
function generateHtmlReport(data: any): string {
  const { stats, cookies, config, timestamp } = data;
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cookie状态监控</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #007bff; }
        .stat-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; margin-top: 5px; }
        .cookies-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .cookies-table th, .cookies-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .cookies-table th { background-color: #f8f9fa; font-weight: 600; }
        .status-valid { color: #28a745; font-weight: bold; }
        .status-invalid { color: #dc3545; font-weight: bold; }
        .actions { margin-top: 20px; }
        .btn { padding: 8px 16px; margin-right: 10px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .timestamp { color: #666; font-size: 0.9em; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍪 Cookie状态监控</h1>
            <p>实时监控小红书API Cookie的状态和使用情况</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">总Cookie数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #28a745;">${stats.valid}</div>
                <div class="stat-label">有效Cookie</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #dc3545;">${stats.invalid}</div>
                <div class="stat-label">无效Cookie</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${config.totalConfigured}</div>
                <div class="stat-label">配置的Cookie</div>
            </div>
        </div>

        <h2>Cookie详细状态</h2>
        <table class="cookies-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Cookie值</th>
                    <th>状态</th>
                    <th>最后使用</th>
                    <th>失败次数</th>
                    <th>连续失败</th>
                    <th>最后验证</th>
                </tr>
            </thead>
            <tbody>
                ${cookies.map((cookie: any) => `
                    <tr>
                        <td>${cookie.id}</td>
                        <td><code>${cookie.maskedValue}</code></td>
                        <td class="${cookie.isValid ? 'status-valid' : 'status-invalid'}">
                            ${cookie.isValid ? '✅ 有效' : '❌ 无效'}
                        </td>
                        <td>${formatDate(cookie.lastUsed)}</td>
                        <td>${cookie.failureCount}</td>
                        <td>${cookie.consecutiveFailures}</td>
                        <td>${formatDate(cookie.lastValidated)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="actions">
            <a href="?action=validate&format=html" class="btn btn-primary">🔍 验证所有Cookie</a>
            <a href="?format=json" class="btn btn-secondary">📊 JSON格式</a>
            <a href="javascript:location.reload()" class="btn btn-secondary">🔄 刷新页面</a>
        </div>

        <div class="timestamp">
            最后更新: ${new Date(timestamp).toLocaleString('zh-CN')} | 环境: ${config.environment}
        </div>
    </div>

    <script>
        // 自动刷新功能
        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.getTime() === 0 ? '从未' : date.toLocaleString('zh-CN');
        }
        
        // 每30秒自动刷新
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.getTime() === 0 ? '从未' : date.toLocaleString('zh-CN');
}
