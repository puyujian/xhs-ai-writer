/**
 * 兑换码管理模块
 * 负责兑换码的生成、验证和使用
 */

import { promises as fs } from 'fs';
import path from 'path';
import { RedemptionCode, RedemptionResult } from './types';
import { CONFIG } from './constants';

// 兑换码配置
export const REDEMPTION_CONFIG = {
  // 存储目录
  REDEMPTION_DIR: path.join(process.cwd(), 'data', 'redemption'),
  // 兑换码文件
  CODES_FILE: 'codes.json',
  // 清理过期数据的天数
  CLEANUP_DAYS: 7,
} as const;

/**
 * 检查是否启用兑换码功能
 */
function isRedemptionEnabled(): boolean {
  const redemptionEnabled = process.env.ENABLE_REDEMPTION;
  // 默认启用兑换码，除非明确设置为 'false'
  return redemptionEnabled !== 'false';
}

/**
 * 确保兑换码目录存在
 */
async function ensureRedemptionDir(): Promise<void> {
  try {
    await fs.access(REDEMPTION_CONFIG.REDEMPTION_DIR);
  } catch {
    await fs.mkdir(REDEMPTION_CONFIG.REDEMPTION_DIR, { recursive: true });
  }
}

/**
 * 获取兑换码文件路径
 */
function getCodesFilePath(): string {
  return path.join(REDEMPTION_CONFIG.REDEMPTION_DIR, REDEMPTION_CONFIG.CODES_FILE);
}

/**
 * 生成随机兑换码
 */
function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < CONFIG.REDEMPTION_CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 格式化为 XXXX-XXXX-XXXX 的形式
  return result.replace(/(.{4})/g, '$1-').slice(0, -1);
}

/**
 * 读取所有兑换码
 */
