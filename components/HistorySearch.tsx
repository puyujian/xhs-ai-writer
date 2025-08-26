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
    const hasActiveFilters = Boolean(searchTerm.trim()) || dateRange !== 'all'
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
    <div className="mb-4 p-3 bg-gradient-to-r from-pink-50/30 to-blue-50/30 rounded-lg border border-pink-100">
      {/* 第一行：搜索框独立单行 */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="搜索关键词、内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-10 pr-10 text-sm border-gray-200 focus:border-pink-400 focus:ring-pink-200 bg-white text-gray-900 placeholder:text-gray-400"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 hover:bg-gray-100"
            >
              <X size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* 第二行：时间筛选按钮 */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={12} className="text-blue-500 flex-shrink-0" />
        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">时间筛选</span>
        <div className="flex gap-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'today', label: '今天' },
            { key: 'week', label: '本周' },
            { key: 'month', label: '本月' }
          ].map((option) => (
            <Button
              key={option.key}
              variant={dateRange === option.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateRange(option.key as any)}
              className={`h-6 px-2 text-xs transition-all duration-200 ${
                dateRange === option.key 
                  ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm' 
                  : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 第三行：热门关键词（横向滚动） */}
      {topKeywords.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Filter size={12} className="text-purple-500" />
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">热门关键词</span>
            </div>
            <div className="h-px bg-gradient-to-r from-purple-200 to-transparent flex-1"></div>
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {topKeywords.slice(0, 8).map((item, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100 hover:scale-105 transition-all duration-200 text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0"
                onClick={() => handleKeywordClick(item.keyword)}
              >
                <span className="font-medium">{item.keyword}</span>
                <span className="ml-1 text-xs opacity-70 bg-white/50 px-1 rounded">
                  {item.count}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 第四行：统计信息 + 清除按钮（底部行） */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs">
          {isFilterActive ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              <span className="text-gray-600">筛选结果</span>
              <span className="text-gray-700">
                <span className="font-semibold text-pink-600">{filteredCount}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-gray-600">{totalCount}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              <span className="text-gray-600">
                共 <span className="font-semibold text-blue-600">{totalCount}</span> 条记录
              </span>
            </div>
          )}
        </div>
        
        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
          >
            <X size={10} className="mr-1" />
            清除
          </Button>
        )}
      </div>
    </div>
  )
}