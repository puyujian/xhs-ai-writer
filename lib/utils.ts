import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并Tailwind CSS类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 生成随机的trace ID
 * @param len 长度，默认16
 * @returns 随机字符串
 */
export function generateTraceId(len: number = 16): string {
  let result = '';
  const chars = 'abcdef0123456789';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * 获取环境变量值，如果未配置则返回默认值
 * @param envVar 环境变量名
 * @param defaultValue 默认值
 * @returns 环境变量值
 */
export function getEnvVar(envVar: string, defaultValue: string = ''): string {
  const value = process.env[envVar];
  return value || defaultValue;
}

/**
 * 创建API成功响应
 * @param data 响应数据
 * @param status HTTP状态码
 * @returns Response对象
 */
export function createApiResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * 创建API错误响应
 * @param error 错误信息
 * @param status HTTP状态码
 * @param details 详细信息
 * @returns Response对象
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: string
): Response {
  return new Response(
    JSON.stringify({
      error,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * 安全的JSON解析，带自动修复功能
 * @param jsonString JSON字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析结果或默认值
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    // 首先尝试直接解析
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败，尝试修复:', error);

    try {
      // 尝试修复常见的JSON格式问题
      let fixedJson = jsonString;

      // 1. 移除可能的markdown代码块标记
      fixedJson = fixedJson.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

      // 2. 修复未闭合的字符串（简单情况）
      const openQuotes = (fixedJson.match(/"/g) || []).length;
      if (openQuotes % 2 !== 0) {
        // 如果引号数量是奇数，在末尾添加引号和闭合括号
        fixedJson = fixedJson + '"}';
      }

      // 3. 确保JSON对象正确闭合
      const openBraces = (fixedJson.match(/{/g) || []).length;
      const closeBraces = (fixedJson.match(/}/g) || []).length;
      if (openBraces > closeBraces) {
        fixedJson = fixedJson + '}';
      }

      // 4. 移除末尾的逗号
      fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');

      console.log('🔧 尝试解析修复后的JSON...');
      return JSON.parse(fixedJson);

    } catch (fixError) {
      console.error('JSON修复也失败了:', fixError);
      console.log('原始内容:', jsonString.substring(0, 500) + '...');
      return defaultValue;
    }
  }
}
