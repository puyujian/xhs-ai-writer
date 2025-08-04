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
    <Card className="mb-3 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate text-gray-800">
              🎯 {item.keyword}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Clock size={14} />
              <span>{formatTime(item.timestamp)}</span>
              {item.generatedTags.length > 0 && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs">
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
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 内容预览 */}
        {!isExpanded && (
          <div className="space-y-2">
            {item.generatedTitles && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">标题：</span>
                <span>{getPreview(item.generatedTitles)}</span>
              </div>
            )}
            {item.generatedBody && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">正文：</span>
                <span>{getPreview(item.generatedBody)}</span>
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
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestore(item)}
            className="flex items-center gap-1"
          >
            <RotateCcw size={14} />
            恢复
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="flex items-center gap-1"
          >
            <Copy size={14} />
            复制
          </Button>

          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1"
            >
              <ChevronUp size={14} />
              收起
            </Button>
          )}

          <div className="flex-1"></div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} />
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}