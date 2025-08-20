/**
 * 增强版AI提示词管理模块
 * 集成笔记详情和评论数据，提升文案生成的针对性和用户共鸣度
 */

import { NoteContentAnalysis, CommentSentimentAnalysis, ComprehensiveInsights } from './data-storage';

/**
 * 增强版分析提示词 - 基于真实笔记详情数据
 */
export const getEnhancedAnalysisPrompt = (
  scrapedContent: string,
  noteAnalyses?: NoteContentAnalysis[],
  commentAnalyses?: CommentSentimentAnalysis[]
): string => {
  let enhancedContext = '';
  
  // 如果有笔记详情分析数据，添加深度洞察
  if (noteAnalyses && noteAnalyses.length > 0) {
    const avgScore = noteAnalyses.reduce((sum, analysis) => sum + analysis.contentQuality.overallScore, 0) / noteAnalyses.length;
    const topPerformers = noteAnalyses.filter(analysis => analysis.contentQuality.overallScore >= 8);
    const commonKeywords = extractCommonKeywords(noteAnalyses);
    const successFactors = extractSuccessFactors(noteAnalyses);
    
    enhancedContext += `

**深度数据洞察：**
- 分析了${noteAnalyses.length}篇真实笔记详情数据
- 平均内容质量评分：${avgScore.toFixed(1)}/10
- 高质量笔记（8分以上）：${topPerformers.length}篇
- 高频成功关键词：${commonKeywords.join('、')}
- 爆款成功要素：${successFactors.join('、')}

**高质量笔记特征分析：**
${topPerformers.map(analysis => `
- 标题：${analysis.basicInfo.title}
  * 质量评分：${analysis.contentQuality.overallScore}/10
  * 互动表现：${analysis.engagement.viralPotential}爆款潜力
  * 成功要素：${analysis.contentQuality.strengths.join('、')}
  * 内容类型：${analysis.features.contentType}
  * 语调风格：${analysis.features.tone}
`).join('')}`;
  }

  // 如果有评论分析数据，添加用户反馈洞察
  if (commentAnalyses && commentAnalyses.length > 0) {
    const avgPositiveRate = commentAnalyses.reduce((sum, analysis) => sum + analysis.sentimentDistribution.positive, 0) / commentAnalyses.length;
    const allPraises = commentAnalyses.flatMap(analysis => analysis.userFeedback.commonPraises);
    const allComplaints = commentAnalyses.flatMap(analysis => analysis.userFeedback.commonComplaints);
    const hotTopics = commentAnalyses.flatMap(analysis => analysis.hotTopics);
    
    enhancedContext += `

**用户反馈洞察：**
- 平均正面评价率：${(avgPositiveRate * 100).toFixed(1)}%
- 用户最喜欢的内容特点：${[...new Set(allPraises)].slice(0, 5).join('、')}
- 用户常见抱怨点：${[...new Set(allComplaints)].slice(0, 3).join('、')}
- 热门讨论话题：${hotTopics.slice(0, 5).map(topic => topic.topic).join('、')}

**用户偏好分析：**
${commentAnalyses.map((analysis, index) => `
笔记${index + 1}用户反馈：
- 好评关键词：${analysis.userFeedback.commonPraises.slice(0, 3).join('、')}
- 用户建议：${analysis.userFeedback.suggestions.slice(0, 2).join('、')}
- 互动质量：${analysis.interactionQuality.qualityScore}/10
`).join('')}`;
  }

  return `你是一位拥有百万粉丝的小红书资深博主，精通小红书算法和用户心理。现在需要你分析以下热门笔记内容，提取爆款公式和创作策略。

**原始热门笔记内容：**
${scrapedContent}
${enhancedContext}

**分析任务：**
请基于以上内容和数据洞察，深度分析并提取以下信息：

1. **标题公式分析** (titleFormulas)
   - 基于真实数据表现，提取最有效的标题公式
   - 结合用户反馈，优化标题吸引力
   - 避免用户抱怨的标题套路

2. **内容结构分析** (contentStructure)  
   - 分析高质量笔记的内容组织方式
   - 提取用户最喜欢的开头和结尾方式
   - 结合用户建议优化内容结构

3. **标签策略分析** (tagStrategy)
   - 基于热门话题提取有效标签
   - 结合用户讨论热点优化标签选择

4. **封面风格分析** (coverStyleAnalysis)
   - 分析高互动笔记的视觉特征
   - 结合用户偏好推荐封面风格

**输出要求：**
- 必须基于真实数据洞察，不要泛泛而谈
- 重点突出经过验证的成功要素
- 结合用户反馈优化建议
- 提供具体可执行的创作指导

请以JSON格式返回分析结果，确保格式正确且内容具体。`;
};

