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

// 导出历史记录相关类型
export type {
  HistoryItem,
  HistoryManagerConfig,
  HistorySearchOptions,
  HistoryExportOptions,
  HistoryStats
} from './history-types';
