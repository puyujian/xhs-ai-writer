/**
 * 使用限制管理模块
 * 负责每日使用次数的记录和限制
 */

import { promises as fs } from 'fs';
import path from 'path';
import { UsageRecord, UsageStatus } from './types';
import { CONFIG } from './constants';

// 使用限制配置
export const USAGE_CONFIG = {
  // 存储目录
  USAGE_DIR: path.join(process.cwd(), 'data', 'usage'),
  // 单个记录文件名
  USAGE_FILE: 'daily-usage.json',
  // 清理过期数据的天数
  CLEANUP_DAYS: 7,
} as const;

/**
 * 检查是否启用使用限制
 */
function isUsageLimitEnabled(): boolean {
  const limitEnabled = process.env.ENABLE_USAGE_LIMIT;
  // 默认启用限制，除非明确设置为 'false'
  return limitEnabled !== 'false';
}

/**
 * 确保使用记录目录存在
 */
async function ensureUsageDir(): Promise<void> {
  try {
    await fs.access(USAGE_CONFIG.USAGE_DIR);
  } catch {
    await fs.mkdir(USAGE_CONFIG.USAGE_DIR, { recursive: true });
  }
}

/**
 * 获取今日日期字符串
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * 获取下次重置时间
 */
function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(CONFIG.USAGE_RESET_HOUR, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * 获取使用记录文件路径
 */
function getUsageFilePath(): string {
  return path.join(USAGE_CONFIG.USAGE_DIR, USAGE_CONFIG.USAGE_FILE);
}

/**
 * 读取所有使用记录
 */
async function readUsageRecords(): Promise<Record<string, UsageRecord>> {
  try {
    const filePath = getUsageFilePath();
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * 保存使用记录
 */
async function saveUsageRecords(records: Record<string, UsageRecord>): Promise<void> {
  try {
    await ensureUsageDir();
    const filePath = getUsageFilePath();
    await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存使用记录失败:', error);
    throw error;
  }
}

/**
 * 从IP地址获取客户端标识符
 */
function getClientId(ip: string): string {
  // 对IPv6地址进行简化处理
  if (ip.includes('::1') || ip === '127.0.0.1') {
    return 'localhost';
  }
  
  // 对IPv4地址取前三段以支持同一网络的多个设备
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return parts.slice(0, 3).join('.');
  }
  
  // IPv6地址取前4段
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':');
  }
  
  return ip;
}

/**
 * 检查IP是否还有使用次数
 */
export async function checkUsageLimit(ip: string): Promise<UsageStatus> {
  if (!isUsageLimitEnabled()) {
    return {
      remaining: CONFIG.DAILY_LIMIT,
      total: CONFIG.DAILY_LIMIT,
      resetTime: getNextResetTime(),
      canUse: true,
      bonusRemaining: 0,
    };
  }

  try {
    const clientId = getClientId(ip);
    const today = getTodayString();
    const records = await readUsageRecords();
    
    const userRecord = records[clientId];
    
    // 如果没有记录或者日期不是今天，返回完整限额
    if (!userRecord || userRecord.resetDate !== today) {
      return {
        remaining: CONFIG.DAILY_LIMIT,
        total: CONFIG.DAILY_LIMIT,
        resetTime: getNextResetTime(),
        canUse: true,
        bonusRemaining: userRecord?.bonusCount || 0,
      };
    }
    
    const dailyRemaining = Math.max(0, CONFIG.DAILY_LIMIT - userRecord.count);
    const bonusRemaining = userRecord.bonusCount || 0;
    const totalRemaining = dailyRemaining + bonusRemaining;
    
    return {
      remaining: totalRemaining,
      total: CONFIG.DAILY_LIMIT,
      resetTime: getNextResetTime(),
      canUse: totalRemaining > 0,
      bonusRemaining,
    };
  } catch (error) {
    console.error('检查使用限制失败:', error);
    // 出错时默认允许使用
    return {
      remaining: CONFIG.DAILY_LIMIT,
      total: CONFIG.DAILY_LIMIT,
      resetTime: getNextResetTime(),
      canUse: true,
      bonusRemaining: 0,
    };
  }
}

/**
 * 记录一次使用
 */
