'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HistoryItem, HistorySearchOptions, HistoryStats } from '@/lib/history-types'
import { historyManager } from '@/lib/history-manager'
import HistoryItemComponent from './HistoryItem'
import HistorySearch from './HistorySearch'
import { History, Download, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

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
  const [currentPage, setCurrentPage] = useState(1)
  
  // 分页配置
  const ITEMS_PER_PAGE = 5 // 改为每页5条

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
    setCurrentPage(1) // 重置到第一页
  }, [])

  // 清除搜索筛选
  const handleClearSearch = useCallback(() => {
    setFilteredHistory(allHistory)
    setCurrentPage(1) // 重置到第一页
  }, [allHistory])

  // 删除历史记录项
  const handleDelete = useCallback((id: string) => {
    const success = historyManager.deleteHistoryItem(id)
    if (success) {
      loadHistory() // 重新加载数据
      setCurrentPage(1) // 重置到第一页
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
        setCurrentPage(1) // 重置到第一页
      }
    }
  }, [loadHistory])

  // 格式化存储大小
  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 分页计算
  const paginationData = useMemo(() => {
    const totalItems = filteredHistory.length
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentItems = filteredHistory.slice(startIndex, endIndex)
    
    return {
      totalPages,
      currentItems,
      totalItems,
      startIndex,
      endIndex: Math.min(endIndex, totalItems)
    }
  }, [filteredHistory, currentPage])

  // 处理页面变化
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Card className="flex-1 flex flex-col bg-gradient-to-br from-white via-pink-50/30 to-blue-50/30 border-pink-200 shadow-lg">
        {/* 优化的头部设计 */}
        <CardHeader className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-pink-50 to-blue-50 border-b border-pink-100">
          {/* 标题和操作按钮 - 单行紧凑设计 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gradient-to-r from-pink-500 to-blue-500 rounded-md">
                <History size={14} className="text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent leading-none">
                  历史记录
                </h3>
                {/* 统计信息紧贴标题下方 */}
                {stats && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      <span>共 {stats.totalItems} 条</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span>{formatStorageSize(stats.storageSize)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* 操作按钮 - 极简紧凑排列 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadHistory}
                className="h-6 w-6 p-0 hover:bg-white/80"
                title="刷新"
              >
                <RefreshCw size={12} className="text-gray-600" />
              </Button>
              
              {allHistory.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                    title="导出记录"
                  >
                    <Download size={12} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="清空记录"
                  >
                    <Trash2 size={12} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
          {/* 搜索框 - 简化为单行 */}
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
            <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2 shadow-sm">
              <span className="flex-shrink-0">✅</span>
              <span>内容已复制到剪贴板</span>
            </div>
          )}

          {/* 历史记录列表 - 去掉内嵌分页 */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-200"></div>
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <span className="mt-3 text-gray-600 text-sm">加载历史记录中...</span>
              </div>
            ) : paginationData.currentItems.length > 0 ? (
              <div className="space-y-3">
                {paginationData.currentItems.map((item) => (
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-full mb-4">
                  <AlertCircle size={32} className="text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">未找到匹配的记录</h3>
                <p className="text-sm text-gray-600 mb-4">尝试调整搜索条件或清除筛选</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-block w-1.5 h-1.5 bg-orange-300 rounded-full"></span>
                  <span>共有 {allHistory.length} 条历史记录</span>
                </div>
              </div>
            ) : (
              // 没有任何历史记录
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-6 bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 rounded-2xl mb-6">
                  <History size={40} className="text-gray-400 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">开始您的创作之旅</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-48">
                  生成文案后会自动保存到这里，<br />
                  方便您随时查看和重用精彩内容
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs text-gray-500">
                  <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span>自动保存，安全可靠</span>
                </div>
              </div>
            )}
          </div>

          {/* 固定底部：分页控件 + 存储统计 */}
          <div className="flex-shrink-0 mt-4 space-y-3">
            {/* 分页控件 - 固定在底部 */}
            {paginationData.totalPages > 1 && (
              <div className="pt-3 border-t border-gray-100">
                <div className="bg-gradient-to-r from-pink-50/50 to-blue-50/50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full"></span>
                      显示第 {paginationData.startIndex + 1} - {paginationData.endIndex} 条，
                      共 {paginationData.totalItems} 条记录
                    </span>
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={paginationData.totalPages}
                    onPageChange={handlePageChange}
                    showPageInfo={false}
                    className="justify-center"
                  />
                </div>
              </div>
            )}

            {/* 存储统计信息 */}
            {stats && stats.totalItems > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                    最多保存 50 条记录
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs transition-colors ${
                      stats.totalItems >= 45 
                        ? 'bg-orange-50 border-orange-200 text-orange-700' 
                        : stats.totalItems >= 30 
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                        : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    {stats.totalItems}/50
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}