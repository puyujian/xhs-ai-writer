/**
 * 数据利用方案使用示例
 * 展示如何使用新增的数据分析和AI增强功能
 */

import { dataAnalyzer } from '@/lib/data-analyzer';
import { dataStorage } from '@/lib/data-storage';
import { businessIntelligence } from '@/lib/business-intelligence';
import { batchProcessor } from '@/lib/batch-processor';
import { enhancedCacheManager } from '@/lib/enhanced-cache-manager';

/**
 * 示例1：单个笔记的完整分析流程
 */
export async function example1_SingleNoteAnalysis() {
  console.log('=== 示例1：单个笔记完整分析 ===');
  
  const noteId = '689c3e96000000001d02a88e';
  
  try {
    // 1. 获取笔记详情（从存储或API）
    const noteData = await dataStorage.getNoteDetail(noteId);
    if (!noteData) {
      console.log('笔记数据不存在，需要先获取');
      return;
    }
    
    // 2. 分析笔记内容
    console.log('🔍 分析笔记内容...');
    const noteAnalysis = await dataAnalyzer.analyzeNoteContent(noteData.noteDetail);
    console.log('📊 内容质量评分:', noteAnalysis.contentQuality.overallScore);
    console.log('🎯 爆款潜力:', noteAnalysis.engagement.viralPotential);
    
    // 3. 分析评论情感（模拟评论数据）
    console.log('💬 分析评论情感...');
    const mockComments = [
      { content: '太实用了！', user: { nickname: '用户1' } },
      { content: '学到了很多', user: { nickname: '用户2' } },
      { content: '期待更多分享', user: { nickname: '用户3' } }
    ];
    const commentAnalysis = await dataAnalyzer.analyzeCommentSentiment(mockComments);
    console.log('😊 正面评价率:', (commentAnalysis.sentimentDistribution.positive * 100).toFixed(1) + '%');
    
    // 4. 生成综合洞察
    console.log('💡 生成综合洞察...');
    const insights = await dataAnalyzer.generateComprehensiveInsights(noteAnalysis, commentAnalysis);
    console.log('🏆 整体表现:', insights.performanceSummary.overallRating);
    console.log('👥 主要受众:', insights.audienceInsights.primaryAudience);
    
    // 5. 保存分析结果
    await dataStorage.saveAnalysis(noteId, noteAnalysis, commentAnalysis);
    await dataStorage.saveInsights(noteId, insights);
    
    console.log('✅ 单个笔记分析完成');
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  }
}

/**
 * 示例2：批量笔记分析
 */
export async function example2_BatchAnalysis() {
  console.log('=== 示例2：批量笔记分析 ===');
  
  const noteIds = [
    '689c3e96000000001d02a88e',
    '68a41ccc000000001c00c16d',
    // 更多笔记ID...
  ];
  
  try {
    // 1. 准备笔记数据
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
    
    console.log(`📦 准备分析 ${notesData.length} 个笔记`);
    
    // 2. 批量分析
    const result = await batchProcessor.batchAnalyzeNotes(notesData, {
      batchSize: 5,
      priority: 'high',
      skipExisting: true,
      onProgress: (progress) => {
        console.log(`📈 进度: ${progress.percentage.toFixed(1)}% (${progress.completed}/${progress.total})`);
      }
    });
    
    console.log('✅ 批量分析完成');
    console.log(`📊 成功: ${result.completedTasks}, 失败: ${result.failedTasks}`);
    console.log(`⚡ 吞吐量: ${result.throughput.toFixed(2)} 任务/秒`);
    
  } catch (error) {
    console.error('❌ 批量分析失败:', error);
  }
}

/**
 * 示例3：竞品分析
 */
export async function example3_CompetitorAnalysis() {
  console.log('=== 示例3：竞品分析 ===');
  
  try {
    // 1. 执行竞品分析
    console.log('🔍 分析竞品...');
    const analysis = await businessIntelligence.analyzeCompetitors(
      '护肤',      // 关键词
      'beauty',    // 分类
      20           // 分析数量
    );
    
    console.log('💪 竞品优势:', analysis.competitorStrengths.slice(0, 3));
    console.log('🎯 市场空白:', analysis.marketGaps.slice(0, 3));
    console.log('🚀 差异化机会:', analysis.differentiationOpportunities.slice(0, 3));
    console.log('📊 平均评分:', analysis.benchmarkData.avgScore.toFixed(1));
    
    console.log('✅ 竞品分析完成');
    
  } catch (error) {
    console.error('❌ 竞品分析失败:', error);
  }
}

