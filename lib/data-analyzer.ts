/**
 * 数据分析模块 - 深度分析笔记详情和评论数据
 * 提供内容分析、情感分析、热点提取等功能
 */

import { XhsNoteDetail, XhsComment } from './types';
import { aiManager } from './ai-manager';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * 笔记内容分析结果接口
 */
export interface NoteContentAnalysis {
  // 基础信息分析
  basicInfo: {
    noteId: string;
    title: string;
    contentLength: number;
    imageCount: number;
    hasVideo: boolean;
    createTime: string;
    category: string; // 自动分类
  };
  
  // 内容质量分析
  contentQuality: {
    titleScore: number; // 标题吸引力评分 (1-10)
    contentScore: number; // 内容质量评分 (1-10)
    structureScore: number; // 结构完整性评分 (1-10)
    overallScore: number; // 综合评分 (1-10)
    strengths: string[]; // 优势点
    improvements: string[]; // 改进建议
  };
  
  // 互动数据分析
  engagement: {
    likeRate: number; // 点赞率
    commentRate: number; // 评论率
    shareRate: number; // 分享率
    favoriteRate: number; // 收藏率
    engagementScore: number; // 综合互动评分
    viralPotential: 'low' | 'medium' | 'high'; // 爆款潜力
  };
  
  // 关键词提取
  keywords: {
    primaryKeywords: string[]; // 主要关键词
    secondaryKeywords: string[]; // 次要关键词
    hashtags: string[]; // 话题标签
    mentions: string[]; // 提及的品牌/人物
  };
  
  // 内容特征
  features: {
    contentType: 'tutorial' | 'review' | 'lifestyle' | 'shopping' | 'other';
    tone: 'professional' | 'casual' | 'humorous' | 'emotional';
    targetAudience: string; // 目标受众描述
    callToAction: string[]; // 行动号召
  };
}

/**
 * 评论情感分析结果接口
 */
export interface CommentSentimentAnalysis {
  // 整体情感分布
  sentimentDistribution: {
    positive: number; // 正面评论占比
    neutral: number; // 中性评论占比
    negative: number; // 负面评论占比
    totalComments: number; // 总评论数
  };
  
  // 热点话题
  hotTopics: Array<{
    topic: string; // 话题内容
    frequency: number; // 出现频次
    sentiment: 'positive' | 'neutral' | 'negative'; // 话题情感
    keywords: string[]; // 相关关键词
  }>;
  
  // 用户反馈分析
  userFeedback: {
    commonPraises: string[]; // 常见好评点
    commonComplaints: string[]; // 常见抱怨点
    suggestions: string[]; // 用户建议
    questions: string[]; // 用户疑问
  };
  
  // 互动质量
  interactionQuality: {
    averageCommentLength: number; // 平均评论长度
    meaningfulComments: number; // 有意义评论数
    spamComments: number; // 垃圾评论数
    qualityScore: number; // 互动质量评分 (1-10)
  };
}

/**
 * 综合洞察结果接口
 */
export interface ComprehensiveInsights {
  // 内容表现总结
  performanceSummary: {
    overallRating: 'excellent' | 'good' | 'average' | 'poor';
    keySuccessFactors: string[]; // 成功关键因素
    improvementAreas: string[]; // 改进领域
    benchmarkComparison: string; // 与同类内容对比
  };
  
  // 受众洞察
  audienceInsights: {
    primaryAudience: string; // 主要受众群体
    audienceNeeds: string[]; // 受众需求
    contentPreferences: string[]; // 内容偏好
    engagementPatterns: string[]; // 互动模式
  };
  
  // 优化建议
  optimizationSuggestions: {
    titleOptimization: string[]; // 标题优化建议
    contentOptimization: string[]; // 内容优化建议
    engagementOptimization: string[]; // 互动优化建议
    timingOptimization: string; // 发布时机建议
  };
  
  // 创作灵感
  creativeInspiration: {
    similarTopics: string[]; // 相似话题
    trendingElements: string[]; // 流行元素
    contentAngles: string[]; // 内容角度
    formatSuggestions: string[]; // 格式建议
  };
}

/**
 * 数据分析器类
 */
