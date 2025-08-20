/**
 * 小红书内容与评论分析模块（最小化改动版）
 * 说明：纯函数实现，无外部依赖，便于在API路由中直接调用。
 */

import { XhsNoteDetail } from '@/lib/types';

// 轻量情感词典（可按需扩展）
const POSITIVE_WORDS = ['喜欢', '爱了', '好用', '真香', '棒', '推荐', '惊喜', '满意', '快乐', '有效', '值'];
const NEGATIVE_WORDS = ['不好', '一般', '失望', '踩雷', '难用', '垃圾', '无语', '生气', '后悔', '浪费', '贵'];

// 基础停用词（中文+符号精简版）
const STOPWORDS = new Set(['的', '了', '和', '是', '就', '都', '很', '也', '在', '有', '还', '又', '啊', '呢', '吧', '呀', '啦', '我', '你', '他', '她', '它', '他们', '我们', '你们']);

export interface NoteContentAnalysis {
  // 标题要素
  titleFeatures: {
    length: number;
    hasNumber: boolean;
    hasHashtag: boolean;
    exclamationCount: number;
  };
  // 正文结构与要素
  bodyFeatures: {
    length: number;              // 正文字数
    paragraphCount: number;      // 段落数
    hasCTA: boolean;             // 是否包含评论引导等CTA
    ctaStrength?: 'none' | 'light' | 'strong'; // CTA强度（启发式）
    openingHook?: boolean;       // 是否存在开头Hook（首段是否含强提示/疑问/数字）
    endingCTA?: boolean;         // 末段是否存在CTA
    readability?: {
      avgSentenceLen: number;    // 平均句长（字）
      avgParagraphLen: number;   // 平均段落长度（字）
      ttr: number;               // 词汇多样性（独特词/总词）
      shortSentenceRatio: number;// 短句比率（<=15字）
    };
    sentiment?: {
      positiveHits: number;      // 正向词命中数（正文）
      negativeHits: number;      // 负向词命中数（正文）
      score: number;             // (pos-neg)/句数
    };
    colloquiality?: {
      emojiCount: number;        // Emoji/表情
      fillerWords: number;       // 语气词/口头禅
      slangHits: number;         // 俚语/网络词
    };
    topics?: string[];           // #话题 标签
  };
  // 媒体要素
  mediaFeatures: {
    imageCount: number;
    hasVideo: boolean;
    videoDurationSec?: number;
  };
  // 互动要素
  engagement: {
    like: number;
    favorite: number;
    comment: number;
    share: number;
    engagementRate: number; // (赞+藏+评)/1000字的简单归一
  };
  keywords: string[]; // 朴素关键词（基于词频）
  // 内容结构模板识别
  templates?: {
    labels: Array<'教程' | '测评' | '种草' | '避坑' | '故事'>;
    confidence: number; // 0-1
    reasons: string[];  // 命中规则说明
  };
  // 综合吸引力评分
  attraction?: {
    score: number; // 0-100
    breakdown: {
      title: number;
      openingHook: number;
      cta: number;
      readability: number;
      colloquiality: number;
    };
  };
}

export interface CommentItemLite {
  id: string;
  content: string;
  likeCount?: number;
  createTime?: string;
}

export interface CommentAnalysis {
  total: number;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    score: number; // [-1,1]
  };
  hotComments: CommentItemLite[]; // 依据点赞/长度的TopN
  topKeywords: Array<{ word: string; count: number }>;
  representativeQuestions: string[]; // 疑问句抽取
}

export interface CombinedInsights {
  summary: string;
  strengths: string[];
  risks: string[];
  opportunities: string[];
  suggestions: string[];
}

