/**
 * AI交互管理模块
 * 提供重试机制、错误恢复和响应验证
 */

import OpenAI from 'openai';
import { getEnvVar, safeJsonParse } from './utils';
import { CONFIG } from './constants';
import { BusinessError } from './error-handler';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * AI响应验证结果
 */
interface ValidationResult {
  isValid: boolean;
  data: any;
  errors: string[];
}

/**
 * 重试配置
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // 基础延迟（毫秒）
  maxDelay: number; // 最大延迟（毫秒）
  backoffMultiplier: number; // 退避倍数
}

/**
 * AI调用可选参数（用于降低同质化、按场景调参）
 */
interface AICallOptions {
  temperature?: number;
}

/**
 * AI客户端管理器
 * 优化版：添加请求超时控制，适配 Vercel 180s 限制
 */
export class AIManager {
  private client: OpenAI | null = null;
  // 优化重试配置：减少重试次数和延迟，避免超时
  private retryConfig: RetryConfig = {
    maxRetries: 1, // 从 2 次降低到 1 次，减少总等待时间
    baseDelay: 500, // 从 1000ms 降低到 500ms
    maxDelay: 3000, // 从 10000ms 降低到 3000ms
    backoffMultiplier: 2
  };

  /**
   * 解析模型列表，支持多模型降级
   */
  private getModelList(): string[] {
    const modelNames = getEnvVar('AI_MODEL_NAME', CONFIG.DEFAULT_AI_MODEL);
    return modelNames.split(',').map(name => name.trim()).filter(name => name.length > 0);
  }

  /**
   * 获取AI客户端实例
   * 优化：添加请求超时配置
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiUrl = getEnvVar('THIRD_PARTY_API_URL');
      const apiKey = getEnvVar('THIRD_PARTY_API_KEY');

      if (!apiUrl || !apiKey) {
        throw new BusinessError(
          'AI服务配置不完整',
          'AI服务配置错误',
          '请检查环境变量配置，确保API地址和密钥正确设置',
          false
        );
      }

      this.client = new OpenAI({
        baseURL: apiUrl,
        apiKey: apiKey,
        // 默认超时设置为流式超时（较大值），具体请求会在调用时显式覆盖
        // 这样可以确保流式请求不会被默认超时截断
        timeout: CONFIG.AI_STREAM_TIMEOUT, // 120秒，由每次请求显式控制
        maxRetries: 0, // 禁用 OpenAI SDK 内置重试，使用我们自己的重试逻辑
      });
    }

    return this.client;
  }

  /**
   * 计算重试延迟时间
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证JSON响应
   */
  private validateJsonResponse(content: string, expectedFields: string[] = []): ValidationResult {
    const errors: string[] = [];

    if (!content || content.trim() === '') {
      errors.push('AI返回了空响应');
      return { isValid: false, data: null, errors };
    }

    // 添加调试信息
    if (debugLoggingEnabled) {
      console.log(`🔍 AI响应内容长度: ${content.length} 字符`);
      console.log(`🔍 AI响应前100字符: ${content.substring(0, 100)}...`);
    }

    const parsed: any = safeJsonParse(content, null);
    if (parsed === null) {
      errors.push('AI返回的不是有效的JSON格式');
      console.error('❌ JSON解析失败，原始内容:', content);
      return { isValid: false, data: null, errors };
    }

    if (debugLoggingEnabled) {
      console.log(`✅ JSON解析成功，包含字段: ${Object.keys(parsed).join(', ')}`);
    }

    // 检查必需字段
    for (const field of expectedFields) {
      if (!(field in parsed) || !parsed[field]) {
        errors.push(`缺少必需字段: ${field}`);
      }
    }

    // 兼容旧版本的rules验证
    if (expectedFields.includes('rules')) {
      if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) {
        errors.push('rules字段应该是非空数组');
      } else if (debugLoggingEnabled) {
        console.log(`✅ rules数组包含 ${parsed.rules.length} 个规律`);
      }
    }

