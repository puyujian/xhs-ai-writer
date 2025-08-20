import { NextRequest } from 'next/server';
import { XhsNoteDetailResponse } from '@/lib/types';
import { ERROR_MESSAGES, API_ENDPOINTS, XHS_CONFIG, HTTP_STATUS } from '@/lib/constants';
import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { getCacheData, saveCacheData } from '@/lib/cache-manager';
import { cookieManager } from '@/lib/cookie-manager';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * 获取小红书笔记详情
 * @param noteId 笔记ID
 * @returns 笔记详情数据
 */
async function fetchNoteDetail(noteId: string): Promise<XhsNoteDetailResponse> {
  // 获取可用的cookie
  const cookie = await cookieManager.getNextValidCookie();
  if (!cookie) {
    throw new Error(ERROR_MESSAGES.XHS_NO_VALID_COOKIES);
  }

  try {
    // 构建API URL，替换noteId占位符
    const apiUrl = API_ENDPOINTS.XHS_NOTE_DETAIL.replace('{noteId}', noteId);
    
    if (debugLoggingEnabled) {
      console.log(`🔍 获取笔记详情: ${noteId}`);
      console.log(`📡 API URL: ${apiUrl}`);
    }

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': XHS_CONFIG.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cookie': cookie,
          'Referer': XHS_CONFIG.REFERER,
          'Origin': XHS_CONFIG.ORIGIN,
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (debugLoggingEnabled) {
        console.log(`📊 API响应状态: ${response.status}`);
      }

      // 检查HTTP状态码
      if (response.status === HTTP_STATUS.UNAUTHORIZED || response.status === HTTP_STATUS.FORBIDDEN) {
        // 标记cookie为无效
        cookieManager.markCookieAsInvalid(cookie);
        throw new Error(`认证失败: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }

      const data: XhsNoteDetailResponse = await response.json();

      if (debugLoggingEnabled) {
        console.log(`📊 API响应成功: ${data.success}`);
        console.log(`📊 API响应消息: ${data.msg}`);
      }

      // 检查API响应结构
      if (!data.success) {
        // 如果是认证相关错误，标记cookie为无效
        if (data.msg?.includes('登录') || data.msg?.includes('权限')) {
          cookieManager.markCookieAsInvalid(cookie);
        }
        throw new Error(`小红书API错误: ${data.msg || '未知错误'}`);
      }

      if (!data.data) {
        throw new Error('笔记详情数据结构异常');
      }

      // 标记cookie为有效
      cookieManager.markCookieAsValid(cookie);

      return data;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error('请求超时');
        }
        throw fetchError;
      }
      throw new Error('网络请求失败');
    }

  } catch (error) {
    if (debugLoggingEnabled) {
      console.error(`❌ 获取笔记详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    throw error;
  }
}

/**
 * 带缓存的笔记详情获取
 * @param noteId 笔记ID
 * @returns 笔记详情数据
 */
async function fetchNoteDetailWithCache(noteId: string): Promise<XhsNoteDetailResponse> {
  const cacheKey = `note_detail_${noteId}`;
  const cacheEnabled = process.env.ENABLE_CACHE !== 'false';
  
  if (debugLoggingEnabled) {
    console.log(`🔍 获取笔记详情: ${noteId} (缓存: ${cacheEnabled ? '启用' : '禁用'})`);
  }

  // 1. 尝试读取缓存（6小时有效期）
  if (cacheEnabled) {
    const cachedData = await getCacheData(cacheKey); // 使用默认6小时缓存
    if (cachedData) {
      if (debugLoggingEnabled) {
        console.log(`✅ 使用缓存数据: ${noteId}`);
      }
      return JSON.parse(cachedData.data);
    }
  }

  // 2. 缓存未命中，获取新数据
  try {
    const noteDetail = await fetchNoteDetail(noteId);
    
    // 3. 保存到缓存
    if (cacheEnabled) {
      try {
        await saveCacheData(cacheKey, JSON.stringify(noteDetail), [], 'scraped');
        if (debugLoggingEnabled) {
          console.log(`💾 笔记详情已缓存: ${noteId}`);
        }
      } catch (cacheError) {
        console.warn('保存缓存失败:', cacheError);
        // 缓存失败不影响主流程
      }
    }

    return noteDetail;

  } catch (error) {
    if (debugLoggingEnabled) {
      console.error(`❌ 获取笔记详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    throw error;
  }
}

/**
 * GET - 获取小红书笔记详情
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return createErrorResponse('笔记ID不能为空', HTTP_STATUS.BAD_REQUEST);
    }

    // 验证noteId格式（小红书笔记ID通常是24位十六进制字符）
    if (!/^[a-f0-9]{24}$/i.test(noteId)) {
      return createErrorResponse('笔记ID格式无效', HTTP_STATUS.BAD_REQUEST);
    }

    if (debugLoggingEnabled) {
      console.log(`🔍 开始获取笔记详情: ${noteId}`);
    }

    // 获取笔记详情（带缓存）
    const noteDetail = await fetchNoteDetailWithCache(noteId);

    return createApiResponse({
      success: true,
      noteId,
      data: noteDetail.data,
      summary: `成功获取笔记《${noteDetail.data.title}》的详情信息，包含${noteDetail.data.imagesList.length}张图片，${noteDetail.data.likeNum}个点赞，${noteDetail.data.cmtNum}条评论。`
    });

  } catch (error) {
    console.error('获取笔记详情失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 根据错误类型返回不同的HTTP状态码
    let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    if (errorMessage.includes('认证失败') || errorMessage.includes('权限')) {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
    } else if (errorMessage.includes('笔记ID')) {
      statusCode = HTTP_STATUS.BAD_REQUEST;
    } else if (errorMessage.includes('请求超时')) {
      statusCode = HTTP_STATUS.REQUEST_TIMEOUT;
    }

    return createErrorResponse(
      `获取笔记详情失败: ${errorMessage}`,
      statusCode,
      '请检查笔记ID是否正确，或稍后重试'
    );
  }
}

/**
 * POST - 批量获取笔记详情
 */
export async function POST(request: NextRequest) {
  try {
    const { noteIds } = await request.json();

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return createErrorResponse('笔记ID列表不能为空', HTTP_STATUS.BAD_REQUEST);
    }

    if (noteIds.length > 10) {
      return createErrorResponse('单次最多支持10个笔记ID', HTTP_STATUS.BAD_REQUEST);
    }

    // 验证所有noteId格式
    for (const noteId of noteIds) {
      if (typeof noteId !== 'string' || !/^[a-f0-9]{24}$/i.test(noteId)) {
        return createErrorResponse(`笔记ID格式无效: ${noteId}`, HTTP_STATUS.BAD_REQUEST);
      }
    }

    if (debugLoggingEnabled) {
      console.log(`🔍 开始批量获取笔记详情: ${noteIds.length}个笔记`);
    }

    // 批量获取笔记详情
    const results = [];
    const errors = [];

    for (const noteId of noteIds) {
      try {
        const noteDetail = await fetchNoteDetailWithCache(noteId);
        results.push({
          noteId,
          success: true,
          data: noteDetail.data
        });
        
        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        errors.push({
          noteId,
          success: false,
          error: errorMessage
        });
        
        if (debugLoggingEnabled) {
          console.warn(`⚠️ 获取笔记详情失败: ${noteId} - ${errorMessage}`);
        }
      }
    }

    return createApiResponse({
      success: true,
      total: noteIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: `批量获取完成：成功${results.length}个，失败${errors.length}个`
    });

  } catch (error) {
    console.error('批量获取笔记详情失败:', error);
    
    return createErrorResponse(
      `批量获取笔记详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      '请检查请求参数，或稍后重试'
    );
  }
}
