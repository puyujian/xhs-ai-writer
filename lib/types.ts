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
 * 小红书笔记详情接口 - 基于实际API响应结构
 */
export interface XhsNoteDetail {
  noteId: string;
  noteLink: string;
  userId: string;
  headPhoto?: string;
  name?: string;
  redId?: string;
  type: number;
  atUserList?: any[];
  title: string;
  content: string;
  imagesList: Array<{
    fileId: string;
    url: string;
    original: string;
    width: number;
    height: number;
    latitude?: number;
    longitude?: number;
    traceId: string;
    sticker?: any;
  }>;
  videoInfo?: {
    id: string;
    videoKey: string;
    originVideoKey: string;
    meta: {
      width: number;
      height: number;
      duration: number;
    };
    gifKey: string;
    videoUrl: string;
    gifUrl: string;
    videoKeyList: string[];
    hasFragments: boolean;
    thumbnail: string;
    firstFrame: string;
    volume: number;
    chapters?: any;
  };
  time: {
    createTime: number;
    updateTime: number;
    userUpdateTime: number;
  };
  createTime: string;
  impNum: number;
  likeNum: number;
  favNum: number;
  cmtNum: number;
  readNum: number;
  shareNum: number;
  followCnt: number;
  reportBrandUserId?: string;
  reportBrandName?: string;
  featureTags?: any[];
  userInfo: {
    nickName: string;
    avatar: string;
    userId: string;
    advertiserId?: string;
    fansNum: number;
    cooperType: number;
    priceState?: any;
    pictureState?: any;
    picturePrice?: any;
    videoState?: any;
    videoPrice?: any;
    userType: number;
    operateState?: any;
    currentLevel?: any;
    location: string;
    contentTags: any[];
    featureTags: any[];
    personalTags: any[];
    gender: string;
    isCollect: boolean;
    clickMidNum: number;
    interMidNum: number;
    pictureInCart?: any;
    videoInCart?: any;
    kolType?: any;
    mEngagementNum: number;
  };
  compClickData?: any;
}

/**
 * 小红书笔记详情API响应
 */
export interface XhsNoteDetailResponse {
  code: number;
  msg: string;
  guid?: string;
  success: boolean;
  data: XhsNoteDetail;
}

/**
 * 小红书评论项接口 - 基于实际API响应结构
 */
export interface XhsComment {
  comment: {
    id: number;
    idStr: string;
    createTime: string;
    userId: number;
    userIdStr: string;
    content: string;
    noteId: number;
    noteIdStr: string;
    enabled: boolean;
    atUsers: any[] | null;
    likeCount: number;
    updateTime: string;
    targetCommentId: number;
    subCommentCount: number;
  };
  createTime: number;
  updateTime: number;
  l1L2Comments: Array<{
    id: number;
    idStr: string;
    createTime: string;
    userId: number;
    userIdStr: string;
    content: string;
    noteId: number;
    noteIdStr: string;
    enabled: boolean;
    atUsers: any[] | null;
    likeCount: number;
    updateTime: string;
    targetCommentId: number;
    subCommentCount: number;
  }>;
  userMap: {
    [userId: string]: {
      userId: string;
      userNickName: string;
      imageUrl: string;
      gender: string;
    };
  };
}

/**
 * 小红书评论API响应 - 基于实际API响应结构
 */
export interface XhsCommentsResponse {
  code: number;
  msg: string;
  guid: any;
  success: boolean;
  data: XhsComment[];
}

// 导出历史记录相关类型
export type {
  HistoryItem,
  HistoryManagerConfig,
  HistorySearchOptions,
  HistoryExportOptions,
  HistoryStats
} from './history-types';
