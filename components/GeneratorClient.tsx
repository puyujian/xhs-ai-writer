'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatErrorForUser } from '@/lib/error-handler'
import { historyManager } from '@/lib/history-manager'
import { HistoryItem } from '@/lib/history-types'
import HistoryPanel from './HistoryPanel'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Clipboard, Check, History, Sparkles } from 'lucide-react'
import { ds } from '@/lib/design-system'

interface ErrorState {
  title: string;
  message: string;
  suggestion: string;
  canRetry: boolean;
  retryDelay?: number;
  errorId: string;
}

// 将正则表达式定义移到组件外部，避免重复创建
const titleRegex = /##\s*1[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
const bodyRegex = /##\s*2[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
const tagsRegex = /##\s*3[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
const imagePromptRegex = /##\s*4[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;
const selfCommentRegex = /##\s*5[.、]?\s*(首评关键词引导|首评)/i;
const strategyRegex = /##\s*6[.、]?\s*(发布策略建议|发布策略)/i;
const playbookRegex = /##\s*7[.、]?\s*(小红书增长 Playbook|增长 Playbook)/i;

export default function GeneratorClient() {
  const [keyword, setKeyword] = useState('')
  const [userInfo, setUserInfo] = useState('')
  const [wordLimit, setWordLimit] = useState(600) // 默认600字
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<'analyzing' | 'generating' | ''>('')

  // 分离的内容状态
  const [streamContent, setStreamContent] = useState('') // 原始完整内容
  const [generatedTitles, setGeneratedTitles] = useState('') // 仅标题部分
  const [generatedBody, setGeneratedBody] = useState('') // 仅正文部分
  const [generatedTags, setGeneratedTags] = useState<string[]>([]) // 关键词标签
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState('') // AI绘画提示词
  const [generatedSelfComment, setGeneratedSelfComment] = useState('') // 用于首评引导
  const [generatedStrategy, setGeneratedStrategy] = useState('') // 用于发布策略
  const [generatedPlaybook, setGeneratedPlaybook] = useState('') // 用于增长Playbook

  const [error, setError] = useState<ErrorState | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fullContentRef = useRef<string>('') // 用于实时跟踪完整内容

  // 历史记录相关状态
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  // 为每个需要复制的区域创建一个 ref
  const titlesRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const imagePromptRef = useRef<HTMLDivElement>(null);
  const selfCommentRef = useRef<HTMLDivElement>(null);

  // 新增一个 state 来追踪哪个按钮被点击了
  const [copiedButtonId, setCopiedButtonId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟打字机相关状态
  const chunkQueueRef = useRef<string[]>([]) // 数据块队列
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null) // 打字机定时器
  const [displayContent, setDisplayContent] = useState('') // 当前显示的内容

  // 实时解析和分割内容的 Effect
  useEffect(() => {
    // 解析四个部分：标题、正文、标签、AI绘画提示词
    const parseContent = (content: string) => {

      // 查找各部分的位置
      const titleMatch = content.match(titleRegex);
      const bodyMatch = content.match(bodyRegex);
      const tagsMatch = content.match(tagsRegex);
      const imagePromptMatch = content.match(imagePromptRegex);
      // 新增匹配
      const selfCommentMatch = content.match(selfCommentRegex);
      const strategyMatch = content.match(strategyRegex);
      const playbookMatch = content.match(playbookRegex);



      // 创建位置数组并排序
      const sections = [
        { name: 'title', match: titleMatch, index: titleMatch?.index ?? -1 },
        { name: 'body', match: bodyMatch, index: bodyMatch?.index ?? -1 },
        { name: 'tags', match: tagsMatch, index: tagsMatch?.index ?? -1 },
        { name: 'imagePrompt', match: imagePromptMatch, index: imagePromptMatch?.index ?? -1 },
        // 新增 section
        { name: 'selfComment', match: selfCommentMatch, index: selfCommentMatch?.index ?? -1 },
        { name: 'strategy', match: strategyMatch, index: strategyMatch?.index ?? -1 },
        { name: 'playbook', match: playbookMatch, index: playbookMatch?.index ?? -1 }
      ].filter(section => section.index !== -1).sort((a, b) => a.index - b.index);

      // 初始化内容变量
      let titles = '';
      let body = '';
      let tags: string[] = [];
      let imagePrompt = '';
      // 新增变量
      let selfComment = '';
      let strategy = '';
      let playbook = '';

      if (sections.length === 0) {
        // 如果一个标记都找不到，所有内容都暂时视为标题
        titles = content;
      } else {
        // **【核心修复逻辑】**
        // 1. 检查第一个标记之前是否有内容，如果有，则视为标题
        const firstSectionIndex = sections[0].index;
        if (firstSectionIndex > 0) {
          titles = content.substring(0, firstSectionIndex).trim();
        }

        // 2. 循环解析每个已识别的部分
        for (let i = 0; i < sections.length; i++) {
          const currentSection = sections[i];
          const nextSection = sections[i + 1];

          // 计算当前部分的开始和结束位置
          const startIndex = currentSection.index + (currentSection.match?.[0].length || 0);
          const endIndex = nextSection ? nextSection.index : content.length;

          const sectionContent = content.substring(startIndex, endIndex).trim();

          switch (currentSection.name) {
            case 'title':
              titles = sectionContent;
              break;
            case 'body':
              body = sectionContent;
              break;
            case 'tags':
              const tagMatches = sectionContent.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g) || [];
              const listTagMatches = sectionContent.match(/[-*]\s*([^\n]+)/g) || [];
              const extractedTags = [
                ...tagMatches.map(tag => tag.replace(/^#/, '')), // 移除#号
                ...listTagMatches.map(item => item.replace(/[-*]\s*/, '').trim())
              ];
              tags = Array.from(new Set(extractedTags)).filter(Boolean); // 去重并移除空字符串
              break;
            case 'imagePrompt':
              imagePrompt = sectionContent;
              break;
            // 新增 case
            case 'selfComment':
              selfComment = sectionContent;
              break;
            case 'strategy':
              strategy = sectionContent;
              break;
            case 'playbook':
              playbook = sectionContent;
              break;
          }
        }
      }

      return { titles, body, tags, imagePrompt, selfComment, strategy, playbook };
    };

    const parsed = parseContent(displayContent);
    setGeneratedTitles(parsed.titles);
    setGeneratedBody(parsed.body);
    setGeneratedTags(parsed.tags);
    setGeneratedImagePrompt(parsed.imagePrompt);
    // 设置新状态
    setGeneratedSelfComment(parsed.selfComment);
    setGeneratedStrategy(parsed.strategy);
    setGeneratedPlaybook(parsed.playbook);
  }, [displayContent]);

  // 启动打字机效果
  const startTypewriter = useCallback(() => {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
    }

    typewriterIntervalRef.current = setInterval(() => {
      if (chunkQueueRef.current.length > 0) {
        // 从队列中取出一小块内容
        const chunk = chunkQueueRef.current.shift()!;
        setDisplayContent(prev => prev + chunk);
      }
    }, 20); // 每20毫秒更新一次，创造平滑的打字机效果
  }, []);

  // 停止打字机效果
  const stopTypewriter = useCallback(() => {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }

    // 清空剩余队列，立即显示所有内容
    if (chunkQueueRef.current.length > 0) {
      const remainingContent = chunkQueueRef.current.join('');
      chunkQueueRef.current = [];
      setDisplayContent(prev => prev + remainingContent);
    }
  }, []);

  // 提取状态重置逻辑，避免代码重复
  const resetOutputStates = useCallback(() => {
    setStreamContent('')
    setDisplayContent('')
    fullContentRef.current = '' // 重置完整内容引用
    setGeneratedTitles('')
    setGeneratedBody('')
    setGeneratedTags([])
    setGeneratedImagePrompt('')
    setGeneratedSelfComment('')
    setGeneratedStrategy('')
    setGeneratedPlaybook('')
    chunkQueueRef.current = []
    stopTypewriter()
  }, [stopTypewriter]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!keyword.trim() || !userInfo.trim()) {
      const errorInfo = formatErrorForUser('请填写关键词和原始资料');
      setError(errorInfo);
      return
    }

    setLoading(true)
    setLoadingStage('analyzing')
    setError(null)
    resetOutputStates()

    // 创建新的AbortController
    abortControllerRef.current = new AbortController()

    try {
      // 第一步：分析热门笔记
      const analyzeResponse = await fetch('/api/analyze-hot-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, deepAnalysis: true }),
        signal: abortControllerRef.current.signal,
      })

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json()
        throw new Error(errorData.details || '分析热门笔记失败')
      }

      const analysisResult = await analyzeResponse.json()

      // 更新加载阶段
      setLoadingStage('generating')

      // 第二步：流式生成内容
      const streamResponse = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hot_post_rules: analysisResult.analysis,
          user_info: userInfo,
          keyword,
          word_limit: wordLimit, // 传递字数限制参数
          // 注入Top5的第一条洞察作为生成增强（可后续做多条聚合）
          insights_payload: Array.isArray(analysisResult.top5Analysis) && analysisResult.top5Analysis.length > 0
            ? {
                noteAnalysis: analysisResult.top5Analysis[0]?.noteAnalysis,
                commentAnalysis: analysisResult.top5Analysis[0]?.commentAnalysis,
                insights: analysisResult.top5Analysis[0]?.insights,
              }
            : undefined,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!streamResponse.ok) {
        throw new Error('生成内容失败')
      }

      const reader = streamResponse.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        // 启动打字机效果
        startTypewriter()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                // 停止打字机并显示剩余内容
                stopTypewriter()
                setLoading(false)
                setLoadingStage('')
                
                // 保存到历史记录
                setSaveStatus('saving')
                setTimeout(() => {
                  saveToHistory(fullContentRef.current) // 使用实时内容引用
                }, 100) // 短暂延迟确保状态更新
                
                return
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  // 将内容添加到队列中，而不是直接更新UI
                  // 将内容分割成更小的块以获得更平滑的效果
                  const contentChunks = parsed.content.split('').reduce((acc: string[], char: string, index: number) => {
                    const chunkIndex = Math.floor(index / 3) // 每3个字符一组
                    if (!acc[chunkIndex]) acc[chunkIndex] = ''
                    acc[chunkIndex] += char
                    return acc
                  }, [])

                  chunkQueueRef.current.push(...contentChunks)

                  // 同时更新完整内容用于备份
                  setStreamContent(prev => prev + parsed.content)
                  // 实时更新完整内容引用
                  fullContentRef.current += parsed.content
                } else if (parsed.error) {
                  throw new Error(parsed.error)
                }
              } catch (parseError) {
                // 忽略解析错误，继续处理下一行
              }
            }
          }
        }
      }
    } catch (err) {
      // 出错时停止打字机
      stopTypewriter()

      if (err instanceof Error && err.name === 'AbortError') {
        const errorInfo = formatErrorForUser('生成已取消');
        setError(errorInfo);
      } else {
        const errorMessage = err instanceof Error ? err.message : '生成失败，请重试';
        const errorInfo = formatErrorForUser(errorMessage);
        setError(errorInfo);
      }
    } finally {
      setLoading(false)
      setLoadingStage('')
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
      setLoadingStage('')
    }
    // 停止打字机效果
    stopTypewriter()
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    resetOutputStates();
    handleGenerate();
  }

  // 保存到历史记录
  const saveToHistory = useCallback((forcedContent?: string) => {
    // 如果传入了强制内容，使用它；否则使用状态中的内容
    const contentToSave = forcedContent?.trim() || displayContent.trim() || streamContent.trim();
    
    // 只有当有关键词和生成内容时才保存
    if (!keyword.trim() || !contentToSave) {
      console.log('⚠️ 保存跳过：缺少关键词或内容', { 
        keyword: keyword.trim(), 
        streamContentLength: streamContent.length,
        displayContentLength: displayContent.length,
        forcedContentLength: forcedContent?.length || 0,
        contentToSave: contentToSave.length 
      });
      return;
    }

    try {
      // 直接解析streamContent以确保获得完整内容
      const parseContent = (content: string) => {
        const titleRegex = /##\s*1[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
        const bodyRegex = /##\s*2[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
        const tagsRegex = /##\s*3[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
        const imagePromptRegex = /##\s*4[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;
        const selfCommentRegex = /##\s*5[.、]?\s*(首评关键词引导|首评)/i;
        const strategyRegex = /##\s*6[.、]?\s*(发布策略建议|发布策略)/i;
        const playbookRegex = /##\s*7[.、]?\s*(小红书增长 Playbook|增长 Playbook)/i;

        const sections = [
          { name: 'title', match: content.match(titleRegex), index: content.match(titleRegex)?.index ?? -1 },
          { name: 'body', match: content.match(bodyRegex), index: content.match(bodyRegex)?.index ?? -1 },
          { name: 'tags', match: content.match(tagsRegex), index: content.match(tagsRegex)?.index ?? -1 },
          { name: 'imagePrompt', match: content.match(imagePromptRegex), index: content.match(imagePromptRegex)?.index ?? -1 },
          { name: 'selfComment', match: content.match(selfCommentRegex), index: content.match(selfCommentRegex)?.index ?? -1 },
          { name: 'strategy', match: content.match(strategyRegex), index: content.match(strategyRegex)?.index ?? -1 },
          { name: 'playbook', match: content.match(playbookRegex), index: content.match(playbookRegex)?.index ?? -1 }
        ].filter(section => section.index !== -1).sort((a, b) => a.index - b.index);

        let titles = '';
        let body = '';
        let tags: string[] = [];
        let imagePrompt = '';
        let selfComment = '';
        let strategy = '';
        let playbook = '';

        if (sections.length === 0) {
          titles = content;
        } else {
          const firstSectionIndex = sections[0].index;
          if (firstSectionIndex > 0) {
            titles = content.substring(0, firstSectionIndex).trim();
          }

          for (let i = 0; i < sections.length; i++) {
            const currentSection = sections[i];
            const nextSection = sections[i + 1];
            const startIndex = currentSection.index + (currentSection.match?.[0].length || 0);
            const endIndex = nextSection ? nextSection.index : content.length;
            const sectionContent = content.substring(startIndex, endIndex).trim();

            switch (currentSection.name) {
              case 'title':
                titles = sectionContent;
                break;
              case 'body':
                body = sectionContent;
                break;
              case 'tags':
                const tagMatches = sectionContent.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g) || [];
                const listTagMatches = sectionContent.match(/[-*]\s*([^\n]+)/g) || [];
                const extractedTags = [
                  ...tagMatches.map(tag => tag.replace(/^#/, '')),
                  ...listTagMatches.map(item => item.replace(/[-*]\s*/, '').trim())
                ];
                tags = Array.from(new Set(extractedTags)).filter(Boolean);
                break;
              case 'imagePrompt':
                imagePrompt = sectionContent;
                break;
              case 'selfComment':
                selfComment = sectionContent;
                break;
              case 'strategy':
                strategy = sectionContent;
                break;
              case 'playbook':
                playbook = sectionContent;
                break;
            }
          }
        }

        return { titles, body, tags, imagePrompt, selfComment, strategy, playbook };
      };

      const parsed = parseContent(contentToSave);
      
      historyManager.saveHistory({
        keyword: keyword.trim(),
        userInfo: userInfo.trim(),
        generatedTitles: parsed.titles,
        generatedBody: parsed.body,
        generatedTags: parsed.tags,
        generatedImagePrompt: parsed.imagePrompt,
        generatedSelfComment: parsed.selfComment,
        generatedStrategy: parsed.strategy,
        generatedPlaybook: parsed.playbook
      });
      
      console.log('✅ 历史记录已自动保存', { 
        keyword: keyword.trim(), 
        contentLength: contentToSave.length,
        parsedSections: {
          titles: !!parsed.titles,
          body: !!parsed.body,
          tags: parsed.tags.length,
          imagePrompt: !!parsed.imagePrompt,
          selfComment: !!parsed.selfComment,
          strategy: !!parsed.strategy,
          playbook: !!parsed.playbook
        }
      });
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('保存历史记录失败:', error);
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 5000)
    }
  }, [keyword, userInfo, streamContent, displayContent]);

  // 恢复历史记录
  const handleRestoreHistory = useCallback((item: HistoryItem) => {
    setKeyword(item.keyword);
    setUserInfo(item.userInfo);
    setStreamContent(''); // 先清空流内容
    setGeneratedTitles(item.generatedTitles);
    setGeneratedBody(item.generatedBody);
    setGeneratedTags(item.generatedTags);
    setGeneratedImagePrompt(item.generatedImagePrompt);
    setGeneratedSelfComment(item.generatedSelfComment);
    setGeneratedStrategy(item.generatedStrategy);
    setGeneratedPlaybook(item.generatedPlaybook);
    
    // 重新构建完整内容用于显示
    const fullContent = [
      item.generatedTitles,
      item.generatedBody,
      item.generatedTags.join(' '),
      item.generatedImagePrompt,
      item.generatedSelfComment,
      item.generatedStrategy,
      item.generatedPlaybook
    ].filter(Boolean).join('\n\n');
    
    setStreamContent(fullContent);
    
    // 可选：关闭历史记录面板
    setShowHistoryPanel(false);
    
    console.log('✅ 历史记录已恢复');
  }, []);

  // 通用的、带反馈的复制处理函数
  const handleCopy = (textToCopy: string | undefined, buttonId: string) => {
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);

    // 清除上一个计时器（如果存在）
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    setCopiedButtonId(buttonId);

    // 2秒后自动恢复按钮状态
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedButtonId(null);
    }, 2000);
  };

  return (
    <div className={ds.cn(
      'grid gap-4', // 减少间距
      'grid-cols-1 lg:grid-cols-12',
      'max-w-none min-h-[85vh]' // 确保固定高度
    )}>
      {/* 历史记录面板 - 固定高度 */}
      <div className={ds.cn(
        'lg:col-span-3',
        showHistoryPanel ? 'block' : 'hidden lg:block',
        showHistoryPanel && 'fixed inset-0 z-50 lg:static lg:z-auto',
        showHistoryPanel && 'bg-black/20 backdrop-blur-sm lg:bg-transparent'
      )}>
        <div className={ds.cn(
          showHistoryPanel && 'absolute right-0 top-0 h-full w-80 lg:static lg:w-full'
        )}>
          <div className="h-[85vh]"> {/* 固定高度容器 */}
            <HistoryPanel 
              onRestore={handleRestoreHistory}
              className="h-full"
            />
          </div>
        </div>
        {/* 移动端遮罩层 */}
        {showHistoryPanel && (
          <div 
            className="absolute inset-0 lg:hidden" 
            onClick={() => setShowHistoryPanel(false)}
          />
        )}
      </div>

      {/* 主要内容区域 - 等高布局 */}
      <div className="lg:col-span-9">
        <div className="grid gap-4 lg:grid-cols-2 h-[85vh]"> {/* 固定高度且减少间距 */}
          {/* 输入区域 - 固定高度 */}
          <div className="h-full">
            {/* 输入卡片 - 填满高度 */}
            <Card className={ds.cn(
              ds.presets.card.base,
              ds.presets.card.hover,
              'border-slate-200 bg-white/80 backdrop-blur-sm',
              'h-full flex flex-col' // 填满高度且使用flex布局
            )}>
              <CardHeader className="flex-shrink-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={ds.cn(
                    ds.getTextStyles('lg', 'semibold'),
                    'text-slate-800 flex items-center gap-2'
                  )}>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      ✍️
                    </span>
                    <span>创作输入</span>
                  </CardTitle>
                  {/* 移动端历史记录切换按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                    className={ds.cn(
                      'lg:hidden',
                      ds.animations.transition.base,
                      showHistoryPanel 
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <History size={14} className="mr-1.5" />
                    历史记录
                  </Button>
                </div>
                <CardDescription className={ds.cn(
                  ds.getTextStyles('sm'),
                  'text-slate-600'
                )}>
                  <span className="font-medium text-blue-600">三步生成爆款：</span>
                  <span className="ml-1">主题定位 → 素材输入 → AI创作</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col gap-4 p-4">
                {/* 主题输入 - 紧凑设计 */}
                <div className="space-y-2">
                  <label className={ds.cn(
                    ds.getTextStyles('sm', 'medium'),
                    'text-slate-700 flex items-center gap-2'
                  )}>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                      1
                    </span>
                    <span>笔记主题</span>
                    <span className={ds.cn(
                      ds.getTextStyles('xs'),
                      'text-slate-500 font-normal'
                    )}>
                      （关键词越具体，效果越精准）
                    </span>
                  </label>
                  <Input
                    placeholder="例如：春季敏感肌护肤、职场穿搭技巧、平价美妆好物..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={loading}
                    className={ds.cn(
                      'h-9', // 减少高度
                      ds.presets.input.base,
                      'border-slate-200 focus:border-blue-500 focus:ring-blue-500'
                    )}
                  />
                </div>

                {/* 素材输入 - 自适应高度 */}
                <div className="flex-1 flex flex-col gap-2">
                  <label className={ds.cn(
                    ds.getTextStyles('sm', 'medium'),
                    'text-slate-700 flex items-center gap-2'
                  )}>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">
                      2
                    </span>
                    <span>原始素材</span>
                    <span className={ds.cn(
                      ds.getTextStyles('xs'),
                      'text-slate-500 font-normal'
                    )}>
                      （信息越详细，效果越好）
                    </span>
                  </label>
                  <Textarea
                    placeholder={`输入你的笔记草稿、产品信息或灵感...

例如：产品：XX牌玻尿酸精华，质地清爽，吸收快
我的感受：用了一周，皮肤水润，上妆服帖
目标人群：20-30岁年轻女性，混合皮或干皮
价格：199元，性价比高

💡 提示：可包含产品特点、使用感受、适用人群、价格等`}
                    value={userInfo}
                    onChange={(e) => setUserInfo(e.target.value)}
                    disabled={loading}
                    className={ds.cn(
                      'flex-1 resize-none',
                      ds.presets.input.base,
                      'border-slate-200 focus:border-purple-500 focus:ring-purple-500',
                      'text-sm leading-relaxed'
                    )}
                  />
                </div>

                {/* 字数和操作区域 - 紧凑布局 */}
                <div className="flex-shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={ds.cn(
                      ds.getTextStyles('sm', 'medium'),
                      'text-slate-700 flex items-center gap-2'
                    )}>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold">
                        3
                      </span>
                      <span>字数设定</span>
                    </label>
                    
                    {/* 字数选择 - 水平排列 */}
                    <div className="flex items-center gap-2">
                      {[200, 400, 600, 800].map((limit) => (
                        <button
                          key={limit}
                          type="button"
                          onClick={() => setWordLimit(limit)}
                          disabled={loading}
                          className={ds.cn(
                            'px-3 py-1 rounded-full text-xs font-medium',
                            'border transition-all duration-200',
                            wordLimit === limit
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-green-300',
                            loading && 'opacity-50 cursor-not-allowed',
                            !loading && 'cursor-pointer'
                          )}
                        >
                          {limit}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 自定义字数 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">自定义字数：</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="100"
                        max="1000"
                        value={wordLimit}
                        onChange={(e) => setWordLimit(Math.max(100, Math.min(1000, parseInt(e.target.value) || 600)))}
                        disabled={loading}
                        className={ds.cn(
                          'w-20 h-7 text-xs text-center',
                          ds.presets.input.base,
                          'border-slate-200 focus:border-green-500 focus:ring-green-500'
                        )}
                      />
                      <span className="text-slate-600">字</span>
                    </div>
                  </div>
                </div>

                {/* 错误显示 - 紧凑版本 */}
                {error && (
                  <div className={ds.cn(
                    'rounded-md border border-red-200 bg-red-50 p-3',
                    'text-sm'
                  )}>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 text-xs">⚠️</span>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-red-800">{error.title}</div>
                        <div className="text-red-700 text-xs">{error.message}</div>
                        <div className="flex items-center gap-2 mt-2">
                          {error.canRetry && (
                            <Button
                              onClick={handleRetry}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs text-red-700 border-red-300 hover:bg-red-100"
                            >
                              重试
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 - 底部固定 */}
                <div className="flex-shrink-0 pt-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerate}
                      disabled={loading || !keyword.trim() || !userInfo.trim()}
                      className={ds.cn(
                        'flex-1 h-10',
                        'bg-gradient-to-r from-blue-500 to-purple-600',
                        'hover:from-blue-600 hover:to-purple-700',
                        'text-white font-medium text-sm',
                        'shadow-md',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span className="text-xs">
                            {loadingStage === 'analyzing' ? '分析中...' :
                             loadingStage === 'generating' ? '生成中...' : '处理中...'}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sparkles size={16} />
                          <span>生成爆款文案</span>
                        </span>
                      )}
                    </Button>

                    {loading && (
                      <Button
                        onClick={handleStop}
                        variant="outline"
                        className={ds.cn(
                          'px-4 h-10',
                          'border-slate-300 text-slate-600 text-sm',
                          'hover:bg-slate-50'
                        )}
                      >
                        停止
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 结果区域 - 等高设计 */}
          <div className="h-full">
            <Card className={ds.cn(
              ds.presets.card.base,
              'border-slate-200 bg-white/80 backdrop-blur-sm',
              'h-full flex flex-col'
            )}>
              <CardHeader className="flex-shrink-0 pb-3">
                <CardTitle className={ds.cn(
                  ds.getTextStyles('lg', 'semibold'),
                  'text-slate-800 flex items-center gap-2'
                )}>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-white text-sm">
                    ✨
                  </span>
                  <span>生成结果</span>
                </CardTitle>
                <CardDescription className={ds.cn(
                  ds.getTextStyles('sm'),
                  'text-slate-600'
                )}>
                  AI智能分析并生成的爆款文案内容
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 p-4 overflow-hidden">
                {/* 滚动内容区域 */}
                <div className="h-full overflow-y-auto space-y-4 pr-2">
                  {/* 加载状态显示 */}
                  {loading && !streamContent && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-4"></div>
                      <div className="space-y-2">
                        {loadingStage === 'analyzing' && (
                          <>
                            <p className={ds.cn(ds.getTextStyles('sm', 'medium'), 'text-slate-800')}>
                              🔍 正在分析「{keyword}」热门笔记...
                            </p>
                            <p className={ds.cn(ds.getTextStyles('xs'), 'text-slate-500')}>
                              分析爆款规律，定制创作策略
                            </p>
                          </>
                        )}
                        {loadingStage === 'generating' && (
                          <>
                            <p className={ds.cn(ds.getTextStyles('sm', 'medium'), 'text-slate-800')}>
                              ✅ 分析完成！正在生成文案...
                            </p>
                            <p className={ds.cn(ds.getTextStyles('xs'), 'text-slate-500')}>
                              基于热门规律，创作专属内容
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 空状态显示 */}
                  {!loading && !streamContent && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                      <div className="text-4xl mb-4">📝</div>
                      <div className="space-y-3">
                        <h3 className={ds.cn(ds.getTextStyles('lg', 'semibold'), 'text-slate-800')}>
                          准备开始创作
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <span className="text-slate-600">输入主题</span>
                            <span className="text-slate-400">→</span>
                            <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span className="text-slate-600">提供素材</span>
                            <span className="text-slate-400">→</span>
                            <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span className="text-slate-600">AI 创作</span>
                          </div>
                        </div>
                        <p className={ds.cn(ds.getTextStyles('sm'), 'text-slate-500 mt-4')}>
                          🚀 填写左侧信息，即可开始创作
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 生成的内容 */}
                  {(generatedTitles || generatedBody || generatedTags.length > 0 || generatedImagePrompt || generatedSelfComment || generatedStrategy || generatedPlaybook) && (
                    <div className="space-y-4">
                      {/* 标题 */}
                      {generatedTitles && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={ds.cn(ds.getTextStyles('sm', 'semibold'), 'text-slate-800')}>
                              🎯 生成标题
                            </h4>
                            {!loading && (
                              <Button
                                onClick={() => handleCopy(titlesRef.current?.innerText, 'titles')}
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                              >
                                {copiedButtonId === 'titles' ? (
                                  <><Check size={12} className="mr-1" />已复制</>
                                ) : (
                                  <><Clipboard size={12} className="mr-1" />复制</>
                                )}
                              </Button>
                            )}
                          </div>
                          <div ref={titlesRef} className={ds.cn(
                            'text-sm text-slate-800 leading-relaxed',
                            'bg-slate-50 rounded-md p-3 border border-slate-100'
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {generatedTitles}
                            </ReactMarkdown>
                            {loading && !generatedBody && (
                              <span className="inline-block w-1 h-4 bg-blue-500 animate-pulse ml-1"></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 正文内容 */}
                      {generatedBody && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={ds.cn(ds.getTextStyles('sm', 'semibold'), 'text-slate-800')}>
                              📄 正文内容
                            </h4>
                            {!loading && (
                              <Button
                                onClick={() => handleCopy(bodyRef.current?.innerText, 'body')}
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                              >
                                {copiedButtonId === 'body' ? (
                                  <><Check size={12} className="mr-1" />已复制</>
                                ) : (
                                  <><Clipboard size={12} className="mr-1" />复制</>
                                )}
                              </Button>
                            )}
                          </div>
                          <div ref={bodyRef} className={ds.cn(
                            'text-sm text-slate-800 leading-relaxed',
                            'bg-slate-50 rounded-md p-3 border border-slate-100'
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {generatedBody}
                            </ReactMarkdown>
                            {loading && (
                              <span className="inline-block w-1 h-4 bg-blue-500 animate-pulse ml-1"></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 标签 */}
                      {generatedTags.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={ds.cn(ds.getTextStyles('sm', 'semibold'), 'text-slate-800')}>
                              🏷️ 关键词标签
                            </h4>
                            {!loading && (
                              <Button
                                onClick={() => handleCopy(tagsRef.current?.innerText?.replace(/\s+/g, ' '), 'tags')}
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                              >
                                {copiedButtonId === 'tags' ? (
                                  <><Check size={12} className="mr-1" />已复制</>
                                ) : (
                                  <><Clipboard size={12} className="mr-1" />复制</>
                                )}
                              </Button>
                            )}
                          </div>
                          <div ref={tagsRef} className="flex flex-wrap gap-1.5">
                            {generatedTags.map((tag, index) => (
                              <Badge key={index} variant="tag" className="text-xs px-2 py-1 cursor-pointer hover:scale-105 transition-transform">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI绘画提示词 */}
                      {generatedImagePrompt && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={ds.cn(ds.getTextStyles('sm', 'semibold'), 'text-slate-800')}>
                              🎨 AI绘画提示词
                            </h4>
                            {!loading && (
                              <Button
                                onClick={() => handleCopy(imagePromptRef.current?.innerText, 'imagePrompt')}
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                              >
                                {copiedButtonId === 'imagePrompt' ? (
                                  <><Check size={12} className="mr-1" />已复制</>
                                ) : (
                                  <><Clipboard size={12} className="mr-1" />复制</>
                                )}
                              </Button>
                            )}
                          </div>
                          <div ref={imagePromptRef} className={ds.cn(
                            'text-sm text-slate-800 leading-relaxed',
                            'bg-slate-50 rounded-md p-3 border border-slate-100'
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {generatedImagePrompt}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* 首评引导 */}
                      {generatedSelfComment && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={ds.cn(ds.getTextStyles('sm', 'semibold'), 'text-slate-800')}>
                              💬 首评引导
                            </h4>
                            {!loading && (
                              <Button
                                onClick={() => handleCopy(selfCommentRef.current?.innerText, 'selfComment')}
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                              >
                                {copiedButtonId === 'selfComment' ? (
                                  <><Check size={12} className="mr-1" />已复制</>
                                ) : (
                                  <><Clipboard size={12} className="mr-1" />复制</>
                                )}
                              </Button>
                            )}
                          </div>
                          <div ref={selfCommentRef} className={ds.cn(
                            'text-sm text-slate-800 leading-relaxed',
                            'bg-amber-50 rounded-md p-3 border border-amber-100'
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {generatedSelfComment}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* 发布策略 */}
                      {generatedStrategy && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={ds.cn(ds.getTextStyles('sm', 'semibold'), 'text-slate-800')}>
                              🚀 发布策略
                            </h4>
                          </div>
                          <div className={ds.cn(
                            'text-sm text-slate-800 leading-relaxed',
                            'bg-blue-50 rounded-md p-3 border border-blue-100'
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {generatedStrategy}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* 增长Playbook */}
                      {generatedPlaybook && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={ds.cn(ds.getTextStyles('sm', 'semibold'), 'text-slate-800')}>
                              📊 增长Playbook
                            </h4>
                          </div>
                          <div className={ds.cn(
                            'text-sm text-slate-800 leading-relaxed',
                            'bg-purple-50 rounded-md p-3 border border-purple-100'
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {generatedPlaybook}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* 操作按钮区域 */}
                      {!loading && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                const fullText = [
                                  titlesRef.current?.innerText,
                                  bodyRef.current?.innerText,
                                  tagsRef.current?.innerText?.replace(/\s+/g, ' '),
                                  imagePromptRef.current?.innerText,
                                  selfCommentRef.current?.innerText
                                ].filter(Boolean).join('\n\n');
                                handleCopy(fullText, 'full');
                              }}
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs flex-1"
                            >
                              {copiedButtonId === 'full' ? (
                                <><Check size={12} className="mr-1" />已复制全文</>
                              ) : (
                                <><Clipboard size={12} className="mr-1" />复制全文</>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setStreamContent('');
                                setGeneratedTitles('');
                                setGeneratedBody('');
                                setGeneratedTags([]);
                                setGeneratedImagePrompt('');
                                setGeneratedSelfComment('');
                                setGeneratedStrategy('');
                                setGeneratedPlaybook('');
                              }}
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            >
                              🗑️ 清空
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 保存状态提示 */}
                      {saveStatus && (
                        <div className={ds.cn(
                          'rounded-md p-2 text-xs flex items-center gap-2',
                          saveStatus === 'saving' && 'bg-blue-50 border border-blue-200 text-blue-700',
                          saveStatus === 'saved' && 'bg-green-50 border border-green-200 text-green-700',
                          saveStatus === 'error' && 'bg-red-50 border border-red-200 text-red-700'
                        )}>
                          {saveStatus === 'saving' && (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                              <span>正在保存...</span>
                            </>
                          )}
                          {saveStatus === 'saved' && (
                            <>
                              <Check size={12} className="text-green-600" />
                              <span>已保存到历史记录</span>
                            </>
                          )}
                          {saveStatus === 'error' && (
                            <>
                              <span>⚠️</span>
                              <span>保存失败</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
