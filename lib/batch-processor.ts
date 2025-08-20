/**
 * 批量处理Pipeline模块
 * 提供高效的数据批量处理、任务队列管理和并发控制
 */

import { EventEmitter } from 'events';
import { XhsNoteDetail } from './types';
import { dataAnalyzer, NoteContentAnalysis, CommentSentimentAnalysis } from './data-analyzer';
import { dataStorage } from './data-storage';
import { enhancedCacheManager } from './enhanced-cache-manager';

// 调试日志控制
const debugLoggingEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true';

/**
 * 批量处理配置
 */
const BATCH_CONFIG = {
  // 并发控制
  MAX_CONCURRENT_TASKS: parseInt(process.env.MAX_CONCURRENT_TASKS || '5'),
  MAX_CONCURRENT_ANALYSIS: parseInt(process.env.MAX_CONCURRENT_ANALYSIS || '3'),
  
  // 批次大小
  DEFAULT_BATCH_SIZE: 20,
  MAX_BATCH_SIZE: 100,
  MIN_BATCH_SIZE: 5,
  
  // 重试配置
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒
  EXPONENTIAL_BACKOFF: true,
  
  // 超时配置
  TASK_TIMEOUT: 30000, // 30秒
  ANALYSIS_TIMEOUT: 60000, // 60秒
  
  // 队列配置
  MAX_QUEUE_SIZE: 1000,
  PRIORITY_LEVELS: ['high', 'medium', 'low'] as const,
  
  // 性能优化
  ENABLE_CACHING: true,
  ENABLE_DEDUPLICATION: true,
  ENABLE_PROGRESS_TRACKING: true,
};

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

/**
 * 批量任务接口
 */
export interface BatchTask<T = any, R = any> {
  id: string;
  type: 'note_analysis' | 'comment_analysis' | 'data_fetch' | 'custom';
  data: T;
  priority: typeof BATCH_CONFIG.PRIORITY_LEVELS[number];
  status: TaskStatus;
  result?: R;
  error?: Error;
  retryCount: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  metadata?: Record<string, any>;
}

/**
 * 批量处理结果接口
 */
export interface BatchProcessResult<T> {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  results: T[];
  errors: Array<{ taskId: string; error: Error }>;
  duration: number;
  throughput: number; // 任务/秒
}

/**
 * 进度回调接口
 */
export interface ProgressCallback {
  (progress: {
    completed: number;
    total: number;
    percentage: number;
    currentTask?: string;
    estimatedTimeRemaining?: number;
  }): void;
}

/**
 * 批量处理器类
 */
export class BatchProcessor extends EventEmitter {
  private taskQueue: BatchTask[] = [];
  private runningTasks = new Map<string, BatchTask>();
  private completedTasks = new Map<string, BatchTask>();
  private isProcessing = false;
  private processingStats = {
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    startTime: 0,
  };

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * 批量分析笔记内容
   */
  async batchAnalyzeNotes(
    notes: Array<{ noteId: string; noteDetail: XhsNoteDetail }>,
    options: {
      batchSize?: number;
      priority?: typeof BATCH_CONFIG.PRIORITY_LEVELS[number];
      onProgress?: ProgressCallback;
      skipExisting?: boolean;
    } = {}
  ): Promise<BatchProcessResult<NoteContentAnalysis>> {
    const batchSize = Math.min(options.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE, BATCH_CONFIG.MAX_BATCH_SIZE);
    const priority = options.priority || 'medium';

    if (debugLoggingEnabled) {
      console.log(`🔄 开始批量分析笔记: ${notes.length}个笔记，批次大小: ${batchSize}`);
    }

    // 去重和过滤
    let filteredNotes = notes;
    if (BATCH_CONFIG.ENABLE_DEDUPLICATION) {
      filteredNotes = this.deduplicateNotes(notes);
    }

    if (options.skipExisting) {
      filteredNotes = await this.filterExistingAnalyses(filteredNotes);
    }

    // 创建批量任务
    const tasks: BatchTask[] = filteredNotes.map((note, index) => ({
      id: `note_analysis_${note.noteId}_${Date.now()}_${index}`,
      type: 'note_analysis',
      data: note,
      priority,
      status: TaskStatus.PENDING,
      retryCount: 0,
      createdAt: Date.now(),
    }));

    // 执行批量处理
    return this.executeBatchTasks(tasks, {
      batchSize,
      onProgress: options.onProgress,
      processor: this.processNoteAnalysis.bind(this),
    });
  }

