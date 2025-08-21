'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatErrorForUser } from '@/lib/error-handler'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Clipboard, Check } from 'lucide-react'

interface ErrorState {
  title: string;
  message: string;
  suggestion: string;
  canRetry: boolean;
  retryDelay?: number;
  errorId: string;
}

// 将正则表达式定义移到组件外部，避免重复创建
const analysisRegex = /##\s*1[.、]?\s*(爆款规律分析)/i;
const titleRegex = /##\s*2[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
const bodyRegex = /##\s*3[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
const tagsRegex = /##\s*4[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
const imagePromptRegex = /##\s*5[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;
const selfCommentRegex = /##\s*6[.、]?\s*(首评关键词引导|首评)/i;
const strategyRegex = /##\s*7[.、]?\s*(发布策略建议|发布策略)/i;
const playbookRegex = /##\s*8[.、]?\s*(小红书增长 Playbook|增长 Playbook)/i;

export default function GeneratorClient() {
  const [keyword, setKeyword] = useState('')
  const [userInfo, setUserInfo] = useState('')
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
    // 解析内容，排除爆款规律分析部分
    const parseContent = (content: string) => {

      // 查找各部分的位置
      const analysisMatch = content.match(analysisRegex);
      const titleMatch = content.match(titleRegex);
      const bodyMatch = content.match(bodyRegex);
      const tagsMatch = content.match(tagsRegex);
      const imagePromptMatch = content.match(imagePromptRegex);
      // 新增匹配
      const selfCommentMatch = content.match(selfCommentRegex);
      const strategyMatch = content.match(strategyRegex);
      const playbookMatch = content.match(playbookRegex);



      // 创建位置数组并排序，排除爆款规律分析部分
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
        // 1. 检查第一个标记之前是否有内容，如果有，检查是否包含爆款规律分析
        const firstSectionIndex = sections[0].index;
        if (firstSectionIndex > 0) {
          const beforeFirstSection = content.substring(0, firstSectionIndex).trim();
          
          // 检查是否包含爆款规律分析部分
          if (analysisMatch) {
            // 如果存在爆款规律分析，找到它的结束位置
            const analysisEndIndex = analysisMatch.index! + analysisMatch[0].length;
            // 找到下一个部分的开始位置
            const nextSectionStart = sections[0].index;
            // 提取爆款规律分析之后，第一个部分之前的内容作为标题
            if (analysisEndIndex < nextSectionStart) {
              titles = content.substring(analysisEndIndex, nextSectionStart).trim();
            }
          } else {
            // 如果没有爆款规律分析，直接使用第一个部分之前的内容作为标题
            titles = beforeFirstSection;
          }
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
      // 使用单次API调用方式
      setLoadingStage('generating'); // 直接设置为生成阶段
      const streamResponse = await fetch('/api/generate-combined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_info: userInfo,
          keyword,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!streamResponse.ok) {
        throw new Error('生成内容失败');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-200/15 to-indigo-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '0s'}}></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-indigo-200/15 to-purple-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-r from-slate-200/10 to-blue-200/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          
          {/* 主输入卡片 - 优化美观设计 */}
          <Card className="glass-card border-0 animate-fade-in shadow-xl hover:shadow-2xl overflow-hidden bg-gradient-to-br from-white/95 via-blue-50/80 to-indigo-50/90 backdrop-blur-lg border border-blue-100/50 relative transition-all duration-500">
            {/* 优雅的顶部装饰 */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
            
            {/* 微妙的背景纹理 */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
                backgroundSize: '24px 24px'
              }}></div>
            </div>
            
            <CardHeader className="pb-4 px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-gray-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent font-bold leading-tight mb-3">
                    AI 智能文案工厂
                  </div>
                  {/* 精致的状态标签 */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200/50">
                      v2.0
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200/50">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                      <span className="text-xs text-green-700 font-semibold">ONLINE</span>
                    </div>
                  </div>
                </div>
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-gray-600 mt-4 font-medium text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  基于先进AI模型 · 实时智能分析 · 一键生成爆款内容
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8 relative z-10">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label htmlFor="topic" className="text-sm sm:text-base font-semibold text-gray-700 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white shadow-md">
                      🎯
                    </div>
                    <span className="flex-1">文案主题</span>
                    <div className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-full">REQUIRED</div>
                  </label>
                  <Input
                    id="topic"
                    placeholder="例如：护肤心得、美食探店、旅行攻略..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="border-2 border-gray-200/80 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-base shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white/80 backdrop-blur-sm h-14 text-gray-700 placeholder:text-gray-400 font-medium"
                  />
                </div>
                
                <div className="space-y-3 xl:row-span-2">
                  <label htmlFor="material" className="text-sm sm:text-base font-semibold text-gray-700 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md">
                      📝
                    </div>
                    <span className="flex-1">素材内容</span>
                    <div className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-full">REQUIRED</div>
                  </label>
                  <Textarea
                    id="material"
                    placeholder="产品特点、个人感受、具体细节...越详细生成的文案越精准👍"
                    value={userInfo}
                    onChange={(e) => setUserInfo(e.target.value)}
                    className="border-2 border-gray-200/80 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-base min-h-[160px] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white/80 backdrop-blur-sm resize-none text-gray-700 placeholder:text-gray-400 font-medium leading-relaxed"
                    rows={6}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                  <div className="flex items-start gap-3">
                    <div className="text-red-500 text-lg">⚠️</div>
                    <div className="flex-1">
                      <div className="font-medium text-red-800 mb-1">{error.title}</div>
                      <div className="text-red-700 text-sm mb-2">{error.message}</div>
                      <div className="text-red-600 text-xs mb-3">{error.suggestion}</div>

                      <div className="flex items-center gap-2">
                        {error.canRetry && (
                          <Button
                            onClick={handleRetry}
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-300 hover:bg-red-100"
                          >
                            重试 {retryCount > 0 && `(${retryCount})`}
                          </Button>
                        )}
                        <span className="text-xs text-red-500">错误ID: {error.errorId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-6">
                <Button 
                  onClick={handleGenerate}
                  disabled={loading || !keyword.trim() || !userInfo.trim()}
                  className="px-12 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-500 w-full sm:w-auto max-w-sm group relative overflow-hidden bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-400 hover:via-indigo-500 hover:to-purple-500 text-white border-0 rounded-2xl transform hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      <span>正在生成中...</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <span className="text-xl group-hover:scale-110 transition-transform duration-300">⚡</span>
                        </div>
                        <span>开始生成爆款文案</span>
                      </div>
                      {/* 光效动画 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 生成结果区域 - 只有生成后才显示 */}
          {(loading || streamContent) && (
            <>

          {/* 标题卡片 - 增强视觉效果 */}
          <Card className={`${!loading && !streamContent ? 'hidden' : ''} animate-slide-up glass-card border-0 shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 backdrop-blur-md border border-blue-200/30`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">🎯</span>
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                    生成标题
                  </span>
                  {generatedTitles && (
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-0 animate-scale-in">
                      已完成
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                  AI生成的吸引眼球的爆款标题
                </CardDescription>
              </div>
              {!loading && generatedTitles && (
                <Button
                  onClick={() => handleCopy(titlesRef.current?.innerText, 'titles')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {copiedButtonId === 'titles' ? (
                    <span className="flex items-center gap-2 text-green-600"> 
                      <Check size={16} className="animate-scale-in" /> 
                      已复制 
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"> 
                      <Clipboard size={16} /> 
                      复制标题 
                    </span>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              <div ref={titlesRef} className="prose prose-slate max-w-none text-slate-800 leading-relaxed p-4 sm:p-6 bg-gradient-to-br from-blue-100/60 via-indigo-100/50 to-purple-100/60 rounded-2xl border-2 border-blue-200/40 shadow-inner backdrop-blur-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedTitles}
                </ReactMarkdown>
                {loading && !generatedBody && (
                  <span className="inline-block w-2 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse ml-1 rounded-full"></span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 内容卡片 - 只有当正文部分有内容时才显示 */}
          <Card className={`${!generatedBody ? 'hidden' : ''} animate-slide-up glass-card border-0 shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">📄</span>
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
                    生成内容
                  </span>
                  {generatedBody && (
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0 animate-scale-in">
                      已完成
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                  AI生成的精彩正文内容
                </CardDescription>
              </div>
              {!loading && generatedBody && (
                <Button
                  onClick={() => handleCopy(bodyRef.current?.innerText, 'body')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {copiedButtonId === 'body' ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <Check size={16} className="animate-scale-in" /> 
                      已复制
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clipboard size={16} /> 
                      复制正文
                    </span>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              <div ref={bodyRef} className="prose prose-slate max-w-none text-slate-800 leading-relaxed p-4 sm:p-6 bg-gradient-to-br from-blue-100/60 via-indigo-100/50 to-slate-100/60 rounded-2xl border-2 border-blue-200/40 shadow-inner backdrop-blur-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedBody}
                </ReactMarkdown>
                {loading && (
                  <span className="inline-block w-2 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse ml-1 rounded-full"></span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 标签卡片 - 只有当标签有内容时才显示 */}
          <Card className={`${!generatedTags.length ? 'hidden' : ''} animate-slide-up glass-card border-0 shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 backdrop-blur-md border border-blue-200/30`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">🏷️</span>
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
                    关键词标签
                  </span>
                  {generatedTags.length > 0 && (
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-0 animate-scale-in">
                      {generatedTags.length}个标签
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                  AI生成的热门流行标签
                </CardDescription>
              </div>
              {!loading && generatedTags.length > 0 && (
                <Button
                  onClick={() => handleCopy(tagsRef.current?.innerText?.replace(/\s+/g, ' '), 'tags')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {copiedButtonId === 'tags' ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <Check size={16} className="animate-scale-in" /> 
                      已复制
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clipboard size={16} /> 
                      复制标签
                    </span>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-100/60 via-purple-100/50 to-blue-100/60 rounded-2xl border-2 border-indigo-200/40 shadow-inner backdrop-blur-sm">
                <div ref={tagsRef} className="flex flex-wrap gap-2 sm:gap-3">
                  {generatedTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="tag"
                      className="cursor-pointer text-xs sm:text-sm font-medium animate-fade-in hover:scale-105 transition-all duration-300 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 hover:from-indigo-200 hover:via-purple-200 hover:to-blue-200 text-indigo-800 border-indigo-200 shadow-lg hover:shadow-xl"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      #{tag}
                    </Badge>
                  ))}
                  {loading && generatedTags.length === 0 && (
                    <span className="inline-block w-2 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse-soft ml-1 rounded-full"></span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI绘画提示词卡片 - 只有当提示词有内容时才显示 */}
          <Card className={`${!generatedImagePrompt ? 'hidden' : ''} animate-slide-up glass-card border-0 shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-slate-50/80 to-indigo-50/90 backdrop-blur-md border border-blue-200/30`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <span className="text-xl sm:text-2xl">🎨</span>
                  <span className="bg-gradient-to-r from-blue-600 to-slate-700 bg-clip-text text-transparent">AI绘画提示词</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">为配图生成的AI绘画提示</CardDescription>
              </div>
              {!loading && generatedImagePrompt && (
                <Button
                  onClick={() => handleCopy(imagePromptRef.current?.innerText, 'imagePrompt')}
                  variant="outline"
                  size="sm"
                  className="w-[110px] sm:w-[130px] border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 text-xs sm:text-sm"
                >
                  {copiedButtonId === 'imagePrompt' ? (
                    <span className="flex items-center gap-1 sm:gap-2"> <Check size={14} className="sm:w-4 sm:h-4" /> 已复制 </span>
                  ) : (
                    <span className="flex items-center gap-1 sm:gap-2"> <Clipboard size={14} className="sm:w-4 sm:h-4" /> 复制提示词 </span>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div ref={imagePromptRef} className="prose prose-slate max-w-none text-slate-800 leading-relaxed p-4 bg-gradient-to-br from-blue-100/60 via-slate-100/50 to-indigo-100/60 rounded-xl border-2 border-blue-200/40 shadow-inner backdrop-blur-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedImagePrompt}
                </ReactMarkdown>
                {loading && (
                  <span className="inline-block w-2 h-5 bg-gradient-to-r from-blue-500 to-slate-500 animate-pulse-soft ml-1 rounded-full"></span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 首评引导卡片 - 只有当内容存在时才显示 */}
          <Card className={`${!generatedSelfComment ? 'hidden' : ''} animate-slide-up glass-card border-0 shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <span className="text-xl sm:text-2xl">💬</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-slate-700 bg-clip-text text-transparent">首评关键词引导</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">复制后发布在自己的评论区，提升SEO效果</CardDescription>
              </div>
              {!loading && generatedSelfComment && (
                <Button
                  onClick={() => handleCopy(selfCommentRef.current?.innerText, 'selfComment')}
                  variant="outline"
                  size="sm"
                  className="w-[100px] sm:w-[120px] border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 text-xs sm:text-sm"
                >
                  {copiedButtonId === 'selfComment' ? (
                    <span className="flex items-center gap-1 sm:gap-2"> <Check size={14} className="sm:w-4 sm:h-4" /> 已复制 </span>
                  ) : (
                    <span className="flex items-center gap-1 sm:gap-2"> <Clipboard size={14} className="sm:w-4 sm:h-4" /> 复制首评 </span>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div ref={selfCommentRef} className="prose prose-base max-w-none text-gray-800 leading-relaxed p-4 bg-gradient-to-br from-indigo-100/60 via-blue-100/50 to-slate-100/60 rounded-xl border-2 border-indigo-200/40 shadow-inner backdrop-blur-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedSelfComment}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* 发布策略建议卡片 - 只有当内容存在时才显示 */}
          <Card className={`${!generatedStrategy ? 'hidden' : ''} animate-slide-up glass-card border-0 shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <span className="text-xl sm:text-2xl">🚀</span>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">发布策略建议</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">AI基于内容类型给出的发布时机建议</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="prose prose-base max-w-none text-gray-800 leading-relaxed p-4 bg-gradient-to-br from-blue-100/60 via-indigo-100/50 to-slate-100/60 rounded-xl border-2 border-blue-200/40 shadow-inner backdrop-blur-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedStrategy}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* 增长Playbook卡片 - 只有当内容存在时才显示 */}
          <Card className={`${!generatedPlaybook ? 'hidden' : ''} animate-slide-up glass-card border-0 shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <span className="text-xl sm:text-2xl">📊</span>
                  <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent font-bold">增长 Playbook & 数据核对清单</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-indigo-600 font-medium">将理论化为行动，系统性提升流量</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="prose prose-base max-w-none text-gray-800 leading-relaxed p-4 bg-gradient-to-br from-indigo-100/60 via-blue-100/50 to-slate-100/60 rounded-xl border-2 border-indigo-200/40 shadow-inner backdrop-blur-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedPlaybook}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* 初始占位/加载中提示 - 增强视觉效果 */}
          {loading && !streamContent && (
            <Card className="glass-card border-0 shadow-2xl animate-scale-in bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-shimmer"></div>
              <CardContent className="text-center py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* 动态背景 */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-4 left-4 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                  <div className="absolute top-8 right-8 w-3 h-3 bg-indigo-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                  <div className="absolute bottom-6 left-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
                  <div className="absolute bottom-12 right-1/4 w-1 h-1 bg-slate-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                </div>
                
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mb-6 sm:mb-8 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-2xl animate-spin-slow">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-full flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl lg:text-4xl animate-bounce">✨</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                    {loadingStage === 'generating' && (
                      <>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                          ✨ AI 正在创作中...
                        </h3>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                          🤖 分析热门规律 · ⚡ 创作专属爆款内容
                        </p>
                        <div className="flex justify-center items-center gap-2 sm:gap-3 mt-6">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </>
                    )}
                    {!loadingStage && (
                      <>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700">
                          AI 正在生成内容...
                        </h3>
                        <div className="flex justify-center items-center gap-1 sm:gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 取消按钮 */}
                  <div className="mt-8 sm:mt-10">
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      size="lg"
                      className="px-6 sm:px-8 py-3 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      ⏹️ 取消生成
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !streamContent && (
            <Card className="glass-card border-0 shadow-xl bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
              <CardContent className="text-center py-12 sm:py-16 px-4 sm:px-6">
                <div className="text-5xl sm:text-7xl mb-6 sm:mb-8 animate-bounce-gentle">✨</div>
                <div className="space-y-4 sm:space-y-6">
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">三步生成爆款文案</h3>
                  <div className="flex justify-center items-center gap-3 sm:gap-6 text-sm sm:text-base flex-wrap">
                    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-200">
                      <span className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg">1</span>
                      <span className="text-blue-700 font-semibold">输入主题</span>
                    </div>
                    <span className="text-gray-400 text-lg sm:text-xl hidden sm:inline">→</span>
                    <span className="text-gray-400 text-sm sm:hidden">↓</span>
                    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-50 to-purple-100 rounded-xl border border-indigo-200 hover:shadow-md transition-all duration-200">
                      <span className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg">2</span>
                      <span className="text-indigo-700 font-semibold">提供素材</span>
                    </div>
                    <span className="text-gray-400 text-lg sm:text-xl hidden sm:inline">→</span>
                    <span className="text-gray-400 text-sm sm:hidden">↓</span>
                    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-200">
                      <span className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 via-indigo-500 to-slate-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg">3</span>
                      <span className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-700 bg-clip-text text-transparent font-bold">AI 创作</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm sm:text-base mt-4 sm:mt-6">
                    🚀 <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">立即填写，见证 AI 的创作魔力</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 - 只有在生成完毕后显示 */}
          {!loading && streamContent && (
            <Card className="glass-card border-0 shadow-2xl animate-fade-in bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"></div>
              <CardContent className="px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>生成完成，可以复制使用了！</span>
                  </div>
                  <div className="flex gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end">
                    <Button
                      onClick={() => {
                        // 将所有部分的 innerText 拼接起来
                        const fullText = [
                          titlesRef.current?.innerText,
                          bodyRef.current?.innerText,
                          tagsRef.current?.innerText?.replace(/\s+/g, ' '),
                          imagePromptRef.current?.innerText,
                          selfCommentRef.current?.innerText
                        ].filter(Boolean).join('\n\n'); // 用两个换行符分隔，更美观
                        handleCopy(fullText, 'full');
                      }}
                      variant="modern"
                      size="sm"
                      className="shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {copiedButtonId === 'full' ? (
                        <span className="flex items-center gap-2 text-white">
                          <Check size={16} className="animate-scale-in" /> 
                          已复制全文 
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Clipboard size={16} /> 
                          复制全文 
                        </span>
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
                      className="border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <span className="flex items-center gap-2">
                        🗑️ 清空内容
                      </span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
