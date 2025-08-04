'use client'

import { useState, useEffect } from 'react'
import GeneratorClient from '@/components/GeneratorClient'
import FaqSection from '@/components/FaqSection'
import NotificationBanner from '@/components/NotificationBanner'

export default function Home() {
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // 检查是否显示通知栏
    const hasClosedNotification = localStorage.getItem('notification-banner-closed')
    setShowNotification(!hasClosedNotification)
  }, [])

  return (
    <>
      {/* 通知栏 */}
      <NotificationBanner onVisibilityChange={setShowNotification} />

      {/* 主内容区域 - 根据通知栏状态动态调整顶部间距 */}
      <div className={`min-h-screen bg-gradient-to-br from-pink-50 to-red-50 p-4 transition-all duration-300 ${showNotification ? 'pt-20' : 'pt-4'}`}>
        <div className="max-w-[90rem] mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🔥 AI小红书爆款文案生成器
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              智能分析热门笔记，实时生成爆款文案
            </p>

          </div>

          <GeneratorClient />

          {/* FAQ区域 */}
          <FaqSection />


        </div>
      </div>
    </>
  )
}
