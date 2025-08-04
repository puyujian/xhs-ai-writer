const faqData = [
  {
    question: "这个AI小红书文案生成器是免费的吗？",
    answer: "是的，目前所有核心功能完全免费，您无需登录或注册即可直接使用。每天提供10次免费生成机会，次数在每日凌晨自动重置。"
  },
  {
    question: "生成的内容会和别人重复吗？",
    answer: "不会。AI会根据您提供的【原始素材】和【主题关键词】进行实时创作。每个人的输入都是独特的，因此生成的内容也是独一无二的。"
  },
  {
    question: "作者是谁？",
    answer: "作者迪迦，需要定制请联系！"
  },
  {
    question: "这个工具支持哪些内容领域？",
    answer: "支持非常广泛的领域，包括但不限于美妆、护肤、穿搭、美食、旅行、家居、母婴、职场、学习等。您可以通过输入不同的关键词来适应您的内容领域。"
  },
  {
    question: "生成的文案可以直接发布吗？",
    answer: "建议您在AI生成的基础上，结合自己的真实体验进行个性化调整。这样既能保持内容的高质量，又能体现您独特的创作风格，更容易获得用户共鸣。"
  },
  {
    question: "如何提高生成内容的质量？",
    answer: "提供越详细的【原始素材】，生成的内容质量越高。建议包含具体的使用感受、产品细节、个人故事等真实信息，这样AI能更好地理解您的需求。"
  },
  {
    question: "每天只能使用10次吗？",
    answer: "是的，为了确保服务稳定性和公平使用，每个IP地址每天可以免费生成10次内容。次数会在每日凌晨自动重置。您也可以使用兑换码获取额外的使用机会。"
  },
  {
    question: "什么是兑换码？如何获取？",
    answer: "兑换码可以为您提供额外的使用次数，不受每日限制影响。您可以通过参与活动、推荐朋友或联系客服等方式获取兑换码。在主页面的兑换码输入框中输入即可使用。"
  }
];

export default function FaqSection() {
  return (
    <div className="mt-12">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">常见问题 (FAQ)</h2>
      <div className="max-w-4xl mx-auto space-y-4">
        {faqData.map((item, index) => (
          <details key={index} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow group">
            <summary className="font-semibold cursor-pointer text-lg text-gray-700 hover:text-purple-600 transition-colors list-none">
              <div className="flex items-center justify-between">
                <span>{item.question}</span>
                <span className="text-purple-500 group-open:rotate-180 transition-transform duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </summary>
            <div className="mt-3 pt-3 border-t border-gray-100 text-gray-600 leading-relaxed">
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
