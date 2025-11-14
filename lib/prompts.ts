/**
 * AI提示词管理模块 v3.0 精简版
 * 简化提示词,依赖模型自身能力,只保留格式要求
 */

/**
 * 转义可能破坏提示词结构的特殊字符
 */
function escapePromptContent(content: string): string {
  const jsonString = JSON.stringify(content);
  const escapedContent = jsonString.slice(1, -1);
  return escapedContent
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/```/g, '\\`\\`\\`');
}

/**
 * 生成小红书热门笔记分析提示词
 */
export const getAnalysisPrompt = (scrapedContent: string): string => {
  const safeContent = escapePromptContent(scrapedContent);
  return `你是小红书内容分析师,分析以下热门笔记,提取爆款规律。

**热门笔记数据:**
${safeContent}

**输出要求:**
严格按JSON格式输出,不要任何额外文字。

{
  "titleFormulas": {
    "analysis": "标题常用模式",
    "suggestedFormulas": ["公式1", "公式2"],
    "commonKeywords": [],
    "avoidWords": []
  },
  "contentStructure": {
    "openingHooks": ["开头方式1", "开头方式2"],
    "storyTemplates": ["模板1", "模板2"],
    "bodyTemplate": "正文组织模板",
    "endingHooks": ["结尾方式1", "结尾方式2"],
    "emotionalTone": "情感基调"
  },
  "tagStrategy": {
    "strategy": "标签组合策略",
    "commonTags": [],
    "tagCategories": {
      "coreKeywords": [],
      "longTailKeywords": [],
      "sceneTags": [],
      "demographicTags": []
    }
  },
  "coverStyleAnalysis": {
    "commonStyles": ["风格1", "风格2"],
    "suggestion": "建议",
    "colorTone": "色调偏好"
  },
  "engagingWritingElements": {
    "humorTechniques": [],
    "storyElements": [],
    "emotionalHooks": []
  },
  "writingGuidelines": {
    "antiListingRules": [],
    "lifelikeDetails": []
  },
  "engagementPatterns": {
    "interactionTriggers": [],
    "commentPatterns": [],
    "shareReasons": []
  }
}

**重要:**
- 只返回JSON,无其他文本
- 不确定的信息返回空值
- 禁止编造信息`;
};

/**
 * 生成小红书文案创作提示词
 */
export const getGenerationPrompt = (
  hotPostRules: string,
  userInfo: string,
  keyword: string
): string => {
  return `你是小红书爆款博主,基于用户素材创作一篇高质量笔记。

**爆款规律(内化后使用,不要输出):**
${hotPostRules}

**用户素材:**
${userInfo}

**关键词:** ${keyword}

**核心要求:**
1. 内容必须基于用户素材,不要编造
2. 语言自然口语化,避免AI味
3. 标题≤20字
4. 正文450-750字
5. 标签10-15个

**写作风格:**
- 用口语化表达,避免书面语
- 多用短句、emoji
- 加入真实细节和情绪
- 避免:首先、其次、总之等模板词
- **禁止使用 Markdown 语法**(如 **加粗**、*斜体* 等),直接输出纯文本

**直接输出以下格式,不要任何前导文字:**

## 1. 爆款标题创作(3个)
(每个标题≤20字,emoji计2字)
- 标题1:
- 标题2:
- 标题3:

## 2. 正文内容
(450-750字,基于用户素材,自然口语化,包含真实细节)

## 3. 关键词标签(10-15个)
(与内容强相关,已去重)

## 4. AI绘画提示词
(仅包含2-4个卖点文案,如"加粗字体 '平价逆袭'")

## 5. 首评关键词引导
(补充正文中未说明的关键信息,引导互动)

## 6. 发布策略建议
(建议最佳发布时间段)

## 7. 小红书增长 Playbook
- **核心价值定位:** [实用价值/情绪价值]
- **初始流量池策略:** [具体建议]
- **数据驱动优化:**
  - 点击率 > 10%?
  - 互动率 > 3%?
  - 赞藏比健康?
`;
};
