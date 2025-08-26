import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showPageInfo?: boolean
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  className
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getVisiblePages = () => {
    const delta = 1
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3', className)}>
      {showPageInfo && (
        <div className="text-sm text-gray-600 order-2 sm:order-1">
          第 {currentPage} 页，共 {totalPages} 页
        </div>
      )}
      
      <div className="flex items-center space-x-1 order-1 sm:order-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="上一页"
        >
          <ChevronLeft size={16} />
        </Button>

        <div className="hidden sm:flex items-center space-x-1">
          {visiblePages.map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <div className="flex h-8 w-8 items-center justify-center">
                  <MoreHorizontal size={16} className="text-gray-400" />
                </div>
              ) : (
                <Button
                  variant={currentPage === page ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className={cn(
                    'h-8 w-8 p-0 hover:bg-pink-50 hover:text-pink-600 transition-all duration-200',
                    currentPage === page && 'bg-gradient-to-r from-pink-500 to-blue-500 text-white hover:from-pink-600 hover:to-blue-600 shadow-md'
                  )}
                  title={`第 ${page} 页`}
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* 移动端简化显示 */}
        <div className="sm:hidden flex items-center space-x-2">
          <span className="text-sm text-gray-600 px-2">
            {currentPage} / {totalPages}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="下一页"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}