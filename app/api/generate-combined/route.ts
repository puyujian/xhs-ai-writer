import { getGenerationPrompt } from '@/lib/prompts';
import { ERROR_MESSAGES, HTTP_STATUS, CONFIG } from '@/lib/constants';
import { aiManager } from '@/lib/ai-manager';
import { filterSensitiveContent, detectSensitiveWords } from '@/lib/sensitive-words';
import { sanitizeText } from '@/lib/utils';
import { getCacheData, saveCacheData } from '@/lib/cache-manager';
import { fetchHotPostsViaMCP } from '@/lib/mcp-client';
import { createRandomGenerationStyleConfig } from '@/lib/generation-variants';
import { GenerationContentStart } from '@/lib/generation-stream';
import { BusinessError } from '@/lib/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 180;

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

// 智能数据获取函数 - 优先使用缓存，失败时降级到备用缓存
async function fetchHotPostsWithCache(keyword: string): Promise<string | null> {
  const scrapingEnabled = process.env.ENABLE_SCRAPING !== 'false';

  // 如果爬取功能被禁用，直接返回 null，不使用任何缓存
  if (!scrapingEnabled) {
    if (debugLoggingEnabled) {
      console.log(`⏭️ 爬取功能已禁用（ENABLE_SCRAPING=false），跳过所有数据获取`);
    }
    return null;
  }

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

    // 爬取失败：直接降级到无数据模式继续生成（避免同分类fallback导致的同质化/错配）
    console.warn(`⚠️ 所有数据获取方式都失败，降级到无数据模式继续生成`);
    return null;
  }
}

