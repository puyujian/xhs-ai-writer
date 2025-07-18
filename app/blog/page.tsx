import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '小红书AI写作技巧与攻略 - AI小红书爆款文案生成器博客',
  description: '分享小红书AI写作技巧、爆款文案创作攻略、流量提升秘诀。学习如何使用AI工具创作出更有吸引力的小红书内容。',
  keywords: '小红书写作技巧,小红书爆款攻略,AI写作教程,小红书流量提升,小红书文案技巧',
}

const blogPosts = [
  {
    id: 'ai-xiaohongshu-secrets',
    title: '5个AI也无法替代的小红书爆款秘诀',
    description: '揭秘那些连AI都学不会的小红书爆款创作技巧，让你的笔记在千万内容中脱颖而出。',
    date: '2024-01-15',
    readTime: '5分钟阅读',
  },
  {
    id: 'case-study-300-percent',
    title: '案例分析：我们如何用AI工具将笔记互动率提升300%',
    description: '真实案例分享：从0到爆款的完整复盘，详解AI工具在小红书运营中的实战应用。',
    date: '2024-01-12',
    readTime: '8分钟阅读',
  },
  {
    id: 'title-formulas-2024',
    title: '2024年最新小红书标题公式大全（AI版）',
    description: '收录50+经过AI验证的小红书标题公式，涵盖美妆、穿搭、美食、旅行等各个领域。',
    date: '2024-01-10',
    readTime: '10分钟阅读',
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              📚 小红书AI写作攻略
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              分享最新的小红书AI写作技巧、爆款创作攻略和流量提升秘诀
            </p>
          </div>

          <div className="grid gap-8">
            {blogPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <span>{post.date}</span>
                  <span className="mx-2">•</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3 hover:text-purple-600 transition-colors">
                  <Link href={`/blog/${post.id}`}>
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {post.description}
                </p>
                <Link 
                  href={`/blog/${post.id}`}
                  className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
                >
                  阅读全文 →
                </Link>
              </article>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              ← 返回AI文案生成器
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
