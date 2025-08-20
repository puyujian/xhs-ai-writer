import { NextRequest } from 'next/server';
import { dataAnalyzer } from '@/lib/data-analyzer';
import { dataStorage } from '@/lib/data-storage';
import { batchProcessor } from '@/lib/batch-processor';
import { businessIntelligence } from '@/lib/business-intelligence';
import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { HTTP_STATUS } from '@/lib/constants';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * POST - 数据分析API
 * 支持单个和批量分析
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, 
      noteIds, 
      analysisType = 'comprehensive',
      options = {} 
    } = body;

    if (!action) {
      return createErrorResponse('缺少action参数', HTTP_STATUS.BAD_REQUEST);
    }

    if (debugLoggingEnabled) {
      console.log(`🔍 数据分析请求: ${action}, 笔记数量: ${noteIds?.length || 0}`);
    }

    switch (action) {
      case 'analyze_notes':
        return await handleNoteAnalysis(noteIds, analysisType, options);
      
      case 'analyze_comments':
        return await handleCommentAnalysis(noteIds, options);
      
      case 'comprehensive_analysis':
        return await handleComprehensiveAnalysis(noteIds, options);
      
      case 'competitor_analysis':
        return await handleCompetitorAnalysis(body.keyword, body.category, options);
      
      case 'trend_prediction':
        return await handleTrendPrediction(body.category, body.timeRange, options);
      
      case 'personalized_recommendations':
        return await handlePersonalizedRecommendations(body.userProfile, options);
      
      case 'market_insights':
        return await handleMarketInsights(body.category, options);
      
      default:
        return createErrorResponse('不支持的分析类型', HTTP_STATUS.BAD_REQUEST);
    }

  } catch (error) {
    console.error('数据分析API错误:', error);
    return createErrorResponse(
      `数据分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * GET - 获取分析结果
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const noteId = searchParams.get('noteId');
    const type = searchParams.get('type') || 'all';

    if (!noteId) {
      return createErrorResponse('缺少noteId参数', HTTP_STATUS.BAD_REQUEST);
    }

    const results: any = {};

    // 获取笔记详情
    if (type === 'all' || type === 'note') {
      const noteData = await dataStorage.getNoteDetail(noteId);
      if (noteData) {
        results.noteDetail = noteData.noteDetail;
      }
    }

    // 获取分析结果
    if (type === 'all' || type === 'analysis') {
      const analysisData = await dataStorage.getAnalysis(noteId);
      if (analysisData) {
        results.analysis = analysisData.analysis;
        results.commentAnalysis = analysisData.commentAnalysis;
      }
    }

    // 获取洞察结果
    if (type === 'all' || type === 'insights') {
      const insightsData = await dataStorage.getInsights(noteId);
      if (insightsData) {
        results.insights = insightsData.insights;
      }
    }

    if (Object.keys(results).length === 0) {
      return createErrorResponse('未找到相关数据', HTTP_STATUS.NOT_FOUND);
    }

    return createApiResponse({
      success: true,
      noteId,
      data: results,
      summary: `成功获取笔记 ${noteId} 的${type === 'all' ? '完整' : type}数据`
    });

  } catch (error) {
    console.error('获取分析结果失败:', error);
    return createErrorResponse(
      `获取分析结果失败: ${error instanceof Error ? error.message : '未知错误'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * 处理笔记分析
 */
async function handleNoteAnalysis(noteIds: string[], analysisType: string, options: any) {
  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return createErrorResponse('noteIds不能为空', HTTP_STATUS.BAD_REQUEST);
  }

  if (noteIds.length > 50) {
    return createErrorResponse('单次最多支持50个笔记分析', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    // 获取笔记详情数据
    const notesData = [];
    for (const noteId of noteIds) {
      const noteData = await dataStorage.getNoteDetail(noteId);
      if (noteData) {
        notesData.push({
          noteId,
          noteDetail: noteData.noteDetail
        });
      }
    }

    if (notesData.length === 0) {
      return createErrorResponse('未找到有效的笔记数据', HTTP_STATUS.NOT_FOUND);
    }

    // 批量分析
    const result = await batchProcessor.batchAnalyzeNotes(notesData, {
      batchSize: options.batchSize || 10,
      priority: options.priority || 'medium',
      skipExisting: options.skipExisting !== false,
    });

    return createApiResponse({
      success: true,
      totalNotes: noteIds.length,
      analyzedNotes: result.completedTasks,
      failedNotes: result.failedTasks,
      results: result.results,
      errors: result.errors,
      duration: result.duration,
      throughput: result.throughput,
      summary: `批量分析完成：成功${result.completedTasks}个，失败${result.failedTasks}个，耗时${result.duration}ms`
    });

  } catch (error) {
    throw new Error(`笔记分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理评论分析
 */
async function handleCommentAnalysis(noteIds: string[], options: any) {
  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return createErrorResponse('noteIds不能为空', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    // 这里需要集成评论获取API
    // 暂时返回模拟数据
    const commentsData = noteIds.map(noteId => ({
      noteId,
      comments: [] // 实际应该从评论API获取
    }));

    const result = await batchProcessor.batchAnalyzeComments(commentsData, {
      batchSize: options.batchSize || 10,
      priority: options.priority || 'medium',
    });

    return createApiResponse({
      success: true,
      totalNotes: noteIds.length,
      analyzedComments: result.completedTasks,
      failedComments: result.failedTasks,
      results: result.results,
      errors: result.errors,
      summary: `评论分析完成：成功${result.completedTasks}个，失败${result.failedTasks}个`
    });

  } catch (error) {
    throw new Error(`评论分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理综合分析
 */
async function handleComprehensiveAnalysis(noteIds: string[], options: any) {
  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return createErrorResponse('noteIds不能为空', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const results = [];
    
    for (const noteId of noteIds.slice(0, 10)) { // 限制数量
      // 获取笔记分析
      const analysisData = await dataStorage.getAnalysis(noteId);
      if (!analysisData) {
        continue;
      }

      // 生成综合洞察
      const insights = await dataAnalyzer.generateComprehensiveInsights(
        analysisData.analysis,
        analysisData.commentAnalysis || {
          sentimentDistribution: { positive: 0.6, neutral: 0.3, negative: 0.1, totalComments: 0 },
          hotTopics: [],
          userFeedback: { commonPraises: [], commonComplaints: [], suggestions: [], questions: [] },
          interactionQuality: { averageCommentLength: 0, meaningfulComments: 0, spamComments: 0, qualityScore: 5 }
        }
      );

      // 保存洞察结果
      await dataStorage.saveInsights(noteId, insights);

      results.push({
        noteId,
        analysis: analysisData.analysis,
        commentAnalysis: analysisData.commentAnalysis,
        insights
      });
    }

    return createApiResponse({
      success: true,
      totalAnalyzed: results.length,
      results,
      summary: `综合分析完成：分析了${results.length}个笔记的完整数据`
    });

  } catch (error) {
    throw new Error(`综合分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理竞品分析
 */
async function handleCompetitorAnalysis(keyword: string, category: string, options: any) {
  if (!keyword) {
    return createErrorResponse('缺少keyword参数', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const analysis = await businessIntelligence.analyzeCompetitors(
      keyword,
      category,
      options.limit || 20
    );

    return createApiResponse({
      success: true,
      keyword,
      category,
      analysis,
      summary: `竞品分析完成：分析了${keyword}相关的竞品数据，发现${analysis.marketGaps.length}个市场空白点`
    });

  } catch (error) {
    throw new Error(`竞品分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理趋势预测
 */
async function handleTrendPrediction(category: string, timeRange: number, options: any) {
  try {
    const prediction = await businessIntelligence.predictTrends(
      category,
      timeRange || 30
    );

    return createApiResponse({
      success: true,
      category,
      timeRange,
      prediction,
      summary: `趋势预测完成：识别了${prediction.emergingTopics.length}个新兴话题，置信度${(prediction.confidenceScore * 100).toFixed(1)}%`
    });

  } catch (error) {
    throw new Error(`趋势预测失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理个性化推荐
 */
async function handlePersonalizedRecommendations(userProfile: any, options: any) {
  if (!userProfile) {
    return createErrorResponse('缺少userProfile参数', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const recommendations = await businessIntelligence.generatePersonalizedRecommendations(
      userProfile,
      options.competitorAnalysis,
      options.trendPrediction
    );

    return createApiResponse({
      success: true,
      userProfile,
      recommendations,
      summary: `个性化推荐完成：生成了${recommendations.contentSuggestions.length}条内容建议和${recommendations.optimizationTips.length}条优化建议`
    });

  } catch (error) {
    throw new Error(`个性化推荐失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理市场洞察
 */
async function handleMarketInsights(category: string, options: any) {
  try {
    const insights = await businessIntelligence.generateMarketInsights(category);

    return createApiResponse({
      success: true,
      category,
      insights,
      summary: `市场洞察完成：分析了${insights.marketSize.totalNotes}条数据，识别了${insights.opportunityMap.length}个机会点`
    });

  } catch (error) {
    throw new Error(`市场洞察失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
