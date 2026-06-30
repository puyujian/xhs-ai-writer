/**
 * 应用常量定义
 */

function readPositiveNumberEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : defaultValue;
}

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
  // 默认温度（兜底值）：尽量不要直接用于正文生成
  TEMPERATURE: 0.4,
  // 分离“分析/生成”温度：分析更稳，生成更发散，降低同质化
  ANALYSIS_TEMPERATURE: 0.3,
  GEN_TEMPERATURE_MIN: 0.65,
  GEN_TEMPERATURE_MAX: 0.9,
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
  REQUEST_TIMEOUT: readPositiveNumberEnv('REQUEST_TIMEOUT_MS', 15000), // 15秒通用请求超时
  AI_REQUEST_TIMEOUT: readPositiveNumberEnv('AI_REQUEST_TIMEOUT_MS', 90000), // 90秒 AI 请求超时（单次请求）
  AI_STREAM_TIMEOUT: readPositiveNumberEnv('AI_STREAM_TIMEOUT_MS', 120000), // 120秒 AI 流式生成超时
  AI_STREAM_FIRST_CHUNK_TIMEOUT: readPositiveNumberEnv('AI_STREAM_FIRST_CHUNK_TIMEOUT_MS', 45000), // 45秒内必须产生正文内容，避免第三方流式接口空转
  AI_STREAM_IDLE_TIMEOUT: readPositiveNumberEnv('AI_STREAM_IDLE_TIMEOUT_MS', 30000), // 流式正文超过30秒无新增内容就中止并重试/报错
  AI_TIMEOUT_RESPONSE_BUFFER: readPositiveNumberEnv('AI_TIMEOUT_RESPONSE_BUFFER_MS', 10000), // 给SSE错误返回和函数清理预留时间
  AI_GENERATION_MAX_TOKENS: readPositiveNumberEnv('AI_GENERATION_MAX_TOKENS', 2400), // 限制正文生成长度，避免模型无界输出拖到Vercel超时
  AI_ANALYSIS_MAX_TOKENS: readPositiveNumberEnv('AI_ANALYSIS_MAX_TOKENS', 2200), // 限制分析响应长度
  MCP_REQUEST_TIMEOUT: readPositiveNumberEnv('MCP_REQUEST_TIMEOUT_MS', 20000), // 20秒 MCP 请求超时（从30秒降低）
  MCP_HEALTH_CHECK_TIMEOUT: readPositiveNumberEnv('MCP_HEALTH_CHECK_TIMEOUT_MS', 3000), // 3秒 MCP 健康检查超时（从5秒降低）
  // Vercel 函数总超时预留（Vercel maxDuration=180s，留足时间返回SSE错误）
  VERCEL_SAFE_TIMEOUT: readPositiveNumberEnv('VERCEL_SAFE_TIMEOUT_MS', 160000), // 160秒，避免被平台硬杀
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
