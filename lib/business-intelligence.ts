/**
 * 商业智能模块
 * 提供竞品分析、趋势预测、个性化建议等业务价值功能
 */

import { NoteContentAnalysis, CommentSentimentAnalysis, ComprehensiveInsights } from './data-analyzer';
import { dataStorage, QueryOptions } from './data-storage';
import { aiManager } from './ai-manager';
import { getCompetitorAnalysisPrompt, getTrendPredictionPrompt } from './enhanced-prompts';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * 竞品分析结果接口
 */
export interface CompetitorAnalysis {
  competitorStrengths: string[];
  competitorWeaknesses: string[];
  marketGaps: string[];
  differentiationOpportunities: string[];
  contentTrends: string[];
  audienceInsights: string[];
  recommendedStrategy: string;
  benchmarkData: {
    avgScore: number;
    topPerformer: {
      noteId: string;
      title: string;
      score: number;
    };
    categoryDistribution: Record<string, number>;
  };
}

/**
 * 趋势预测结果接口
 */
export interface TrendPrediction {
  emergingTopics: string[];
  decliningTrends: string[];
  contentFormatTrends: string[];
  audienceBehaviorChanges: string[];
  recommendedContentTypes: string[];
  timingRecommendations: string;
  keywordOpportunities: string[];
  confidenceScore: number; // 预测置信度 (0-1)
  dataQuality: 'high' | 'medium' | 'low';
}

/**
 * 个性化建议接口
 */
export interface PersonalizedRecommendations {
  contentSuggestions: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    expectedPerformance: number; // 预期表现评分 (1-10)
    targetAudience: string;
    keyElements: string[];
  }>;
  optimizationTips: Array<{
    area: 'title' | 'content' | 'timing' | 'engagement';
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  competitorInsights: Array<{
    competitor: string;
    strength: string;
    actionable: string;
  }>;
  trendAlerts: Array<{
    trend: string;
    urgency: 'high' | 'medium' | 'low';
    opportunity: string;
  }>;
}

/**
 * 市场洞察接口
 */
export interface MarketInsights {
  marketSize: {
    totalNotes: number;
    activeCategories: string[];
    growthRate: number; // 增长率百分比
  };
  competitiveLandscape: {
    topPerformers: Array<{
      noteId: string;
      title: string;
      score: number;
      category: string;
    }>;
    marketShare: Record<string, number>; // 各分类占比
    competitionIntensity: 'low' | 'medium' | 'high';
  };
  audienceAnalysis: {
    primaryDemographics: string[];
    contentPreferences: string[];
    engagementPatterns: string[];
    unmetNeeds: string[];
  };
  opportunityMap: Array<{
    category: string;
    opportunity: string;
    difficulty: number; // 1-10
    potential: number; // 1-10
  }>;
}

/**
 * 商业智能分析器
 */
