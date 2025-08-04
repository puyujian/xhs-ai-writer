import { getGenerationPrompt } from '@/lib/prompts';
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants';
import { aiManager } from '@/lib/ai-manager';
import { filterSensitiveContent, detectSensitiveWords } from '@/lib/sensitive-words';
import { sanitizeText } from '@/lib/utils';
import { checkUsageLimit, recordUsage } from '@/lib/usage-limiter';

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

// AI交互现在通过aiManager统一管理

export async function POST(request: Request) {
  try {
    const { keyword, user_info, hot_post_rules } = await request.json();

    // 添加调试日志，验证数据传递
    if (debugLoggingEnabled) {
      console.log('🔍 generate-stream 接收到的数据:');
      console.log('📝 keyword:', keyword);
      console.log('📝 user_info 长度:', user_info?.length || 0, '字符');
      console.log('📝 user_info 前100字符:', user_info?.substring(0, 100) || '空');
      console.log('📝 hot_post_rules 是否存在:', !!hot_post_rules);
    }

    if (!user_info || !keyword) {
      return new Response(ERROR_MESSAGES.MISSING_REQUIRED_PARAMS, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // 获取客户端IP地址
    const clientIP = request.headers.get('x-forwarded-for') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('cf-connecting-ip')
      || '127.0.0.1';

    // 检查使用限制
    try {
      const usageStatus = await checkUsageLimit(clientIP);
      if (!usageStatus.canUse) {
        console.log(`🚫 IP ${clientIP} 超出每日使用限制`);
        return new Response(
          JSON.stringify({ 
            error: ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED,
            usageStatus: {
              remaining: usageStatus.remaining,
              total: usageStatus.total,
              resetTime: usageStatus.resetTime
            }
          }), 
          { 
            status: HTTP_STATUS.FORBIDDEN,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (error) {
      console.error('使用限制检查失败:', error);
      return new Response(ERROR_MESSAGES.USAGE_LIMIT_ERROR, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
    }

    // 使用模块化的生成提示词
    const generatePrompt = getGenerationPrompt(
      hot_post_rules ? JSON.stringify(hot_post_rules, null, 2) : '请参考小红书热门内容的一般规律',
      user_info,
      keyword
    );

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 内容清洗标志位
        let contentStarted = false;
        const startMarker = "## 1."; // 使用更宽松的匹配，只匹配开头部分
        let accumulatedContent = ""; // 累积内容，用于检测开始标记

        // 记录本次使用
        let usageRecorded = false;

        // 使用AI管理器的流式生成（带重试机制）
        await aiManager.generateStreamWithRetry(
          generatePrompt,
          // onChunk: 处理每个内容块
          (content: string) => {
            // 在第一个内容块到达时记录使用次数
            if (!usageRecorded) {
              recordUsage(clientIP).catch(error => {
                console.error('记录使用次数失败:', error);
              });
              usageRecorded = true;
            }
            // ======================================================================
            // ========================= 核心优化点在这里 =========================
            // ======================================================================

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
    console.error('Error in generate-stream:', error);
    return new Response(ERROR_MESSAGES.SERVER_ERROR, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}