// 实际的数据获取函数（通过 MCP 代理获取）
async function scrapeHotPosts(keyword: string): Promise<string> {
  try {
    const { summary, notes } = await fetchHotPostsViaMCP(keyword);

    // 保存到缓存（如果启用）
    try {
      await saveCacheData(keyword, summary, notes, 'scraped');
    } catch (cacheError) {
      console.warn('保存缓存失败:', cacheError);
    }

    return summary;
  } catch (error) {
    console.error('通过MCP获取热门笔记失败:', error);
    throw new Error(`${ERROR_MESSAGES.FETCH_HOT_POSTS_ERROR}: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 创建带参考数据的提示词（当有小红书热门笔记数据时）
function createPromptWithReference(
  scrapedContent: string,
  user_info: string,
  keyword: string,
  styleConfig: ReturnType<typeof createRandomGenerationStyleConfig>
): string {
  // 简化内容处理，只处理可能破坏提示词结构的字符
  let safeContent = scrapedContent
    .replace(/```/g, '´´´')  // 转义代码块标记，防止破坏Markdown结构
    .trim(); // 移除首尾空白字符

  // 限制内容长度，防止提示词过长导致AI响应异常
  if (safeContent.length > CONFIG.MAX_CONTENT_LENGTH) {
    safeContent = safeContent.substring(0, CONFIG.MAX_CONTENT_LENGTH) + '\n\n[内容因长度限制被截断...]';
    if (debugLoggingEnabled) {
      console.log(`⚠️ 内容过长已截断: ${scrapedContent.length} -> ${safeContent.length} 字符`);
    }
  }

  // 构建简化的热门笔记规律说明（用于内化）
  const hotPostRules = `
**【小红书热门笔记数据 - 供你内化分析】**

以下是小红书上关于"${keyword}"的热门笔记数据：

${safeContent}

**内化要求：**
请默默阅读并提取爆款规律（标题公式、内容结构、标签策略等），将其转化为你的创作直觉，但绝对不要在输出中体现任何分析过程。
  `;

  // 使用统一的生成提示词函数，确保策略完全一致
  return getGenerationPrompt(hotPostRules, user_info, keyword, styleConfig);
}

// 创建不带参考数据的提示词（当爬取功能被禁用时）
function createPromptWithoutReference(
  user_info: string,
  keyword: string,
  styleConfig: ReturnType<typeof createRandomGenerationStyleConfig>
): string {
  // 构建一个说明性的"规律"部分，告知 AI 没有参考数据
  const hotPostRules = `
**【创作说明】**

用户没有提供小红书热门笔记的参考数据。请基于你对小红书爆款内容的理解和经验，直接为用户创作内容。

**注意：**
- 没有具体的热门笔记数据可供分析
- 请依靠你对小红书平台特点和爆款规律的内在理解进行创作
- 仍需严格遵守所有降低 AIGC 检测率的策略
  `;

  // 使用完全相同的生成提示词函数，确保 AI 处理策略一致
  return getGenerationPrompt(hotPostRules, user_info, keyword, styleConfig);
}

export async function POST(request: Request) {
  const requestStartTime = Date.now();
  const getRemainingBudget = () => CONFIG.VERCEL_SAFE_TIMEOUT - (Date.now() - requestStartTime);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return new Response('请求体必须是有效的JSON', { status: HTTP_STATUS.BAD_REQUEST });
  }
  const { keyword, user_info } = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (typeof keyword !== 'string' || typeof user_info !== 'string' || !keyword.trim() || !user_info.trim()) {
    return new Response('关键词和素材必须是非空文本', { status: HTTP_STATUS.BAD_REQUEST });
  }
  if (keyword.length > 200 || user_info.length > 20000) {
    return new Response('关键词不能超过200字，素材不能超过20000字', { status: HTTP_STATUS.BAD_REQUEST });
  }

  try {
    const styleConfig = createRandomGenerationStyleConfig();
    const scrapedContent = await fetchHotPostsWithCache(keyword.trim());
    const combinedPrompt = scrapedContent
      ? createPromptWithReference(scrapedContent, user_info.trim(), keyword.trim(), styleConfig)
      : createPromptWithoutReference(user_info.trim(), keyword.trim(), styleConfig);

    const encoder = new TextEncoder();
    const generationController = new AbortController();
    let streamClosed = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const abortGeneration = () => generationController.abort();
    const cleanup = () => {
      clearInterval(heartbeat);
      clearTimeout(deadlineTimer);
      request.signal.removeEventListener('abort', abortGeneration);
      generationController.abort();
    };
    request.signal.addEventListener('abort', abortGeneration, { once: true });
    if (request.signal.aborted) abortGeneration();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const closeStream = () => {
          if (streamClosed) return;
          streamClosed = true;
          cleanup();
          controller.close();
        };
        const enqueueSse = (payload: string) => {
          if (streamClosed || generationController.signal.aborted) return;
          try {
            controller.enqueue(encoder.encode(payload));
          } catch {
            // 浏览器已断开，ReadableStream可能已经关闭，不再写入或重试。
            streamClosed = true;
            cleanup();
          }
        };
        const fail = (error: Error) => {
          if (streamClosed || generationController.signal.aborted) return;
          console.error('Stream error:', error);
          const message = error instanceof BusinessError
            ? `${error.userMessage}。${error.suggestion}`
            : '内容生成中断，请稍后重试';
          enqueueSse(`data: ${JSON.stringify({ error: message })}\n\n`);
          closeStream();
        };
        const opening = new GenerationContentStart();
        let sentContent = false;
        const sendContent = (content: string) => {
          if (!content) return;
          const detection = detectSensitiveWords(content);
          const filtered = detection.hasSensitiveWords ? filterSensitiveContent(content, 'replace') : content;
          if (filtered.trim()) sentContent = true;
          enqueueSse(`data: ${JSON.stringify({ content: filtered })}\n\n`);
        };

        try {
          // 注释心跳不会污染正文，避免首段思考期间连接因空闲而断开。
          heartbeat = setInterval(() => enqueueSse(': keep-alive\n\n'), 10000);
          deadlineTimer = setTimeout(() => fail(new Error('生成已到达安全执行时间上限')), Math.max(1, getRemainingBudget()));
          await aiManager.generateStreamWithRetry(
            combinedPrompt,
            content => sendContent(opening.push(sanitizeText(content))),
            fail,
            getRemainingBudget(),
            {
              temperature: CONFIG.GEN_TEMPERATURE_MIN + Math.random() * (CONFIG.GEN_TEMPERATURE_MAX - CONFIG.GEN_TEMPERATURE_MIN),
              signal: generationController.signal,
            }
          );
          if (!streamClosed && !generationController.signal.aborted) {
            sendContent(opening.finish());
            if (!sentContent) {
              fail(new Error('AI没有返回可显示的内容'));
            } else {
              enqueueSse('data: [DONE]\n\n');
            }
          }
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        } finally {
          if (!streamClosed) closeStream();
          cleanup();
        }
      },
      cancel() {
        streamClosed = true;
        cleanup();
      },
    });

    const allowedOrigin = process.env.NODE_ENV === 'production'
      ? (process.env.PRODUCTION_URL || 'https://xhs-ai-writer.vercel.app')
      : '*';
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
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