    // 新版本爆款公式报告的验证
    if (expectedFields.includes('titleFormulas')) {
      this.validateTitleFormulas(parsed.titleFormulas, errors);
    }

    if (expectedFields.includes('contentStructure')) {
      this.validateContentStructure(parsed.contentStructure, errors);
    }

    if (expectedFields.includes('tagStrategy')) {
      this.validateTagStrategy(parsed.tagStrategy, errors);
    }

    if (expectedFields.includes('coverStyleAnalysis')) {
      this.validateCoverStyleAnalysis(parsed.coverStyleAnalysis, errors);
    }

    return {
      isValid: errors.length === 0,
      data: parsed,
      errors
    };
  }

  /**
   * 验证标题公式结构
   */
  private validateTitleFormulas(titleFormulas: any, errors: string[]): void {
    if (!titleFormulas || typeof titleFormulas !== 'object') {
      errors.push('titleFormulas字段缺失或格式错误');
      return;
    }

    if (!Array.isArray(titleFormulas.suggestedFormulas) || titleFormulas.suggestedFormulas.length === 0) {
      errors.push('titleFormulas.suggestedFormulas应该是非空数组');
    } else if (debugLoggingEnabled) {
      console.log(`✅ 标题公式包含 ${titleFormulas.suggestedFormulas.length} 个公式`);
    }

    if (!Array.isArray(titleFormulas.commonKeywords)) {
      errors.push('titleFormulas.commonKeywords应该是数组');
    }
  }

  /**
   * 验证内容结构
   */
  private validateContentStructure(contentStructure: any, errors: string[]): void {
    if (!contentStructure || typeof contentStructure !== 'object') {
      errors.push('contentStructure字段缺失或格式错误');
      return;
    }

    if (!Array.isArray(contentStructure.openingHooks) || contentStructure.openingHooks.length === 0) {
      errors.push('contentStructure.openingHooks应该是非空数组');
    }

    if (!Array.isArray(contentStructure.endingHooks) || contentStructure.endingHooks.length === 0) {
      errors.push('contentStructure.endingHooks应该是非空数组');
    }

    if (!contentStructure.bodyTemplate || typeof contentStructure.bodyTemplate !== 'string') {
      errors.push('contentStructure.bodyTemplate应该是字符串');
    }

    if (debugLoggingEnabled) {
      console.log(`✅ 内容结构验证通过：${contentStructure.openingHooks?.length || 0}个开头，${contentStructure.endingHooks?.length || 0}个结尾`);
    }
  }

  /**
   * 验证标签策略
   */
  private validateTagStrategy(tagStrategy: any, errors: string[]): void {
    if (!tagStrategy || typeof tagStrategy !== 'object') {
      errors.push('tagStrategy字段缺失或格式错误');
      return;
    }

    if (debugLoggingEnabled) {
      console.log(`🔍 tagStrategy结构:`, JSON.stringify(tagStrategy, null, 2));
    }

    // 检查 commonTags 字段
    if (!tagStrategy.commonTags) {
      if (debugLoggingEnabled) {
        console.log(`⚠️ commonTags字段不存在，尝试从其他字段提取`);
      }
      // 如果 commonTags 不存在，尝试从 tagCategories 中提取
      if (tagStrategy.tagCategories) {
        const extractedTags = [];
        if (Array.isArray(tagStrategy.tagCategories.coreKeywords)) {
          extractedTags.push(...tagStrategy.tagCategories.coreKeywords);
        }
        if (Array.isArray(tagStrategy.tagCategories.longTailKeywords)) {
          extractedTags.push(...tagStrategy.tagCategories.longTailKeywords);
        }
        tagStrategy.commonTags = extractedTags.slice(0, 10); // 取前10个作为常用标签
        if (debugLoggingEnabled) {
          console.log(`🔧 自动生成commonTags:`, tagStrategy.commonTags);
        }
      } else {
        tagStrategy.commonTags = []; // 设置默认空数组
      }
    } else if (!Array.isArray(tagStrategy.commonTags)) {
      if (debugLoggingEnabled) {
        console.log(`⚠️ commonTags不是数组，类型为:`, typeof tagStrategy.commonTags);
        console.log(`⚠️ commonTags内容:`, tagStrategy.commonTags);
      }
      errors.push('tagStrategy.commonTags应该是数组');
    }

    if (debugLoggingEnabled) {
      console.log(`✅ 标签策略验证通过：${tagStrategy.commonTags?.length || 0}个常用标签`);
    }
  }

  /**
   * 验证封面风格分析
   */
  private validateCoverStyleAnalysis(coverStyleAnalysis: any, errors: string[]): void {
    if (!coverStyleAnalysis || typeof coverStyleAnalysis !== 'object') {
      errors.push('coverStyleAnalysis字段缺失或格式错误');
      return;
    }

    if (!Array.isArray(coverStyleAnalysis.commonStyles) || coverStyleAnalysis.commonStyles.length === 0) {
      errors.push('coverStyleAnalysis.commonStyles应该是非空数组');
    }

    if (debugLoggingEnabled) {
      console.log(`✅ 封面风格分析验证通过：${coverStyleAnalysis.commonStyles?.length || 0}个风格`);
    }
  }

  /**
   * 带重试的AI分析调用（支持多模型降级）
   * @param prompt 提示词
   * @param expectedFields 期望的响应字段
   * @param overallTimeoutMs 整体超时时间（毫秒），用于动态控制剩余执行时间
   */
  async analyzeWithRetry(
    prompt: string,
    expectedFields: string[] = ['titleFormulas', 'contentStructure', 'tagStrategy', 'coverStyleAnalysis'],
    overallTimeoutMs: number = CONFIG.VERCEL_SAFE_TIMEOUT,
    options: AICallOptions = {}
  ): Promise<any> {
    const modelList = this.getModelList();
    let lastError: Error | null = null;
    const startTime = Date.now();
    const getRemainingTime = () => overallTimeoutMs - (Date.now() - startTime);

    // 遍历所有可用模型
    for (let modelIndex = 0; modelIndex < modelList.length; modelIndex++) {
      const currentModel = modelList[modelIndex];

      // 对每个模型进行重试
      for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
        // 检查剩余时间
        const remainingTime = getRemainingTime();
        if (remainingTime <= 5000) { // 预留 5 秒缓冲
          lastError = new Error('AI分析已超过剩余执行时间');
          if (debugLoggingEnabled) {
            console.warn(`⏱️ 剩余时间不足 (${remainingTime}ms)，停止重试`);
          }
          break;
        }

        try {
          if (debugLoggingEnabled) {
            console.log(`🤖 AI分析尝试 ${attempt + 1}/${this.retryConfig.maxRetries + 1} (模型: ${currentModel}, 剩余: ${Math.round(remainingTime / 1000)}s)`);
          }

          const client = this.getClient();

          // 为Gemini模型调整请求参数
          // 分析任务更偏“结构化/稳定”，默认温度更低
          const temperature = typeof options.temperature === 'number'
            ? options.temperature
            : (CONFIG.ANALYSIS_TEMPERATURE ?? CONFIG.TEMPERATURE);

          const requestParams: any = {
            model: currentModel,
            messages: [{ role: "user", content: prompt }],
            temperature,
          };

          // 只有在非Gemini模型时才使用response_format
          // Gemini模型对json_object格式支持有限，可能导致空响应
          if (!currentModel.toLowerCase().includes('gemini')) {
            requestParams.response_format = { type: "json_object" };
          }
          // 注意：不设置max_tokens，让模型自然生成完整响应

          // 动态计算请求超时：取配置超时和剩余时间的较小值
          const requestTimeout = Math.min(CONFIG.AI_REQUEST_TIMEOUT, remainingTime - 2000);
          const response = await client.chat.completions.create(requestParams, { timeout: requestTimeout });

          // [核心修复] 增加对 response.choices 的有效性检查
          if (!response || !response.choices || response.choices.length === 0) {
            console.error('❌ AI响应结构异常或choices为空');
            console.error('📊 响应对象存在:', !!response);
            console.error('📊 choices字段存在:', !!(response && response.choices));
            console.error('📊 choices长度:', response && response.choices ? response.choices.length : 'N/A');
            console.error('📊 响应结构:', response ? Object.keys(response) : 'response为null/undefined');
            console.error('📊 模型:', currentModel);
            console.error('📊 尝试次数:', attempt + 1);

            // 只在调试模式下输出完整响应，避免日志过长
            if (debugLoggingEnabled && response) {
              console.error('📄 完整响应:', JSON.stringify(response, null, 2));
            }

            throw new Error(`AI响应结构异常，缺少choices字段或choices为空数组 (模型: ${currentModel}, 尝试: ${attempt + 1})`);
          }

          const content = response.choices[0]?.message?.content;
          if (!content || content.trim() === '') {
            // 检查finish_reason来提供更详细的错误信息
            const finishReason = response.choices[0]?.finish_reason;
            if (finishReason === 'length') {
              throw new Error('AI响应被截断，可能是因为max_tokens设置过小或模型对JSON格式支持有限');
            } else if (finishReason === 'content_filter') {
              throw new Error('AI响应被内容过滤器阻止');
            } else {
              throw new Error(`AI返回了空响应，finish_reason: ${finishReason}`);
            }
          }

          // 验证响应
          const validation = this.validateJsonResponse(content, expectedFields);
          if (!validation.isValid) {
            throw new Error(`AI响应验证失败: ${validation.errors.join(', ')}`);
          }

          if (debugLoggingEnabled) {
            console.log(`✅ AI分析成功 (模型: ${currentModel})`);
          }
          return validation.data;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (debugLoggingEnabled) {
            console.warn(`⚠️ 模型 ${currentModel} 尝试 ${attempt + 1} 失败:`, lastError.message);
          }

          // 如果不是最后一次尝试，等待后重试
          if (attempt < this.retryConfig.maxRetries) {
            const delayMs = this.calculateDelay(attempt);
            if (debugLoggingEnabled) {
              console.log(`⏳ 等待 ${delayMs}ms 后重试...`);
            }
            await this.delay(delayMs);
          }
        }
      }

      // 检查剩余时间，如果不足则不再切换模型
      if (getRemainingTime() <= 5000) {
        if (debugLoggingEnabled) {
          console.warn(`⏱️ 剩余时间不足，停止模型切换`);
        }
        break;
      }

      // 当前模型的所有重试都失败了，尝试下一个模型
      if (modelIndex < modelList.length - 1) {
        if (debugLoggingEnabled) {
          console.log(`🔄 模型 ${currentModel} 失败，尝试下一个模型: ${modelList[modelIndex + 1]}`);
        }
      }
    }

    // 所有模型和重试都失败了
    throw new BusinessError(
      `AI分析失败，已尝试所有模型 [${modelList.join(', ')}]，每个模型重试${this.retryConfig.maxRetries}次: ${lastError?.message}`,
      'AI分析失败',
      '请稍后重试，如果问题持续请联系技术支持',
      true
    );
  }

  /**
   * 带重试的流式生成调用（支持多模型降级）
   * @param prompt 提示词
   * @param onChunk 内容块回调
   * @param onError 错误回调
   * @param overallTimeoutMs 整体超时时间（毫秒），用于动态控制剩余执行时间
   */
  async generateStreamWithRetry(
    prompt: string,
    onChunk: (content: string) => void,
    onError: (error: Error) => void,
    overallTimeoutMs: number = CONFIG.VERCEL_SAFE_TIMEOUT,
    options: AICallOptions = {}
  ): Promise<void> {
    const modelList = this.getModelList();
    let lastError: Error | null = null;
    const startTime = Date.now();
    const getRemainingTime = () => overallTimeoutMs - (Date.now() - startTime);

    // 遍历所有可用模型
    for (let modelIndex = 0; modelIndex < modelList.length; modelIndex++) {
      const currentModel = modelList[modelIndex];

      // 对每个模型进行重试
      for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
        // 检查剩余时间
        const remainingTime = getRemainingTime();
        if (remainingTime <= 5000) {
          lastError = new Error('流式生成已超过剩余执行时间');
          if (debugLoggingEnabled) {
            console.warn(`⏱️ 剩余时间不足 (${remainingTime}ms)，停止重试`);
          }
          break;
        }
        try {
          if (debugLoggingEnabled) {
            console.log(`🤖 流式生成尝试 ${attempt + 1}/${this.retryConfig.maxRetries + 1} (模型: ${currentModel}, 剩余: ${Math.round(remainingTime / 1000)}s)`);
          }

          const client = this.getClient();
          // 动态计算请求超时：取配置超时和剩余时间的较小值
          const requestTimeout = Math.min(CONFIG.AI_STREAM_TIMEOUT, remainingTime - 2000);
          // 生成任务更偏“内容多样性”，默认允许更高温度，必要时由调用方覆盖
          const temperature = typeof options.temperature === 'number'
            ? options.temperature
            : CONFIG.TEMPERATURE;
          const response = await client.chat.completions.create(
            {
              model: currentModel,
              messages: [{ role: "user", content: prompt }],
              stream: true,
              temperature,
            },
            { timeout: requestTimeout }
          );

        let hasContent = false;
        let lastChunkTime = Date.now();

        for await (const chunk of response) {
          // 检查剩余时间，防止流式生成超时
          if (getRemainingTime() <= 2000) {
            if (debugLoggingEnabled) {
              console.warn(`⏱️ 流式生成剩余时间不足，提前结束`);
            }
            break;
          }

          // [核心修复] 增加对 chunk.choices 的有效性检查
          if (!chunk || !chunk.choices || chunk.choices.length === 0) {
            if (debugLoggingEnabled) {
              console.warn('⚠️ 流式响应块缺少choices字段，跳过此块');
            }
            continue;
          }

          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            hasContent = true;
            lastChunkTime = Date.now();
            onChunk(content);
          } else {
            // 心跳机制：如果超过500ms没有内容，发送一个空的心跳
            const now = Date.now();
            if (now - lastChunkTime > 500) {
              onChunk(''); // 发送空内容作为心跳
              lastChunkTime = now;
            }
          }
        }

          if (!hasContent) {
            throw new Error('AI没有返回任何内容');
          }

          if (debugLoggingEnabled) {
            console.log(`✅ 流式生成成功 (模型: ${currentModel})`);
          }
          return;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (debugLoggingEnabled) {
            console.warn(`⚠️ 模型 ${currentModel} 流式生成尝试 ${attempt + 1} 失败:`, lastError.message);
          }

          // 如果不是最后一次尝试，等待后重试
          if (attempt < this.retryConfig.maxRetries) {
            const delayMs = this.calculateDelay(attempt);
            if (debugLoggingEnabled) {
              console.log(`⏳ 等待 ${delayMs}ms 后重试...`);
            }
            await this.delay(delayMs);
          }
        }
      }

      // 检查剩余时间，如果不足则不再切换模型
      if (getRemainingTime() <= 5000) {
        if (debugLoggingEnabled) {
          console.warn(`⏱️ 剩余时间不足，停止模型切换`);
        }
        break;
      }

      // 当前模型的所有重试都失败了，尝试下一个模型
      if (modelIndex < modelList.length - 1) {
        if (debugLoggingEnabled) {
          console.log(`🔄 模型 ${currentModel} 失败，尝试下一个模型: ${modelList[modelIndex + 1]}`);
        }
      }
    }

    // 所有模型和重试都失败了
    const finalError = new BusinessError(
      `流式生成失败，已尝试所有模型 [${modelList.join(', ')}]，每个模型重试${this.retryConfig.maxRetries}次: ${lastError?.message}`,
      '内容生成失败',
      '请稍后重试，如果问题持续请联系技术支持',
      true
    );

    onError(finalError);
  }

  /**
   * 设置重试配置
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * 重置客户端（用于配置更新后）
   */
  resetClient(): void {
    this.client = null;
  }


}

// 导出单例实例
export const aiManager = new AIManager();
