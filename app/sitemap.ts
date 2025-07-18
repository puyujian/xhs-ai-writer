import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://xhs-ai-writer.vercel.app'

  // 博客文章列表，与 app/blog/page.tsx 中的数据保持一致
  const blogPosts = [
    { id: 'ai-xiaohongshu-secrets' },
    { id: 'case-study-300-percent' },
    { id: 'title-formulas-2024' },
  ];

  const blogUrls = blogPosts.map(post => ({
    url: `${baseUrl}/blog/${post.id}`,
    lastModified: new Date(), // 将来可以替换为文章的真实修改日期
    changeFrequency: 'monthly' as 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogUrls, // 动态添加所有博客文章
  ]
}
