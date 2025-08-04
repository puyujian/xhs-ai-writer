'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle } from 'lucide-react'

interface NotificationBannerProps {
  onVisibilityChange?: (visible: boolean) => void
}

export default function NotificationBanner({ onVisibilityChange }: NotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // 检查localStorage中是否已关闭通知
    const hasClosedNotification = localStorage.getItem('notification-banner-closed')
    if (!hasClosedNotification) {
      setIsVisible(true)
      onVisibilityChange?.(true)
      // 添加进入动画延迟
      setTimeout(() => setIsAnimating(true), 100)
    } else {
      onVisibilityChange?.(false)
    }
  }, [onVisibilityChange])

  const handleClose = () => {
    setIsAnimating(false)
    onVisibilityChange?.(false)
    // 等待动画完成后隐藏
    setTimeout(() => {
      setIsVisible(false)
      localStorage.setItem('notification-banner-closed', 'true')
    }, 300)
  }

  const handleContactClick = () => {
    window.open('https://qr.qq.com/qrc/1sqor6xvsqnn7ko', '_blank')
  }

  if (!isVisible) return null

  return (
    <div 
      className={`
        fixed top-0 left-0 right-0 z-50 
        bg-gradient-to-r from-pink-500 via-pink-600 to-red-500 
        text-white shadow-lg
        transform transition-all duration-300 ease-in-out
        ${isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 通知内容 */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg">🔔</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base font-medium">
                <span className="hidden sm:inline">🎉 </span>
                工具内测中，希望多多反馈使用效果和数据情况，以提供更好的体验，谢谢！
              </p>
            </div>
          </div>

          {/* 联系作者按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleContactClick}
              className="
                inline-flex items-center gap-2 px-3 py-1.5 
                bg-white/20 hover:bg-white/30 
                rounded-full text-sm font-medium
                transition-all duration-200 
                hover:scale-105 active:scale-95
                border border-white/30
              "
            >
              <MessageCircle size={16} />
              <span className="hidden sm:inline">联系作者</span>
              <span className="sm:hidden">联系</span>
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="
                p-1.5 rounded-full 
                hover:bg-white/20 
                transition-colors duration-200
                group
              "
              aria-label="关闭通知"
            >
              <X 
                size={18} 
                className="group-hover:scale-110 transition-transform duration-200" 
              />
            </button>
          </div>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div className="h-1 bg-gradient-to-r from-pink-400 to-red-400 opacity-60"></div>
    </div>
  )
}