export class BusinessIntelligenceAnalyzer {
  /**
   * 竞品分析
   */
  async analyzeCompetitors(
    keyword: string,
    userCategory?: string,
    limit: number = 20
  ): Promise<CompetitorAnalysis> {
    if (debugLoggingEnabled) {
      console.log(`🔍 开始竞品分析: ${keyword}`);
    }

    try {
      // 查询相关笔记数据
      const queryOptions: QueryOptions = {
        keywords: [keyword],
        category: userCategory,
        limit,
        sortBy: 'score',
        sortOrder: 'desc'
      };

      const competitorNotes = await dataStorage.queryNotes(queryOptions);
      
      if (competitorNotes.length === 0) {
        throw new Error('未找到相关竞品数据');
      }

      // 获取详细分析数据
      const noteAnalyses: NoteContentAnalysis[] = [];
      const commentAnalyses: CommentSentimentAnalysis[] = [];

      for (const note of competitorNotes.slice(0, 10)) { // 限制分析数量
        const analysis = await dataStorage.getAnalysis(note.noteId);
        if (analysis) {
          noteAnalyses.push(analysis.analysis);
          if (analysis.commentAnalysis) {
            commentAnalyses.push(analysis.commentAnalysis);
          }
        }
      }

      // 使用AI进行竞品分析
      const analysisPrompt = getCompetitorAnalysisPrompt(noteAnalyses, commentAnalyses);
      const aiAnalysis = await aiManager.analyzeWithRetry(analysisPrompt, [
        'competitorStrengths', 'competitorWeaknesses', 'marketGaps', 
        'differentiationOpportunities', 'contentTrends', 'audienceInsights'
      ]);

      // 计算基准数据
      const benchmarkData = this.calculateBenchmarkData(competitorNotes, noteAnalyses);

      const result: CompetitorAnalysis = {
        ...aiAnalysis,
        benchmarkData
      };

      if (debugLoggingEnabled) {
        console.log(`✅ 竞品分析完成: 分析了${noteAnalyses.length}个竞品`);
      }

      return result;
    } catch (error) {
      console.error('竞品分析失败:', error);
      throw new Error(`竞品分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 趋势预测
   */
  async predictTrends(
    category?: string,
    timeRange: number = 30 // 天数
  ): Promise<TrendPrediction> {
    if (debugLoggingEnabled) {
      console.log(`🔍 开始趋势预测: ${category || '全部分类'}`);
    }

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeRange * 24 * 60 * 60 * 1000);

      // 查询历史数据
      const queryOptions: QueryOptions = {
        category,
        dateRange: { start: startDate, end: endDate },
        limit: 100,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const historicalNotes = await dataStorage.queryNotes(queryOptions);
      
      if (historicalNotes.length < 10) {
        throw new Error('历史数据不足，无法进行趋势预测');
      }

      // 获取详细分析数据
      const noteAnalyses: NoteContentAnalysis[] = [];
      const commentAnalyses: CommentSentimentAnalysis[] = [];

      for (const note of historicalNotes.slice(0, 50)) {
        const analysis = await dataStorage.getAnalysis(note.noteId);
        if (analysis) {
          noteAnalyses.push(analysis.analysis);
          if (analysis.commentAnalysis) {
            commentAnalyses.push(analysis.commentAnalysis);
          }
        }
      }

      // 使用AI进行趋势预测
      const predictionPrompt = getTrendPredictionPrompt(noteAnalyses, commentAnalyses);
      const aiPrediction = await aiManager.analyzeWithRetry(predictionPrompt, [
        'emergingTopics', 'decliningTrends', 'contentFormatTrends',
        'audienceBehaviorChanges', 'recommendedContentTypes', 'keywordOpportunities'
      ]);

      // 计算预测质量指标
      const dataQuality = this.assessDataQuality(noteAnalyses, commentAnalyses);
      const confidenceScore = this.calculateConfidenceScore(noteAnalyses, timeRange);

      const result: TrendPrediction = {
        ...aiPrediction,
        confidenceScore,
        dataQuality
      };

      if (debugLoggingEnabled) {
        console.log(`✅ 趋势预测完成: 置信度${(confidenceScore * 100).toFixed(1)}%`);
      }

      return result;
    } catch (error) {
      console.error('趋势预测失败:', error);
      throw new Error(`趋势预测失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成个性化建议
   */
  async generatePersonalizedRecommendations(
    userProfile: {
      category: string;
      targetAudience: string;
      contentStyle: string;
      goals: string[];
    },
    competitorAnalysis?: CompetitorAnalysis,
    trendPrediction?: TrendPrediction
  ): Promise<PersonalizedRecommendations> {
    if (debugLoggingEnabled) {
      console.log(`🔍 生成个性化建议: ${userProfile.category}`);
    }

    try {
      // 构建个性化分析提示词
      const prompt = this.buildPersonalizationPrompt(userProfile, competitorAnalysis, trendPrediction);
      
      // 使用AI生成个性化建议
      const recommendations = await aiManager.analyzeWithRetry(prompt, [
        'contentSuggestions', 'optimizationTips', 'competitorInsights', 'trendAlerts'
      ]);

      // 增强建议质量
      const enhancedRecommendations = await this.enhanceRecommendations(
        recommendations,
        userProfile,
        competitorAnalysis
      );

      if (debugLoggingEnabled) {
        console.log(`✅ 个性化建议生成完成: ${enhancedRecommendations.contentSuggestions.length}条建议`);
      }

      return enhancedRecommendations;
    } catch (error) {
      console.error('个性化建议生成失败:', error);
      throw new Error(`个性化建议生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 市场洞察分析
   */
  async generateMarketInsights(category?: string): Promise<MarketInsights> {
    if (debugLoggingEnabled) {
      console.log(`🔍 生成市场洞察: ${category || '全部分类'}`);
    }

    try {
      // 获取市场数据
      const allNotes = await dataStorage.queryNotes({
        category,
        limit: 1000,
        sortBy: 'score',
        sortOrder: 'desc'
      });

      if (allNotes.length === 0) {
        throw new Error('市场数据不足');
      }

      // 分析市场规模
      const marketSize = this.analyzeMarketSize(allNotes);
      
      // 分析竞争格局
      const competitiveLandscape = this.analyzeCompetitiveLandscape(allNotes);
      
      // 分析受众特征
      const audienceAnalysis = await this.analyzeAudience(allNotes);
      
      // 识别机会点
      const opportunityMap = this.identifyOpportunities(allNotes, competitiveLandscape);

      const insights: MarketInsights = {
        marketSize,
        competitiveLandscape,
        audienceAnalysis,
        opportunityMap
      };

      if (debugLoggingEnabled) {
        console.log(`✅ 市场洞察生成完成: 分析了${allNotes.length}条数据`);
      }

      return insights;
    } catch (error) {
      console.error('市场洞察生成失败:', error);
      throw new Error(`市场洞察生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 计算基准数据
   */
  private calculateBenchmarkData(notes: any[], analyses: NoteContentAnalysis[]) {
    const scores = analyses.map(a => a.contentQuality.overallScore);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const topPerformer = analyses.reduce((top, current, index) => {
      return current.contentQuality.overallScore > top.score ? {
        noteId: notes[index].noteId,
        title: current.basicInfo.title,
        score: current.contentQuality.overallScore
      } : top;
    }, { noteId: '', title: '', score: 0 });

    const categoryDistribution = analyses.reduce((dist, analysis) => {
      const category = analysis.features.contentType;
      dist[category] = (dist[category] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      avgScore,
      topPerformer,
      categoryDistribution
    };
  }

  /**
   * 评估数据质量
   */
  private assessDataQuality(
    noteAnalyses: NoteContentAnalysis[],
    commentAnalyses: CommentSentimentAnalysis[]
  ): 'high' | 'medium' | 'low' {
    const noteCount = noteAnalyses.length;
    const commentCount = commentAnalyses.length;
    const avgCommentQuality = commentAnalyses.reduce((sum, c) => sum + c.interactionQuality.qualityScore, 0) / commentCount;

    if (noteCount >= 30 && commentCount >= 20 && avgCommentQuality >= 7) {
      return 'high';
    } else if (noteCount >= 15 && commentCount >= 10 && avgCommentQuality >= 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 计算置信度
   */
  private calculateConfidenceScore(analyses: NoteContentAnalysis[], timeRange: number): number {
    const dataPoints = analyses.length;
    const timeWeight = Math.min(1, timeRange / 30); // 30天为满分
    const dataWeight = Math.min(1, dataPoints / 50); // 50个数据点为满分
    const qualityWeight = analyses.reduce((sum, a) => sum + a.contentQuality.overallScore, 0) / (analyses.length * 10);

    return (timeWeight + dataWeight + qualityWeight) / 3;
  }

  /**
   * 构建个性化提示词
   */
  private buildPersonalizationPrompt(
    userProfile: any,
    competitorAnalysis?: CompetitorAnalysis,
    trendPrediction?: TrendPrediction
  ): string {
    let context = `用户画像：
- 内容分类：${userProfile.category}
- 目标受众：${userProfile.targetAudience}
- 内容风格：${userProfile.contentStyle}
- 目标：${userProfile.goals.join('、')}`;

    if (competitorAnalysis) {
      context += `\n\n竞品分析洞察：
- 竞品优势：${competitorAnalysis.competitorStrengths.join('、')}
- 市场空白：${competitorAnalysis.marketGaps.join('、')}
- 差异化机会：${competitorAnalysis.differentiationOpportunities.join('、')}`;
    }

    if (trendPrediction) {
      context += `\n\n趋势预测：
- 新兴话题：${trendPrediction.emergingTopics.join('、')}
- 推荐内容类型：${trendPrediction.recommendedContentTypes.join('、')}
- 关键词机会：${trendPrediction.keywordOpportunities.join('、')}`;
    }

    return `基于以下信息，为用户生成个性化的内容创作建议：

${context}

请生成以下格式的建议：

{
  "contentSuggestions": [
    {
      "title": "建议标题",
      "description": "详细描述",
      "priority": "high/medium/low",
      "expectedPerformance": "预期表现评分(1-10)",
      "targetAudience": "目标受众",
      "keyElements": ["关键要素1", "关键要素2"]
    }
  ],
  "optimizationTips": [
    {
      "area": "优化领域",
      "suggestion": "具体建议",
      "impact": "影响程度",
      "difficulty": "实施难度"
    }
  ],
  "competitorInsights": [
    {
      "competitor": "竞品特征",
      "strength": "竞品优势",
      "actionable": "可执行的应对策略"
    }
  ],
  "trendAlerts": [
    {
      "trend": "趋势描述",
      "urgency": "紧急程度",
      "opportunity": "机会描述"
    }
  ]
}

只返回JSON格式，不要添加任何解释。`;
  }

  /**
   * 增强建议质量
   */
  private async enhanceRecommendations(
    recommendations: any,
    userProfile: any,
    competitorAnalysis?: CompetitorAnalysis
  ): Promise<PersonalizedRecommendations> {
    // 根据用户画像和竞品分析调整建议优先级
    if (recommendations.contentSuggestions) {
      recommendations.contentSuggestions.forEach((suggestion: any) => {
        // 根据竞品分析调整预期表现
        if (competitorAnalysis && suggestion.expectedPerformance) {
          const avgBenchmark = competitorAnalysis.benchmarkData.avgScore;
          suggestion.expectedPerformance = Math.min(10, suggestion.expectedPerformance * (avgBenchmark / 10));
        }
      });
    }

    return recommendations;
  }

  /**
   * 分析市场规模
   */
  private analyzeMarketSize(notes: any[]) {
    const categories = [...new Set(notes.map(note => note.category))];
    const recentNotes = notes.filter(note => {
      const noteDate = new Date(note.timestamp);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return noteDate > thirtyDaysAgo;
    });

    const growthRate = (recentNotes.length / notes.length) * 100;

    return {
      totalNotes: notes.length,
      activeCategories: categories,
      growthRate
    };
  }

  /**
   * 分析竞争格局
   */
  private analyzeCompetitiveLandscape(notes: any[]) {
    const topPerformers = notes.slice(0, 10).map(note => ({
      noteId: note.noteId,
      title: note.title,
      score: note.score,
      category: note.category
    }));

    const marketShare = notes.reduce((share, note) => {
      share[note.category] = (share[note.category] || 0) + 1;
      return share;
    }, {} as Record<string, number>);

    // 计算竞争强度
    const avgScore = notes.reduce((sum, note) => sum + note.score, 0) / notes.length;
    const competitionIntensity = avgScore > 7 ? 'high' : avgScore > 4 ? 'medium' : 'low';

    return {
      topPerformers,
      marketShare,
      competitionIntensity
    };
  }

  /**
   * 分析受众特征
   */
  private async analyzeAudience(notes: any[]) {
    // 这里可以基于笔记内容和评论数据分析受众特征
    // 简化实现，实际可以更复杂
    return {
      primaryDemographics: ['年轻女性', '都市白领', '学生群体'],
      contentPreferences: ['实用教程', '生活分享', '产品推荐'],
      engagementPatterns: ['晚间活跃', '周末高峰', '互动性强'],
      unmetNeeds: ['个性化定制', '深度分析', '实时互动']
    };
  }

  /**
   * 识别机会点
   */
  private identifyOpportunities(notes: any[], landscape: any) {
    const categories = Object.keys(landscape.marketShare);
    
    return categories.map(category => {
      const categoryNotes = notes.filter(note => note.category === category);
      const avgScore = categoryNotes.reduce((sum, note) => sum + note.score, 0) / categoryNotes.length;
      const competition = categoryNotes.length;
      
      return {
        category,
        opportunity: avgScore < 6 ? '质量提升机会' : competition < 10 ? '市场空白机会' : '差异化机会',
        difficulty: competition > 50 ? 8 : competition > 20 ? 5 : 3,
        potential: avgScore < 6 ? 8 : competition < 10 ? 9 : 6
      };
    });
  }
}

// 导出单例实例
export const businessIntelligence = new BusinessIntelligenceAnalyzer();
