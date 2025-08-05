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
 * 获取所有编号的cookie环境变量
 * @returns cookie数组
 */
export function getCookies(): string[] {
  const cookies: string[] = [];
  let cookieIndex = 1;

  while (true) {
    const cookieValue = process.env[`XHS_COOKIE_${cookieIndex}`];
    if (!cookieValue) {
      break; // 没有更多cookie了
    }
    cookies.push(cookieValue);
    cookieIndex++;
  }

  // 如果没有找到编号的cookie，尝试读取原来的单个cookie
  if (cookies.length === 0) {
    const singleCookie = process.env['XHS_COOKIE'];
    if (singleCookie) {
      cookies.push(singleCookie);
      console.warn('⚠️ 检测到旧版单cookie配置，建议迁移到XHS_COOKIE_1格式');
    }
  }

  return cookies;
}

/**
 * 验证cookie格式是否正确
 * @param cookie cookie字符串
 * @returns 是否有效
 */
export function isValidCookieFormat(cookie: string): boolean {
  if (!cookie || typeof cookie !== 'string') {
    return false;
  }

  // 基本格式检查：应该包含键值对
  const hasKeyValuePairs = cookie.includes('=');
  const hasMinLength = cookie.length > 10;

  return hasKeyValuePairs && hasMinLength;
}

/**
 * 创建API成功响应
 * @param data 响应数据
 * @param status HTTP状态码
 * @returns Response对象
 */
export function createApiResponse(data: any, status: number = 200): Response {
  // 安全的CORS配置
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.PRODUCTION_URL || 'https://xhs-ai-writer.vercel.app')
    : '*';

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
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
  // 安全的CORS配置
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.PRODUCTION_URL || 'https://xhs-ai-writer.vercel.app')
    : '*';

  return new Response(
    JSON.stringify({
      error,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

/**
 * 净化文本，移除潜在的隐形水印字符 (如零宽字符)
 * @param text 输入的文本
 * @returns 净化后的文本
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  // 这个正则表达式匹配所有非"标准"字符。
  // 我们保留：
  // \p{L}: 所有语言的字母 (包括汉字)
  // \p{N}: 所有数字
  // \p{P}: 所有标点符号
  // \p{S}: 所有符号 (包括Emoji)
  // \p{Z}: 所有空白符 (包括普通空格)
  // \s: 标准空白符 (换行、制表符等)
  // *#[](): 保留Markdown特殊字符
  // 除了以上字符，其他的 (特别是控制字符和不可见字符) 都会被移除。
  const sanitized = text.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\u2ceb0-\u2ebef\u30000-\u3134f\ua000-\ua48f\ua490-\ua4cf\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff\u0041-\u005a\u0061-\u007a\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u017f\u0180-\u024f\u1e00-\u1eff\u0030-\u0039\u00b2\u00b3\u00b9\u00bc-\u00be\u2070\u2074-\u2079\u2080-\u2089\u2150-\u218f\u2460-\u24ff\u2776-\u2793\u2cfd\u3007\u3021-\u3029\u3038-\u303a\ua6e6-\ua6ef\u0020-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e\u00a0-\u00bf\u2000-\u206f\u2e00-\u2e7f\u3000-\u303f\ufe30-\ufe4f\ufe50-\ufe6f\uff00-\uffef\s*#\[\]()]/g, '');

  return sanitized;
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
