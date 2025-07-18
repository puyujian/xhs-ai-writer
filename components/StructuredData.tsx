export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "AI小红书爆款文案生成器",
    "description": "使用AI小红书爆款文案生成器，通过智能分析热门笔记，一键创作出充满人味的高质量标题、正文和标签，轻松提升您的笔记流量。",
    "url": "https://xhs-ai-writer.vercel.app",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    },
    "creator": {
      "@type": "Organization",
      "name": "AI小红书爆款文案生成器"
    },
    "keywords": "AI小红书文案生成器,小红书爆款文案,小红书AI写作,小红书标题生成,小红书文案工具,AI写作助手,小红书营销工具",
    "inLanguage": "zh-CN",
    "potentialAction": {
      "@type": "UseAction",
      "target": "https://xhs-ai-writer.vercel.app",
      "object": {
        "@type": "WebApplication",
        "name": "AI小红书爆款文案生成器"
      }
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
