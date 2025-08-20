import { NextRequest } from 'next/server';
import { XhsCommentsResponse } from '@/lib/types';
import { ERROR_MESSAGES, API_ENDPOINTS, XHS_CONFIG, HTTP_STATUS } from '@/lib/constants';
import { createApiResponse, createErrorResponse, generateTraceId } from '@/lib/utils';
import { getCacheData, saveCacheData } from '@/lib/cache-manager';
import { cookieManager } from '@/lib/cookie-manager';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * 获取小红书笔记评论
 * @param noteId 笔记ID
 * @param pageSize 每页数量
 * @param pageIndex 页码索引
 * @returns 评论数据
 */
async function fetchComments(
  noteId: string,
  pageSize: number = 20,
  pageIndex: number = 0
): Promise<XhsCommentsResponse> {
  // 获取可用的cookie
  const cookie = await cookieManager.getNextValidCookie();
  if (!cookie) {
    throw new Error(ERROR_MESSAGES.XHS_NO_VALID_COOKIES);
  }

  try {
    // 构建API URL，替换noteId占位符
    const apiUrl = API_ENDPOINTS.XHS_COMMENTS.replace('{noteId}', noteId) +
                   `?pageSize=${pageSize}&pageIndex=${pageIndex}`;

    if (debugLoggingEnabled) {
      console.log(`🔍 获取评论: ${noteId}`);
      console.log(`📡 API URL: ${apiUrl}`);
      console.log(`📊 请求参数: pageSize=${pageSize}, pageIndex=${pageIndex}`);
    }

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'authority': 'pgy.xiaohongshu.com',
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'authorization': '',
          'cookie': cookie,
          'referer': 'https://pgy.xiaohongshu.com/solar/pre-trade/note/kol',
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': XHS_CONFIG.USER_AGENT,
          'x-b3-traceid': generateTraceId(16),
          'x-s': '1ldvO2MCOgVkslFl0gTLsYMCsgvLsB5LO2sbZYsGslT3',
          'x-s-common': '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',
          'x-t': Date.now().toString()
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

      const data: XhsCommentsResponse = await response.json();

      if (debugLoggingEnabled) {
        console.log(`📊 API响应成功: ${data.success}`);
        console.log(`📊 API响应消息: ${data.msg}`);
        console.log(`📊 评论数量: ${data.data?.length || 0}`);
      }

      // 检查API响应结构
      if (!data.success) {
        // 如果是认证相关错误，标记cookie为无效
        if (data.msg?.includes('登录') || data.msg?.includes('权限')) {
          cookieManager.markCookieAsInvalid(cookie);
        }
        throw new Error(`小红书API错误: ${data.msg || '未知错误'}`);
      }

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('评论数据结构异常');
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
      console.error(`❌ 获取评论失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    throw error;
  }
}

/**
 * 带缓存的评论获取
 * @param noteId 笔记ID
 * @param pageSize 每页数量
 * @param pageIndex 页码索引
 * @returns 评论数据
 */
async function fetchCommentsWithCache(
  noteId: string,
  pageSize: number = 20,
  pageIndex: number = 0
): Promise<XhsCommentsResponse> {
  const cacheKey = `comments_${noteId}_${pageSize}_${pageIndex}`;
  const cacheEnabled = process.env.ENABLE_CACHE !== 'false';

  if (debugLoggingEnabled) {
    console.log(`🔍 获取评论: ${noteId} (缓存: ${cacheEnabled ? '启用' : '禁用'})`);
  }

  // 1. 尝试读取缓存（2小时有效期，评论更新较频繁）
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
    const comments = await fetchComments(noteId, pageSize, pageIndex);

    // 3. 保存到缓存
    if (cacheEnabled) {
      try {
        await saveCacheData(cacheKey, JSON.stringify(comments), [], 'scraped');
        if (debugLoggingEnabled) {
          console.log(`💾 评论已缓存: ${noteId}`);
        }
      } catch (cacheError) {
        console.warn('保存缓存失败:', cacheError);
        // 缓存失败不影响主流程
      }
    }

    return comments;

  } catch (error) {
    if (debugLoggingEnabled) {
      console.error(`❌ 获取评论失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    throw error;
  }
}

/**
 * GET - 获取小红书笔记评论
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const noteId = searchParams.get('noteId');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const pageIndex = parseInt(searchParams.get('pageIndex') || '0');

    if (!noteId) {
      return createErrorResponse('笔记ID不能为空', HTTP_STATUS.BAD_REQUEST);
    }

    // 验证noteId格式
    if (!/^[a-f0-9]{24}$/i.test(noteId)) {
      return createErrorResponse('笔记ID格式无效', HTTP_STATUS.BAD_REQUEST);
    }

    // 验证分页参数
    if (pageSize < 1 || pageSize > 100) {
      return createErrorResponse('每页数量必须在1-100之间', HTTP_STATUS.BAD_REQUEST);
    }

    if (pageIndex < 0) {
      return createErrorResponse('页码索引不能小于0', HTTP_STATUS.BAD_REQUEST);
    }

    if (debugLoggingEnabled) {
      console.log(`🔍 开始获取评论: ${noteId} (第${pageIndex + 1}页，每页${pageSize}条)`);
    }

    // 获取评论（带缓存）
    const commentsData = await fetchCommentsWithCache(noteId, pageSize, pageIndex);

    // 处理评论数据，提取用户信息
    const processedComments = commentsData.data.map(item => {
      const comment = item.comment;
      const userInfo = item.userMap[comment.userIdStr];

      return {
        id: comment.idStr,
        content: comment.content,
        createTime: comment.createTime,
        likeCount: comment.likeCount,
        subCommentCount: comment.subCommentCount,
        user: {
          userId: userInfo?.userId || comment.userIdStr,
          nickname: userInfo?.userNickName || '未知用户',
          avatar: userInfo?.imageUrl || '',
          gender: userInfo?.gender || 'UNKNOWN'
        },
        subComments: item.l1L2Comments.map(subComment => ({
          id: subComment.idStr,
          content: subComment.content,
          createTime: subComment.createTime,
          likeCount: subComment.likeCount,
          user: {
            userId: item.userMap[subComment.userIdStr]?.userId || subComment.userIdStr,
            nickname: item.userMap[subComment.userIdStr]?.userNickName || '未知用户',
            avatar: item.userMap[subComment.userIdStr]?.imageUrl || '',
            gender: item.userMap[subComment.userIdStr]?.gender || 'UNKNOWN'
          }
        }))
      };
    });

    return createApiResponse({
      success: true,
      noteId,
      pageSize,
      pageIndex,
      total: processedComments.length,
      comments: processedComments,
      summary: `成功获取第${pageIndex + 1}页评论，共${processedComments.length}条评论。`
    });

  } catch (error) {
    console.error('获取评论失败:', error);

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
      `获取评论失败: ${errorMessage}`,
      statusCode,
      '请检查笔记ID是否正确，或稍后重试'
    );
  }
}

/**
 * POST - 批量获取多个笔记的评论
 */
export async function POST(request: NextRequest) {
  try {
    const { noteIds, pageSize = 20, pageIndex = 0 } = await request.json();

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return createErrorResponse('笔记ID列表不能为空', HTTP_STATUS.BAD_REQUEST);
    }

    if (noteIds.length > 5) {
      return createErrorResponse('单次最多支持5个笔记ID', HTTP_STATUS.BAD_REQUEST);
    }

    // 验证所有noteId格式
    for (const noteId of noteIds) {
      if (typeof noteId !== 'string' || !/^[a-f0-9]{24}$/i.test(noteId)) {
        return createErrorResponse(`笔记ID格式无效: ${noteId}`, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // 验证分页参数
    if (pageSize < 1 || pageSize > 100) {
      return createErrorResponse('每页数量必须在1-100之间', HTTP_STATUS.BAD_REQUEST);
    }

    if (pageIndex < 0) {
      return createErrorResponse('页码索引不能小于0', HTTP_STATUS.BAD_REQUEST);
    }

    if (debugLoggingEnabled) {
      console.log(`🔍 开始批量获取评论: ${noteIds.length}个笔记`);
    }

    // 批量获取评论
    const results = [];
    const errors = [];

    for (const noteId of noteIds) {
      try {
        const commentsData = await fetchCommentsWithCache(noteId, pageSize, pageIndex);

        // 处理评论数据
        const processedComments = commentsData.data.map(item => {
          const comment = item.comment;
          const userInfo = item.userMap[comment.userIdStr];

          return {
            id: comment.idStr,
            content: comment.content,
            createTime: comment.createTime,
            likeCount: comment.likeCount,
            subCommentCount: comment.subCommentCount,
            user: {
              userId: userInfo?.userId || comment.userIdStr,
              nickname: userInfo?.userNickName || '未知用户',
              avatar: userInfo?.imageUrl || '',
              gender: userInfo?.gender || 'UNKNOWN'
            },
            subComments: item.l1L2Comments.map(subComment => ({
              id: subComment.idStr,
              content: subComment.content,
              createTime: subComment.createTime,
              likeCount: subComment.likeCount,
              user: {
                userId: item.userMap[subComment.userIdStr]?.userId || subComment.userIdStr,
                nickname: item.userMap[subComment.userIdStr]?.userNickName || '未知用户',
                avatar: item.userMap[subComment.userIdStr]?.imageUrl || '',
                gender: item.userMap[subComment.userIdStr]?.gender || 'UNKNOWN'
              }
            }))
          };
        });

        results.push({
          noteId,
          success: true,
          pageSize,
          pageIndex,
          total: processedComments.length,
          comments: processedComments
        });

        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        errors.push({
          noteId,
          success: false,
          error: errorMessage
        });

        if (debugLoggingEnabled) {
          console.warn(`⚠️ 获取评论失败: ${noteId} - ${errorMessage}`);
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
    console.error('批量获取评论失败:', error);

    return createErrorResponse(
      `批量获取评论失败: ${error instanceof Error ? error.message : '未知错误'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      '请检查请求参数，或稍后重试'
    );
  }
}
