/**
 * 应用常量定义
 */

// API相关常量
export const API_ENDPOINTS = {
  XHS_SEARCH: 'https://edith.xiaohongshu.com/api/sns/web/v1/search/notes',
  ANALYZE_HOT_POSTS: '/api/analyze-hot-posts',
  GENERATE_COMBINED: '/api/generate-combined',
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
  MISSING_KEYWORD: '请填写关键词和原始资料',
  MISSING_REQUIRED_PARAMS: '缺少必需参数',
  XHS_COOKIE_NOT_CONFIGURED: 'XHS_COOKIE is not configured in environment variables.',
  XHS_API_ERROR: '小红书API返回错误状态',
  XHS_DATA_STRUCTURE_ERROR: '小红书API返回的数据结构异常',
  NO_NOTES_FOUND: '未找到相关笔记内容',
  FETCH_HOT_POSTS_ERROR: '无法获取小红书数据',
  GENERATE_CONTENT_ERROR: '生成内容失败',
  AI_CONNECTION_ERROR: 'AI连接失败',
  SERVER_ERROR: '服务器错误',
  GENERATION_CANCELLED: '生成已取消',
} as const;

// 成功消息常量
export const SUCCESS_MESSAGES = {
  AI_CONNECTED: '连接成功',
  CONTENT_GENERATED: '内容生成成功',
  ANALYSIS_COMPLETED: '分析完成',
} as const;

// 配置常量
export const CONFIG = {
  DEFAULT_AI_MODEL: 'gemini-2.5-flash',
  // Gemini有1M上下文，不需要限制max_tokens
  TEMPERATURE: 0.4, // 降低温度提高输出稳定性
  TARGET_NOTES_COUNT: 40,
  MAX_PAGES: 3,
  TRACE_ID_LENGTH: 16,
  // 流式生成配置
  MAX_CONTENT_LENGTH: 8000, // 限制内容长度，防止提示词过长
  STREAM_CHUNK_SIZE: 8, // 流式输出时每个块的字符数
  TYPEWRITER_INTERVAL: 30, // 打字机效果间隔(ms)
  // 缓存配置
  CACHE_EXPIRY_HOURS: 24, // 缓存过期时间
  // 请求超时配置（优化版 - 适配 Vercel 180s 限制）
  REQUEST_TIMEOUT: 15000, // 15秒通用请求超时
  AI_REQUEST_TIMEOUT: 90000, // 90秒 AI 请求超时（单次请求）
  AI_STREAM_TIMEOUT: 120000, // 120秒 AI 流式生成超时
  MCP_REQUEST_TIMEOUT: 20000, // 20秒 MCP 请求超时（从30秒降低）
  MCP_HEALTH_CHECK_TIMEOUT: 3000, // 3秒 MCP 健康检查超时（从5秒降低）
  // Vercel 函数总超时预留（留 10 秒缓冲）
  VERCEL_SAFE_TIMEOUT: 170000, // 170秒，预留 10 秒给清理工作
} as const;

// HTTP状态码
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// 小红书相关常量
export const XHS_CONFIG = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  REFERER: 'https://www.xiaohongshu.com/',
  ORIGIN: 'https://www.xiaohongshu.com',
  CONTENT_TYPE: 'application/json;charset=UTF-8',
} as const;
