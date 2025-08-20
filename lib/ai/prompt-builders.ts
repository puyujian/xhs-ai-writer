/**
 * 将洞察注入到现有生成流程的提示词构建器（最小改动版）
 */

import { getGenerationPrompt } from '@/lib/prompts';

export interface InsightsPayload {
  noteAnalysis: any;
  commentAnalysis: any;
  insights: any;
}

export function buildPromptWithInsights(
  baseHotPostRulesJson: string,
  userInfo: string,
  keyword: string,
  wordLimit: number,
  insights?: InsightsPayload
): string {
  // 将洞察压缩为简洁的上下文注释，注入到hotPostRules后
  const extra = insights ? `\n/* 洞察摘要（用于增强共鸣与反驳段落）\n- strengths: ${insights.insights?.strengths?.slice(0,3).join('；') || ''}\n- risks: ${insights.insights?.risks?.slice(0,3).join('；') || ''}\n- opportunities: ${insights.insights?.opportunities?.slice(0,3).join('；') || ''}\n- representativeQuestions: ${(insights.commentAnalysis?.representativeQuestions || []).slice(0,3).join('；')}\n*/\n` : '';

  const merged = baseHotPostRulesJson + extra;
  return getGenerationPrompt(merged, userInfo, keyword, wordLimit);
}

