import { NextRequest } from 'next/server';
import { getEnhancedAnalysisPrompt, getEnhancedGenerationPrompt } from '@/lib/enhanced-prompts';
import { dataStorage } from '@/lib/data-storage';
import { businessIntelligence } from '@/lib/business-intelligence';
import { aiManager } from '@/lib/ai-manager';
import { historyManager } from '@/lib/history-manager';
import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { enhancedCacheManager } from '@/lib/enhanced-cache-manager';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * POST - 增强版文案生成API
 * 集成数据分析洞察，提供更精准的文案生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      keyword, 
      user_info, 
      word_limit = 600,
      enable_data_insights = true,
      reference_note_ids = [],
      competitor_analysis = false,
      trend_analysis = false,
      personalized_recommendations = false,
      user_profile = null
    } = body;

    if (!user_info || !keyword) {
      return createErrorResponse(ERROR_MESSAGES.MISSING_REQUIRED_PARAMS, HTTP_STATUS.BAD_REQUEST);
    }

    if (debugLoggingEnabled) {
      console.log(`🚀 增强版文案生成: ${keyword}, 数据洞察: ${enable_data_insights}`);
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 阶段1：基础热门笔记分析
          controller.enqueue(encoder.encode(`data: {"stage": "analysis", "message": "正在分析热门笔记..."}\n\n`));
          
          let hotPostRules = '';
          let noteAnalyses: any[] = [];
          let commentAnalyses: any[] = [];
          
          // 获取基础热门笔记数据
          const cacheKey = `hot_posts_${keyword}`;
          const cachedData = await enhancedCacheManager.getCacheData(cacheKey, 6 * 60 * 60 * 1000);
          
          if (cachedData) {
            hotPostRules = cachedData.analysis || '';
            if (debugLoggingEnabled) {
              console.log('✅ 使用缓存的热门笔记分析');
            }
          } else {
            // 这里应该调用原有的热门笔记分析API
            hotPostRules = `基于${keyword}的热门笔记分析结果...`; // 简化处理
          }

          // 阶段2：数据洞察增强（如果启用）
          if (enable_data_insights) {
            controller.enqueue(encoder.encode(`data: {"stage": "insights", "message": "正在获取数据洞察..."}\n\n`));
            
            // 获取参考笔记的详细分析
            if (reference_note_ids.length > 0) {
              for (const noteId of reference_note_ids.slice(0, 5)) {
                const analysisData = await dataStorage.getAnalysis(noteId);
                if (analysisData) {
                  noteAnalyses.push(analysisData.analysis);
                  if (analysisData.commentAnalysis) {
                    commentAnalyses.push(analysisData.commentAnalysis);
                  }
                }
              }
            }

            // 使用增强版分析提示词
            if (noteAnalyses.length > 0) {
              controller.enqueue(encoder.encode(`data: {"stage": "enhanced_analysis", "message": "正在进行深度数据分析..."}\n\n`));
              
              const enhancedPrompt = getEnhancedAnalysisPrompt(
                hotPostRules,
                noteAnalyses,
                commentAnalyses
              );
              
              const enhancedAnalysis = await aiManager.analyzeWithRetry(enhancedPrompt, [
                'titleFormulas', 'contentStructure', 'tagStrategy', 'coverStyleAnalysis'
              ]);
              
              // 更新热门笔记规律
              hotPostRules = JSON.stringify(enhancedAnalysis);
            }
          }

          // 阶段3：竞品分析（如果启用）
          let competitorInsights = null;
          if (competitor_analysis) {
            controller.enqueue(encoder.encode(`data: {"stage": "competitor", "message": "正在分析竞品..."}\n\n`));
            
            try {
              competitorInsights = await businessIntelligence.analyzeCompetitors(keyword, undefined, 10);
            } catch (error) {
              console.warn('竞品分析失败:', error);
            }
          }

          // 阶段4：趋势分析（如果启用）
          let trendInsights = null;
          if (trend_analysis) {
            controller.enqueue(encoder.encode(`data: {"stage": "trend", "message": "正在分析趋势..."}\n\n`));
            
            try {
              trendInsights = await businessIntelligence.predictTrends(undefined, 30);
            } catch (error) {
              console.warn('趋势分析失败:', error);
            }
          }

          // 阶段5：个性化推荐（如果启用）
          let personalizedInsights = null;
          if (personalized_recommendations && user_profile) {
            controller.enqueue(encoder.encode(`data: {"stage": "personalization", "message": "正在生成个性化建议..."}\n\n`));
            
            try {
              personalizedInsights = await businessIntelligence.generatePersonalizedRecommendations(
                user_profile,
                competitorInsights,
                trendInsights
              );
            } catch (error) {
              console.warn('个性化推荐失败:', error);
            }
          }

          // 阶段6：增强版文案生成
          controller.enqueue(encoder.encode(`data: {"stage": "generation", "message": "正在生成增强版文案..."}\n\n`));
          
          // 构建综合洞察
          const comprehensiveInsights = {
            performanceSummary: competitorInsights ? {
              overallRating: 'good',
              keySuccessFactors: competitorInsights.competitorStrengths.slice(0, 3),
              improvementAreas: competitorInsights.marketGaps.slice(0, 2),
              benchmarkComparison: `平均质量评分: ${competitorInsights.benchmarkData.avgScore.toFixed(1)}/10`
            } : null,
            audienceInsights: personalizedInsights ? {
              primaryAudience: user_profile?.targetAudience || '目标用户',
              audienceNeeds: personalizedInsights.contentSuggestions.slice(0, 3).map((s: any) => s.targetAudience),
              contentPreferences: personalizedInsights.optimizationTips.slice(0, 3).map((t: any) => t.suggestion),
              engagementPatterns: ['高质量互动', '深度讨论', '实用性关注']
            } : null,
            optimizationSuggestions: personalizedInsights ? {
              titleOptimization: personalizedInsights.optimizationTips
                .filter((t: any) => t.area === 'title')
                .map((t: any) => t.suggestion),
              contentOptimization: personalizedInsights.optimizationTips
                .filter((t: any) => t.area === 'content')
                .map((t: any) => t.suggestion),
              engagementOptimization: personalizedInsights.optimizationTips
                .filter((t: any) => t.area === 'engagement')
                .map((t: any) => t.suggestion),
              timingOptimization: '建议在用户活跃时段发布'
            } : null,
            creativeInspiration: trendInsights ? {
              similarTopics: trendInsights.emergingTopics.slice(0, 3),
              trendingElements: trendInsights.contentFormatTrends.slice(0, 3),
              contentAngles: trendInsights.recommendedContentTypes.slice(0, 3),
              formatSuggestions: ['图文结合', '视频展示', '互动问答']
            } : null
          };

          // 使用增强版生成提示词
          const enhancedGenerationPrompt = getEnhancedGenerationPrompt(
            hotPostRules,
            user_info,
            keyword,
            word_limit,
            comprehensiveInsights,
            noteAnalyses.slice(0, 3) // 取前3个高质量笔记作为参考
          );

          // 流式生成文案
          let generatedContent = '';
          await aiManager.generateStreamWithRetry(
            enhancedGenerationPrompt,
            (chunk: string) => {
              generatedContent += chunk;
              controller.enqueue(encoder.encode(`data: {"stage": "streaming", "content": ${JSON.stringify(chunk)}}\n\n`));
            },
            (error: Error) => {
              controller.enqueue(encoder.encode(`data: {"stage": "error", "error": ${JSON.stringify(error.message)}}\n\n`));
            }
          );

          // 阶段7：保存历史记录
          controller.enqueue(encoder.encode(`data: {"stage": "saving", "message": "正在保存生成结果..."}\n\n`));
          
          try {
            // 解析生成的内容
            const parsedContent = this.parseGeneratedContent(generatedContent);
            
            // 保存到历史记录
            const historyItem = {
              keyword,
              userInfo: user_info,
              generatedTitles: parsedContent.titles || '',
              generatedBody: parsedContent.body || '',
              generatedTags: parsedContent.tags || [],
              generatedImagePrompt: parsedContent.imagePrompt || '',
              generatedSelfComment: parsedContent.selfComment || '',
              generatedStrategy: parsedContent.strategy || '',
              generatedPlaybook: parsedContent.playbook || '',
              // 新增：数据洞察信息
              dataInsights: {
                enabledInsights: enable_data_insights,
                referenceNotes: reference_note_ids.length,
                competitorAnalysis: !!competitorInsights,
                trendAnalysis: !!trendInsights,
                personalizedRecommendations: !!personalizedInsights,
                comprehensiveInsights
              }
            };

            historyManager.saveHistory(historyItem);
          } catch (error) {
            console.warn('保存历史记录失败:', error);
          }

          // 完成
          controller.enqueue(encoder.encode(`data: {"stage": "complete", "message": "增强版文案生成完成！", "insights_summary": ${JSON.stringify({
            data_insights_enabled: enable_data_insights,
            reference_notes_analyzed: noteAnalyses.length,
            competitor_analysis_enabled: !!competitorInsights,
            trend_analysis_enabled: !!trendInsights,
            personalized_recommendations_enabled: !!personalizedInsights
          })}}\n\n`));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('增强版文案生成失败:', error);
          controller.enqueue(encoder.encode(`data: {"stage": "error", "error": ${JSON.stringify(error instanceof Error ? error.message : '未知错误')}}\n\n`));
          controller.close();
        }
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
    console.error('增强版文案生成API错误:', error);
    return createErrorResponse(
      `增强版文案生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 解析生成的内容
 */
function parseGeneratedContent(content: string): {
  titles?: string;
  body?: string;
  tags?: string[];
  imagePrompt?: string;
  selfComment?: string;
  strategy?: string;
  playbook?: string;
} {
  try {
    // 尝试解析JSON格式的内容
    if (content.trim().startsWith('{')) {
      return JSON.parse(content);
    }

    // 如果不是JSON，尝试按标记分割
    const sections: any = {};
    const patterns = {
      titles: /【标题】([\s\S]*?)(?=【|$)/,
      body: /【正文】([\s\S]*?)(?=【|$)/,
      tags: /【标签】([\s\S]*?)(?=【|$)/,
      imagePrompt: /【配图提示】([\s\S]*?)(?=【|$)/,
      selfComment: /【自评论】([\s\S]*?)(?=【|$)/,
      strategy: /【推广策略】([\s\S]*?)(?=【|$)/,
      playbook: /【创作手册】([\s\S]*?)(?=【|$)/,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = content.match(pattern);
      if (match) {
        let value = match[1].trim();
        if (key === 'tags') {
          // 解析标签
          sections[key] = value.split(/[#\s]+/).filter(tag => tag.length > 0);
        } else {
          sections[key] = value;
        }
      }
    }

    return sections;
  } catch (error) {
    console.warn('解析生成内容失败:', error);
    return { body: content };
  }
}
