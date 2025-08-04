'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HistoryItem, HistorySearchOptions, HistoryStats } from '@/lib/history-types'
import { historyManager } from '@/lib/history-manager'
import HistoryItemComponent from './HistoryItem'
import HistorySearch from './HistorySearch'
import { History, Download, Trash2, RefreshCw, AlertCircle } from 'lucide-react'

interface HistoryPanelProps {
  onRestore: (item: HistoryItem) => void
  className?: string
}

export default function HistoryPanel({ onRestore, className = '' }: HistoryPanelProps) {
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([])
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedContent, setCopiedContent] = useState<string | null>(null)

  // 加载历史记录数据
  const loadHistory = useCallback(() => {
    setIsLoading(true)
    try {
      const history = historyManager.getHistory()
      const historyStats = historyManager.getStats()
      
      setAllHistory(history)
      setFilteredHistory(history)
      setStats(historyStats)
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 组件挂载时加载数据
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // 搜索处理
  const handleSearch = useCallback((options: HistorySearchOptions) => {
    const filtered = historyManager.searchHistory(options)
    setFilteredHistory(filtered)
  }, [])

  // 清除搜索筛选
  const handleClearSearch = useCallback(() => {
    setFilteredHistory(allHistory)
  }, [allHistory])

  // 删除历史记录项
  const handleDelete = useCallback((id: string) => {
    const success = historyManager.deleteHistoryItem(id)
    if (success) {
      loadHistory() // 重新加载数据
    }
  }, [loadHistory])

  // 复制内容处理
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedContent(content)
      setTimeout(() => setCopiedContent(null), 2000)
    }).catch(err => {
      console.error('复制失败:', err)
    })
  }, [])

  // 导出历史记录
  const handleExport = useCallback(() => {
    try {
      const exportContent = historyManager.exportHistory({
        format: 'markdown',
        includeMetadata: true
      })
      
      // 创建下载链接
      const blob = new Blob([exportContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `小红书文案历史记录_${new Date().toLocaleDateString('zh-CN')}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出失败:', error)
    }
  }, [])

  // 清空所有历史记录
  const handleClearAll = useCallback(() => {
    if (window.confirm('确定要清空所有历史记录吗？此操作无法撤销。')) {
      const success = historyManager.clearAllHistory()
      if (success) {
        loadHistory() // 重新加载数据
      }
    }
  }, [loadHistory])

  // 格式化存储大小
  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History size={20} />
                历史记录
              </CardTitle>
              <CardDescription>
                {stats && (
                  <span>
                    共 {stats.totalItems} 条记录，占用 {formatStorageSize(stats.storageSize)}
                  </span>
                )}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadHistory}
                title="刷新"
              >
                <RefreshCw size={16} />
              </Button>
              
              {allHistory.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    title="导出历史记录"
                  >
                    <Download size={16} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="清空所有记录"
                  >
                    <Trash2 size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
          {/* 搜索和筛选 */}
          {allHistory.length > 0 && (
            <HistorySearch
              onSearch={handleSearch}
              onClear={handleClearSearch}
              totalCount={allHistory.length}
              filteredCount={filteredHistory.length}
              topKeywords={stats?.topKeywords}
            />
          )}

          {/* 复制成功提示 */}
          {copiedContent && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              ✅ 内容已复制到剪贴板
            </div>
          )}

          {/* 历史记录列表 */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <HistoryItemComponent
                    key={item.id}
                    item={item}
                    onRestore={onRestore}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            ) : allHistory.length > 0 ? (
              // 有历史记录但搜索结果为空
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <AlertCircle size={48} className="mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">未找到匹配的记录</p>
                <p className="text-sm">尝试调整搜索条件或清除筛选</p>
              </div>
            ) : (
              // 没有任何历史记录
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <History size={48} className="mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">暂无历史记录</p>
                <p className="text-sm text-center">
                  生成文案后会自动保存到这里<br />
                  方便您随时查看和重用
                </p>
              </div>
            )}
          </div>

          {/* 存储统计信息 */}
          {stats && stats.totalItems > 0 && (
            <div className="flex-shrink-0 mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  最多保存 50 条记录
                </span>
                <Badge variant="outline" className="text-xs">
                  {stats.totalItems}/50
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}