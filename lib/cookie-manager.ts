/**
 * Cookie管理器 - 支持多cookie轮询和有效性检测
 */

import { generateTraceId } from './utils';
import { XHS_CONFIG, API_ENDPOINTS } from './constants';

// Cookie信息接口
export interface CookieInfo {
  id: string;                    // Cookie唯一标识
  value: string;                 // Cookie值
  isValid: boolean;              // 是否有效
  lastUsed: Date;               // 最后使用时间
  failureCount: number;         // 失败次数
  lastValidated: Date;          // 最后验证时间
  consecutiveFailures: number;  // 连续失败次数
}

// Cookie状态统计
export interface CookieStats {
  total: number;
  valid: number;
  invalid: number;
  unknown: number;
}

// Cookie管理器类
export class CookieManager {
  private cookies: Map<string, CookieInfo> = new Map();
  private currentIndex: number = 0;
  private maxFailures: number = 3;           // 最大失败次数
  private validationInterval: number = 300000; // 5分钟验证间隔
  private cooldownPeriod: number = 600000;   // 10分钟冷却期

  constructor() {
    this.loadCookiesFromEnv();
  }

  /**
   * 从环境变量加载所有cookie
   */
  private loadCookiesFromEnv(): void {
    let cookieIndex = 1;
    
    while (true) {
      const cookieValue = process.env[`XHS_COOKIE_${cookieIndex}`];
      if (!cookieValue) {
        break; // 没有更多cookie了
      }

      const cookieId = `cookie_${cookieIndex}`;
      const cookieInfo: CookieInfo = {
        id: cookieId,
        value: cookieValue,
        isValid: true, // 初始假设有效
        lastUsed: new Date(0), // 从未使用
        failureCount: 0,
        lastValidated: new Date(0), // 从未验证
        consecutiveFailures: 0
      };

      this.cookies.set(cookieId, cookieInfo);
      cookieIndex++;
    }

    console.log(`🍪 Cookie管理器初始化完成，加载了 ${this.cookies.size} 个cookie`);
  }

  /**
   * 获取下一个可用的cookie
   */
  public async getNextValidCookie(): Promise<string | null> {
    const validCookies = this.getValidCookies();
    
    if (validCookies.length === 0) {
      console.warn('⚠️ 没有可用的cookie');
      return null;
    }

    // 轮询策略：使用当前索引
    const cookie = validCookies[this.currentIndex % validCookies.length];
    this.currentIndex = (this.currentIndex + 1) % validCookies.length;

    // 更新使用时间
    cookie.lastUsed = new Date();
    
    console.log(`🍪 使用cookie: ${cookie.id} (${this.maskCookie(cookie.value)})`);
    return cookie.value;
  }

  /**
   * 标记cookie为失效
   */
  public markCookieAsInvalid(cookieValue: string, reason?: string): void {
    const cookie = this.findCookieByValue(cookieValue);
    if (!cookie) {
      console.warn('⚠️ 未找到要标记为失效的cookie');
      return;
    }

    cookie.failureCount++;
    cookie.consecutiveFailures++;
    
    // 如果连续失败次数超过阈值，标记为无效
    if (cookie.consecutiveFailures >= this.maxFailures) {
      cookie.isValid = false;
      console.warn(`❌ Cookie ${cookie.id} 已标记为无效 (原因: ${reason || '连续失败'})`);
    } else {
      console.warn(`⚠️ Cookie ${cookie.id} 失败 ${cookie.consecutiveFailures}/${this.maxFailures} (原因: ${reason || '未知'})`);
    }
  }

  /**
   * 标记cookie为有效
   */
  public markCookieAsValid(cookieValue: string): void {
    const cookie = this.findCookieByValue(cookieValue);
    if (!cookie) {
      return;
    }

    cookie.isValid = true;
    cookie.consecutiveFailures = 0; // 重置连续失败次数
    cookie.lastValidated = new Date();
    
    console.log(`✅ Cookie ${cookie.id} 验证有效`);
  }

