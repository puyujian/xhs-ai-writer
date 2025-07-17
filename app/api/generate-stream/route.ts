import { getGenerationPrompt } from '@/lib/prompts';
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants';
import { aiManager } from '@/lib/ai-manager';
import { filterSensitiveContent, detectSensitiveWords } from '@/lib/sensitive-words';

// AI交互现在通过aiManager统一管理

export async function POST(request: Request) {
  try {
    const { keyword, user_info, hot_post_rules } = await request.json();

    if (!user_info || !keyword) {
      return new Response(ERROR_MESSAGES.MISSING_REQUIRED_PARAMS, { status: HTTP_STATUS.BAD_REQUEST });
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
        const startMarker = "## 1. 爆款标题创作";
        let accumulatedContent = ""; // 累积内容，用于检测开始标记

        // 使用AI管理器的流式生成（带重试机制）
        await aiManager.generateStreamWithRetry(
          generatePrompt,
          // onChunk: 处理每个内容块
          (content: string) => {
            // 累积内容用于检测
            accumulatedContent += content;

            let chunkToSend = content;

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
              // 检测敏感词
              const detection = detectSensitiveWords(chunkToSend);
              if (detection.hasSensitiveWords) {
                console.warn('🚨 检测到敏感词:', detection.detectedWords);
                // 过滤敏感词
                chunkToSend = filterSensitiveContent(chunkToSend, 'replace');
                console.log('✅ 敏感词已处理');
              }

              // 发送处理后的内容
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in generate-stream:', error);
    return new Response(ERROR_MESSAGES.SERVER_ERROR, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}
