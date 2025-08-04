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
    <div className="space-y-4 mb-6 p-4 bg-gradient-to-r from-pink-50/50 to-blue-50/50 rounded-xl border border-pink-100">
      {/* 搜索输入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400" size={16} />
        <Input
          placeholder="搜索关键词、内容..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 border-pink-200 focus:border-pink-400 focus:ring-pink-200 bg-white/80 backdrop-blur-sm"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-pink-100 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {/* 时间范围筛选 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-blue-500" />
          <span className="text-xs font-medium text-gray-600">时间筛选</span>
        </div>
        <div className="flex gap-1 flex-wrap">
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
              className={`h-7 px-3 text-xs transition-all duration-200 ${
                dateRange === option.key 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-sm' 
                  : 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 热门关键词快速筛选 */}
      {topKeywords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-purple-500" />
            <span className="text-xs font-medium text-gray-600">热门关键词</span>
            <div className="h-px bg-gradient-to-r from-purple-200 to-transparent flex-1 ml-2"></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {topKeywords.slice(0, 8).map((item, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100 hover:scale-105 transition-all duration-200 text-xs px-2.5 py-1"
                onClick={() => handleKeywordClick(item.keyword)}
              >
                <span className="font-medium">{item.keyword}</span>
                <span className="ml-1.5 text-xs opacity-70 bg-white/50 px-1 rounded">
                  {item.count}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果统计和清除按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-gradient-to-r from-pink-100 to-blue-100">
        <div className="flex items-center gap-2 text-sm">
          {isFilterActive ? (
            <>
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-gray-600">筛选结果</span>
              </div>
              <span className="text-gray-700">
                <span className="font-semibold text-pink-600">{filteredCount}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-gray-600">{totalCount}</span>
                <span className="text-gray-500 ml-1">条记录</span>
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
              <span className="text-gray-600">
                共 <span className="font-semibold text-blue-600">{totalCount}</span> 条历史记录
              </span>
            </div>
          )}
        </div>
        
        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-3 text-xs bg-gray-50 text-gray-600 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 transition-all duration-200"
          >
            <X size={12} className="mr-1" />
            清除筛选
          </Button>
        )}
      </div>
    </div>
  )
}