export default function StructuredData() {
  const webApplicationData = {
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

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "这个AI小红书文案生成器是免费的吗？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "是的，目前所有核心功能完全免费，您无需登录或注册即可直接使用。我们致力于为创作者提供便捷的工具。"
        }
      },
      {
        "@type": "Question",
        "name": "生成的内容会和别人重复吗？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "不会。AI会根据您提供的【原始素材】和【主题关键词】进行实时创作。每个人的输入都是独特的，因此生成的内容也是独一无二的。"
        }
      },
      {
        "@type": "Question",
        "name": "为什么需要小红书Cookie？不配置可以使用吗？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "小红书Cookie用于【实时分析】最新热门笔记。如果您不配置，系统会智能降级使用【备用缓存数据】进行分析，核心功能依然可用，但可能不是最新的爆款趋势。"
        }
      },
      {
        "@type": "Question",
        "name": "这个工具支持哪些内容领域？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "支持非常广泛的领域，包括但不限于美妆、护肤、穿搭、美食、旅行、家居、母婴、职场、学习等。您可以通过输入不同的关键词来适应您的内容领域。"
        }
      },
      {
        "@type": "Question",
        "name": "生成的文案可以直接发布吗？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "建议您在AI生成的基础上，结合自己的真实体验进行个性化调整。这样既能保持内容的高质量，又能体现您独特的创作风格，更容易获得用户共鸣。"
        }
      },
      {
        "@type": "Question",
        "name": "如何提高生成内容的质量？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "提供越详细的【原始素材】，生成的内容质量越高。建议包含具体的使用感受、产品细节、个人故事等真实信息，这样AI能更好地理解您的需求。"
        }
      }
    ]
  }

  const howToData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "如何使用AI小红书爆款文案生成器？",
    "description": "通过三个简单步骤，智能分析热门笔记并一键创作出高质量的小红书文案。",
    "step": [
      {
        "@type": "HowToStep",
        "name": "第一步：输入主题关键词",
        "text": "在「笔记主题」输入框中，填写您想创作内容的核心关键词，例如「春季敏感肌护肤」或「职场穿搭技巧」。关键词越具体，AI分析越精准。",
        "url": "https://xhs-ai-writer.vercel.app/#step1"
      },
      {
        "@type": "HowToStep",
        "name": "第二步：提供原始素材",
        "text": "在「原始素材」文本框中，输入您的笔记草稿、产品信息、使用感受或灵感。提供的信息越详细，生成的内容质量越高、越贴合您的需求。",
        "url": "https://xhs-ai-writer.vercel.app/#step2"
      },
      {
        "@type": "HowToStep",
        "name": "第三步：AI智能创作与复制",
        "text": "点击「生成内容」按钮。AI会先分析热门笔记，然后为您创作出标题、正文、标签等完整内容。您可以点击各个部分的复制按钮，方便地粘贴到小红书发布。",
        "url": "https://xhs-ai-writer.vercel.app/#step3"
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify([webApplicationData, faqData, howToData]) }}
    />
  )
}
