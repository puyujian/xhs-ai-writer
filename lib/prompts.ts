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

**格式禁令（严格执行）:**
- ❌ 禁止使用 Markdown 语法
- ❌ 禁止使用任何星号标记：**加粗**、*斜体*
- ❌ 禁止使用方括号标记：[文本]、[链接]
- ❌ 禁止使用任何格式化符号：* [ ] ( )
- ❌ 避免绝对化词语：最、第一、唯一、100%、保证等
- ✅ 仅输出纯文本内容，不带任何格式标记
- ✅ 如需强调，用"真的"、"超级"等口语化词汇
- ✅ 用"很"、"非常"、"特别"代替绝对化表达

**直接输出以下格式,不要任何前导文字:**

## 1. 爆款标题创作(3个)
(每个标题≤20字,emoji计2字)
- 标题1:
- 标题2:
- 标题3:

## 2. 正文内容
(100-400字,基于用户素材,自然口语化,包含真实细节。**重要:正文中禁止出现任何标签,不要用 #标签名 格式**)

## 3. 关键词标签(10-15个)
(标签生成策略：
- 按核心词+长尾词+场景词+人群词组合，但仅保留与素材强相关的项
- 严格去重，避免同义词堆砌
- 不要机械套用"#平价好物""#学生党"等常见词，除非素材确实贴合
- 确保每个标签都与内容有明确关联，避免为了凑数而添加无关标签
- 标签数量控制在10-15个之间，优先保留相关性高的标签)

## 4. AI绘画提示词
(仅包含2-4个卖点文案,如"加粗字体 '平价逆袭'"，简单易懂的语音描述小红书封面风格)

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