  /**
   * 批量分析评论情感
   */
  async batchAnalyzeComments(
    commentsData: Array<{ noteId: string; comments: any[] }>,
    options: {
      batchSize?: number;
      priority?: typeof BATCH_CONFIG.PRIORITY_LEVELS[number];
      onProgress?: ProgressCallback;
    } = {}
  ): Promise<BatchProcessResult<CommentSentimentAnalysis>> {
    const batchSize = Math.min(options.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE, BATCH_CONFIG.MAX_BATCH_SIZE);
    const priority = options.priority || 'medium';

    if (debugLoggingEnabled) {
      console.log(`🔄 开始批量分析评论: ${commentsData.length}个笔记的评论`);
    }

    // 创建批量任务
    const tasks: BatchTask[] = commentsData.map((data, index) => ({
      id: `comment_analysis_${data.noteId}_${Date.now()}_${index}`,
      type: 'comment_analysis',
      data,
      priority,
      status: TaskStatus.PENDING,
      retryCount: 0,
      createdAt: Date.now(),
    }));

    // 执行批量处理
    return this.executeBatchTasks(tasks, {
      batchSize,
      onProgress: options.onProgress,
      processor: this.processCommentAnalysis.bind(this),
    });
  }

  /**
   * 批量获取笔记详情
   */
  async batchFetchNoteDetails(
    noteIds: string[],
    options: {
      batchSize?: number;
      priority?: typeof BATCH_CONFIG.PRIORITY_LEVELS[number];
      onProgress?: ProgressCallback;
      useCache?: boolean;
    } = {}
  ): Promise<BatchProcessResult<XhsNoteDetail>> {
    const batchSize = Math.min(options.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE, BATCH_CONFIG.MAX_BATCH_SIZE);
    const priority = options.priority || 'medium';

    if (debugLoggingEnabled) {
      console.log(`🔄 开始批量获取笔记详情: ${noteIds.length}个笔记`);
    }

    // 创建批量任务
    const tasks: BatchTask[] = noteIds.map((noteId, index) => ({
      id: `data_fetch_${noteId}_${Date.now()}_${index}`,
      type: 'data_fetch',
      data: { noteId, useCache: options.useCache },
      priority,
      status: TaskStatus.PENDING,
      retryCount: 0,
      createdAt: Date.now(),
    }));

    // 执行批量处理
    return this.executeBatchTasks(tasks, {
      batchSize,
      onProgress: options.onProgress,
      processor: this.processDataFetch.bind(this),
    });
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats(): {
    queueSize: number;
    runningTasks: number;
    completedTasks: number;
    totalProcessed: number;
    totalFailed: number;
    averageProcessingTime: number;
    throughput: number;
  } {
    const now = Date.now();
    const duration = this.processingStats.startTime ? now - this.processingStats.startTime : 1;
    const throughput = this.processingStats.totalProcessed / (duration / 1000);

    return {
      queueSize: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      completedTasks: this.completedTasks.size,
      totalProcessed: this.processingStats.totalProcessed,
      totalFailed: this.processingStats.totalFailed,
      averageProcessingTime: this.processingStats.averageProcessingTime,
      throughput,
    };
  }

  /**
   * 取消所有待处理任务
   */
  cancelAllTasks(): void {
    this.taskQueue.forEach(task => {
      task.status = TaskStatus.CANCELLED;
    });
    this.taskQueue = [];
    
    if (debugLoggingEnabled) {
      console.log('🚫 所有待处理任务已取消');
    }
  }

  /**
   * 执行批量任务
   */
  private async executeBatchTasks<T>(
    tasks: BatchTask[],
    options: {
      batchSize: number;
      onProgress?: ProgressCallback;
      processor: (task: BatchTask) => Promise<T>;
    }
  ): Promise<BatchProcessResult<T>> {
    const startTime = Date.now();
    this.processingStats.startTime = startTime;
    
    const results: T[] = [];
    const errors: Array<{ taskId: string; error: Error }> = [];
    let completed = 0;

    // 分批处理
    for (let i = 0; i < tasks.length; i += options.batchSize) {
      const batch = tasks.slice(i, i + options.batchSize);
      
      // 并发处理当前批次
      const batchPromises = batch.map(async (task) => {
        try {
          task.status = TaskStatus.RUNNING;
          task.startedAt = Date.now();
          this.runningTasks.set(task.id, task);

          const result = await this.executeTaskWithRetry(task, options.processor);
          
          task.status = TaskStatus.COMPLETED;
          task.completedAt = Date.now();
          task.result = result;
          
          this.runningTasks.delete(task.id);
          this.completedTasks.set(task.id, task);
          
          results.push(result);
          completed++;
          
          // 更新统计信息
          this.processingStats.totalProcessed++;
          if (task.startedAt && task.completedAt) {
            const processingTime = task.completedAt - task.startedAt;
            this.processingStats.averageProcessingTime = 
              (this.processingStats.averageProcessingTime + processingTime) / 2;
          }

          // 触发进度回调
          if (options.onProgress) {
            const percentage = (completed / tasks.length) * 100;
            const estimatedTimeRemaining = this.calculateEstimatedTime(completed, tasks.length, startTime);
            
            options.onProgress({
              completed,
              total: tasks.length,
              percentage,
              currentTask: task.id,
              estimatedTimeRemaining,
            });
          }

          return result;
        } catch (error) {
          task.status = TaskStatus.FAILED;
          task.error = error as Error;
          task.completedAt = Date.now();
          
          this.runningTasks.delete(task.id);
          this.processingStats.totalFailed++;
          
          errors.push({
            taskId: task.id,
            error: error as Error,
          });

          if (debugLoggingEnabled) {
            console.error(`❌ 任务失败: ${task.id}`, error);
          }
          
          return null;
        }
      });

      // 等待当前批次完成
      await Promise.all(batchPromises);
      
      // 批次间延迟，避免过载
      if (i + options.batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const throughput = completed / (duration / 1000);

    const result: BatchProcessResult<T> = {
      totalTasks: tasks.length,
      completedTasks: completed,
      failedTasks: errors.length,
      results: results.filter(r => r !== null),
      errors,
      duration,
      throughput,
    };

    if (debugLoggingEnabled) {
      console.log(`✅ 批量处理完成: ${completed}/${tasks.length} 成功，耗时 ${duration}ms`);
    }

    return result;
  }

  /**
   * 带重试的任务执行
   */
  private async executeTaskWithRetry<T>(
    task: BatchTask,
    processor: (task: BatchTask) => Promise<T>
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= BATCH_CONFIG.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          task.status = TaskStatus.RETRYING;
          task.retryCount = attempt;
          
          // 指数退避延迟
          const delay = BATCH_CONFIG.EXPONENTIAL_BACKOFF 
            ? BATCH_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1)
            : BATCH_CONFIG.RETRY_DELAY;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          if (debugLoggingEnabled) {
            console.log(`🔄 重试任务: ${task.id} (第${attempt}次)`);
          }
        }

        // 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('任务超时')), BATCH_CONFIG.TASK_TIMEOUT);
        });