/**
 * 示例4：趋势预测
 */
export async function example4_TrendPrediction() {
  console.log('=== 示例4：趋势预测 ===');
  
  try {
    // 1. 执行趋势预测
    console.log('📈 预测趋势...');
    const prediction = await businessIntelligence.predictTrends(
      'lifestyle',  // 分类
      30           // 时间范围（天）
    );
    
    console.log('🔥 新兴话题:', prediction.emergingTopics.slice(0, 5));
    console.log('📉 衰落趋势:', prediction.decliningTrends.slice(0, 3));
    console.log('💡 推荐内容类型:', prediction.recommendedContentTypes.slice(0, 3));
    console.log('🎯 关键词机会:', prediction.keywordOpportunities.slice(0, 5));
    console.log('📊 预测置信度:', (prediction.confidenceScore * 100).toFixed(1) + '%');
    
    console.log('✅ 趋势预测完成');
    
  } catch (error) {
    console.error('❌ 趋势预测失败:', error);
  }
}

/**
 * 示例5：个性化推荐
 */
export async function example5_PersonalizedRecommendations() {
  console.log('=== 示例5：个性化推荐 ===');
  
  try {
    // 1. 定义用户画像
    const userProfile = {
      category: 'beauty',
      targetAudience: '25-35岁女性',
      contentStyle: '专业+亲和',
      goals: ['提升互动', '增加粉丝', '建立专业形象']
    };
    
    // 2. 生成个性化推荐
    console.log('🎯 生成个性化推荐...');
    const recommendations = await businessIntelligence.generatePersonalizedRecommendations(
      userProfile
    );
    
    console.log('📝 内容建议数量:', recommendations.contentSuggestions.length);
    console.log('🔧 优化建议数量:', recommendations.optimizationTips.length);
    console.log('🚨 趋势提醒数量:', recommendations.trendAlerts.length);
    
    // 3. 展示高优先级建议
    const highPriorityContent = recommendations.contentSuggestions
      .filter(s => s.priority === 'high')
      .slice(0, 3);
    
    console.log('⭐ 高优先级内容建议:');
    highPriorityContent.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion.title}`);
      console.log(`     预期表现: ${suggestion.expectedPerformance}/10`);
    });
    
    console.log('✅ 个性化推荐完成');
    
  } catch (error) {
    console.error('❌ 个性化推荐失败:', error);
  }
}

/**
 * 示例6：增强版文案生成
 */
export async function example6_EnhancedGeneration() {
  console.log('=== 示例6：增强版文案生成 ===');
  
  try {
    // 1. 准备参数
    const keyword = '护肤';
    const userInfo = '25岁女性，关注护肤美妆，希望分享护肤心得';
    const referenceNoteIds = ['689c3e96000000001d02a88e'];
    
    // 2. 调用增强版生成API（模拟）
    console.log('🚀 启动增强版文案生成...');
    
    const requestBody = {
      keyword,
      user_info: userInfo,
      word_limit: 600,
      enable_data_insights: true,
      reference_note_ids: referenceNoteIds,
      competitor_analysis: true,
      trend_analysis: true,
      personalized_recommendations: true,
      user_profile: {
        category: 'beauty',
        targetAudience: '年轻女性',
        contentStyle: '专业+亲和',
        goals: ['提升互动', '增加粉丝']
      }
    };
    
    console.log('📊 请求参数:', {
      keyword: requestBody.keyword,
      enable_data_insights: requestBody.enable_data_insights,
      reference_notes: requestBody.reference_note_ids.length,
      competitor_analysis: requestBody.competitor_analysis,
      trend_analysis: requestBody.trend_analysis
    });
    
    // 实际使用时，这里会调用 /api/enhanced-generate
    console.log('💡 提示：实际使用时调用 POST /api/enhanced-generate');
    console.log('✅ 增强版文案生成配置完成');
    
  } catch (error) {
    console.error('❌ 增强版文案生成失败:', error);
  }
}

/**
 * 示例7：缓存管理
 */
export async function example7_CacheManagement() {
  console.log('=== 示例7：缓存管理 ===');
  
  try {
    // 1. 获取缓存统计
    const stats = enhancedCacheManager.getCacheStats();
    console.log('📊 缓存统计:');
    console.log('  内存缓存大小:', stats.memory.size);
    console.log('  缓存命中率:', (stats.performance.hitRate * 100).toFixed(1) + '%');
    console.log('  压缩节省空间:', stats.compression.saved, 'bytes');
    
    // 2. 批量缓存操作
    const testData = new Map([
      ['test_key_1', { data: 'test_value_1' }],
      ['test_key_2', { data: 'test_value_2' }],
      ['test_key_3', { data: 'test_value_3' }]
    ]);
    
    console.log('💾 批量保存缓存...');
    const savedCount = await enhancedCacheManager.batchSaveCacheData(testData, {
      priority: 'medium'
    });
    console.log('✅ 成功保存:', savedCount, '项');
    
    // 3. 批量获取缓存
    console.log('📖 批量获取缓存...');
    const keys = ['test_key_1', 'test_key_2', 'test_key_3'];
    const results = await enhancedCacheManager.batchGetCacheData(keys);
    console.log('✅ 成功获取:', results.size, '项');
    
    // 4. 清理过期缓存
    console.log('🧹 清理过期缓存...');
    await enhancedCacheManager.cleanupExpiredCache();
    console.log('✅ 缓存清理完成');
    
  } catch (error) {
    console.error('❌ 缓存管理失败:', error);
  }
}

/**
 * 示例8：数据查询和统计
 */
export async function example8_DataQuery() {
  console.log('=== 示例8：数据查询和统计 ===');
  
  try {
    // 1. 查询高质量笔记
    console.log('🔍 查询高质量笔记...');
    const highQualityNotes = await dataStorage.queryNotes({
      minScore: 8,
      limit: 10,
      sortBy: 'score',
      sortOrder: 'desc'
    });
    console.log('⭐ 找到高质量笔记:', highQualityNotes.length, '篇');
    
    // 2. 按分类查询
    console.log('📂 按分类查询...');
    const beautyNotes = await dataStorage.queryNotes({
      category: 'beauty',
      limit: 20
    });
    console.log('💄 美妆类笔记:', beautyNotes.length, '篇');
    
    // 3. 关键词查询
    console.log('🔎 关键词查询...');
    const skinCareNotes = await dataStorage.queryNotes({
      keywords: ['护肤', '保养'],
      limit: 15
    });
    console.log('🧴 护肤相关笔记:', skinCareNotes.length, '篇');
    
    // 4. 获取存储统计
    console.log('📊 获取存储统计...');
    const storageStats = await dataStorage.getStorageStats();
    console.log('📝 总笔记数:', storageStats.totalNotes);
    console.log('🔬 总分析数:', storageStats.totalAnalyses);
    console.log('💡 总洞察数:', storageStats.totalInsights);
    console.log('💾 内存缓存:', storageStats.memoryCache);
    
    console.log('✅ 数据查询完成');
    
  } catch (error) {
    console.error('❌ 数据查询失败:', error);
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('🚀 开始运行所有示例...\n');
  
  const examples = [
    example1_SingleNoteAnalysis,
    example2_BatchAnalysis,
    example3_CompetitorAnalysis,
    example4_TrendPrediction,
    example5_PersonalizedRecommendations,
    example6_EnhancedGeneration,
    example7_CacheManagement,
    example8_DataQuery
  ];
  
  for (let i = 0; i < examples.length; i++) {
    try {
      await examples[i]();
      console.log(`\n✅ 示例 ${i + 1} 完成\n`);
    } catch (error) {
      console.error(`\n❌ 示例 ${i + 1} 失败:`, error, '\n');
    }
    
    // 示例间延迟
    if (i < examples.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('🎉 所有示例运行完成！');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
