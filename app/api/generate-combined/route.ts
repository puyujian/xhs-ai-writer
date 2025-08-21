import { getGenerationPrompt, getAnalysisPrompt } from '@/lib/prompts';
import { ERROR_MESSAGES, HTTP_STATUS, CONFIG } from '@/lib/constants';
import { aiManager } from '@/lib/ai-manager';
import { filterSensitiveContent, detectSensitiveWords } from '@/lib/sensitive-words';
import { sanitizeText } from '@/lib/utils';
import { XhsNoteItem, XhsApiResponse, ProcessedNote } from '@/lib/types';
import { generateTraceId, getEnvVar } from '@/lib/utils';
import { getCacheData, saveCacheData, getFallbackCacheData } from '@/lib/cache-manager';
import { API_ENDPOINTS, XHS_CONFIG } from '@/lib/constants';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

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
          headers: {
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
          },
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
    const { keyword, user_info } = await request.json();

    if (!user_info || !keyword) {
      return new Response(ERROR_MESSAGES.MISSING_REQUIRED_PARAMS, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // 添加调试日志，验证数据传递
    if (debugLoggingEnabled) {
      console.log('🔍 generate-combined 接收到的数据:');
      console.log('📝 keyword:', keyword);
      console.log('📝 user_info 长度:', user_info?.length || 0, '字符');
      console.log('📝 user_info 前100字符:', user_info?.substring(0, 100) || '空');
    }

    // 第一步：获取热门笔记数据
    const scrapedContent = await fetchHotPostsWithCache(keyword);

    // 简化内容处理，只处理可能破坏提示词结构的字符
    let safeContent = scrapedContent
      .replace(/```/g, '´´´')  // 转义代码块标记，防止破坏Markdown结构
      .trim(); // 移除首尾空白字符

    // 限制内容长度，防止提示词过长导致AI响应异常
    const MAX_CONTENT_LENGTH = 8000; // 约8000字符，为提示词留出足够空间
    if (safeContent.length > MAX_CONTENT_LENGTH) {
      safeContent = safeContent.substring(0, MAX_CONTENT_LENGTH) + '\n\n[内容因长度限制被截断...]';
      if (debugLoggingEnabled) {
        console.log(`⚠️ 内容过长已截断: ${scrapedContent.length} -> ${safeContent.length} 字符`);
      }
    }

    // 第二步：创建组合提示词，将分析和生成合并为一次AI调用
    const combinedPrompt = `
你是一位顶尖的小红书内容策略分析师和文案创作专家。你的任务是基于以下热门笔记数据和用户提供的素材，一次性完成分析和创作。

**第一步：分析热门笔记**
请基于以下热门笔记数据，进行深度拆解，提取爆款规律：

>>> 原始内容开始 >>>
${safeContent}
<<< 原始内容结束 <<<

**第二步：创作爆款文案**
基于以上分析结果和以下用户提供的素材，创作一篇小红书爆款笔记：

>>> 用户素材开始 >>>
${user_info}
<<< 用户素材结束 <<<

**目标关键词：** ${keyword}

**请按照以下格式输出你的分析和创作：**

## 1. 爆款规律分析
（简要总结你从热门笔记中发现的标题公式、内容结构、标签策略等关键规律）

## 2. 爆款标题创作（3个）
(必须基于用户原始素材中的具体内容创作标题，严格运用爆款规律。每个标题都必须严格遵守小红书的20字以内规定，不能超过20个字。字数计算：一个中文字/英文单词/标点=1字，emoji=2字。标题必须体现用户素材中的核心信息)

## 3. 正文内容
(严格要求：必须基于用户提供的原始素材进行创作，不得创作与素材无关的内容。
**反流水账要求：**
- 禁止使用"第一步、第二步"这样的机械表述
- 必须通过故事线串联所有内容点
- 每个段落都要有情绪起伏或转折
- 包含至少3个生活化细节和1个幽默元素
- 用场景和对话替代说明文字

**核心字数要求：**内容要丰富，力求达到600字左右，但**【绝对不能超过800字】**。结尾必须引导互动)

## 4. 关键词标签（10-15个）
(标签生成策略：
- 按核心词+长尾词+场景词+人群词组合，但仅保留与素材强相关的项
- 严格去重，避免同义词堆砌
- 确保每个标签都与内容有明确关联，避免为了凑数而添加无关标签)

## 5. AI绘画提示词
(创作一个生动的配图提示词，引导AI生成一张适合3:4竖版比例的图片)

## 6. 首评关键词引导
(写一条简短的、适合发布在自己笔记评论区的引导语，补充你在正文中故意保留的关键信息缺口)

## 7. 发布策略建议
(给出最佳的发布时间建议)

## 8. 小红书增长 Playbook
(提供一份专属的、可行动的增长核对清单)

**重要指令:**
- 绝对不要在 "## 1. 爆款规律分析" 之前添加任何文字。
- 绝对不要在 "## 8. 小红书增长 Playbook" 的内容之后添加任何文字。
- **标题字数限制：每个标题必须控制在20字以内。**
- 直接开始生成内容，从第一个##标题开始。
`;

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 内容清洗标志位
        let contentStarted = false;
        const startMarker = "## 1."; // 使用更宽松的匹配，只匹配开头部分
        let accumulatedContent = ""; // 累积内容，用于检测开始标记

        // 使用AI管理器的流式生成（带重试机制）
        await aiManager.generateStreamWithRetry(
          combinedPrompt,
          // onChunk: 处理每个内容块
          (content: string) => {
            // 第一步：净化文本，移除潜在的零宽字符等水印
            let cleanContent = sanitizeText(content);

            // 后续所有操作都使用净化后的 cleanContent
            accumulatedContent += cleanContent;
            let chunkToSend = cleanContent;

            // 如果内容尚未开始，检查当前累积内容是否包含开始标记
            if (!contentStarted) {
              const startIndex = accumulatedContent.indexOf(startMarker);
              if (startIndex !== -1) {
                // 找到了开始标记，说明正式内容开始了
                contentStarted = true;
                // 计算在当前chunk中的相对位置
                const chunkStartIndex = startIndex - (accumulatedContent.length - content.length);
                if (chunkStartIndex >= 0) {
                  // 开始标记在当前chunk中，只发送从标记开始的部分
                  chunkToSend = content.substring(chunkStartIndex);
                } else {
                  // 开始标记在之前的chunk中，发送完整的当前chunk
                  chunkToSend = content;
                }

                console.log('🎯 检测到内容开始标记，开始发送内容');
              } else {
                // 没找到开始标记，且内容未开始，忽略这个块
                console.log('⏭️ 跳过前置内容:', content.substring(0, 50) + '...');
                return;
              }
            }

            // 敏感词过滤处理
            if (contentStarted && chunkToSend) {
              // 1. 先检测敏感词
              const detection = detectSensitiveWords(chunkToSend);

              // 2. 如果检测到，只打印一次简洁的日志
              if (detection.hasSensitiveWords) {
                console.warn(`🚨 在当前数据块中检测到敏感词: [${detection.detectedWords.join(', ')}]，已自动处理。`);
                // 3. 然后进行过滤
                chunkToSend = filterSensitiveContent(chunkToSend, 'replace');
              }

              // 4. 发送处理后的内容
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunkToSend })}\n\n`));
            }
          },
          // onError: 处理错误
          (error: Error) => {
            console.error('Stream error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            controller.close();
          }
        );

        // 生成完成
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    // 安全的CORS配置
    const allowedOrigin = process.env.NODE_ENV === 'production'
      ? (process.env.PRODUCTION_URL || 'https://xhs-ai-writer.vercel.app')
      : '*';

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in generate-combined:', error);
    return new Response(ERROR_MESSAGES.SERVER_ERROR, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}