export class DataAnalyzer {
  /**
   * 分析笔记内容
   */
  async analyzeNoteContent(noteDetail: XhsNoteDetail): Promise<NoteContentAnalysis> {
    if (debugLoggingEnabled) {
      console.log(`🔍 开始分析笔记内容: ${noteDetail.noteId}`);
    }

    try {
      // 构建分析提示词
      const analysisPrompt = this.buildNoteAnalysisPrompt(noteDetail);
      
      // 使用AI进行分析
      const analysisResult = await aiManager.analyzeWithRetry(
        analysisPrompt,
        ['basicInfo', 'contentQuality', 'engagement', 'keywords', 'features']
      );

      // 计算互动数据
      const engagement = this.calculateEngagementMetrics(noteDetail);
      
      // 合并分析结果
      const analysis: NoteContentAnalysis = {
        basicInfo: {
          noteId: noteDetail.noteId,
          title: noteDetail.title,
          contentLength: noteDetail.content.length,
          imageCount: noteDetail.imagesList.length,
          hasVideo: !!noteDetail.videoInfo,
          createTime: noteDetail.createTime,
          category: analysisResult.basicInfo?.category || 'other'
        },
        contentQuality: analysisResult.contentQuality || {
          titleScore: 5,
          contentScore: 5,
          structureScore: 5,
          overallScore: 5,
          strengths: [],
          improvements: []
        },
        engagement,
        keywords: analysisResult.keywords || {
          primaryKeywords: [],
          secondaryKeywords: [],
          hashtags: [],
          mentions: []
        },
        features: analysisResult.features || {
          contentType: 'other',
          tone: 'casual',
          targetAudience: '未知',
          callToAction: []
        }
      };

      if (debugLoggingEnabled) {
        console.log(`✅ 笔记内容分析完成: 综合评分 ${analysis.contentQuality.overallScore}/10`);
      }

      return analysis;
    } catch (error) {
      console.error('笔记内容分析失败:', error);
      throw new Error(`笔记内容分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 分析评论情感
   */
  async analyzeCommentSentiment(comments: any[]): Promise<CommentSentimentAnalysis> {
    if (debugLoggingEnabled) {
      console.log(`🔍 开始分析评论情感: ${comments.length}条评论`);
    }

    try {
      // 提取评论文本
      const commentTexts = this.extractCommentTexts(comments);
      
      if (commentTexts.length === 0) {
        return this.getEmptyCommentAnalysis();
      }

      // 构建情感分析提示词
      const sentimentPrompt = this.buildCommentSentimentPrompt(commentTexts);
      
      // 使用AI进行情感分析
      const sentimentResult = await aiManager.analyzeWithRetry(
        sentimentPrompt,
        ['sentimentDistribution', 'hotTopics', 'userFeedback', 'interactionQuality']
      );

      // 计算互动质量指标
      const interactionQuality = this.calculateInteractionQuality(comments);
      
      const analysis: CommentSentimentAnalysis = {
        sentimentDistribution: sentimentResult.sentimentDistribution || {
          positive: 0.6,
          neutral: 0.3,
          negative: 0.1,
          totalComments: comments.length
        },
        hotTopics: sentimentResult.hotTopics || [],
        userFeedback: sentimentResult.userFeedback || {
          commonPraises: [],
          commonComplaints: [],
          suggestions: [],
          questions: []
        },
        interactionQuality
      };

      if (debugLoggingEnabled) {
        console.log(`✅ 评论情感分析完成: 正面${(analysis.sentimentDistribution.positive * 100).toFixed(1)}%`);
      }

      return analysis;
    } catch (error) {
      console.error('评论情感分析失败:', error);
      throw new Error(`评论情感分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成综合洞察
   */
  async generateComprehensiveInsights(
    noteAnalysis: NoteContentAnalysis,
    commentAnalysis: CommentSentimentAnalysis
  ): Promise<ComprehensiveInsights> {
    if (debugLoggingEnabled) {
      console.log('🔍 开始生成综合洞察');
    }

    try {
      // 构建综合分析提示词
      const insightsPrompt = this.buildComprehensiveInsightsPrompt(noteAnalysis, commentAnalysis);
      
      // 使用AI生成洞察
      const insightsResult = await aiManager.analyzeWithRetry(
        insightsPrompt,
        ['performanceSummary', 'audienceInsights', 'optimizationSuggestions', 'creativeInspiration']
      );

      const insights: ComprehensiveInsights = {
        performanceSummary: insightsResult.performanceSummary || {
          overallRating: 'average',
          keySuccessFactors: [],
          improvementAreas: [],
          benchmarkComparison: '数据不足'
        },
        audienceInsights: insightsResult.audienceInsights || {
          primaryAudience: '未知',
          audienceNeeds: [],
          contentPreferences: [],
          engagementPatterns: []
        },
        optimizationSuggestions: insightsResult.optimizationSuggestions || {
          titleOptimization: [],
          contentOptimization: [],
          engagementOptimization: [],
          timingOptimization: '建议在用户活跃时段发布'
        },
        creativeInspiration: insightsResult.creativeInspiration || {
          similarTopics: [],
          trendingElements: [],
          contentAngles: [],
          formatSuggestions: []
        }
      };

      if (debugLoggingEnabled) {
        console.log(`✅ 综合洞察生成完成: ${insights.performanceSummary.overallRating}`);
      }

      return insights;
    } catch (error) {
      console.error('综合洞察生成失败:', error);
      throw new Error(`综合洞察生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 构建笔记分析提示词
   */
  private buildNoteAnalysisPrompt(noteDetail: XhsNoteDetail): string {
    return `请分析以下小红书笔记的内容质量和特征：

**笔记信息：**
- 标题：${noteDetail.title}
- 正文：${noteDetail.content}
- 图片数量：${noteDetail.imagesList.length}
- 视频：${noteDetail.videoInfo ? '有' : '无'}
- 点赞数：${noteDetail.likeNum}
- 评论数：${noteDetail.cmtNum}
- 收藏数：${noteDetail.favNum}
- 分享数：${noteDetail.shareNum}
- 曝光数：${noteDetail.impNum}

请从以下维度进行分析，并以JSON格式返回：

{
  "basicInfo": {
    "category": "内容分类(tutorial/review/lifestyle/shopping/other)"
  },
  "contentQuality": {
    "titleScore": "标题吸引力评分(1-10)",
    "contentScore": "内容质量评分(1-10)", 
    "structureScore": "结构完整性评分(1-10)",
    "overallScore": "综合评分(1-10)",
    "strengths": ["优势点1", "优势点2"],
    "improvements": ["改进建议1", "改进建议2"]
  },
  "keywords": {
    "primaryKeywords": ["主要关键词1", "主要关键词2"],
    "secondaryKeywords": ["次要关键词1", "次要关键词2"],
    "hashtags": ["话题标签1", "话题标签2"],
    "mentions": ["提及的品牌/人物"]
  },
  "features": {
    "contentType": "内容类型",
    "tone": "语调风格(professional/casual/humorous/emotional)",
    "targetAudience": "目标受众描述",
    "callToAction": ["行动号召1", "行动号召2"]
  }
}

只返回JSON格式，不要添加任何解释。`;
  }

  /**
   * 构建评论情感分析提示词
   */
  private buildCommentSentimentPrompt(commentTexts: string[]): string {
    const sampleComments = commentTexts.slice(0, 50).join('\n- '); // 取前50条评论
    
    return `请分析以下评论的情感倾向和热点话题：

**评论内容：**
- ${sampleComments}

请从以下维度进行分析，并以JSON格式返回：

{
  "sentimentDistribution": {
    "positive": "正面评论占比(0-1)",
    "neutral": "中性评论占比(0-1)", 
    "negative": "负面评论占比(0-1)",
    "totalComments": ${commentTexts.length}
  },
  "hotTopics": [
    {
      "topic": "热点话题1",
      "frequency": "出现频次",
      "sentiment": "话题情感(positive/neutral/negative)",
      "keywords": ["相关关键词1", "相关关键词2"]
    }
  ],
  "userFeedback": {
    "commonPraises": ["常见好评点1", "常见好评点2"],
    "commonComplaints": ["常见抱怨点1", "常见抱怨点2"],
    "suggestions": ["用户建议1", "用户建议2"],
    "questions": ["用户疑问1", "用户疑问2"]
  }
}

只返回JSON格式，不要添加任何解释。`;
  }

  /**
   * 构建综合洞察提示词
   */
  private buildComprehensiveInsightsPrompt(
    noteAnalysis: NoteContentAnalysis,
    commentAnalysis: CommentSentimentAnalysis
  ): string {
    return `基于以下笔记分析和评论分析结果，生成综合洞察：

**笔记分析结果：**
- 综合评分：${noteAnalysis.contentQuality.overallScore}/10
- 内容类型：${noteAnalysis.features.contentType}
- 互动评分：${noteAnalysis.engagement.engagementScore}/10
- 爆款潜力：${noteAnalysis.engagement.viralPotential}

**评论分析结果：**
- 正面评论：${(commentAnalysis.sentimentDistribution.positive * 100).toFixed(1)}%
- 总评论数：${commentAnalysis.sentimentDistribution.totalComments}
- 互动质量：${commentAnalysis.interactionQuality.qualityScore}/10

请生成综合洞察，以JSON格式返回：

{
  "performanceSummary": {
    "overallRating": "综合表现(excellent/good/average/poor)",
    "keySuccessFactors": ["成功关键因素1", "成功关键因素2"],
    "improvementAreas": ["改进领域1", "改进领域2"],
    "benchmarkComparison": "与同类内容对比描述"
  },
  "audienceInsights": {
    "primaryAudience": "主要受众群体描述",
    "audienceNeeds": ["受众需求1", "受众需求2"],
    "contentPreferences": ["内容偏好1", "内容偏好2"],
    "engagementPatterns": ["互动模式1", "互动模式2"]
  },
  "optimizationSuggestions": {
    "titleOptimization": ["标题优化建议1", "标题优化建议2"],
    "contentOptimization": ["内容优化建议1", "内容优化建议2"],
    "engagementOptimization": ["互动优化建议1", "互动优化建议2"],
    "timingOptimization": "发布时机建议"
  },
  "creativeInspiration": {
    "similarTopics": ["相似话题1", "相似话题2"],
    "trendingElements": ["流行元素1", "流行元素2"],
    "contentAngles": ["内容角度1", "内容角度2"],
    "formatSuggestions": ["格式建议1", "格式建议2"]
  }
}

只返回JSON格式，不要添加任何解释。`;
  }

  /**
   * 计算互动指标
   */
  private calculateEngagementMetrics(noteDetail: XhsNoteDetail) {
    const totalInteractions = noteDetail.likeNum + noteDetail.cmtNum + noteDetail.shareNum + noteDetail.favNum;
    const impressions = noteDetail.impNum || 1; // 避免除零

    return {
      likeRate: noteDetail.likeNum / impressions,
      commentRate: noteDetail.cmtNum / impressions,
      shareRate: noteDetail.shareNum / impressions,
      favoriteRate: noteDetail.favNum / impressions,
      engagementScore: Math.min(10, (totalInteractions / impressions) * 1000), // 标准化到1-10
      viralPotential: this.calculateViralPotential(totalInteractions, impressions)
    };
  }

  /**
   * 计算爆款潜力
   */
  private calculateViralPotential(totalInteractions: number, impressions: number): 'low' | 'medium' | 'high' {
    const engagementRate = totalInteractions / impressions;
    if (engagementRate > 0.05) return 'high';
    if (engagementRate > 0.02) return 'medium';
    return 'low';
  }

  /**
   * 提取评论文本
   */
  private extractCommentTexts(comments: any[]): string[] {
    const texts: string[] = [];
    
    comments.forEach(comment => {
      if (comment.content) {
        texts.push(comment.content);
      }
      // 处理子评论
      if (comment.subComments && Array.isArray(comment.subComments)) {
        comment.subComments.forEach((subComment: any) => {
          if (subComment.content) {
            texts.push(subComment.content);
          }
        });
      }
    });
    
    return texts;
  }

  /**
   * 计算互动质量
   */
  private calculateInteractionQuality(comments: any[]) {
    const allComments = this.extractCommentTexts(comments);
    const totalLength = allComments.reduce((sum, comment) => sum + comment.length, 0);
    const meaningfulComments = allComments.filter(comment => comment.length > 10).length;
    const spamComments = allComments.filter(comment => comment.length <= 3).length;

    return {
      averageCommentLength: allComments.length > 0 ? totalLength / allComments.length : 0,
      meaningfulComments,
      spamComments,
      qualityScore: Math.min(10, (meaningfulComments / Math.max(1, allComments.length)) * 10)
    };
  }

  /**
   * 获取空评论分析结果
   */
  private getEmptyCommentAnalysis(): CommentSentimentAnalysis {
    return {
      sentimentDistribution: {
        positive: 0,
        neutral: 0,
        negative: 0,
        totalComments: 0
      },
      hotTopics: [],
      userFeedback: {
        commonPraises: [],
        commonComplaints: [],
        suggestions: [],
        questions: []
      },
      interactionQuality: {
        averageCommentLength: 0,
        meaningfulComments: 0,
        spamComments: 0,
        qualityScore: 0
      }
    };
  }
}

// 导出单例实例
export const dataAnalyzer = new DataAnalyzer();
