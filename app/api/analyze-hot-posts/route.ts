import { XhsNoteItem, XhsApiResponse, ProcessedNote } from '@/lib/types';
import { getAnalysisPrompt } from '@/lib/prompts';
import { ERROR_MESSAGES, CONFIG, API_ENDPOINTS, XHS_CONFIG, HTTP_STATUS } from '@/lib/constants';
import { generateTraceId, createApiResponse, createErrorResponse, getEnvVar } from '@/lib/utils';
import { getCacheData, saveCacheData, getFallbackCacheData } from '@/lib/cache-manager';
import { aiManager } from '@/lib/ai-manager';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

// AI交互现在通过aiManager统一管理

// 智能数据获取函数 - 优先使用缓存，失败时降级到备用缓存
async function fetchHotPostsWithCache(keyword: string): Promise<string> {
  const cacheEnabled = process.env.ENABLE_CACHE !== 'false';
  if (debugLoggingEnabled) {
    console.log(`🔍 开始获取关键词"${keyword}"的热门笔记数据 (缓存: ${cacheEnabled ? '启用' : '禁用'})`);
  }

  // 1. 首先尝试读取有效缓存（如果启用）
  const cachedData = await getCacheData(keyword);
  if (cachedData) {
    if (debugLoggingEnabled) {
      console.log(`✅ 使用缓存数据: ${keyword} (${cachedData.processedNotes.length}条笔记)`);
    }
    return cachedData.data;
  }

  // 2. 尝试爬取新数据
  try {
    const scrapedData = await scrapeHotPosts(keyword);
    if (debugLoggingEnabled) {
      console.log(`✅ 爬取成功: ${keyword}`);
    }
    return scrapedData;
  } catch (scrapeError) {
    console.warn(`⚠️ 爬取失败: ${scrapeError instanceof Error ? scrapeError.message : '未知错误'}`);

    // 3. 爬取失败，尝试使用同分类的备用缓存
    const fallbackData = await getFallbackCacheData(keyword);
    if (fallbackData) {
      if (debugLoggingEnabled) {
        console.log(`🔄 使用备用缓存: ${fallbackData.keyword} -> ${keyword}`);
      }
      return fallbackData.data;
    }

    // 4. 所有方案都失败，抛出错误
    throw new Error(`${ERROR_MESSAGES.FETCH_HOT_POSTS_ERROR}: 无法获取数据且无可用缓存`);
  }
}

