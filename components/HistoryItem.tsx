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
    <Card className="mb-2 hover:shadow-md transition-all duration-200 border-l-2 border-l-pink-400 bg-white/90">
      <CardHeader className="pb-2 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-1.5 mb-1">
              <span className="text-pink-500 text-xs">🎯</span>
              <span className="truncate">{item.keyword}</span>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={10} className="text-gray-400" />
                {formatTime(item.timestamp)}
              </span>
              {item.generatedTags.length > 0 && (
                <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 text-xs px-1.5 py-0">
                  {item.generatedTags.length}
                </Badge>
              )}
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 hover:bg-pink-50 flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronUp size={12} className="text-gray-500" />
            ) : (
              <Eye size={12} className="text-gray-500" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 pb-3">
        {/* 内容预览 */}
        {!isExpanded && (
          <div className="space-y-1.5">
            {item.generatedTitles && (
              <div className="bg-pink-50/50 p-1.5 rounded text-xs">
                <span className="font-medium text-pink-600 block mb-0.5">✨ 标题预览</span>
                <p className="text-gray-700 leading-tight truncate">{getPreview(item.generatedTitles)}</p>
              </div>
            )}
            {item.generatedBody && (
              <div className="bg-blue-50/50 p-1.5 rounded text-xs">
                <span className="font-medium text-blue-600 block mb-0.5">📝 正文预览</span>
                <p className="text-gray-700 leading-tight truncate">{getPreview(item.generatedBody)}</p>
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
        <div className="flex gap-1 pt-2 border-t border-gray-100">
          <Button
            onClick={() => onRestore(item)}
            variant="default"
            size="sm"
            className="flex-1 h-7 text-xs bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white border-0"
          >
            <RotateCcw size={11} className="mr-1" />
            恢复
          </Button>

          <Button
            onClick={handleCopyAll}
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Copy size={11} className="mr-1" />
            复制
          </Button>
          
          <Button
            onClick={() => onDelete(item.id)}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}