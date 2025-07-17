/**
 * 错误处理工具模块
 * 提供统一的错误分类、处理和用户友好的错误消息
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // API相关错误
  API_ERROR = 'API_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  
  // 配置相关错误
  CONFIG_ERROR = 'CONFIG_ERROR',
  ENV_ERROR = 'ENV_ERROR',
  
  // 数据相关错误
  DATA_ERROR = 'DATA_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 业务逻辑错误
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  
  // 系统错误
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 用户友好的错误信息
 */
export interface UserFriendlyError {
  type: ErrorType;
  title: string;
  message: string;
  suggestion: string;
  canRetry: boolean;
  retryDelay?: number; // 建议重试延迟（秒）
}

/**
 * 错误分析结果
 */
export interface ErrorAnalysis {
  originalError: Error;
  errorType: ErrorType;
  userFriendlyError: UserFriendlyError;
  technicalDetails: string;
  shouldLog: boolean;
}

/**
 * 错误模式匹配规则
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  type: ErrorType;
  userError: Omit<UserFriendlyError, 'type'>;
}> = [
  // 网络错误
  {
    pattern: /ENOTFOUND|DNS|getaddrinfo/i,
    type: ErrorType.NETWORK_ERROR,
    userError: {
      title: '网络连接失败',
      message: '无法连接到服务器，请检查网络连接',
      suggestion: '请检查网络连接后重试，或稍后再试',
      canRetry: true,
      retryDelay: 5
    }
  },
  {
    pattern: /timeout|ETIMEDOUT/i,
    type: ErrorType.TIMEOUT_ERROR,
    userError: {
      title: '请求超时',
      message: '服务器响应时间过长',
      suggestion: '请稍后重试，或检查网络连接',
      canRetry: true,
      retryDelay: 3
    }
  },
  {
    pattern: /ECONNREFUSED|ECONNRESET/i,
    type: ErrorType.CONNECTION_ERROR,
    userError: {
      title: '连接被拒绝',
      message: '无法连接到服务器',
      suggestion: '服务器可能暂时不可用，请稍后重试',
      canRetry: true,
      retryDelay: 10
    }
  },
  
  // API错误
  {
    pattern: /401|unauthorized/i,
    type: ErrorType.AUTH_ERROR,
    userError: {
      title: '认证失败',
      message: 'API密钥无效或已过期',
      suggestion: '请检查API密钥配置，或联系管理员',
      canRetry: false
    }
  },
  {
    pattern: /403|forbidden/i,
    type: ErrorType.AUTH_ERROR,
    userError: {
      title: '权限不足',
      message: '没有访问权限',
      suggestion: '请检查API密钥权限，或联系管理员',
      canRetry: false
    }
  },
  {
    pattern: /429|rate.?limit/i,
    type: ErrorType.RATE_LIMIT_ERROR,
    userError: {
      title: '请求过于频繁',
      message: '已达到API调用限制',
      suggestion: '请稍后重试，或升级API套餐',
      canRetry: true,
      retryDelay: 60
    }
  },
  
  // 配置错误
  {
    pattern: /AI服务配置不完整|缺少API地址或密钥/i,
    type: ErrorType.CONFIG_ERROR,
    userError: {
      title: '配置错误',
      message: 'AI服务配置不完整',
      suggestion: '请检查环境变量配置，确保API地址和密钥正确设置',
      canRetry: false
    }
  },
  {
    pattern: /XHS_COOKIE.*not configured/i,
    type: ErrorType.CONFIG_ERROR,
    userError: {
      title: '数据源配置缺失',
      message: '小红书数据抓取功能未配置',
      suggestion: '将使用缓存数据，如需实时数据请配置相关参数',
      canRetry: false
    }
  },
  
  // 数据错误
  {
    pattern: /未找到相关笔记|NO_NOTES_FOUND/i,
    type: ErrorType.NOT_FOUND_ERROR,
    userError: {
      title: '未找到相关内容',
      message: '没有找到相关的热门笔记',
      suggestion: '请尝试其他关键词，或稍后重试',
      canRetry: true,
      retryDelay: 5
    }
  },
  {
    pattern: /JSON.*parse|解析失败/i,
    type: ErrorType.PARSE_ERROR,
    userError: {
      title: '数据解析失败',
      message: '服务器返回的数据格式异常',
      suggestion: '请重试，如果问题持续请联系技术支持',
      canRetry: true,
      retryDelay: 3
    }
  },
  
  // 小红书API特定错误
  {
    pattern: /小红书API.*错误|XHS.*API.*error/i,
    type: ErrorType.API_ERROR,
    userError: {
      title: '数据获取失败',
      message: '无法获取最新的热门笔记数据',
      suggestion: '将使用缓存数据继续分析，或稍后重试获取最新数据',
      canRetry: true,
      retryDelay: 30
    }
  }
];

/**
 * 分析错误并返回用户友好的错误信息
 */
export function analyzeError(error: Error | string): ErrorAnalysis {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const originalError = typeof error === 'string' ? new Error(error) : error;

  // 查找匹配的错误模式
  for (const rule of ERROR_PATTERNS) {
    const isMatch = typeof rule.pattern === 'string' 
      ? errorMessage.includes(rule.pattern)
      : rule.pattern.test(errorMessage);

    if (isMatch) {
      return {
        originalError,
        errorType: rule.type,
        userFriendlyError: {
          type: rule.type,
          ...rule.userError
        },
        technicalDetails: errorMessage,
        shouldLog: rule.type !== ErrorType.CONFIG_ERROR // 配置错误不需要记录到日志
      };
    }
  }

  // 默认错误处理
  return {
    originalError,
    errorType: ErrorType.UNKNOWN_ERROR,
    userFriendlyError: {
      type: ErrorType.UNKNOWN_ERROR,
      title: '未知错误',
      message: '发生了意外错误',
      suggestion: '请重试，如果问题持续请联系技术支持',
      canRetry: true,
      retryDelay: 5
    },
    technicalDetails: errorMessage,
    shouldLog: true
  };
}

/**
 * 格式化错误信息供前端显示
 */
export function formatErrorForUser(error: Error | string): {
  title: string;
  message: string;
  suggestion: string;
  canRetry: boolean;
  retryDelay?: number;
  errorId: string;
} {
  const analysis = analyzeError(error);
  const errorId = generateErrorId();

  if (analysis.shouldLog) {
    console.error(`[${errorId}] ${analysis.errorType}:`, analysis.technicalDetails);
  }

  return {
    ...analysis.userFriendlyError,
    errorId
  };
}

/**
 * 生成错误ID用于追踪
 */
function generateErrorId(): string {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
}

/**
 * 检查错误是否可以重试
 */
export function isRetryableError(error: Error | string): boolean {
  const analysis = analyzeError(error);
  return analysis.userFriendlyError.canRetry;
}

/**
 * 获取建议的重试延迟时间
 */
export function getRetryDelay(error: Error | string): number {
  const analysis = analyzeError(error);
  return analysis.userFriendlyError.retryDelay || 5;
}

/**
 * 创建业务错误
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly suggestion: string,
    public readonly canRetry: boolean = true
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 创建配置错误
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly suggestion: string
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}