/**
 * 增强版生成提示词 - 基于数据洞察优化文案生成
 */
export const getEnhancedGenerationPrompt = (
  hotPostRules: string,
  userInfo: string,
  keyword: string,
  wordLimit: number = 600,
  insights?: ComprehensiveInsights,
  topPerformingNotes?: NoteContentAnalysis[]
): string => {
  let enhancedGuidance = '';
  
  // 如果有综合洞察，添加优化指导
  if (insights) {
    enhancedGuidance += `

**基于真实数据的创作指导：**

📊 **内容表现洞察：**
- 整体表现等级：${insights.performanceSummary.overallRating}
- 成功关键因素：${insights.performanceSummary.keySuccessFactors.join('、')}
- 需要改进的领域：${insights.performanceSummary.improvementAreas.join('、')}

👥 **受众洞察：**
- 主要受众群体：${insights.audienceInsights.primaryAudience}
- 受众核心需求：${insights.audienceInsights.audienceNeeds.join('、')}
- 内容偏好：${insights.audienceInsights.contentPreferences.join('、')}
- 互动习惯：${insights.audienceInsights.engagementPatterns.join('、')}

🎯 **优化建议：**
- 标题优化方向：${insights.optimizationSuggestions.titleOptimization.join('、')}
- 内容优化重点：${insights.optimizationSuggestions.contentOptimization.join('、')}
- 互动优化策略：${insights.optimizationSuggestions.engagementOptimization.join('、')}

💡 **创作灵感：**
- 相关热门话题：${insights.creativeInspiration.similarTopics.join('、')}
- 流行元素：${insights.creativeInspiration.trendingElements.join('、')}
- 推荐内容角度：${insights.creativeInspiration.contentAngles.join('、')}
- 格式建议：${insights.creativeInspiration.formatSuggestions.join('、')}`;
  }

  // 如果有高质量笔记参考，添加成功案例
  if (topPerformingNotes && topPerformingNotes.length > 0) {
    enhancedGuidance += `

**高质量笔记成功案例参考：**
${topPerformingNotes.slice(0, 3).map((note, index) => `
案例${index + 1}：
- 标题：${note.basicInfo.title}
- 综合评分：${note.contentQuality.overallScore}/10
- 成功要素：${note.contentQuality.strengths.join('、')}
- 内容类型：${note.features.contentType}
- 目标受众：${note.features.targetAudience}
- 行动号召：${note.features.callToAction.join('、')}
`).join('')}`;
  }

  return `你是一位拥有百万粉丝、精通小红书增长 Playbook 的资深博主。你深刻理解小红书的"中心化分发"漏斗算法。

**你的任务：**
基于热门笔记规律分析和真实数据洞察，为用户生成一篇${wordLimit}字左右的高质量小红书文案。

**热门笔记规律：**
${hotPostRules}

**用户原始资料：**
${userInfo}

**目标关键词：**
${keyword}
${enhancedGuidance}

**创作要求：**

1. **标题创作** (控制在20字以内)
   - 必须基于数据验证的成功公式
   - 结合用户反馈优化吸引力
   - 避免用户抱怨的套路化表达
   - 精准匹配目标受众需求

2. **正文创作** (${wordLimit}字左右)
   - 严格按照高质量笔记的内容结构
   - 融入用户最喜欢的表达方式
   - 解决受众的核心需求和痛点
   - 采用经过验证的语调风格
   - 包含有效的行动号召

3. **标签创作** (8-10个)
   - 基于热门话题和用户讨论热点
   - 结合流行元素和趋势关键词
   - 确保标签的搜索价值和互动潜力

4. **配图提示**
   - 基于高互动笔记的视觉特征
   - 结合用户偏好和成功案例
   - 提供具体可执行的拍摄指导

5. **自评论**
   - 基于用户互动习惯设计
   - 引导有意义的讨论和互动
   - 避免低质量的互动套路

6. **推广策略**
   - 基于数据洞察的发布时机建议
   - 针对目标受众的推广渠道
   - 互动优化的具体执行方案

7. **创作手册**
   - 总结本次创作的关键成功要素
   - 提供可复用的创作模板
   - 基于数据反馈的持续优化建议

**重要提醒：**
- 必须基于真实数据洞察，避免空洞的建议
- 重点突出经过验证的成功要素
- 确保内容与目标受众高度匹配
- 融入用户反馈和偏好分析
- 保持内容的真实性和人味

请严格按照以上要求创作，确保每个部分都有具体的内容输出。`;
};

