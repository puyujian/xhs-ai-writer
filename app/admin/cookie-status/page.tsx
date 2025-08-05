'use client';

/**
 * Cookie状态监控页面
 * 提供实时的cookie状态监控和管理界面
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 类型定义
interface CookieInfo {
  id: string;
  maskedValue: string;
  isValid: boolean;
  lastUsed: string;
  failureCount: number;
  lastValidated: string;
  consecutiveFailures: number;
}

interface CookieStats {
  total: number;
  valid: number;
  invalid: number;
  unknown: number;
}

interface CookieStatusData {
  success: boolean;
  timestamp: string;
  stats: CookieStats;
  cookies: CookieInfo[];
  config: {
    totalConfigured: number;
    managedCookies: number;
    environment: string;
  };
}

export default function CookieStatusPage() {
  const [data, setData] = useState<CookieStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [adminKey, setAdminKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // 获取cookie状态数据
  const fetchCookieStatus = useCallback(async (keyToUse?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL('/api/admin/cookie-status', window.location.origin);
      const currentKey = keyToUse || adminKey;
      if (currentKey) {
        url.searchParams.set('key', currentKey);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          throw new Error('访问被拒绝，请检查管理员密钥');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  // 验证所有cookie
  const validateAllCookies = async () => {
    try {
      setIsValidating(true);
      setError(null);
      setValidationMessage('正在验证所有Cookie...');

      const url = new URL('/api/admin/cookie-status', window.location.origin);
      url.searchParams.set('action', 'validate');
      if (adminKey) {
        url.searchParams.set('key', adminKey);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`验证失败: HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('验证结果:', result);

      setValidationMessage('验证完成，正在刷新数据...');

      // 等待一小段时间确保验证完成，然后刷新数据
      setTimeout(async () => {
        await fetchCookieStatus();
        setValidationMessage('数据已更新！');
        setTimeout(() => setValidationMessage(null), 3000);
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败');
      setValidationMessage(null);
    } finally {
      setIsValidating(false);
    }
  };

  // 手动登录函数
  const handleLogin = async () => {
    if (!adminKey.trim()) {
      setError('请输入管理员密钥');
      return;
    }
    await fetchCookieStatus(adminKey.trim());
  };

  // 初始加载（仅在开发环境或已认证时）
  useEffect(() => {
    // 在开发环境下自动加载，生产环境需要手动输入密钥
    if (process.env.NODE_ENV === 'development') {
      fetchCookieStatus();
    }
  }, [fetchCookieStatus]);

  // 自动刷新（仅在已认证时）
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;

    const interval = setInterval(() => {
      fetchCookieStatus();
    }, 30000); // 30秒刷新
    return () => clearInterval(interval);
  }, [autoRefresh, isAuthenticated, fetchCookieStatus]);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getTime() === 0 ? '从未' : date.toLocaleString('zh-CN');
  };

  // 获取状态颜色
  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-green-600' : 'text-red-600';
  };

  // 获取状态图标
  const getStatusIcon = (isValid: boolean) => {
    return isValid ? '✅' : '❌';
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载Cookie状态中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">🚫 访问错误</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            {(error.includes('管理员密钥') || error.includes('访问被拒绝')) && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-2">
                    管理员密钥:
                  </label>
                  <input
                    type="password"
                    id="adminKey"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入管理员密钥"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading || !adminKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '验证中...' : '登录访问'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 开发环境提示 */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-700">🔧 开发环境模式：无需管理员密钥即可访问</p>
          </CardContent>
        </Card>
      )}

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🍪 Cookie状态监控</h1>
          <p className="text-gray-600 mt-2">实时监控小红书API Cookie的状态和使用情况</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">自动刷新</span>
          </label>
          <button
            onClick={() => fetchCookieStatus()}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {loading ? '刷新中...' : '🔄 手动刷新'}
          </button>
          <button
            onClick={validateAllCookies}
            disabled={isValidating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {isValidating ? '验证中...' : '🔍 验证所有Cookie'}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">总Cookie数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">有效Cookie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.valid}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">无效Cookie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.stats.invalid}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">配置的Cookie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{data.config.totalConfigured}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cookie详细列表 */}
      <Card>
        <CardHeader>
          <CardTitle>Cookie详细状态</CardTitle>
          <CardDescription>
            最后更新: {formatDate(data.timestamp)} | 环境: {data.config.environment}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">ID</th>
                  <th className="text-left p-3 font-medium text-gray-600">Cookie值</th>
                  <th className="text-left p-3 font-medium text-gray-600">状态</th>
                  <th className="text-left p-3 font-medium text-gray-600">最后使用</th>
                  <th className="text-left p-3 font-medium text-gray-600">失败次数</th>
                  <th className="text-left p-3 font-medium text-gray-600">连续失败</th>
                  <th className="text-left p-3 font-medium text-gray-600">最后验证</th>
                </tr>
              </thead>
              <tbody>
                {data.cookies.map((cookie) => (
                  <tr key={cookie.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{cookie.id}</td>
                    <td className="p-3 font-mono text-sm text-gray-600">
                      <code className="bg-gray-100 px-2 py-1 rounded">{cookie.maskedValue}</code>
                    </td>
                    <td className={`p-3 font-medium ${getStatusColor(cookie.isValid)}`}>
                      {getStatusIcon(cookie.isValid)} {cookie.isValid ? '有效' : '无效'}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{formatDate(cookie.lastUsed)}</td>
                    <td className="p-3 text-sm">{cookie.failureCount}</td>
                    <td className="p-3 text-sm">
                      <span className={cookie.consecutiveFailures > 0 ? 'text-red-600 font-medium' : ''}>
                        {cookie.consecutiveFailures}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{formatDate(cookie.lastValidated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 验证状态提示 */}
      {validationMessage && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-blue-600">ℹ️ {validationMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">⚠️ {error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
