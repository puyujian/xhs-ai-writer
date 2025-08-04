// 小红书API相关类型定义

/**
 * 小红书笔记项目接口 - 搜索API返回的结构
 */
export interface XhsNoteItem {
  id: string;
  model_type: "note" | string;
  note_card?: {
    display_title: string;
    title?: string;
    desc: string;
    user: {
      nickname: string;
      user_id?: string;
    };
    interact_info: {
      liked_count: number;
      comment_count: number;
      collected_count: number;
      share_count?: number;
    };
    cover?: {
      url: string;
      width?: number;
      height?: number;
    };
    tag_list?: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };
  // 兼容旧格式
  title?: string;
  display_title?: string;
  desc?: string;
  user?: {
    nickname: string;
    user_id?: string;
  };
  interact_info?: {
    liked_count: number;
    comment_count: number;
    collected_count: number;
    share_count?: number;
  };
  note_id?: string;
  cover?: {
    url: string;
    width?: number;
    height?: number;
  };
  tag_list?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

/**
 * 小红书API响应数据结构
 */
export interface XhsApiResponse {
  success: boolean;
  msg?: string;
  data: {
    items: XhsNoteItem[];
    has_more: boolean;
    cursor?: string;
    total?: number;
  };
}

/**
 * 处理后的笔记数据
 */
export interface ProcessedNote {
  title: string;
  desc: string;
  interact_info: {
    liked_count: number;
    comment_count: number;
    collected_count: number;
  };
  note_id: string;
  user_info: {
    nickname: string;
  };
}

/**
 * 分析结果接口
 */
export interface AnalysisResult {
  rules: string;
  summary: string;
  note_count: number;
}

/**
 * 生成内容接口
 */
export interface GeneratedContent {
  title: string[];
  body: string;
  keywords: string[];
  image_prompt: string;
}

/**
 * API错误响应
 */
export interface ApiError {
  error: string;
  details?: string;
  code?: number;
}

/**
 * 使用限制相关接口
 */
export interface UsageRecord {
  ip: string;
  count: number;
  lastUsed: number;
  resetDate: string; // YYYY-MM-DD 格式
  bonusCount?: number; // 额外获得的次数
}

export interface UsageStatus {
  remaining: number;
  total: number;
  resetTime: string;
  canUse: boolean;
  bonusRemaining?: number; // 剩余额外次数
}

/**
 * 兑换码相关接口
 */
export interface RedemptionCode {
  code: string;
  type: 'usage_bonus'; // 兑换码类型，目前只支持增加使用次数
  value: number; // 增加的次数
  isUsed: boolean;
  usedBy?: string; // 使用者IP
  usedAt?: number; // 使用时间戳
  createdAt: number;
  expiresAt: number;
  createdBy: string; // 创建者标识
}

export interface RedemptionResult {
  success: boolean;
  message: string;
  addedUsage?: number;
  newUsageStatus?: UsageStatus;
}
