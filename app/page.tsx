'use client'

import { useState, useEffect } from 'react'
import GeneratorClient from '@/components/GeneratorClient'
import FaqSection from '@/components/FaqSection'
import NotificationBanner from '@/components/NotificationBanner'
import { ds } from '@/lib/design-system'

export default function Home() {
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    const hasClosedNotification = localStorage.getItem('notification-banner-closed')
    setShowNotification(!hasClosedNotification)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-50">
      {/* 通知栏 */}
      <NotificationBanner onVisibilityChange={setShowNotification} />

      {/* 主内容容器 - 统一间距系统 */}
      <main className={ds.cn(
        'transition-all duration-300',
        showNotification ? 'pt-20' : 'pt-8',
        ds.layout.container.base,
        ds.layout.container.sizes.xl
      )}>
        {/* 标题区域 - 统一设计 */}
        <header className="text-center mb-12 space-y-4">
          <h1 className={ds.cn(
            ds.getTextStyles('4xl', 'bold'),
            'text-slate-900 tracking-tight'
          )}>
            <span className="inline-block">🔥</span>
            <span className="bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent font-bold">
              AI小红书爆款文案生成器
            </span>
          </h1>
          
          <p className={ds.cn(
            ds.getTextStyles('lg'),
            'text-slate-600 max-w-2xl mx-auto leading-relaxed'
          )}>
            智能分析热门笔记，实时生成爆款文案
          </p>
          
          {/* 特性标签 */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {[
              { icon: '🎯', text: '精准分析' },
              { icon: '⚡', text: '实时生成' },
              { icon: '🚀', text: '爆款助手' }
            ].map((item, index) => (
              <span 
                key={index}
                className={ds.cn(
                  'inline-flex items-center gap-2 px-4 py-2',
                  'bg-white/70 backdrop-blur-sm',
                  'border border-slate-200/80',
                  'rounded-full',
                  'text-slate-700 text-sm font-medium',
                  'shadow-sm',
                  ds.animations.hover.lift
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </header>

        {/* 主要内容区域 */}
        <div className="space-y-16">
          <GeneratorClient />
          <FaqSection />
        </div>
      </main>
    </div>
  )
}