// 实际的爬取函数
async function scrapeHotPosts(keyword: string): Promise<string> {
  const cookie = getEnvVar('XHS_COOKIE');
  if (!cookie) {
    throw new Error(ERROR_MESSAGES.XHS_COOKIE_NOT_CONFIGURED);
  }

  try {
    // 使用正确的小红书API端点
    const apiUrl = API_ENDPOINTS.XHS_SEARCH;

    // 分页获取40篇笔记的函数
    const fetchNotesPage = async (page: number) => {
      const requestData = {
        keyword: keyword,
        page: page,
        page_size: 20,
        search_id: generateTraceId(21),
        sort: "popularity_descending", // 热门排序
        note_type: 0, // 不限类型
        ext_flags: [],
        filters: [
          {
            tags: ["popularity_descending"],
            type: "sort_type"
          },
          {
            tags: ["不限"],
            type: "filter_note_type"
          },
          {
            tags: ["不限"],
            type: "filter_note_time"
          },
          {
            tags: ["不限"],
            type: "filter_note_range"
          },
          {
            tags: ["不限"],
            type: "filter_pos_distance"
          }
        ],
        geo: "",
        image_formats: ["jpg", "webp", "avif"]
      };

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // 检查响应状态（允许4xx和5xx状态码通过，与axios的validateStatus行为一致）
        if (response.status >= 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 解析JSON响应
        const data = await response.json();

        // 返回与axios兼容的响应格式
        return {
          status: response.status,
          data: data
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('请求超时');
        }
        throw error;
      }
    };

    // 设置正确的请求头 - 参考专业项目
    const headers = {
      'authority': 'edith.xiaohongshu.com',
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/json;charset=UTF-8',
      'origin': 'https://www.xiaohongshu.com',
      'pragma': 'no-cache',
      'referer': 'https://www.xiaohongshu.com/',
      'sec-ch-ua': '"Not A(Brand)";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': XHS_CONFIG.USER_AGENT,
      'x-b3-traceid': generateTraceId(),
      'cookie': cookie
    };

    // 分页获取笔记
    let allNotes: XhsNoteItem[] = [];
    let currentPage = 1;
    const targetCount = CONFIG.TARGET_NOTES_COUNT;

    while (allNotes.length < targetCount && currentPage <= CONFIG.MAX_PAGES) { // 最多获取指定页数，避免无限循环
      const response = await fetchNotesPage(currentPage);

      // 检查响应状态
      if (response.status !== HTTP_STATUS.OK) {
        throw new Error(`${ERROR_MESSAGES.XHS_API_ERROR}: ${response.status}`);
      }

      const data: XhsApiResponse = response.data;

      // 添加详细的调试信息
      if (debugLoggingEnabled) {
        console.log(`📊 第${currentPage}页API响应状态:`, response.status);
        console.log(`📊 API响应成功标志:`, data.success);
        console.log(`📊 API响应消息:`, data.msg);
        console.log(`📊 返回的items数量:`, data.data?.items?.length || 0);
      }

      // 检查API响应结构
      if (!data.success) {
        throw new Error(`小红书API错误: ${data.msg || '未知错误'}`);
      }

      if (!data.data || !data.data.items) {
        throw new Error(ERROR_MESSAGES.XHS_DATA_STRUCTURE_ERROR);
      }

      // 过滤出笔记类型的内容
      const pageNotes = data.data.items.filter((item: XhsNoteItem) => item.model_type === "note");

      // 调试第一个笔记的数据结构
      if (debugLoggingEnabled && data.data.items.length > 0 && currentPage === 1) {
        const firstItem = data.data.items[0];
        console.log(`🔍 第一个item的完整数据结构:`, JSON.stringify(firstItem, null, 2));

        // 检查是否有note_card字段
        if (firstItem.note_card) {
          console.log(`🔍 note_card结构:`, {
            display_title: firstItem.note_card.display_title,
            desc: firstItem.note_card.desc,
            interact_info: firstItem.note_card.interact_info,
            user: firstItem.note_card.user
          });
        }
      }

      if (pageNotes.length === 0) {
        break; // 如果当前页没有笔记，停止获取
      }

      allNotes = allNotes.concat(pageNotes);
      currentPage++;

      // 如果API表示没有更多数据，停止获取
      if (!data.data.has_more) {
        break;
      }
    }

    if (allNotes.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_NOTES_FOUND);
    }

    // 取前40篇笔记进行分析 - 根据实际API结构解析
    const posts: ProcessedNote[] = [];

    for (const item of allNotes.slice(0, targetCount)) {
      // 优先使用note_card中的数据，如果没有则使用直接字段
      const noteCard = item.note_card;
      const title = noteCard?.display_title || noteCard?.title || item.display_title || item.title || '无标题';
      const desc = noteCard?.desc || item.desc || '无描述';
      const interactInfo = noteCard?.interact_info || item.interact_info || {
        liked_count: 0,
        comment_count: 0,
        collected_count: 0
      };
      const userInfo = noteCard?.user || item.user || { nickname: '未知用户' };

      posts.push({
        title,
        desc,
        interact_info: {
          liked_count: interactInfo.liked_count || 0,
          comment_count: interactInfo.comment_count || 0,
          collected_count: interactInfo.collected_count || 0
        },
        note_id: item.id || item.note_id || '',
        user_info: {
          nickname: userInfo.nickname || '未知用户'
        }
      });
    }

    // 格式化为字符串
    let result = `关键词"${keyword}"的热门笔记分析（目标${targetCount}篇，实际获取${posts.length}篇）：\n\n`;
    posts.forEach((post: ProcessedNote, index: number) => {
      result += `${index + 1}. 标题：${post.title}\n`;
      result += `   描述：${post.desc.substring(0, 100)}${post.desc.length > 100 ? '...' : ''}\n`;
      result += `   互动：点赞${post.interact_info.liked_count} 评论${post.interact_info.comment_count} 收藏${post.interact_info.collected_count}\n`;
      result += `   作者：${post.user_info.nickname}\n\n`;
    });

    // 保存到缓存
    try {
      await saveCacheData(keyword, result, posts, 'scraped');
    } catch (cacheError) {
      console.warn('保存缓存失败:', cacheError);
      // 缓存失败不影响主流程
    }

    return result;

  } catch (error) {
    console.error('Error fetching hot posts:', error);
    // 抓取失败直接抛出错误，不使用模拟数据
    throw new Error(`${ERROR_MESSAGES.FETCH_HOT_POSTS_ERROR}: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}



export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return createErrorResponse('Keyword is required', HTTP_STATUS.BAD_REQUEST);
    }



    // 智能获取热门笔记数据（缓存优先）
    const scrapedContent = await fetchHotPostsWithCache(keyword);

    // 使用模块化的分析提示词
    const analysisPrompt = getAnalysisPrompt(scrapedContent);

    // 使用AI管理器进行分析（带重试机制）
    const analysisResult = await aiManager.analyzeWithRetry(
      analysisPrompt,
      ['titleFormulas', 'contentStructure', 'tagStrategy', 'coverStyleAnalysis']
    );

    return createApiResponse({
      success: true,
      keyword,
      // 直接返回完整的分析结果
      analysis: analysisResult,
      summary: `基于${keyword}热门笔记的深度分析，提取了${analysisResult.titleFormulas?.suggestedFormulas?.length || 0}个标题公式、${analysisResult.contentStructure?.openingHooks?.length || 0}种开头方式、${analysisResult.coverStyleAnalysis?.commonStyles?.length || 0}种封面风格等实用策略。`,
      raw_data: scrapedContent
    });

  } catch (error) {
    console.error('Error in analyze-hot-posts:', error);
    return createErrorResponse(
      'Failed to analyze hot posts',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