export async function recordUsage(ip: string): Promise<UsageStatus> {
  if (!isUsageLimitEnabled()) {
    return {
      remaining: CONFIG.DAILY_LIMIT - 1,
      total: CONFIG.DAILY_LIMIT,
      resetTime: getNextResetTime(),
      canUse: true,
      bonusRemaining: 0,
    };
  }

  try {
    const clientId = getClientId(ip);
    const today = getTodayString();
    const now = Date.now();
    const records = await readUsageRecords();
    
    const existingRecord = records[clientId];
    
    // 如果是新用户或者新一天，创建新记录
    if (!existingRecord || existingRecord.resetDate !== today) {
      records[clientId] = {
        ip: clientId,
        count: 1,
        lastUsed: now,
        resetDate: today,
        bonusCount: existingRecord?.bonusCount || 0, // 保留额外次数
      };
    } else {
      // 优先使用日常次数，然后使用额外次数
      const dailyUsed = existingRecord.count;
      const bonusCount = existingRecord.bonusCount || 0;
      
      if (dailyUsed < CONFIG.DAILY_LIMIT) {
        // 使用日常次数
        records[clientId] = {
          ...existingRecord,
          count: existingRecord.count + 1,
          lastUsed: now,
        };
      } else if (bonusCount > 0) {
        // 使用额外次数
        records[clientId] = {
          ...existingRecord,
          bonusCount: bonusCount - 1,
          lastUsed: now,
        };
      } else {
        // 理论上不应该到这里，因为checkUsageLimit已经检查过
        throw new Error('使用次数已用完');
      }
    }
    
    await saveUsageRecords(records);
    
    const currentRecord = records[clientId];
    const dailyRemaining = Math.max(0, CONFIG.DAILY_LIMIT - currentRecord.count);
    const bonusRemaining = currentRecord.bonusCount || 0;
    const totalRemaining = dailyRemaining + bonusRemaining;
    
    console.log(`📊 使用记录: IP ${clientId} 今日已使用 ${currentRecord.count}/${CONFIG.DAILY_LIMIT} 次，额外次数 ${bonusRemaining}`);
    
    return {
      remaining: totalRemaining,
      total: CONFIG.DAILY_LIMIT,
      resetTime: getNextResetTime(),
      canUse: totalRemaining > 0,
      bonusRemaining,
    };
  } catch (error) {
    console.error('记录使用失败:', error);
    throw error;
  }
}

/**
 * 清理过期的使用记录
 */
export async function cleanupOldUsageRecords(): Promise<{
  cleanedCount: number;
  totalRecords: number;
  limitEnabled: boolean;
}> {
  if (!isUsageLimitEnabled()) {
    return {
      cleanedCount: 0,
      totalRecords: 0,
      limitEnabled: false,
    };
  }

  try {
    const records = await readUsageRecords();
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - USAGE_CONFIG.CLEANUP_DAYS);
    const cutoffString = cutoffDate.toISOString().split('T')[0];
    
    const originalCount = Object.keys(records).length;
    let cleanedCount = 0;
    
    // 清理过期记录
    for (const [clientId, record] of Object.entries(records)) {
      if (record.resetDate < cutoffString) {
        delete records[clientId];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      await saveUsageRecords(records);
      console.log(`🧹 清理了 ${cleanedCount} 条过期使用记录`);
    }
    
    return {
      cleanedCount,
      totalRecords: originalCount,
      limitEnabled: true,
    };
  } catch (error) {
    console.error('清理使用记录失败:', error);
    return {
      cleanedCount: 0,
      totalRecords: 0,
      limitEnabled: true,
    };
  }
}

/**
 * 获取使用统计
 */
export async function getUsageStats(): Promise<{
  totalUsers: number;
  todayActiveUsers: number;
  totalUsageToday: number;
  limitEnabled: boolean;
}> {
  if (!isUsageLimitEnabled()) {
    return {
      totalUsers: 0,
      todayActiveUsers: 0,
      totalUsageToday: 0,
      limitEnabled: false,
    };
  }

  try {
    const records = await readUsageRecords();
    const today = getTodayString();
    
    const totalUsers = Object.keys(records).length;
    let todayActiveUsers = 0;
    let totalUsageToday = 0;
    
    for (const record of Object.values(records)) {
      if (record.resetDate === today) {
        todayActiveUsers++;
        totalUsageToday += record.count;
      }
    }
    
    return {
      totalUsers,
      todayActiveUsers,
      totalUsageToday,
      limitEnabled: true,
    };
  } catch (error) {
    console.error('获取使用统计失败:', error);
    return {
      totalUsers: 0,
      todayActiveUsers: 0,
      totalUsageToday: 0,
      limitEnabled: true,
    };
  }
}

/**
 * 为用户添加额外使用次数
 */
export async function addBonusUsage(ip: string, bonusCount: number): Promise<{
  success: boolean;
  message: string;
  newUsageStatus?: UsageStatus;
}> {
  if (!isUsageLimitEnabled()) {
    return {
      success: false,
      message: '使用限制功能未启用'
    };
  }

  if (bonusCount <= 0) {
    return {
      success: false,
      message: '额外次数必须大于0'
    };
  }

  try {
    const clientId = getClientId(ip);
    const today = getTodayString();
    const records = await readUsageRecords();
    
    const existingRecord = records[clientId];
    
    if (!existingRecord || existingRecord.resetDate !== today) {
      // 创建新记录
      records[clientId] = {
        ip: clientId,
        count: 0,
        lastUsed: Date.now(),
        resetDate: today,
        bonusCount: (existingRecord?.bonusCount || 0) + bonusCount,
      };
    } else {
      // 更新现有记录
      records[clientId] = {
        ...existingRecord,
        bonusCount: (existingRecord.bonusCount || 0) + bonusCount,
      };
    }
    
    await saveUsageRecords(records);
    
    // 获取更新后的状态
    const newUsageStatus = await checkUsageLimit(ip);
    
    console.log(`🎁 为 IP ${clientId} 添加 ${bonusCount} 次额外使用机会`);
    
    return {
      success: true,
      message: `成功添加 ${bonusCount} 次额外使用机会`,
      newUsageStatus
    };
  } catch (error) {
    console.error('添加额外使用次数失败:', error);
    return {
      success: false,
      message: '添加额外使用次数失败'
    };
  }
}