        const result = await Promise.race([
          processor(task),
          timeoutPromise
        ]);

        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === BATCH_CONFIG.MAX_RETRIES) {
          throw lastError;
        }
      }
    }

    throw lastError!;
  }

  /**
   * 处理笔记分析任务
   */
  private async processNoteAnalysis(task: BatchTask): Promise<NoteContentAnalysis> {
    const { noteId, noteDetail } = task.data;
    
    // 检查缓存
    if (BATCH_CONFIG.ENABLE_CACHING) {
      const cached = await dataStorage.getAnalysis(noteId);
      if (cached) {
        return cached.analysis;
      }
    }

    // 执行分析
    const analysis = await dataAnalyzer.analyzeNoteContent(noteDetail);
    
    // 保存结果
    await dataStorage.saveAnalysis(noteId, analysis);
    
    return analysis;
  }

  /**
   * 处理评论分析任务
   */
  private async processCommentAnalysis(task: BatchTask): Promise<CommentSentimentAnalysis> {
    const { noteId, comments } = task.data;
    
    // 执行分析
    const analysis = await dataAnalyzer.analyzeCommentSentiment(comments);
    
    // 保存结果（可选）
    // await dataStorage.saveCommentAnalysis(noteId, analysis);
    
    return analysis;
  }

  /**
   * 处理数据获取任务
   */
  private async processDataFetch(task: BatchTask): Promise<XhsNoteDetail> {
    const { noteId, useCache } = task.data;
    
    // 检查缓存
    if (useCache) {
      const cached = await dataStorage.getNoteDetail(noteId);
      if (cached) {
        return cached.noteDetail;
      }
    }

    // 这里应该调用实际的数据获取API
    // 暂时抛出错误，需要集成实际的API调用
    throw new Error('数据获取功能需要集成实际的API调用');
  }

  /**
   * 去重笔记
   */
  private deduplicateNotes(notes: Array<{ noteId: string; noteDetail: XhsNoteDetail }>): Array<{ noteId: string; noteDetail: XhsNoteDetail }> {
    const seen = new Set<string>();
    return notes.filter(note => {
      if (seen.has(note.noteId)) {
        return false;
      }
      seen.add(note.noteId);
      return true;
    });
  }

  /**
   * 过滤已存在的分析
   */
  private async filterExistingAnalyses(notes: Array<{ noteId: string; noteDetail: XhsNoteDetail }>): Promise<Array<{ noteId: string; noteDetail: XhsNoteDetail }>> {
    const filtered = [];
    
    for (const note of notes) {
      const existing = await dataStorage.getAnalysis(note.noteId);
      if (!existing) {
        filtered.push(note);
      }
    }
    
    return filtered;
  }

  /**
   * 计算预估剩余时间
   */
  private calculateEstimatedTime(completed: number, total: number, startTime: number): number {
    if (completed === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const averageTime = elapsed / completed;
    const remaining = total - completed;
    
    return remaining * averageTime;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.on('taskCompleted', (task: BatchTask) => {
      if (debugLoggingEnabled) {
        console.log(`✅ 任务完成: ${task.id}`);
      }
    });

    this.on('taskFailed', (task: BatchTask, error: Error) => {
      if (debugLoggingEnabled) {
        console.error(`❌ 任务失败: ${task.id}`, error);
      }
    });
  }
}

// 导出单例实例
export const batchProcessor = new BatchProcessor();
