/**
 * AI交互管理模块
 * 提供重试机制、错误恢复和响应验证
 */

import OpenAI from 'openai';
import { getEnvVar, safeJsonParse } from './utils';
import { CONFIG } from './constants';
import { BusinessError } from './error-handler';

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
 * AI客户端管理器
 */
export class AIManager {
  private client: OpenAI | null = null;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  /**
   * 获取AI客户端实例
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
    console.log(`🔍 AI响应内容长度: ${content.length} 字符`);
    console.log(`🔍 AI响应前100字符: ${content.substring(0, 100)}...`);

    const parsed = safeJsonParse(content, null);
    if (parsed === null) {
      errors.push('AI返回的不是有效的JSON格式');
      console.error('❌ JSON解析失败，原始内容:', content);
      return { isValid: false, data: null, errors };
    }

    console.log(`✅ JSON解析成功，包含字段: ${Object.keys(parsed).join(', ')}`);

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
      } else {
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
    } else {
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

    console.log(`✅ 内容结构验证通过：${contentStructure.openingHooks?.length || 0}个开头，${contentStructure.endingHooks?.length || 0}个结尾`);
  }

  /**
   * 验证标签策略
   */
  private validateTagStrategy(tagStrategy: any, errors: string[]): void {
    if (!tagStrategy || typeof tagStrategy !== 'object') {
      errors.push('tagStrategy字段缺失或格式错误');
      return;
    }

    if (!Array.isArray(tagStrategy.commonTags)) {
      errors.push('tagStrategy.commonTags应该是数组');
    }

    console.log(`✅ 标签策略验证通过：${tagStrategy.commonTags?.length || 0}个常用标签`);
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

    console.log(`✅ 封面风格分析验证通过：${coverStyleAnalysis.commonStyles?.length || 0}个风格`);
  }

  /**
   * 带重试的AI分析调用
   */
  async analyzeWithRetry(
    prompt: string,
    expectedFields: string[] = ['titleFormulas', 'contentStructure', 'tagStrategy', 'coverStyleAnalysis']
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🤖 AI分析尝试 ${attempt + 1}/${this.retryConfig.maxRetries + 1}`);
        
        const client = this.getClient();
        const response = await client.chat.completions.create({
          model: getEnvVar('AI_MODEL_NAME', CONFIG.DEFAULT_AI_MODEL),
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: CONFIG.TEMPERATURE, // 使用统一的温度配置
          // Gemini有1M上下文，不需要限制max_tokens
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('AI返回了空响应');
        }

        // 验证响应
        const validation = this.validateJsonResponse(content, expectedFields);
        if (!validation.isValid) {
          throw new Error(`AI响应验证失败: ${validation.errors.join(', ')}`);
        }

        console.log('✅ AI分析成功');
        return validation.data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ AI分析尝试 ${attempt + 1} 失败:`, lastError.message);

        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.retryConfig.maxRetries) {
          const delayMs = this.calculateDelay(attempt);
          console.log(`⏳ 等待 ${delayMs}ms 后重试...`);
          await this.delay(delayMs);
        }
      }
    }

    // 所有重试都失败了
    throw new BusinessError(
      `AI分析失败，已重试${this.retryConfig.maxRetries}次: ${lastError?.message}`,
      'AI分析失败',
      '请稍后重试，如果问题持续请联系技术支持',
      true
    );
  }

  /**
   * 带重试的流式生成调用
   */
  async generateStreamWithRetry(
    prompt: string,
    onChunk: (content: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🤖 流式生成尝试 ${attempt + 1}/${this.retryConfig.maxRetries + 1}`);
        
        const client = this.getClient();
        const response = await client.chat.completions.create({
          model: getEnvVar('AI_MODEL_NAME', CONFIG.DEFAULT_AI_MODEL),
          messages: [{ role: "user", content: prompt }],
          stream: true,
          temperature: CONFIG.TEMPERATURE,
          // Gemini有1M上下文，不需要限制max_tokens
        });

        let hasContent = false;
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            hasContent = true;
            onChunk(content);
          }
        }

        if (!hasContent) {
          throw new Error('AI没有返回任何内容');
        }

        console.log('✅ 流式生成成功');
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ 流式生成尝试 ${attempt + 1} 失败:`, lastError.message);

        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.retryConfig.maxRetries) {
          const delayMs = this.calculateDelay(attempt);
          console.log(`⏳ 等待 ${delayMs}ms 后重试...`);
          await this.delay(delayMs);
        }
      }
    }

    // 所有重试都失败了
    const finalError = new BusinessError(
      `流式生成失败，已重试${this.retryConfig.maxRetries}次: ${lastError?.message}`,
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
