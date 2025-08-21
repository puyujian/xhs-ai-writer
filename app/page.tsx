import GeneratorClient from '@/components/GeneratorClient'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/25 to-indigo-200/25 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/25 to-purple-200/25 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-slate-100/20 to-blue-100/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 rounded-full border border-blue-200/50 backdrop-blur-sm shadow-lg">
              <span className="text-2xl animate-bounce">🔥</span>
              <span className="text-sm font-medium text-slate-700">AI 驱动的爆款文案工厂</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-slate-800 via-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
              小红书爆款文案生成器
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-6 max-w-2xl mx-auto leading-relaxed">
              🤖 智能分析热门笔记规律 · ⚡ 实时生成专属爆款文案 · 🎯 助力内容快速出圈
            </p>
            <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
              <a
                href="https://github.com/EBOLABOY/xhs-ai-writer"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-slate-700 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-200 rounded-xl hover:from-slate-200 hover:to-blue-200 hover:border-slate-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="text-lg group-hover:scale-110 transition-transform duration-300">⭐</span>
                <span>GitHub</span>
              </a>
              <a
                href="https://www.xiaohongshu.com/user/profile/5e141963000000000100158e"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-slate-700 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-xl hover:from-blue-200 hover:to-indigo-200 hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="text-lg group-hover:scale-110 transition-transform duration-300">📱</span>
                <span>小红书</span>
              </a>
            </div>
          </div>
        </div>

        <GeneratorClient />
      </div>

      {/* 底部友链栏 */}
      <div className="relative z-10 mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-slate-50/90 backdrop-blur-md border border-blue-200/30 rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="text-center mb-6">
              <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
                🔗 友情链接
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                推荐一些优质的工具和服务
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <a
                href="https://ticketradar.izlx.de/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-4 bg-gradient-to-r from-blue-100/60 to-indigo-100/60 border border-blue-200/50 rounded-xl hover:from-blue-200/80 hover:to-indigo-200/80 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform duration-300">
                  ✈️
                </div>
                <div>
                  <h4 className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors duration-300">
                    智慧航班
                  </h4>
                  <p className="text-xs text-gray-500">
                    航班信息查询服务
                  </p>
                </div>
              </a>

              <a
                href="https://www.izlx.de/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-100/60 to-purple-100/60 border border-indigo-200/50 rounded-xl hover:from-indigo-200/80 hover:to-purple-200/80 hover:border-indigo-300 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform duration-300">
                  🌐
                </div>
                <div>
                  <h4 className="font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors duration-300">
                    独立站
                  </h4>
                  <p className="text-xs text-gray-500">
                    个人独立网站服务
                  </p>
                </div>
              </a>

              <a
                href="https://sg.izlx.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-4 bg-gradient-to-r from-purple-100/60 to-blue-100/60 border border-purple-200/50 rounded-xl hover:from-purple-200/80 hover:to-blue-200/80 hover:border-purple-300 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform duration-300">
                  💰
                </div>
                <div>
                  <h4 className="font-semibold text-slate-700 group-hover:text-purple-700 transition-colors duration-300">
                    虚拟货币自动交易
                  </h4>
                  <p className="text-xs text-gray-500">
                    智能交易系统服务
                  </p>
                </div>
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-blue-200/30 text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                © 2024 小红书爆款文案生成器 · 由 AI 驱动的内容创作工具
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
