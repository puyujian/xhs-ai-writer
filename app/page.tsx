'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatErrorForUser } from '@/lib/error-handler'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

  const [error, setError] = useState<ErrorState | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 实时解析和分割内容的 Effect
  useEffect(() => {
    // 解析四个部分：标题、正文、标签、AI绘画提示词
    const parseContent = (content: string) => {
      // 添加调试日志
      console.log('🔍 开始解析内容，内容长度:', content.length);
      console.log('🔍 内容前200字符:', content.substring(0, 200));

      // 定义各部分的正则表达式
      const titleRegex = /##\s*1[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
      const bodyRegex = /##\s*2[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
      const tagsRegex = /##\s*3[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
      const imagePromptRegex = /##\s*4[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;

      // 查找各部分的位置
      const titleMatch = content.match(titleRegex);
      const bodyMatch = content.match(bodyRegex);
      const tagsMatch = content.match(tagsRegex);
      const imagePromptMatch = content.match(imagePromptRegex);

      // 添加调试日志
      console.log('🔍 正则匹配结果:');
      console.log('  - titleMatch:', titleMatch ? `找到: ${titleMatch[0]}` : '未找到');
      console.log('  - bodyMatch:', bodyMatch ? `找到: ${bodyMatch[0]}` : '未找到');
      console.log('  - tagsMatch:', tagsMatch ? `找到: ${tagsMatch[0]}` : '未找到');
      console.log('  - imagePromptMatch:', imagePromptMatch ? `找到: ${imagePromptMatch[0]}` : '未找到');

      // 创建位置数组并排序
      const sections = [
        { name: 'title', match: titleMatch, index: titleMatch?.index || -1 },
        { name: 'body', match: bodyMatch, index: bodyMatch?.index || -1 },
        { name: 'tags', match: tagsMatch, index: tagsMatch?.index || -1 },
        { name: 'imagePrompt', match: imagePromptMatch, index: imagePromptMatch?.index || -1 }
      ].filter(section => section.index !== -1).sort((a, b) => a.index - b.index);

      // 提取各部分内容
      let titles = '';
      let body = '';
      let tags: string[] = [];
      let imagePrompt = '';

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
            // 解析标签，提取以#开头的标签或列表项
            const tagMatches = sectionContent.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g) || [];
            const listTagMatches = sectionContent.match(/[-*]\s*([^\n]+)/g) || [];
            const extractedTags = [
              ...tagMatches.map(tag => tag.substring(1)), // 移除#号
              ...listTagMatches.map(item => item.replace(/[-*]\s*/, '').trim())
            ];
            tags = [...new Set(extractedTags)]; // 去重
            break;
          case 'imagePrompt':
            imagePrompt = sectionContent;
            break;
        }
      }

      // 如果没有找到明确的分割，使用备用解析方案
      if (sections.length === 0) {
        // 备用方案：查找正文标记
        const bodyMarkers = [
          '## 2. 正文内容',
          '## 正文内容',
          '## 2. 笔记正文',
          '## 笔记正文',
          '## 2. 内容',
          '## 内容'
        ];

        let bodyStartIndex = -1;
        let usedMarker = '';

        for (const marker of bodyMarkers) {
          const index = content.indexOf(marker);
          if (index !== -1) {
            bodyStartIndex = index;
            usedMarker = marker;
            break;
          }
        }

        if (bodyStartIndex !== -1) {
          titles = content.substring(0, bodyStartIndex).trim();
          body = content.substring(bodyStartIndex + usedMarker.length).trim();
        } else {
          titles = content;
        }
      }

      return { titles, body, tags, imagePrompt };
    };

    const parsed = parseContent(streamContent);

    // 添加调试日志
    console.log('🔍 解析结果:');
    console.log('  - titles:', parsed.titles ? `长度${parsed.titles.length}` : '空');
    console.log('  - body:', parsed.body ? `长度${parsed.body.length}` : '空');
    console.log('  - tags:', parsed.tags.length);
    console.log('  - imagePrompt:', parsed.imagePrompt ? `长度${parsed.imagePrompt.length}` : '空');

    setGeneratedTitles(parsed.titles);
    setGeneratedBody(parsed.body);
    setGeneratedTags(parsed.tags);
    setGeneratedImagePrompt(parsed.imagePrompt);
  }, [streamContent]);

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
    setGeneratedTitles('')
    setGeneratedBody('')
    setGeneratedTags([])
    setGeneratedImagePrompt('')

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
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                setLoading(false)
                setLoadingStage('')
                return
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
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
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setStreamContent('');
    setGeneratedTitles('');
    setGeneratedBody('');
    setGeneratedTags([]);
    setGeneratedImagePrompt('');
    handleGenerate();
  }

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
                    onClick={() => navigator.clipboard.writeText(generatedTitles)}
                    variant="outline"
                    size="sm"
                  >
                    📋 复制标题
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="prose prose-pink max-w-none text-gray-800 leading-relaxed">
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
                    onClick={() => navigator.clipboard.writeText(generatedBody)}
                    variant="outline"
                    size="sm"
                  >
                    📋 复制正文
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="prose prose-pink max-w-none text-gray-800 leading-relaxed">
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
                    onClick={() => navigator.clipboard.writeText(generatedTags.map(tag => `#${tag}`).join(' '))}
                    variant="outline"
                    size="sm"
                  >
                    📋 复制标签
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
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
                    onClick={() => navigator.clipboard.writeText(generatedImagePrompt)}
                    variant="outline"
                    size="sm"
                  >
                    📋 复制提示词
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="prose prose-pink max-w-none text-gray-800 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedImagePrompt}
                  </ReactMarkdown>
                  {loading && (
                    <span className="inline-block w-2 h-5 bg-pink-500 animate-pulse ml-1"></span>
                  )}
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
                  onClick={() => navigator.clipboard.writeText(streamContent)}
                  variant="outline"
                  size="sm"
                >
                  📋 复制全文
                </Button>
                <Button
                  onClick={() => {
                    setStreamContent('');
                    setGeneratedTitles('');
                    setGeneratedBody('');
                    setGeneratedTags([]);
                    setGeneratedImagePrompt('');
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
