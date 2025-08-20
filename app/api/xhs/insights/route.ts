import { NextRequest } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { HTTP_STATUS } from '@/lib/constants';
import { analyzeNoteContent, analyzeComments, getCombinedInsights, CommentItemLite } from '@/lib/analysis/xhs-analysis';

/**
 * 综合洞察API：聚合笔记详情与评论，返回分析与可执行建议
 * 最小化改动：不改动现有detail/comments接口，仅做聚合与分析
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const noteId = searchParams.get('noteId');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const pageIndex = parseInt(searchParams.get('pageIndex') || '0');

    if (!noteId) {
      return createErrorResponse('笔记ID不能为空', HTTP_STATUS.BAD_REQUEST);
    }
    if (!/^[a-f0-9]{24}$/i.test(noteId)) {
      return createErrorResponse('笔记ID格式无效', HTTP_STATUS.BAD_REQUEST);
    }

    // 复用现有API路由（通过内部HTTP调用）
    // {{ AURA-X: Modify - 使用请求origin避免localhost自调用失败. Confirmed via 寸止 }}
    const base = process.env.PRODUCTION_URL || request.nextUrl.origin;

    // {{ AURA-X: Add - 处理Vercel Deployment Protection绕过. Confirmed via 寸止 }}
    const bypassToken = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const bypassParams = bypassToken ? `&x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypassToken}` : '';

    const detailRes = await fetch(`${base}/api/xhs/detail?noteId=${noteId}${bypassParams}`);
    if (!detailRes.ok) {
      const t = await detailRes.text();
      return createErrorResponse(`获取笔记详情失败: ${t}`, detailRes.status);
    }
    const detailJson = await detailRes.json();

    const commentsRes = await fetch(`${base}/api/xhs/comments?noteId=${noteId}&pageSize=${pageSize}&pageIndex=${pageIndex}${bypassParams}`);
    if (!commentsRes.ok) {
      const t = await commentsRes.text();
      return createErrorResponse(`获取评论失败: ${t}`, commentsRes.status);
    }
    const commentsJson = await commentsRes.json();

    // 适配数据结构
    const noteDetail = detailJson.data; // XhsNoteDetail
    const comments: CommentItemLite[] = (commentsJson.comments || []).map((c: any) => ({
      id: c.id,
      content: c.content,
      likeCount: c.likeCount,
      createTime: c.createTime,
    }));

    // 调用分析模块
    const noteAnalysis = analyzeNoteContent(noteDetail);
    const commentAnalysis = analyzeComments(comments);
    const insights = getCombinedInsights(noteAnalysis, commentAnalysis);

    // 智能建议清单生成器
    const suggestions = buildSmartSuggestions(noteAnalysis, commentAnalysis);

    return createApiResponse({
      success: true,
      noteId,
      noteAnalysis,
      commentAnalysis,
      insights,
      suggestions,
    });

  } catch (error) {
    return createErrorResponse(`Insights计算失败: ${error instanceof Error ? error.message : '未知错误'}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// 将代表性问题转为首评草稿 + 标题/结构优化建议
function buildSmartSuggestions(noteAnalysis: ReturnType<typeof analyzeNoteContent>, commentAnalysis: ReturnType<typeof analyzeComments>) {
  const titles: string[] = [];
  const hook = noteAnalysis.bodyFeatures.openingHook;
  const hasNumber = noteAnalysis.titleFeatures.hasNumber;
  const topics = noteAnalysis.bodyFeatures.topics || [];

  // 标题优化（结合主题/数字/人群词）
  const mainTopic = topics[0] || (noteAnalysis.keywords[0] || '');
  if (mainTopic) {
    titles.push(`【${mainTopic}】我踩过的坑与避坑建议`);
    titles.push(`${mainTopic}｜新手必看：3个关键点，少走弯路`);
    titles.push(`${mainTopic}实测：到底值不值？我的真实体验`);
  } else {
    titles.push(`新手必看：这3点做好，效果直接翻倍`);
    titles.push(`真实体验：值不值？我的使用报告`);
    titles.push(`避坑指南：我踩过的那些雷，别再重复了`);
  }

  // 首评草稿（围绕代表性问题）
  const qas: string[] = (commentAnalysis.representativeQuestions || []).slice(0, 3).map((q, i) => `Q${i+1}: ${q}\nA: 【作者答】我这边的真实体验是...（给出明确结论+具体数据/场景）`);
  const firstCommentDraft = qas.length > 0
    ? `大家问得最多的问题在这里统一回复：\n${qas.join('\n\n')}\n如果还有想了解的，直接在评论区问我～`
    : `欢迎在评论区提问你最关心的问题，我会集中整理并更新在这里～`;

  // 正文结构建议
  const structureTips: string[] = [];
  const templates = noteAnalysis.templates?.labels || [];
  if (templates.includes('教程')) structureTips.push('按照「问题→步骤→注意事项→成果」的顺序组织，步骤使用有序列表标明');
  if (templates.includes('测评')) structureTips.push('补充「对比对象/标准/场景」与「优缺点」小结，给1句结论');
  if (templates.includes('种草')) structureTips.push('补充「适合人群/不适合人群」与「价格/渠道」信息，提升实用度');
  if (templates.includes('避坑')) structureTips.push('给出「踩雷原因→替代方案」的闭环；列出可复现的判断标准');
  if (templates.includes('故事')) structureTips.push('强化「时间-地点-人物-事件」四要素，并在结尾给出启示/建议');
  if (structureTips.length === 0) structureTips.push('建议采用「开头Hook→核心信息→案例/对比→结尾CTA」的四段式结构');

  // 可读性与口语化建议
  const readability = noteAnalysis.bodyFeatures.readability;
  const colloq = noteAnalysis.bodyFeatures.colloquiality;
  const qualityTips: string[] = [];
  if ((readability?.avgSentenceLen || 0) > 28) qualityTips.push('句子偏长，建议拆分为短句（≤15字）并增加换行');
  if ((readability?.avgParagraphLen || 0) > 160) qualityTips.push('段落偏长，建议3-5行一段，增强“呼吸感”');
  if ((colloq?.emojiCount || 0) < 2) qualityTips.push('适度加入Emoji作为段落小标题，提高亲和力和可读性');

  // CTA建议
  const ctaTips: string[] = [];
  const ctaStrength = noteAnalysis.bodyFeatures.ctaStrength;
  if (ctaStrength === 'none') ctaTips.push('结尾加上一句互动引导（如“想看哪一款？评论区告诉我”）');
  if (ctaStrength === 'light') ctaTips.push('可以更明确地提问或承诺更新，提升评论区活跃度');

  return {
    titleSuggestions: titles.slice(0, 3),
    firstCommentDraft,
    structureTips,
    qualityTips,
    ctaTips,
    attractionScore: noteAnalysis.attraction?.score || 0,
    detectedTemplates: templates,
  };
}