async function readRedemptionCodes(): Promise<Record<string, RedemptionCode>> {
  try {
    const filePath = getCodesFilePath();
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * 保存兑换码
 */
async function saveRedemptionCodes(codes: Record<string, RedemptionCode>): Promise<void> {
  try {
    await ensureRedemptionDir();
    const filePath = getCodesFilePath();
    await fs.writeFile(filePath, JSON.stringify(codes, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存兑换码失败:', error);
    throw error;
  }
}

/**
 * 验证管理员权限
 */
function verifyAdminPermission(adminKey: string): boolean {
  const validAdminKey = process.env.ADMIN_KEY;
  return validAdminKey && adminKey === validAdminKey;
}

/**
 * 生成兑换码
 */
export async function generateRedemptionCode(
  value: number, 
  adminKey: string,
  createdBy: string = 'admin'
): Promise<{ success: boolean; code?: string; message: string }> {
  if (!isRedemptionEnabled()) {
    return {
      success: false,
      message: '兑换码功能未启用'
    };
  }

  // 验证管理员权限
  if (!verifyAdminPermission(adminKey)) {
    return {
      success: false,
      message: '管理员权限验证失败'
    };
  }

  // 验证价值范围
  if (value <= 0 || value > CONFIG.MAX_BONUS_USAGE) {
    return {
      success: false,
      message: `兑换码价值必须在 1-${CONFIG.MAX_BONUS_USAGE} 之间`
    };
  }

  try {
    const codes = await readRedemptionCodes();
    const now = Date.now();
    
    // 生成唯一的兑换码
    let newCode: string;
    let attempts = 0;
    do {
      newCode = generateRandomCode();
      attempts++;
      if (attempts > 100) {
        throw new Error('生成唯一兑换码失败');
      }
    } while (codes[newCode]);

    // 创建兑换码记录
    const redemptionCode: RedemptionCode = {
      code: newCode,
      type: 'usage_bonus',
      value,
      isUsed: false,
      createdAt: now,
      expiresAt: now + (CONFIG.REDEMPTION_CODE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      createdBy
    };

    codes[newCode] = redemptionCode;
    await saveRedemptionCodes(codes);

    console.log(`✅ 生成兑换码: ${newCode}, 价值: ${value} 次`);

    return {
      success: true,
      code: newCode,
      message: `成功生成兑换码，价值 ${value} 次使用机会`
    };
  } catch (error) {
    console.error('生成兑换码失败:', error);
    return {
      success: false,
      message: '生成兑换码失败'
    };
  }
}

/**
 * 验证兑换码
 */
export async function validateRedemptionCode(code: string): Promise<{
  valid: boolean;
  redemptionCode?: RedemptionCode;
  message: string;
}> {
  if (!isRedemptionEnabled()) {
    return {
      valid: false,
      message: '兑换码功能未启用'
    };
  }

  try {
    const codes = await readRedemptionCodes();
    const redemptionCode = codes[code];

    if (!redemptionCode) {
      return {
        valid: false,
        message: '兑换码不存在'
      };
    }

    if (redemptionCode.isUsed) {
      return {
        valid: false,
        message: '兑换码已被使用'
      };
    }

    if (Date.now() > redemptionCode.expiresAt) {
      return {
        valid: false,
        message: '兑换码已过期'
      };
    }

    return {
      valid: true,
      redemptionCode,
      message: '兑换码有效'
    };
  } catch (error) {
    console.error('验证兑换码失败:', error);
    return {
      valid: false,
      message: '验证兑换码失败'
    };
  }
}

/**
 * 使用兑换码
 */
export async function useRedemptionCode(
  code: string, 
  userIP: string
): Promise<RedemptionResult> {
  if (!isRedemptionEnabled()) {
    return {
      success: false,
      message: '兑换码功能未启用'
    };
  }

  try {
    // 先验证兑换码
    const validation = await validateRedemptionCode(code);
    if (!validation.valid || !validation.redemptionCode) {
      return {
        success: false,
        message: validation.message
      };
    }

    const codes = await readRedemptionCodes();
    const redemptionCode = validation.redemptionCode;

    // 标记为已使用
    codes[code] = {
      ...redemptionCode,
      isUsed: true,
      usedBy: userIP,
      usedAt: Date.now()
    };

    await saveRedemptionCodes(codes);

    console.log(`🎁 兑换码 ${code} 已被 ${userIP} 使用，获得 ${redemptionCode.value} 次额外使用机会`);

    return {
      success: true,
      message: `兑换成功！获得 ${redemptionCode.value} 次额外使用机会`,
      addedUsage: redemptionCode.value
    };
  } catch (error) {
    console.error('使用兑换码失败:', error);
    return {
      success: false,
      message: '使用兑换码失败'
    };
  }
}

/**
 * 清理过期兑换码
 */
export async function cleanupExpiredCodes(): Promise<{
  cleanedCount: number;
  totalCodes: number;
  redemptionEnabled: boolean;
}> {
  if (!isRedemptionEnabled()) {
    return {
      cleanedCount: 0,
      totalCodes: 0,
      redemptionEnabled: false
    };
  }

  try {
    const codes = await readRedemptionCodes();
    const now = Date.now();
    const cutoffTime = now - (REDEMPTION_CONFIG.CLEANUP_DAYS * 24 * 60 * 60 * 1000);
    
    const originalCount = Object.keys(codes).length;
    let cleanedCount = 0;

    // 清理过期或已使用很久的兑换码
    for (const [codeStr, codeData] of Object.entries(codes)) {
      const shouldClean = 
        // 已过期且过了清理期
        (now > codeData.expiresAt && codeData.expiresAt < cutoffTime) ||
        // 已使用且使用时间过了清理期
        (codeData.isUsed && codeData.usedAt && codeData.usedAt < cutoffTime);

      if (shouldClean) {
        delete codes[codeStr];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await saveRedemptionCodes(codes);
      console.log(`🧹 清理了 ${cleanedCount} 个过期兑换码`);
    }

    return {
      cleanedCount,
      totalCodes: originalCount,
      redemptionEnabled: true
    };
  } catch (error) {
    console.error('清理兑换码失败:', error);
    return {
      cleanedCount: 0,
      totalCodes: 0,
      redemptionEnabled: true
    };
  }
}

/**
 * 获取兑换码统计信息
 */
export async function getRedemptionStats(): Promise<{
  totalCodes: number;
  usedCodes: number;
  expiredCodes: number;
  activeCodes: number;
  redemptionEnabled: boolean;
}> {
  if (!isRedemptionEnabled()) {
    return {
      totalCodes: 0,
      usedCodes: 0,
      expiredCodes: 0,
      activeCodes: 0,
      redemptionEnabled: false
    };
  }

  try {
    const codes = await readRedemptionCodes();
    const now = Date.now();
    
    let usedCodes = 0;
    let expiredCodes = 0;
    let activeCodes = 0;

    for (const codeData of Object.values(codes)) {
      if (codeData.isUsed) {
        usedCodes++;
      } else if (now > codeData.expiresAt) {
        expiredCodes++;
      } else {
        activeCodes++;
      }
    }

    return {
      totalCodes: Object.keys(codes).length,
      usedCodes,
      expiredCodes,
      activeCodes,
      redemptionEnabled: true
    };
  } catch (error) {
    console.error('获取兑换码统计失败:', error);
    return {
      totalCodes: 0,
      usedCodes: 0,
      expiredCodes: 0,
      activeCodes: 0,
      redemptionEnabled: true
    };
  }
}