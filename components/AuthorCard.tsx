import { Card, CardContent } from '@/components/ui/card'

export default function AuthorCard() {
  return (
    <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
      <CardContent className="py-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg font-semibold text-gray-800">
            💡 喜欢这个工具吗？
          </div>
          <p className="text-gray-600 max-w-2xl">
            这个AI工具由小红书博主精心打造，专注于帮助大家创作更优质的内容。
            如果觉得有用，欢迎关注我的小红书，获取更多爆款创作技巧！
          </p>
          <a
            href="https://www.xiaohongshu.com/user/profile/5e141963000000000100158e"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            📱 关注作者小红书，获取更多干货
          </a>
          <p className="text-sm text-gray-500">
            分享小红书运营技巧 • AI工具使用心得 • 爆款文案解析
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
