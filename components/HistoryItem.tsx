'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HistoryItem } from '@/lib/history-types'
import { Clock, Eye, Trash2, RotateCcw, Copy, ChevronDown, ChevronUp } from 'lucide-react'

interface HistoryItemProps {
  item: HistoryItem
  onRestore: (item: HistoryItem) => void
  onDelete: (id: string) => void
  onCopy: (content: string) => void
}

export default function HistoryItemComponent({ 
  item, 
  onRestore, 
  onDelete, 
  onCopy 
}: HistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else if (diffInHours < 168) { // 7天
      const days = Math.floor(diffInHours / 24)
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // 获取内容预览（前50个字符）
  const getPreview = (content: string) => {
    if (!content) return '暂无内容'
    return content.length > 50 ? content.substring(0, 50) + '...' : content
  }

  // 复制完整内容
  const handleCopyAll = () => {
    const fullContent = [
      `关键词：${item.keyword}`,
      `原始素材：${item.userInfo}`,
      `生成标题：${item.generatedTitles}`,
      `正文内容：${item.generatedBody}`,
      `关键词标签：${item.generatedTags.join(', ')}`,
      `AI绘画提示词：${item.generatedImagePrompt}`,
      `首评引导：${item.generatedSelfComment}`,
      `发布策略：${item.generatedStrategy}`,
      `增长Playbook：${item.generatedPlaybook}`
    ].filter(Boolean).join('\n\n')
    
    onCopy(fullContent)
  }

  return (
    <Card className="mb-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-pink-400 bg-gradient-to-r from-white to-pink-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg truncate text-gray-800 font-semibold">
              <span className="text-pink-500">🎯</span> {item.keyword}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1 text-xs md:text-sm">
              <Clock size={12} className="text-gray-400" />
              <span className="text-gray-500">{formatTime(item.timestamp)}</span>
              {item.generatedTags.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700 border-pink-200">
                    {item.generatedTags.length}个标签
                  </Badge>
                </>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 hover:bg-pink-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-600" />
              ) : (
                <Eye size={16} className="text-gray-600" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 内容预览 */}
        {!isExpanded && (
          <div className="space-y-3">
            {item.generatedTitles && (
              <div className="bg-gradient-to-r from-pink-50 to-transparent p-3 rounded-lg border-l-2 border-pink-300">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 mb-1">
                  <span>✨</span> 标题预览
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{getPreview(item.generatedTitles)}</p>
              </div>
            )}
            {item.generatedBody && (
              <div className="bg-gradient-to-r from-blue-50 to-transparent p-3 rounded-lg border-l-2 border-blue-300">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 mb-1">
                  <span>📝</span> 正文预览
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{getPreview(item.generatedBody)}</p>
              </div>
            )}
          </div>
        )}

        {/* 完整内容 */}
        {isExpanded && (
          <div className="space-y-4">
            {/* 原始素材 */}
            {item.userInfo && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">📝 原始素材</h4>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                  {item.userInfo}
                </div>
              </div>
            )}

            {/* 生成标题 */}
            {item.generatedTitles && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">🎯 生成标题</h4>
                <div className="text-sm text-gray-800 bg-pink-50 p-2 rounded border-l-2 border-pink-300">
                  {item.generatedTitles}
                </div>
              </div>
            )}

            {/* 正文内容 */}
            {item.generatedBody && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">📄 正文内容</h4>
                <div className="text-sm text-gray-800 bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                  {item.generatedBody}
                </div>
              </div>
            )}

            {/* 关键词标签 */}
            {item.generatedTags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">🏷️ 关键词标签</h4>
                <div className="flex flex-wrap gap-1">
                  {item.generatedTags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI绘画提示词 */}
            {item.generatedImagePrompt && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">🎨 AI绘画提示词</h4>
                <div className="text-sm text-gray-600 bg-purple-50 p-2 rounded border-l-2 border-purple-300">
                  {item.generatedImagePrompt}
                </div>
              </div>
            )}

            {/* 首评引导 */}
            {item.generatedSelfComment && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">💬 首评引导</h4>
                <div className="text-sm text-gray-600 bg-green-50 p-2 rounded border-l-2 border-green-300">
                  {item.generatedSelfComment}
                </div>
              </div>
            )}

            {/* 发布策略 */}
            {item.generatedStrategy && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">🚀 发布策略</h4>
                <div className="text-sm text-gray-600 bg-orange-50 p-2 rounded border-l-2 border-orange-300">
                  {item.generatedStrategy}
                </div>
              </div>
            )}

            {/* 增长Playbook */}
            {item.generatedPlaybook && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">📈 增长Playbook</h4>
                <div className="text-sm text-gray-600 bg-indigo-50 p-2 rounded border-l-2 border-indigo-300">
                  {item.generatedPlaybook}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gradient-to-r from-pink-100 to-blue-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestore(item)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">恢复使用</span>
            <span className="sm:hidden">恢复</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
          >
            <Copy size={14} />
            <span className="hidden sm:inline">复制全文</span>
            <span className="sm:hidden">复制</span>
          </Button>

          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
            >
              <ChevronUp size={14} />
              <span className="hidden sm:inline">收起详情</span>
              <span className="sm:hidden">收起</span>
            </Button>
          )}

          <div className="flex-1"></div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-200"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">删除</span>
            <span className="sm:hidden">删</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}