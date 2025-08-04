'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HistorySearchOptions } from '@/lib/history-types'
import { Search, Calendar, X, Filter } from 'lucide-react'

interface HistorySearchProps {
  onSearch: (options: HistorySearchOptions) => void
  onClear: () => void
  totalCount: number
  filteredCount: number
  topKeywords?: Array<{ keyword: string; count: number }>
}

export default function HistorySearch({ 
  onSearch, 
  onClear, 
  totalCount, 
  filteredCount,
  topKeywords = [] 
}: HistorySearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [isFilterActive, setIsFilterActive] = useState(false)

  // 当搜索条件变化时触发搜索
  useEffect(() => {
    const options: HistorySearchOptions = {}
    
    if (searchTerm.trim()) {
      options.keyword = searchTerm.trim()
    }

    // 设置时间范围
    if (dateRange !== 'all') {
      const now = Date.now()
      let startTime: number
      
      switch (dateRange) {
        case 'today':
          startTime = now - 24 * 60 * 60 * 1000 // 24小时
          break
        case 'week':
          startTime = now - 7 * 24 * 60 * 60 * 1000 // 7天
          break
        case 'month':
          startTime = now - 30 * 24 * 60 * 60 * 1000 // 30天
          break
        default:
          startTime = 0
      }
      
      if (startTime > 0) {
        options.startTime = startTime
      }
    }

    // 检查是否有活动的筛选条件
    const hasActiveFilters = searchTerm.trim() || dateRange !== 'all'
    setIsFilterActive(hasActiveFilters)

    onSearch(options)
  }, [searchTerm, dateRange, onSearch])

  // 清空所有筛选条件
  const handleClearAll = () => {
    setSearchTerm('')
    setDateRange('all')
    onClear()
  }

  // 快速搜索热门关键词
  const handleKeywordClick = (keyword: string) => {
    setSearchTerm(keyword)
  }

  return (
    <div className="space-y-3 mb-4">
      {/* 搜索输入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input
          placeholder="搜索关键词、内容..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {/* 时间范围筛选 */}
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-gray-500" />
        <div className="flex gap-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'today', label: '今天' },
            { key: 'week', label: '本周' },
            { key: 'month', label: '本月' }
          ].map((option) => (
            <Button
              key={option.key}
              variant={dateRange === option.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(option.key as any)}
              className="h-7 px-2 text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 热门关键词快速筛选 */}
      {topKeywords.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <span className="text-xs text-gray-600">热门关键词</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {topKeywords.slice(0, 8).map((item, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-pink-100 hover:text-pink-700 transition-colors text-xs"
                onClick={() => handleKeywordClick(item.keyword)}
              >
                {item.keyword}
                <span className="ml-1 text-xs opacity-60">({item.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果统计和清除按钮 */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          {isFilterActive ? (
            <span>
              显示 <span className="font-medium text-pink-600">{filteredCount}</span> / {totalCount} 条记录
            </span>
          ) : (
            <span>共 <span className="font-medium">{totalCount}</span> 条历史记录</span>
          )}
        </div>
        
        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <X size={12} className="mr-1" />
            清除筛选
          </Button>
        )}
      </div>
    </div>
  )
}