function tokenize(text: string): string[] {
  // 粗粒度分词：按非中英数字拆分，过滤停用词和长度为1的噪声（保留重要单字）
  return (text || '')
    .toLowerCase()
    .replace(/[`~!@#$%^&*()_+\-=[\]{};':",./<>?\\|\s]+/g, ' ')
    .split(' ')
    .map(t => t.trim())
    .filter(t => t && !STOPWORDS.has(t));
}

function extractTopKeywords(texts: string[], topK: number = 15): string[] {
  const freq = new Map<string, number>();
  for (const t of texts) {
    for (const tok of tokenize(t)) {
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([w]) => w);
}

function extractTopKeywordsWithCounts(texts: string[], topK: number = 15): Array<{ word: string; count: number }> {
  const freq = new Map<string, number>();
  for (const t of texts) {
    for (const tok of tokenize(t)) {
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([word, count]) => ({ word, count }));
}

export function analyzeNoteContent(note: XhsNoteDetail): NoteContentAnalysis {
  const title = note.title || '';
  const content = note.content || '';

  const titleFeatures = {
    length: title.length,
    hasNumber: /[0-9０-９一二三四五六七八九十]/.test(title),
    hasHashtag: /[#＃]/.test(title),
    exclamationCount: (title.match(/!|！/g) || []).length,
  };

  const paragraphs = content.split(/\n+/).filter(Boolean);

  // 句子切分（粗粒度，按句号/问号/感叹号）
  const sentences = (content.match(/[^。！？!?\n]+[。！？!?]?/g) || []).map(s => s.trim()).filter(Boolean);
  const totalChars = content.length;
  const avgSentenceLen = sentences.length ? totalChars / sentences.length : totalChars;
  const avgParagraphLen = paragraphs.length ? totalChars / paragraphs.length : totalChars;
  const shortSentenceRatio = sentences.length ? (sentences.filter(s => s.length <= 15).length / sentences.length) : 0;

  // 词汇多样性（TTR）
  const tokens = tokenize(content);
  const uniqueTokens = new Set(tokens);
  const ttr = tokens.length ? uniqueTokens.size / tokens.length : 0;

  // CTA 检测与强度
  const hasCTA = /评论|留言|告诉我|想看|要不要|你们|点个赞|收藏|转发/.test(content);
  const strongCTA = /(一定|必须|快|现在|立刻).*(评论|留言|收藏|转发)|在评论区/.test(content);
  const ctaStrength: 'none' | 'light' | 'strong' = !hasCTA ? 'none' : (strongCTA ? 'strong' : 'light');

  // 开头hook与结尾CTA
  const firstPara = paragraphs[0] || '';
  const lastPara = paragraphs[paragraphs.length - 1] || '';
  const openingHook = /[0-9一二三四五六七八九十]|\?|？|震惊|必须|不要|别|我|亲测|实测/.test(firstPara);
  const endingCTA = /(评论|留言|告诉我|想看|收藏|转发|一起|下次|下期|想要)/.test(lastPara);

  // 文本情感（正文）
  const posHits = POSITIVE_WORDS.reduce((acc, w) => acc + (content.includes(w) ? 1 : 0), 0);
  const negHits = NEGATIVE_WORDS.reduce((acc, w) => acc + (content.includes(w) ? 1 : 0), 0);
  const sentScore = sentences.length ? (posHits - negHits) / sentences.length : 0;

  // 口语化程度
  const emojiCount = (content.match(/[😂😊😍💪✨🔥👍👉💕🥹😅😭🐶🐱⭐️⭐︎⭐]/g)?.length || 0);
  const fillerWords = (content.match(/啊|呀|吧|呢|嘛|哇|欸|呗|诶/g)?.length || 0);
  const slangHits = (content.match(/绝绝子|YYDS|yyds|牛逼|牛B|OMG|omg|冲|冲冲冲|盘它|真香/g)?.length || 0);

  // 话题标签抽取（正文 + note结构）
  const hashTopics = Array.from(new Set((content.match(/[#＃][\w\u4e00-\u9fa5]+/g) || []).map(s => s.replace(/^[#＃]/, ''))));
  const structTopics = [
    ...(note as any).featureTags?.map((t: any) => t?.name || t)?.filter(Boolean) || [],
    ...(note as any).contentTags?.map((t: any) => t?.name || t)?.filter(Boolean) || [],
  ];
  const topics = Array.from(new Set([...hashTopics, ...structTopics])).slice(0, 20);

  // 结构模板识别（启发式规则）
  const templateRules: Array<{label: '教程'|'测评'|'种草'|'避坑'|'故事'; test: (t: string)=>boolean; reason: string}> = [
    { label: '教程', test: t => /(步骤|Step|步骤\d|教程|指南|攻略|清单|方法|流程)/i.test(t) || /\d+\.?\s*[、.：:]/.test(t), reason: '包含步骤/攻略/清单等词或编号结构' },
    { label: '测评', test: t => /(测评|评测|上脸|上手|体验|对比|优缺点|打分|评分)/.test(t), reason: '包含测评/对比/体验等关键词' },
    { label: '种草', test: t => /(安利|种草|必须入|闭眼入|好用到|真香|推荐|回购)/.test(t), reason: '包含推荐/安利/回购等关键词' },
    { label: '避坑', test: t => /(避坑|踩雷|不要买|后悔|血泪|千万别|警告)/.test(t), reason: '包含避坑/踩雷/警告等关键词' },
    { label: '故事', test: t => /(故事|那天|后来|第一次|有一次|朋友说|我妈说|他\/她说)/.test(t) || /“.*”/.test(t), reason: '出现叙事/对话/时间线线索' },
  ];
  const matched = templateRules.filter(r => r.test(content));
  const templates = {
    labels: matched.map(m => m.label),
    confidence: Math.min(1, matched.length / 3),
    reasons: matched.map(m => m.reason),
  };

  // 吸引力评分（0-100）
  const titleScore = (titleFeatures.hasNumber ? 30 : 0) + (titleFeatures.hasHashtag ? 10 : 0) + Math.min(10, titleFeatures.exclamationCount * 3);
  const openingScore = openingHook ? 20 : 0;
  const ctaScore = ctaStrength === 'strong' ? 20 : (ctaStrength === 'light' ? 10 : 0);
  const readabilityScore = Math.max(0, 20
    - Math.max(0, (avgSentenceLen - 24)) * 0.6
    - Math.max(0, (avgParagraphLen - 120)) * 0.05
    + shortSentenceRatio * 10);
  const colloquialityScore = Math.min(20, (emojiCount >= 2 ? 8 : emojiCount * 3)
    + Math.min(6, fillerWords)
    + Math.min(6, slangHits));
  let totalScore = titleScore + openingScore + ctaScore + readabilityScore + colloquialityScore;
  totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  const attraction = {
    score: totalScore,
    breakdown: {
      title: Math.round(titleScore),
      openingHook: Math.round(openingScore),
      cta: Math.round(ctaScore),
      readability: Math.round(readabilityScore),
      colloquiality: Math.round(colloquialityScore),
    }
  };

  const bodyFeatures = {
    length: totalChars,
    paragraphCount: paragraphs.length,
    hasCTA,
    ctaStrength,
    openingHook,
    endingCTA,
    readability: {
      avgSentenceLen: Number(avgSentenceLen.toFixed(1)),
      avgParagraphLen: Number(avgParagraphLen.toFixed(1)),
      ttr: Number(ttr.toFixed(3)),
      shortSentenceRatio: Number(shortSentenceRatio.toFixed(3)),
    },
    sentiment: {
      positiveHits: posHits,
      negativeHits: negHits,
      score: Number(sentScore.toFixed(3)),
    },
    colloquiality: {
      emojiCount,
      fillerWords,
      slangHits,
    },
    topics,
  } as NoteContentAnalysis['bodyFeatures'];

  const mediaFeatures = {
    imageCount: note.imagesList?.length || 0,
    hasVideo: !!note.videoInfo,
    videoDurationSec: note.videoInfo?.meta?.duration,
  };

  const like = note.likeNum || 0;
  const favorite = note.favNum || 0;
  const comment = note.cmtNum || 0;
  const share = note.shareNum || 0;
  const thousandChars = Math.max(1, Math.round((content.length || 1) / 1000));
  const engagementRate = (like + favorite + comment) / thousandChars;

  const keywords = extractTopKeywords([title + ' ' + content], 20);

  return {
    titleFeatures,
    bodyFeatures,
    mediaFeatures,
    engagement: { like, favorite, comment, share, engagementRate },
    keywords,
    templates,
    attraction,
  };
}

export function analyzeComments(comments: CommentItemLite[], topN: number = 20): CommentAnalysis {
  const total = comments.length;
  let pos = 0, neg = 0, neu = 0;

  const texts: string[] = [];
  const hotScore = (c: CommentItemLite) => (c.likeCount || 0) + Math.min((c.content || '').length / 20, 10);

  for (const c of comments) {
    const text = c.content || '';
    texts.push(text);
    const pHits = POSITIVE_WORDS.filter(w => text.includes(w)).length;
    const nHits = NEGATIVE_WORDS.filter(w => text.includes(w)).length;
    if (pHits === 0 && nHits === 0) neu++;
    else if (pHits >= nHits) pos++;
    else neg++;
  }

  const score = total > 0 ? (pos - neg) / total : 0;
  const topKeywords = extractTopKeywordsWithCounts(texts, 20);
  const hotComments = comments
    .slice()
    .sort((a, b) => hotScore(b) - hotScore(a))
    .slice(0, Math.min(topN, 10));

  // 简单疑问句抽取
  const representativeQuestions = comments
    .map(c => c.content)
    .filter(Boolean)
    .filter(t => /\?$|？$|怎么|为何|为什么|哪款|多少钱|靠谱吗/.test(t!))
    .slice(0, 5) as string[];

  return {
    total,
    sentiment: { positive: pos, negative: neg, neutral: neu, score: Number(score.toFixed(3)) },
    hotComments,
    topKeywords,
    representativeQuestions,
  };
}

export function getCombinedInsights(noteA: NoteContentAnalysis, cmtA: CommentAnalysis): CombinedInsights {
  const strengths: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const suggestions: string[] = [];

  // 优势识别
  if (noteA.mediaFeatures.imageCount >= 3) strengths.push('图片素材充足，利于信息量展示');
  if (noteA.mediaFeatures.hasVideo) strengths.push('包含视频，提升停留时长');
  if (noteA.bodyFeatures.hasCTA) strengths.push('正文包含互动引导，有利于评论增长');
  if (noteA.bodyFeatures.openingHook) strengths.push('开头具备Hook，利于提升完读率');

  // 风险提示
  if (noteA.titleFeatures.length > 20) risks.push('标题可能偏长，建议控制在20字以内');
  if (cmtA.sentiment.score < 0) risks.push('评论负向比例偏高，需检查争议点或误导点');
  if ((noteA.bodyFeatures.readability?.avgSentenceLen || 0) > 28) risks.push('句子偏长，影响可读性');

  // 机会识别
  if (cmtA.representativeQuestions.length > 0) opportunities.push('围绕高频疑问制作FAQ或首评补充');
  if ((noteA.bodyFeatures.topics || []).length > 0) opportunities.push('利用#话题 提升搜索召回与相关性');
  if (noteA.bodyFeatures.ctaStrength === 'light') opportunities.push('可提升CTA强度，促进评论与收藏');

  // 建议
  suggestions.push('标题建议加入数字/场景/人群限定以提升点击');
  suggestions.push('在正文前两段嵌入核心利益点与关键词，优化SEO召回');
  if (!noteA.bodyFeatures.endingCTA) suggestions.push('结尾安排明确CTA，引导评论与收藏');
  if ((noteA.bodyFeatures.colloquiality?.emojiCount || 0) < 2) suggestions.push('适度加入Emoji/语气词，增强口语化与亲和力');

  const summary = `情感得分${cmtA.sentiment.score}，关键词${noteA.keywords.slice(0,5).join(' / ')}，互动率约${noteA.engagement.engagementRate.toFixed(1)}；可读性(句均/段均)≈${noteA.bodyFeatures.readability?.avgSentenceLen}/${noteA.bodyFeatures.readability?.avgParagraphLen}`;

  return { summary, strengths, risks, opportunities, suggestions };
}