/**
 * 竞品分析提示词
 */
export const getCompetitorAnalysisPrompt = (
  competitorNotes: NoteContentAnalysis[],
  competitorComments: CommentSentimentAnalysis[]
): string => {
  return `请基于以下竞品数据进行深度分析：

**竞品笔记分析数据：**
${competitorNotes.map((note, index) => `
竞品${index + 1}：
- 标题：${note.basicInfo.title}
- 内容质量：${note.contentQuality.overallScore}/10
- 互动表现：${note.engagement.engagementScore}/10
- 爆款潜力：${note.engagement.viralPotential}
- 成功要素：${note.contentQuality.strengths.join('、')}
- 内容类型：${note.features.contentType}
- 目标受众：${note.features.targetAudience}
`).join('')}

**竞品评论分析数据：**
${competitorComments.map((comment, index) => `
竞品${index + 1}用户反馈：
- 正面评价率：${(comment.sentimentDistribution.positive * 100).toFixed(1)}%
- 用户好评点：${comment.userFeedback.commonPraises.join('、')}
- 用户抱怨点：${comment.userFeedback.commonComplaints.join('、')}
- 热门话题：${comment.hotTopics.map(topic => topic.topic).join('、')}
`).join('')}

请分析并返回JSON格式的竞品洞察：

{
  "competitorStrengths": ["竞品优势1", "竞品优势2"],
  "competitorWeaknesses": ["竞品劣势1", "竞品劣势2"],
  "marketGaps": ["市场空白点1", "市场空白点2"],
  "differentiationOpportunities": ["差异化机会1", "差异化机会2"],
  "contentTrends": ["内容趋势1", "内容趋势2"],
  "audienceInsights": ["受众洞察1", "受众洞察2"],
  "recommendedStrategy": "基于竞品分析的推荐策略"
}

只返回JSON格式，不要添加任何解释。`;
};

/**
 * 趋势预测提示词
 */
export const getTrendPredictionPrompt = (
  historicalData: NoteContentAnalysis[],
  recentComments: CommentSentimentAnalysis[]
): string => {
  const recentNotes = historicalData.filter(note => {
    const noteDate = new Date(note.basicInfo.createTime);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return noteDate > thirtyDaysAgo;
  });

  return `基于以下历史数据和用户反馈，预测内容趋势：

**近期高质量内容分析：**
${recentNotes.slice(0, 10).map(note => `
- ${note.basicInfo.title} (评分: ${note.contentQuality.overallScore}/10)
  类型: ${note.features.contentType}, 受众: ${note.features.targetAudience}
`).join('')}

**用户反馈趋势：**
${recentComments.map(comment => `
- 热门话题：${comment.hotTopics.slice(0, 3).map(topic => topic.topic).join('、')}
- 用户需求：${comment.userFeedback.suggestions.slice(0, 2).join('、')}
`).join('')}

请预测未来趋势并返回JSON格式：

{
  "emergingTopics": ["新兴话题1", "新兴话题2"],
  "decliningTrends": ["衰落趋势1", "衰落趋势2"],
  "contentFormatTrends": ["内容格式趋势1", "内容格式趋势2"],
  "audienceBehaviorChanges": ["受众行为变化1", "受众行为变化2"],
  "recommendedContentTypes": ["推荐内容类型1", "推荐内容类型2"],
  "timingRecommendations": "发布时机建议",
  "keywordOpportunities": ["关键词机会1", "关键词机会2"]
}

只返回JSON格式，不要添加任何解释。`;
};

/**
 * 辅助函数：提取常见关键词
 */
function extractCommonKeywords(analyses: NoteContentAnalysis[]): string[] {
  const allKeywords = analyses.flatMap(analysis => 
    [...analysis.keywords.primaryKeywords, ...analysis.keywords.secondaryKeywords]
  );
  
  const keywordCount = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(keywordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([keyword]) => keyword);
}

/**
 * 辅助函数：提取成功要素
 */
function extractSuccessFactors(analyses: NoteContentAnalysis[]): string[] {
  const highQualityNotes = analyses.filter(analysis => analysis.contentQuality.overallScore >= 8);
  const allStrengths = highQualityNotes.flatMap(analysis => analysis.contentQuality.strengths);
  
  const strengthCount = allStrengths.reduce((acc, strength) => {
    acc[strength] = (acc[strength] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(strengthCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([strength]) => strength);
}
