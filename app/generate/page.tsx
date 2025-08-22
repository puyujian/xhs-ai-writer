'use client'

import { useState, useEffect, useRef, useCallback, Suspense, useMemo, memo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clipboard, Check, ArrowLeft, ArrowUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { GeneratedContent } from '@/lib/types'

// 优化的Markdown渲染组件
const OptimizedMarkdown = memo(({ content }: { content: string }) => {
  const markdownComponents = useMemo(() => ({
    p: ({ children }: any) => <div className="mb-2">{children}</div>,
    div: ({ children }: any) => <div className="mb-2">{children}</div>,
    h1: ({ children }: any) => <h1 className="mb-3 text-xl font-bold">{children}</h1>,
    h2: ({ children }: any) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
    h3: ({ children }: any) => <h3 className="mb-2 text-md font-semibold">{children}</h3>,
    ul: ({ children }: any) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
    ol: ({ children }: any) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>
  }), []);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
});

OptimizedMarkdown.displayName = 'OptimizedMarkdown';
const titleRegex = /##\s*1[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
const bodyRegex = /##\s*2[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
const tagsRegex = /##\s*3[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
const imagePromptRegex = /##\s*4[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;
const selfCommentRegex = /##\s*5[.、]?\s*(首评关键词引导|首评)/i;
const strategyRegex = /##\s*6[.、]?\s*(发布策略建议|发布策略)/i;
const playbookRegex = /##\s*7[.、]?\s*(小红书增长 Playbook|增长 Playbook)/i;

// 简单的文本格式化函数
const formatText = (text: string) => {
  if (!text) return null;
  
  return text.split('\n').map((line, index) => {
    // 处理空行
    if (line.trim() === '') {
      return <br key={index} />;
    }
    
    // 处理列表项（以 - 或 * 开头）
    if (line.trim().match(/^[-*]\s/)) {
      return (
        <div key={index} className="mb-2 pl-4">
          • {line.trim().replace(/^[-*]\s/, '')}
        </div>
      );
    }
    
    // 处理数字列表（以数字开头）
    if (line.trim().match(/^\d+[.).]\s/)) {
      return (
        <div key={index} className="mb-2 pl-4">
          {line.trim()}
        </div>
      );
    }
    
    // 处理标题（以 # 开头）
    if (line.trim().startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const content = line.replace(/^#+\s*/, '');
      
      if (level === 1) {
        return <h1 key={index} className="mb-3 text-xl font-bold">{content}</h1>;
      } else if (level === 2) {
        return <h2 key={index} className="mb-2 text-lg font-bold">{content}</h2>;
      } else {
        return <h3 key={index} className="mb-2 text-md font-semibold">{content}</h3>;
      }
    }
    
    // 处理普通段落
    return (
      <div key={index} className="mb-2 leading-relaxed">
        {line}
      </div>
    );
  });
};

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState('preparing')
  const [error, setError] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({
    titles: '',
    body: '',
    tags: [],
    imagePrompt: '',
    selfComment: '',
    strategy: '',
    playbook: ''
  })
  
  // 为每个需要复制的区域创建一个 ref
  const titlesRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const imagePromptRef = useRef<HTMLDivElement>(null);
  const selfCommentRef = useRef<HTMLDivElement>(null);

  // 新增一个 state 来追踪哪个按钮被点击了
  const [copiedButtonId, setCopiedButtonId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 流式生成相关状态
  const [displayContent, setDisplayContent] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null);

  // 解析内容的函数
  const parseContent = useCallback((content: string) => {
    // 查找各部分的位置
    const titleMatch = content.match(titleRegex);
    const bodyMatch = content.match(bodyRegex);
    const tagsMatch = content.match(tagsRegex);
    const imagePromptMatch = content.match(imagePromptRegex);
    const selfCommentMatch = content.match(selfCommentRegex);
    const strategyMatch = content.match(strategyRegex);
    const playbookMatch = content.match(playbookRegex);

    // 创建位置数组并排序
    const sections = [
      { name: 'title', match: titleMatch, index: titleMatch?.index ?? -1 },
      { name: 'body', match: bodyMatch, index: bodyMatch?.index ?? -1 },
      { name: 'tags', match: tagsMatch, index: tagsMatch?.index ?? -1 },
      { name: 'imagePrompt', match: imagePromptMatch, index: imagePromptMatch?.index ?? -1 },
      { name: 'selfComment', match: selfCommentMatch, index: selfCommentMatch?.index ?? -1 },
      { name: 'strategy', match: strategyMatch, index: strategyMatch?.index ?? -1 },
      { name: 'playbook', match: playbookMatch, index: playbookMatch?.index ?? -1 }
    ].filter(section => section.index !== -1).sort((a, b) => a.index - b.index);

    // 初始化内容变量
    let titles = '';
    let body = '';
    let tags: string[] = [];
    let imagePrompt = '';
    let selfComment = '';
    let strategy = '';
    let playbook = '';

    if (sections.length === 0) {
      // 如果一个标记都找不到，所有内容都暂时视为标题
      titles = content;
    } else {
      // 检查第一个标记之前是否有内容
      const firstSectionIndex = sections[0].index;
      if (firstSectionIndex > 0) {
        // 第一个标记之前的内容作为标题
        titles = content.substring(0, firstSectionIndex).trim();
      }
    }

    // 循环解析每个已识别的部分
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

    return { titles, body, tags, imagePrompt, selfComment, strategy, playbook };
  }, []);

  // 实时解析显示内容并更新状态 - 使用节流优化性能
  useEffect(() => {
    if (!displayContent) return;
    
    // 使用 requestAnimationFrame 优化渲染性能
    const timeoutId = setTimeout(() => {
      const parsed = parseContent(displayContent);
      setGeneratedContent(parsed);
    }, 100); // 100ms 节流，避免过于频繁的解析
    
    return () => clearTimeout(timeoutId);
  }, [displayContent, parseContent]);

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

  // 滚动检测，显示回到顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 回到顶部函数
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 开始生成的函数
  const startGeneration = async () => {
    const keyword = searchParams.get('keyword');
    const userInfo = searchParams.get('userInfo');
    
    if (!keyword || !userInfo) {
      setError('缺少必要的参数');
      setLoading(false);
      return;
    }

    try {
      // 标记开始生成
      setHasGenerated(true);
      setLoading(true);
      setError(null);
      
      // 立即开始生成流程，不等待
      setLoadingStage('fetching-data');
      setDisplayContent('');
      
      // 确保之前的 AbortController 被清理
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;
      
      try {
        setLoadingStage('analyzing-trends');
        
        const streamResponse = await fetch('/api/generate-combined', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_info: userInfo,
            keyword,
          }),
          signal: currentController.signal,
        });

        // 检查请求是否被中止
        if (currentController.signal.aborted) {
          console.log('请求被中止');
          return;
        }

        if (!streamResponse.ok) {
          throw new Error(`生成内容失败: HTTP ${streamResponse.status}`);
        }

        setLoadingStage('generating-content');

        const reader = streamResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              // 检查是否被中止
              if (currentController.signal.aborted) {
                console.log('读取被中止');
                break;
              }
              
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    // 生成完成
                    setLoading(false);
                    setLoadingStage('');
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      // 立即追加内容到显示区域，实现真正的流式输出
                      setDisplayContent(prev => prev + parsed.content);
                    } else if (parsed.error) {
                      throw new Error(parsed.error);
                    }
                  } catch (parseError) {
                    console.warn('解析错误:', parseError);
                    // 忽略解析错误，继续处理下一行
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } catch (fetchError) {
        // 检查是否是中止错误
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.log('请求被主动中止');
          return;
        }
        throw fetchError;
      }
    } catch (err) {
      console.error('生成失败:', err);
      
      // 提供更详细的错误信息
      let errorMessage = '生成失败，请重试';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (err.message.includes('timeout')) {
          errorMessage = '请求超时，请重试';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
      setLoadingStage('');
    }
  };

  // 从URL参数中获取数据并判断是否需要生成
  useEffect(() => {
    const checkAndStart = async () => {
      try {
        // 检查是否有已生成的数据（来自旧的跳转方式）
        const data = searchParams.get('data');
        if (data) {
          // 处理已生成的数据
          const decodedData = decodeURIComponent(atob(data));
          const parsed = parseContent(decodedData);
          setGeneratedContent(parsed);
          setLoading(false);
          setHasGenerated(true);
          return;
        }
        
        // 获取新的参数（keyword和userInfo）
        const keyword = searchParams.get('keyword');
        const userInfo = searchParams.get('userInfo');
        
        if (!keyword || !userInfo) {
          setError('缺少必要的参数');
          setLoading(false);
          return;
        }
        
        // 检查是否是页面刷新的情况
        const sessionKey = `generated_${keyword}_${userInfo}`;
        const hasGeneratedInSession = sessionStorage.getItem(sessionKey);
        
        if (hasGeneratedInSession && !hasGenerated) {
          // 页面刷新的情况，显示重新生成提示
          setLoading(false);
          setShowRegeneratePrompt(true);
          return;
        }
        
        // 如果还没有生成过，开始生成
        if (!hasGenerated) {
          // 标记这个会话已经生成过
          sessionStorage.setItem(sessionKey, 'true');
          await startGeneration();
        }
      } catch (err) {
        console.error('初始化失败:', err);
        setError('初始化失败');
        setLoading(false);
      }
    };

    checkAndStart();
  }, [searchParams, parseContent, hasGenerated]);
  
  // 清理函数
  useEffect(() => {
    return () => {
      // 清理 AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);


  if (showRegeneratePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* 背景装饰元素 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-200/15 to-indigo-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '0s'}}></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-indigo-200/15 to-purple-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Card className="glass-card shadow-2xl animate-scale-in bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30 max-w-md mx-4">
            <CardContent className="text-center py-12 px-6 relative overflow-hidden">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-2xl">
                <span className="text-3xl">🔄</span>
              </div>
              
              <div className="space-y-4 mb-8">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  检测到页面刷新
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  页面已刷新，之前可能已经生成过内容。你是否要重新生成新的内容？
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={async () => {
                    setShowRegeneratePrompt(false);
                    await startGeneration();
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="text-lg">✨</span>
                    重新生成内容
                  </span>
                </Button>
                
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="w-full border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowLeft size={16} />
                    返回首页
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    // 定义加载阶段的信息
    const loadingStages = {
      'preparing': {
        icon: '⚡',
        title: '正在准备...',
        description: '页面已成功跳转，正在初始化生成环境'
      },
      'fetching-data': {
        icon: '🔍',
        title: '获取热门数据中...',
        description: '正在分析小红书最新热门笔记，提取爆款规律'
      },
      'analyzing-trends': {
        icon: '📊',
        title: '分析爆款趋势中...',
        description: 'AI正在深度解析热门内容，识别成功模式'
      },
      'generating-content': {
        icon: '✨',
        title: 'AI 内容创作中...',
        description: '基于爆款规律，为您量身定制专属文案内容'
      }
    };

    const currentStage = loadingStages[loadingStage as keyof typeof loadingStages] || loadingStages.preparing;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* 背景装饰元素 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-200/15 to-indigo-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '0s'}}></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-indigo-200/15 to-purple-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-r from-slate-200/10 to-blue-200/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Card className="glass-card shadow-2xl animate-scale-in bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30 max-w-lg mx-4">
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
                    <span className="text-2xl sm:text-3xl lg:text-4xl animate-bounce">{currentStage.icon}</span>
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    {currentStage.title}
                  </h3>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                    {currentStage.description}
                  </p>
                  
                  {/* 进度指示器 */}
                  <div className="flex justify-center items-center gap-2 sm:gap-3 mt-6">
                    {Object.keys(loadingStages).map((stage, index) => (
                      <div 
                        key={stage}
                        className={`w-3 h-3 rounded-full transition-all duration-500 ${
                          Object.keys(loadingStages).indexOf(loadingStage) >= index 
                            ? 'bg-blue-500 animate-pulse' 
                            : 'bg-gray-300'
                        }`}
                        style={{animationDelay: `${index * 0.1}s`}}
                      />
                    ))}
                  </div>
                  
                  <p className="text-xs sm:text-sm text-indigo-600 max-w-md mx-auto leading-relaxed mt-4">
                    请稍候，AI正在为您生成独特的爆款内容...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-600 mb-2">出错了</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
          >
            返回首页
          </Button>
        </div>
      </div>
    );
  }

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
          
          {/* 返回按钮和快速导航 */}
          <div className="flex justify-between items-center mb-6">
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
              className="flex items-center gap-2 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300"
            >
              <ArrowLeft size={16} />
              返回首页
            </Button>
            
            {/* 快速导航 - 桌面端和移动端不同样式 */}
            {!loading && (
              <>
                {/* 桌面端导航 */}
                <div className="hidden lg:flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-blue-200/50 shadow-lg">
                  <span className="text-sm text-gray-600 font-medium">快速跳转：</span>
                  <div className="flex gap-2">
                    {generatedContent.titles && (
                      <button 
                        onClick={() => document.getElementById('titles-section')?.scrollIntoView({behavior: 'smooth'})}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        标题
                      </button>
                    )}
                    {generatedContent.body && (
                      <button 
                        onClick={() => document.getElementById('body-section')?.scrollIntoView({behavior: 'smooth'})}
                        className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                      >
                        正文
                      </button>
                    )}
                    {generatedContent.tags.length > 0 && (
                      <button 
                        onClick={() => document.getElementById('tags-section')?.scrollIntoView({behavior: 'smooth'})}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        标签
                      </button>
                    )}
                  </div>
                </div>
                
                {/* 移动端导航 - 简化版本 */}
                <div className="lg:hidden flex items-center gap-1">
                  {generatedContent.titles && (
                    <button 
                      onClick={() => document.getElementById('titles-section')?.scrollIntoView({behavior: 'smooth'})}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      标题
                    </button>
                  )}
                  {generatedContent.body && (
                    <button 
                      onClick={() => document.getElementById('body-section')?.scrollIntoView({behavior: 'smooth'})}
                      className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      正文
                    </button>
                  )}
                  {generatedContent.tags.length > 0 && (
                    <button 
                      onClick={() => document.getElementById('tags-section')?.scrollIntoView({behavior: 'smooth'})}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      标签
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 加载状态卡片 - 仅在生成开始但还没有内容时显示 */}
          {loading && !generatedContent.titles && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 backdrop-blur-md border border-blue-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-shimmer"></div>
              <CardContent className="text-center py-12 sm:py-16 px-4 sm:px-6 relative overflow-hidden">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-2xl animate-spin-slow">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center">
                    <span className="text-xl sm:text-2xl animate-bounce">✨</span>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    AI 正在创作中...
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                    正在分析热门规律并生成专属内容，请稍候...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 生成完成总览卡片 - 仅在生成完成后显示 */}
          {!loading && generatedContent.titles && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-blue-50/90 backdrop-blur-md border border-green-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">🎉</span>
                    <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent font-bold">
                      生成完成
                    </span>
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 animate-scale-in">
                      已完成
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                    AI 已完成内容创作，点击各部分可单独复制或复制全文
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleCopy(displayContent, 'full')}
                  variant="glass"
                  size="sm"
                  className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {copiedButtonId === 'full' ? (
                    <span className="flex items-center gap-2 text-green-600"> 
                      <Check size={16} className="animate-scale-in" /> 
                      已复制 
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"> 
                      <Clipboard size={16} /> 
                      复制全文 
                    </span>
                  )}
                </Button>
              </CardHeader>
            </Card>
          )}

          {/* 各个分段的卡片 - 根据内容实时显示 */}
          {/* 标题卡片 - 当有标题内容时就显示 */}
          {generatedContent.titles && (
            <>
              <Card id="titles-section" className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 backdrop-blur-md border border-blue-200/30">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                      <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">🎯</span>
                      <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                        生成标题
                      </span>
                      <Badge variant="tag" className="ml-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-0 animate-scale-in">
                        {loading ? '生成中...' : '已完成'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                      AI生成的吸引眼球的爆款标题
                    </CardDescription>
                  </div>
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
                </CardHeader>
                <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                  <div ref={titlesRef} className="prose prose-slate max-w-none text-slate-800 leading-relaxed p-4 sm:p-6 bg-gradient-to-br from-blue-100/60 via-indigo-100/50 to-purple-100/60 rounded-2xl border-2 border-blue-200/40 shadow-inner backdrop-blur-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      p: ({ children }) => <div className="mb-2">{children}</div>,
                      div: ({ children }) => <div className="mb-2">{children}</div>
                    }}>
                      {generatedContent.titles}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* 内容卡片 - 当有正文内容时就显示 */}
          {generatedContent.body && (
            <Card id="body-section" className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">📄</span>
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
                      生成内容
                    </span>
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-0 animate-scale-in">
                      {loading ? '生成中...' : '已完成'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                    AI生成的精彩正文内容
                  </CardDescription>
                </div>
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
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div ref={bodyRef} className="prose prose-slate max-w-none text-slate-800 leading-relaxed p-4 sm:p-6 bg-gradient-to-br from-blue-100/60 via-indigo-100/50 to-slate-100/60 rounded-2xl border-2 border-blue-200/40 shadow-inner backdrop-blur-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    div: ({ children }) => <div className="mb-2">{children}</div>,
                    // 确保其他可能产生块级元素的标签也正确处理
                    h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
                    h3: ({ children }) => <h3 className="mb-2 text-md font-bold">{children}</h3>,
                    ul: ({ children }) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>
                  }}>
                    {generatedContent.body}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 标签卡片 - 当有标签时就显示 */}
          {generatedContent.tags.length > 0 && (
            <Card id="tags-section" className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 backdrop-blur-md border border-blue-200/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                    <span className="text-xl sm:text-2xl lg:text-3xl animate-bounce-gentle">🏷️</span>
                    <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
                      关键词标签
                    </span>
                    <Badge variant="tag" className="ml-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-0 animate-scale-in">
                      {generatedContent.tags.length}个标签 {loading ? '(生成中...)' : ''}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1">
                    AI生成的热门流行标签
                  </CardDescription>
                </div>
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
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-100/60 via-purple-100/50 to-blue-100/60 rounded-2xl border-2 border-indigo-200/40 shadow-inner backdrop-blur-sm">
                  <div ref={tagsRef} className="flex flex-wrap gap-2 sm:gap-3">
                    {generatedContent.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="tag"
                        className="cursor-pointer text-xs sm:text-sm font-medium animate-fade-in hover:scale-105 transition-all duration-300 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 hover:from-indigo-200 hover:via-purple-200 hover:to-blue-200 text-indigo-800 border-indigo-200 shadow-lg hover:shadow-xl"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI绘画提示词卡片 - 当有提示词时就显示 */}
          {generatedContent.imagePrompt && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-slate-50/80 to-indigo-50/90 backdrop-blur-md border border-blue-200/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <span className="text-xl sm:text-2xl">🎨</span>
                    <span className="bg-gradient-to-r from-blue-600 to-slate-700 bg-clip-text text-transparent">AI绘画提示词</span>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600">为配图生成的AI绘画提示</CardDescription>
                </div>
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
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div ref={imagePromptRef} className="prose prose-slate max-w-none text-slate-800 leading-relaxed p-4 bg-gradient-to-br from-blue-100/60 via-slate-100/50 to-indigo-100/60 rounded-xl border-2 border-blue-200/40 shadow-inner backdrop-blur-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    div: ({ children }) => <div className="mb-2">{children}</div>
                  }}>
                    {generatedContent.imagePrompt}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 首评引导卡片 - 当有首评时就显示 */}
          {generatedContent.selfComment && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <span className="text-xl sm:text-2xl">💬</span>
                    <span className="bg-gradient-to-r from-indigo-600 to-slate-700 bg-clip-text text-transparent">首评关键词引导</span>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600">复制后发布在自己的评论区，提升SEO效果</CardDescription>
                </div>
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
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div ref={selfCommentRef} className="prose prose-base max-w-none text-gray-800 leading-relaxed p-4 bg-gradient-to-br from-indigo-100/60 via-blue-100/50 to-slate-100/60 rounded-xl border-2 border-indigo-200/40 shadow-inner backdrop-blur-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    div: ({ children }) => <div className="mb-2">{children}</div>
                  }}>
                    {generatedContent.selfComment}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 发布策略建议卡片 - 当有策略时就显示 */}
          {generatedContent.strategy && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    div: ({ children }) => <div className="mb-2">{children}</div>
                  }}>
                    {generatedContent.strategy}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 增长Playbook卡片 - 当有playbook时就显示 */}
          {generatedContent.playbook && (
            <Card className="animate-slide-up glass-card shadow-2xl hover-lift overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    div: ({ children }) => <div className="mb-2">{children}</div>
                  }}>
                    {generatedContent.playbook}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <Card className="glass-card shadow-2xl animate-fade-in bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30">
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
                    onClick={() => router.push('/')}
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <span className="flex items-center gap-2">
                      <ArrowLeft size={16} />
                      返回首页
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 回到顶部按钮 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center z-50 animate-fade-in hover:scale-110"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
  )
}

// Loading component for Suspense fallback
function GeneratePageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在加载生成结果...</p>
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<GeneratePageLoading />}>
      <GeneratePageContent />
    </Suspense>
  )
}