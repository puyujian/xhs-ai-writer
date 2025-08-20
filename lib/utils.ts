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
      // 统一预处理：去除Markdown围栏、提取首个JSON片段、修复细节
      let fixedJson = (jsonString || '').trim();

      // 1) 去除常见的Markdown代码块围栏（```json / ``` / ~~~json / ~~~）
      const stripMarkdownFences = (s: string): string => {
        let out = s.trim();
        // 三反引号围栏（带语言）起始行
        out = out.replace(/^\s*```[a-z0-9_-]*\s*\r?\n/i, '');
        // 三反引号围栏结束行
        out = out.replace(/\r?\n```[\s]*$/i, '');
        // 三波浪线围栏
        out = out.replace(/^\s*~~~[a-z0-9_-]*\s*\r?\n/i, '');
        out = out.replace(/\r?\n~~~[\s]*$/i, '');
        // 兼容单行围栏包裹
        out = out.replace(/^```[a-z0-9_-]*\s*/i, '').replace(/\s*```$/i, '');
        out = out.replace(/^~~~[a-z0-9_-]*\s*/i, '').replace(/\s*~~~$/i, '');
        // 特定 "```json" 形式（历史兼容）
        out = out.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');
        return out.trim();
      };

      fixedJson = stripMarkdownFences(fixedJson);

      // 2) 若仍包含非JSON前缀或后缀，尝试提取首个顶层JSON对象/数组片段
      const extractFirstJson = (s: string): string | null => {
        const n = s.length;
        let start = -1;
        for (let i = 0; i < n; i++) {
          const ch = s[i];
          if (ch === '{' || ch === '[') { start = i; break; }
        }
        if (start === -1) return null;

        let inString = false;
        let escape = false;
        let objDepth = 0;
        let arrDepth = 0;

        const first = s[start];
        if (first === '{') objDepth = 1; else arrDepth = 1;

        for (let i = start + 1; i < n; i++) {
          const ch = s[i];
          if (inString) {
            if (escape) {
              escape = false; // 跳过转义字符
            } else if (ch === '\\') {
              escape = true;
            } else if (ch === '"') {
              inString = false;
            }
            continue;
          } else {
            if (ch === '"') { inString = true; continue; }
            if (ch === '{') objDepth++;
            else if (ch === '}') objDepth = Math.max(0, objDepth - 1);
            else if (ch === '[') arrDepth++;
            else if (ch === ']') arrDepth = Math.max(0, arrDepth - 1);

            if (objDepth === 0 && arrDepth === 0) {
              return s.slice(start, i + 1);
            }
          }
        }
        // 若未能完全闭合，返回到字符串末尾的片段，后续再做闭合修复
        return s.slice(start);
      };

      let candidate = extractFirstJson(fixedJson) || fixedJson;

      // 3) 移除末尾多余逗号（对象或数组前）
      candidate = candidate.replace(/,(\s*[}\]])/g, '$1');

      // 4) 尝试补全未闭合的大括号/中括号（仅在显然不匹配时）
      const count = (str: string, re: RegExp) => (str.match(re) || []).length;
      const openBraces = count(candidate, /\{/g);
      const closeBraces = count(candidate, /\}/g);
      const openBrackets = count(candidate, /\[/g);
      const closeBrackets = count(candidate, /\]/g);
      let patched = candidate;
      if (openBraces > closeBraces) patched += '}'.repeat(openBraces - closeBraces);
      if (openBrackets > closeBrackets) patched += ']'.repeat(openBrackets - closeBrackets);

      // 5) 尝试解析修复后的JSON
      console.log('🔧 尝试解析修复后的JSON...');
      return JSON.parse(patched);

    } catch (fixError) {
      console.error('JSON修复也失败了:', fixError);
      console.log('原始内容片段:', (jsonString || '').substring(0, 500) + '...');
      return defaultValue;
    }
  }
}
