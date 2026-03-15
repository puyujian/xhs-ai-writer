import { getGenerationPrompt } from '@/lib/prompts';
import { ERROR_MESSAGES, HTTP_STATUS, CONFIG } from '@/lib/constants';
import { aiManager } from '@/lib/ai-manager';
import { filterSensitiveContent, detectSensitiveWords } from '@/lib/sensitive-words';
import { sanitizeText } from '@/lib/utils';
import { getCacheData, saveCacheData } from '@/lib/cache-manager';
import { fetchHotPostsViaMCP } from '@/lib/mcp-client';
import { createRandomGenerationStyleConfig } from '@/lib/generation-variants';

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
  // 记录请求开始时间，用于计算剩余执行时间
  const requestStartTime = Date.now();
  const getRemainingBudget = () => CONFIG.VERCEL_SAFE_TIMEOUT - (Date.now() - requestStartTime);

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

    // 为本次请求生成“随机写作配置”，用于降低同质化（同一关键词也会不同写法）
    const styleConfig = createRandomGenerationStyleConfig();

    // 第一步：获取热门笔记数据（如果爬取功能启用）
    const scrapedContent = await fetchHotPostsWithCache(keyword);

    // 第二步：根据是否有参考数据，创建不同的提示词
    const combinedPrompt = scrapedContent
      ? createPromptWithReference(scrapedContent, user_info, keyword, styleConfig)
      : createPromptWithoutReference(user_info, keyword, styleConfig);

    if (debugLoggingEnabled) {
      console.log(`📝 使用${scrapedContent ? '有参考数据' : '无参考数据'}模式生成内容`);
      console.log(`🎛️ 写作变体: ${styleConfig.variant.id} (${styleConfig.variant.label})`);
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 内容清洗标志位
        let contentStarted = false;
        const startMarker = "## 1."; // 从第1部分开始，现在直接是标题创作
        let accumulatedContent = ""; // 累积内容，用于检测开始标记

        // 使用AI管理器的流式生成（带重试机制）
        // 传入剩余执行时间预算，确保不超过 Vercel 限制
        const remainingForAI = getRemainingBudget();
        if (debugLoggingEnabled) {
          console.log(`⏱️ AI 流式生成剩余时间预算: ${Math.round(remainingForAI / 1000)}s`);
        }

        // 生成温度做随机抖动：在不改变“基于素材”的前提下，提升表达多样性
        const genTemperature =
          CONFIG.GEN_TEMPERATURE_MIN +
          Math.random() * (CONFIG.GEN_TEMPERATURE_MAX - CONFIG.GEN_TEMPERATURE_MIN);

        if (debugLoggingEnabled) {
          console.log(`🌡️ 本次生成温度: ${genTemperature.toFixed(2)}`);
        }

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
          },
          // 传入剩余执行时间预算
          remainingForAI,
          { temperature: genTemperature }
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