  /**
   * 验证cookie有效性
   */
  public async validateCookie(cookieValue: string): Promise<boolean> {
    try {
      // 发送一个轻量级的测试请求
      const testUrl = API_ENDPOINTS.XHS_SEARCH;
      const testData = {
        keyword: "测试",
        page: 1,
        page_size: 1,
        search_id: generateTraceId(21),
        sort: "popularity_descending",
        note_type: 0,
        ext_flags: [],
        filters: [],
        geo: "",
        image_formats: ["jpg"]
      };

      const headers = {
        'authority': 'edith.xiaohongshu.com',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'cache-control': 'no-cache',
        'content-type': 'application/json;charset=UTF-8',
        'origin': 'https://www.xiaohongshu.com',
        'pragma': 'no-cache',
        'referer': 'https://www.xiaohongshu.com/',
        'user-agent': XHS_CONFIG.USER_AGENT,
        'x-b3-traceid': generateTraceId(),
        'cookie': cookieValue
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(testUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (response.status === 401 || response.status === 403) {
        this.markCookieAsInvalid(cookieValue, `HTTP ${response.status}`);
        return false;
      }

      if (response.status === 200) {
        const data = await response.json();
        
        // 检查响应内容是否表示认证失败
        if (data.success === false && (
          data.msg?.includes('登录') || 
          data.msg?.includes('认证') ||
          data.msg?.includes('权限')
        )) {
          this.markCookieAsInvalid(cookieValue, `认证失败: ${data.msg}`);
          return false;
        }

        this.markCookieAsValid(cookieValue);
        return true;
      }

      // 其他状态码暂时认为是网络问题，不标记为无效
      console.warn(`⚠️ Cookie验证返回状态码: ${response.status}`);
      return false;

    } catch (error) {
      console.warn(`⚠️ Cookie验证失败:`, error);
      return false;
    }
  }

  /**
   * 获取所有有效的cookie
   */
  private getValidCookies(): CookieInfo[] {
    const now = new Date();
    const allCookies: CookieInfo[] = [];

    // 使用forEach代替for...of来兼容es5
    this.cookies.forEach(cookie => {
      allCookies.push(cookie);
    });

    return allCookies.filter(cookie => {
      // 如果cookie被标记为无效，检查是否已过冷却期
      if (!cookie.isValid) {
        const timeSinceLastFailure = now.getTime() - cookie.lastValidated.getTime();
        if (timeSinceLastFailure > this.cooldownPeriod) {
          // 冷却期已过，重新标记为有效进行尝试
          cookie.isValid = true;
          cookie.consecutiveFailures = 0;
          console.log(`🔄 Cookie ${cookie.id} 冷却期已过，重新启用`);
          return true;
        }
        return false;
      }
      return true;
    });
  }

  /**
   * 根据cookie值查找cookie信息
   */
  private findCookieByValue(cookieValue: string): CookieInfo | undefined {
    let foundCookie: CookieInfo | undefined;

    // 使用forEach代替Array.from来兼容es5
    this.cookies.forEach(cookie => {
      if (cookie.value === cookieValue) {
        foundCookie = cookie;
      }
    });

    return foundCookie;
  }

  /**
   * 脱敏显示cookie值
   */
  private maskCookie(cookieValue: string): string {
    if (cookieValue.length <= 10) {
      return '*'.repeat(cookieValue.length);
    }
    return cookieValue.substring(0, 5) + '*'.repeat(cookieValue.length - 10) + cookieValue.substring(cookieValue.length - 5);
  }

  /**
   * 获取cookie统计信息
   */
  public getCookieStats(): CookieStats {
    const stats: CookieStats = {
      total: this.cookies.size,
      valid: 0,
      invalid: 0,
      unknown: 0
    };

    this.cookies.forEach(cookie => {
      if (cookie.isValid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }
    });

    return stats;
  }

  /**
   * 获取所有cookie的详细信息（用于状态页面）
   */
  public getAllCookiesInfo(): Array<{
    id: string;
    maskedValue: string;
    isValid: boolean;
    lastUsed: string;
    failureCount: number;
    lastValidated: string;
    consecutiveFailures: number;
  }> {
    const cookiesInfo: Array<{
      id: string;
      maskedValue: string;
      isValid: boolean;
      lastUsed: string;
      failureCount: number;
      lastValidated: string;
      consecutiveFailures: number;
    }> = [];

    // 使用forEach代替Array.from来兼容es5
    this.cookies.forEach(cookie => {
      cookiesInfo.push({
        id: cookie.id,
        maskedValue: this.maskCookie(cookie.value),
        isValid: cookie.isValid,
        lastUsed: cookie.lastUsed.toISOString(),
        failureCount: cookie.failureCount,
        lastValidated: cookie.lastValidated.toISOString(),
        consecutiveFailures: cookie.consecutiveFailures
      });
    });

    return cookiesInfo;
  }

  /**
   * 手动验证所有cookie
   */
  public async validateAllCookies(): Promise<void> {
    console.log('🔍 开始验证所有cookie...');

    // 使用forEach代替for...of来兼容es5
    const cookiePromises: Promise<void>[] = [];
    this.cookies.forEach(cookie => {
      cookiePromises.push(
        this.validateCookie(cookie.value).then(() => {
          // 添加延迟避免请求过于频繁
          return new Promise<void>(resolve => setTimeout(resolve, 1000));
        })
      );
    });

    // 等待所有验证完成
    await Promise.all(cookiePromises);

    console.log('✅ 所有cookie验证完成');
  }
}

// 全局cookie管理器实例
export const cookieManager = new CookieManager();
