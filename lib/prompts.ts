/**
 * AI提示词管理模块 v3.0 精简版
 * 简化提示词,依赖模型自身能力,只保留格式要求
 */

import type { GenerationStyleConfig } from './generation-variants';

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
  keyword: string,
  styleConfig: GenerationStyleConfig
): string => {
  const { variant, opening, ending, depthModules, nonce } = styleConfig;

  const depthText = depthModules.map(m => `- ${m}`).join('\n');
  const structureText = variant.structure.map(s => `- ${s}`).join('\n');
  const styleRulesText = variant.styleRules.map(r => `- ${r}`).join('\n');

  const emojiHint =
    variant.emojiDensity === 'high'
      ? '正文建议 4-10 个，标题每个 0-1 个；不要每句都加。'
      : variant.emojiDensity === 'medium'
        ? '正文建议 2-6 个，标题可偶尔点缀；不要堆表情。'
        : '正文建议 0-2 个，少量点缀即可。';

  return `你是小红书爆款博主,基于用户素材创作一篇高质量笔记。

**本次写作配置(仅用于控制风格,禁止在输出中提及):**
- 角度: ${variant.angle}
- 人设: ${variant.persona}
- 开头方式: ${opening}
- 结构骨架:
${structureText}
- 额外风格规则:
${styleRulesText}
- 深度加强(能从素材里找到就写,找不到就不写):
${depthText}
- 收尾方式: ${ending}
- emoji密度: ${variant.emojiDensity} (${emojiHint})
- 随机扰动码: ${nonce} (严禁输出)

**爆款规律(内化后使用,不要输出):**
${hotPostRules}

**用户素材:**
${userInfo}

**关键词:** ${keyword}

**核心要求:**
1. 内容必须基于用户素材,不要编造
2. 语言自然口语化,避免AI味
3. 标题≤20字
4. 正文50-750字
5. 标签10-15个

**写作风格:**
- 用口语化表达,避免书面语
- 多用短句、emoji
- 加入真实细节和情绪
- 避免:首先、其次、总之等模板词
- 避免这些高频开头套话: 今天来分享、给大家安利、姐妹们听我说、宝子们
- 标题与正文都要尽量避免“同一套句式重复”,多换表达方式

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
(基于用户素材,自然口语化,包含真实细节。**重要:正文中禁止出现任何标签,不要用 #标签名 格式**)

## 3. 关键词标签(10-15个)
(标签生成策略：
- 按核心词+长尾词+场景词+人群词组合，但仅保留与素材强相关的项
- 严格去重，避免同义词堆砌
- 不要机械套用"#平价好物""#学生党"等常见词，除非素材确实贴合
- 确保每个标签都与内容有明确关联，避免为了凑数而添加无关标签
- 标签数量控制在10-15个之间，优先保留相关性高的标签)

## 4. AI绘画提示词
(任务：将正文提炼为核心卖点。
要求：
1.  请严格基于正文内容进行提炼，不添加或臆造新信息。
2.  核心卖点提炼标准：
    *   **明确价值**：必须清晰传达能给用户带来的具体好处或解决方案（如“美白”、“省时”、“高效”）。
    *   **引发共鸣**：需戳中目标用户的痛点或核心欲望（如“熬夜脸救星”、“懒人必备”）。
    *   **差异化**：突出产品、服务或内容相较于同类竞品的独特优势。
3.  小红书封面文案创作标准：
    *   **句式简洁有力**：字数建议控制在10-15字以内，易于快速阅读。
    *   **关键词前置**：将最具吸引力的核心词（如“巨显白”、“闭眼入”）置于开头。
    *   **多用符号与情绪词**：可酌情使用“❗”、“🔥”、“绝了！”等符号和网络流行语增强视觉冲击力和情绪感染力。
    *   **避免复杂句式与专业术语**，确保文案口语化、社交化。
    *   **避免同质化**，尽可能让每次生成都不一样的卖点和文字
4.  最终输出只需呈现提炼并优化后的小红书封面文案本身，无需解释或保留原始文案内容。)

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
