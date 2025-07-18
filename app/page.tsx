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
// ======================================================================
// ========================= 核心优化点 1/4 =========================
// ======================================================================
// 引入 Clipboard 和 Check 图标
import { Clipboard, Check } from 'lucide-react'

interface ErrorState {
  title: string;
  message: string;
  suggestion: string;
  canRetry: boolean;
  retryDelay?: number;
  errorId: string;
}

export default function Home() {
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

  // ======================================================================
  // ========================= 核心优化点 1/3 =========================
  // ======================================================================
  // 为每个需要复制的区域创建一个 ref
  const titlesRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const imagePromptRef = useRef<HTMLDivElement>(null);
  const selfCommentRef = useRef<HTMLDivElement>(null);

  // ======================================================================
  // ========================= 核心优化点 2/4 =========================
  // ======================================================================
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

      // 定义各部分的正则表达式
      const titleRegex = /##\s*1[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
      const bodyRegex = /##\s*2[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
      const tagsRegex = /##\s*3[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
      const imagePromptRegex = /##\s*4[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;
      // 新增三个正则表达式
      const selfCommentRegex = /##\s*5[.、]?\s*(首评关键词引导|首评)/i;
      const strategyRegex = /##\s*6[.、]?\s*(发布策略建议|发布策略)/i;
      const playbookRegex = /##\s*7[.、]?\s*(小红书增长 Playbook|增长 Playbook)/i;

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
    setStreamContent('')
    setDisplayContent('') // 清空显示内容
    setGeneratedTitles('')
    setGeneratedBody('')
    setGeneratedTags([])
    setGeneratedImagePrompt('')
    setGeneratedSelfComment('')
    setGeneratedStrategy('')
    setGeneratedPlaybook('')

    // 清空队列和停止之前的打字机
    chunkQueueRef.current = []
    stopTypewriter()

    // 创建新的AbortController
    abortControllerRef.current = new AbortController()

    try {
      // 第一步：分析热门笔记
      const analyzeResponse = await fetch('/api/analyze-hot-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
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
    setStreamContent('');
    setDisplayContent(''); // 清空显示内容
    setGeneratedTitles('');
    setGeneratedBody('');
    setGeneratedTags([]);
    setGeneratedImagePrompt('');
    setGeneratedSelfComment('');
    setGeneratedStrategy('');
    setGeneratedPlaybook('');

    // 清理打字机状态
    chunkQueueRef.current = []
    stopTypewriter()

    handleGenerate();
  }

  // ======================================================================
  // ========================= 核心优化点 3/4 =========================
  // ======================================================================
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔥 AI小红书爆款文案生成器
          </h1>
          <p className="text-lg text-gray-600">
            智能分析热门笔记，实时生成爆款文案
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 输入区域 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>📝 输入内容</CardTitle>
                <CardDescription>
                  <span className="text-pink-600 font-medium">三步生成爆款文案：</span>
                  <span className="text-gray-600"> 1. 输入主题 → 2. 提供素材 → 3. AI 创作</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <span>🎯 笔记主题</span>
                    <span className="text-xs text-gray-500 font-normal">（关键词越具体，分析越精准）</span>
                  </label>
                  <Input
                    placeholder="例如：春季敏感肌护肤、职场穿搭技巧、平价美妆好物..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <span>✍️ 原始素材</span>
                    <span className="text-xs text-gray-500 font-normal">（提供越详细的信息，生成效果越好）</span>
                  </label>
                  <Textarea
                    placeholder={`在这里输入你的笔记草稿、产品信息或灵感...

例如：
产品：XX牌新款玻尿酸精华
特点：质地清爽，吸收快，主打深层补水
我的感受：用了一周，感觉皮肤没那么干了，上妆也更服帖
目标人群：20-30岁的年轻女性，混合皮或干皮
价格：199元，性价比很高

💡 提示：可以包含产品特点、使用感受、适用人群、价格等信息`}
                    value={userInfo}
                    onChange={(e) => setUserInfo(e.target.value)}
                    rows={10}
                    disabled={loading}
                    className="text-sm"
                  />
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

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !keyword.trim() || !userInfo.trim()}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {loadingStage === 'analyzing' ? '🔍 正在分析热门笔记...' :
                         loadingStage === 'generating' ? '✨ 正在生成文案...' : '生成中...'}
                      </span>
                    ) : '✨ 生成内容'}
                  </Button>

                  {loading && (
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      className="px-4"
                    >
                      停止
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 结果区域 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 标题卡片 */}
            <Card className={!loading && !streamContent ? 'hidden' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>🎯 生成标题</CardTitle>
                  <CardDescription>AI生成的标题建议</CardDescription>
                </div>
                {!loading && generatedTitles && (
                  <Button
                    onClick={() => handleCopy(titlesRef.current?.innerText, 'titles')}
                    variant="outline"
                    size="sm"
                    className="w-[120px]" // 固定宽度防止文字变化时按钮抖动
                  >
                    {copiedButtonId === 'titles' ? (
                      <span className="flex items-center gap-2"> <Check size={16} /> 已复制 </span>
                    ) : (
                      <span className="flex items-center gap-2"> <Clipboard size={16} /> 复制标题 </span>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div ref={titlesRef} className="prose prose-pink max-w-none text-gray-800 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedTitles}
                  </ReactMarkdown>
                  {loading && !generatedBody && (
                    <span className="inline-block w-2 h-5 bg-pink-500 animate-pulse ml-1"></span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 内容卡片 - 只有当正文部分有内容时才显示 */}
            <Card className={!generatedBody ? 'hidden' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>📄 生成内容</CardTitle>
                  <CardDescription>AI生成的正文内容</CardDescription>
                </div>
                {!loading && generatedBody && (
                  <Button
                    onClick={() => handleCopy(bodyRef.current?.innerText, 'body')}
                    variant="outline"
                    size="sm"
                    className="w-[120px]"
                  >
                    {copiedButtonId === 'body' ? (
                      <span className="flex items-center gap-2"> <Check size={16} /> 已复制 </span>
                    ) : (
                      <span className="flex items-center gap-2"> <Clipboard size={16} /> 复制正文 </span>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div ref={bodyRef} className="prose prose-pink max-w-none text-gray-800 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedBody}
                  </ReactMarkdown>
                  {loading && (
                    <span className="inline-block w-2 h-5 bg-pink-500 animate-pulse ml-1"></span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 标签卡片 - 只有当标签有内容时才显示 */}
            <Card className={!generatedTags.length ? 'hidden' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>🏷️ 关键词标签</CardTitle>
                  <CardDescription>AI生成的热门标签</CardDescription>
                </div>
                {!loading && generatedTags.length > 0 && (
                  <Button
                    onClick={() => handleCopy(tagsRef.current?.innerText?.replace(/\s+/g, ' '), 'tags')}
                    variant="outline"
                    size="sm"
                    className="w-[120px]"
                  >
                    {copiedButtonId === 'tags' ? (
                      <span className="flex items-center gap-2"> <Check size={16} /> 已复制 </span>
                    ) : (
                      <span className="flex items-center gap-2"> <Clipboard size={16} /> 复制标签 </span>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div ref={tagsRef} className="flex flex-wrap gap-2">
                  {generatedTags.map((tag, index) => (
                    <Badge key={index} variant="tag" className="cursor-pointer hover:scale-105 transition-transform">
                      #{tag}
                    </Badge>
                  ))}
                  {loading && generatedTags.length === 0 && (
                    <span className="inline-block w-2 h-5 bg-pink-500 animate-pulse ml-1"></span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI绘画提示词卡片 - 只有当提示词有内容时才显示 */}
            <Card className={!generatedImagePrompt ? 'hidden' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>🎨 AI绘画提示词</CardTitle>
                  <CardDescription>为配图生成的AI绘画提示</CardDescription>
                </div>
                {!loading && generatedImagePrompt && (
                  <Button
                    onClick={() => handleCopy(imagePromptRef.current?.innerText, 'imagePrompt')}
                    variant="outline"
                    size="sm"
                    className="w-[130px]" // 宽度微调
                  >
                    {copiedButtonId === 'imagePrompt' ? (
                      <span className="flex items-center gap-2"> <Check size={16} /> 已复制 </span>
                    ) : (
                      <span className="flex items-center gap-2"> <Clipboard size={16} /> 复制提示词 </span>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div ref={imagePromptRef} className="prose prose-pink max-w-none text-gray-800 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedImagePrompt}
                  </ReactMarkdown>
                  {loading && (
                    <span className="inline-block w-2 h-5 bg-pink-500 animate-pulse ml-1"></span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 首评引导卡片 - 只有当内容存在时才显示 */}
            <Card className={!generatedSelfComment ? 'hidden' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>💬 首评关键词引导</CardTitle>
                  <CardDescription>复制后发布在自己的评论区，提升SEO效果</CardDescription>
                </div>
                {!loading && generatedSelfComment && (
                  <Button
                    onClick={() => handleCopy(selfCommentRef.current?.innerText, 'selfComment')}
                    variant="outline"
                    size="sm"
                    className="w-[120px]"
                  >
                    {copiedButtonId === 'selfComment' ? (
                      <span className="flex items-center gap-2"> <Check size={16} /> 已复制 </span>
                    ) : (
                      <span className="flex items-center gap-2"> <Clipboard size={16} /> 复制首评 </span>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div ref={selfCommentRef} className="prose prose-pink max-w-none text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedSelfComment}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* 发布策略建议卡片 - 只有当内容存在时才显示 */}
            <Card className={!generatedStrategy ? 'hidden' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>🚀 发布策略建议</CardTitle>
                  <CardDescription>AI基于内容类型给出的发布时机建议</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-pink max-w-none text-gray-800 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedStrategy}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* 增长Playbook卡片 - 只有当内容存在时才显示 */}
            <Card className={!generatedPlaybook ? 'hidden' : 'border-blue-200 bg-blue-50/50'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-blue-800">🚀 增长 Playbook & 数据核对清单</CardTitle>
                  <CardDescription className="text-blue-600">将理论化为行动，系统性提升流量</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-blue max-w-none text-gray-800 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedPlaybook}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* 初始占位/加载中提示 */}
            {loading && !streamContent && (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
                  <div className="space-y-2">
                    {loadingStage === 'analyzing' && (
                      <>
                        <p className="text-gray-800 font-medium">🔍 正在分析「{keyword}」热门笔记...</p>
                        <p className="text-gray-500 text-sm">分析爆款规律，为您定制创作策略</p>
                      </>
                    )}
                    {loadingStage === 'generating' && (
                      <>
                        <p className="text-gray-800 font-medium">✅ 分析完成！正在生成文案...</p>
                        <p className="text-gray-500 text-sm">基于热门规律，创作专属爆款内容</p>
                      </>
                    )}
                    {!loadingStage && (
                      <p className="text-gray-600">AI正在分析热门笔记并生成内容...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && !streamContent && (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-6">✨</div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-800">三步生成爆款文案</h3>
                    <div className="flex justify-center items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-pink-50 rounded-lg">
                        <span className="w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <span className="text-pink-700">输入主题</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                        <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <span className="text-red-700">提供素材</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-50 to-red-50 rounded-lg">
                        <span className="w-6 h-6 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <span className="bg-gradient-to-r from-pink-700 to-red-700 bg-clip-text text-transparent font-medium">AI 创作</span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4">
                      🚀 <span className="font-medium text-pink-600">立即填写，见证 AI 的创作魔力</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 操作按钮 - 只有在生成完毕后显示 */}
            {!loading && streamContent && (
              <div className="flex gap-2">
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
                  variant="outline"
                  size="sm"
                  className="w-[120px]"
                >
                  {copiedButtonId === 'full' ? (
                    <span className="flex items-center gap-2"> <Check size={16} /> 已复制 </span>
                  ) : (
                    <span className="flex items-center gap-2"> <Clipboard size={16} /> 复制全文 </span>
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
                >
                  🗑️ 清空内容
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
