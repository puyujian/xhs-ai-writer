import GeneratorClient from '@/components/GeneratorClient'
import FaqSection from '@/components/FaqSection'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
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
  )
}
