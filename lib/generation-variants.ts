/**
 * 生成多样性配置池
 * 目标：在不引入外部存储的情况下，通过“随机写作配置 + 结构约束”
 * 降低同一套提示词导致的标题/正文同质化。
 */

export type EmojiDensity = 'low' | 'medium' | 'high';

export interface GenerationVariant {
  id: string;
  label: string;
  persona: string;
  angle: string;
  openingOptions: string[];
  structure: string[];
  styleRules: string[];
  endingOptions: string[];
  emojiDensity: EmojiDensity;
}

export interface GenerationStyleConfig {
  variant: GenerationVariant;
  opening: string;
  ending: string;
  depthModules: string[];
  nonce: string;
}

const VARIANTS: GenerationVariant[] = [
  {
    id: 'diary_recap',
    label: '真实复盘日记',
    persona: '像真人在写自己的复盘，语气松弛，不端着。',
    angle: '用真实经历讲清楚一个点：发生了什么、我怎么做、我怎么判断效果。',
    openingOptions: [
      '用一个具体场景开头（素材里有就写，没有就跳过场景细节）：当时我在什么情况下需要它/做了这件事。',
      '用一句反差开头：我原本以为会怎样，结果完全不是。',
      '用一句“今天只讲一个点”的开头：这次最想分享的其实就一句话。'
    ],
    structure: [
      '背景 1-2 句（只取素材中明确的信息）。',
      '过程/体验分 2-3 段，每段只讲 1 个点，不要堆概念。',
      '最后 1 段给出适合/不适合的人（素材里有就写，没有就谨慎写成“可能更适合…”）。'
    ],
    styleRules: [
      '多用短句，避免长段落。',
      '不要用“首先/其次/总之”。',
      '像在和朋友聊天，不要像说明书。'
    ],
    endingOptions: [
      '用一句轻互动收尾：你更在意哪一点？',
      '用一句经验收尾：如果你也遇到同样情况，可以先从一个小动作开始。'
    ],
    emojiDensity: 'medium'
  },
  {
    id: 'avoid_pitfalls',
    label: '避坑提醒',
    persona: '像过来人分享避坑，不吓唬人，但很具体。',
    angle: '围绕“别踩这几个坑/别忽略这几点”，把素材里提到的关键点讲透。',
    openingOptions: [
      '一句提醒式开头：同样的事/同类产品，我见过太多人在这里翻车。',
      '先给结论再解释：我觉得最关键的一点是…'
    ],
    structure: [
      '先点出“最容易出问题的一点”（必须能从素材里找到支撑）。',
      '用 2-3 段把“为什么会这样 + 怎么做更稳”写清楚（没有素材支撑就写成条件句）。',
      '收尾给一个“最小可执行建议”。'
    ],
    styleRules: [
      '不要列“坑1/坑2/坑3”这种固定格式，用自然段承载。',
      '不要夸张恐吓，用“可能/容易/比较”这种语气。'
    ],
    endingOptions: [
      '结尾抛一个选择题式互动：你更怕哪个问题？',
      '结尾一句补充：如果你的情况不同，做法也可能不一样。'
    ],
    emojiDensity: 'low'
  },
  {
    id: 'qa_chat',
    label: '问答聊天体',
    persona: '像朋友私聊答疑，干脆直接。',
    angle: '用 2-4 个常见问题把素材讲透，但不机械。',
    openingOptions: [
      '开头先设问：如果你也纠结过“要不要/怎么选/怎么用”，我把我的做法说清楚。',
      '开头一句：把你可能会问的 3 个问题，我一次讲完。'
    ],
    structure: [
      '用 2-4 组 Q/A（问题要短，回答要具体；素材不足就减少问题数量）。',
      '最后用 1 段把结论收束成一句话。'
    ],
    styleRules: [
      'Q/A 不要超过 4 组，避免变成模板。',
      '回答里必须出现来自素材的具体信息（没有就不写该问题）。'
    ],
    endingOptions: [
      '收尾一句：你们平时遇到这种情况一般怎么处理？',
      '收尾一句：有试过的姐妹来说说你们的体验呗。'
    ],
    emojiDensity: 'low'
  },
  {
    id: 'myth_busting',
    label: '反常识澄清',
    persona: '像在认真解释一个误会，语气温和但有逻辑。',
    angle: '先提出一个常见误区，再用素材里的经历/事实做澄清。',
    openingOptions: [
      '开头一句“很多人以为…”，然后立刻说“我实际遇到的是…”（必须有素材支撑）。',
      '开头先讲“我之前也以为…”，再讲“后来我才发现…”'
    ],
    structure: [
      '误区 1 句（不要上价值）。',
      '澄清 2-3 段：发生了什么/我怎么做/我怎么判断（只基于素材）。',
      '最后给一个“更稳的理解方式/做法”。'
    ],
    styleRules: [
      '解释要通俗，不要学术腔。',
      '不要用“科学证明/权威研究”这类素材外信息。'
    ],
    endingOptions: [
      '结尾一句：你也这样以为过吗？',
      '结尾一句：如果你跟我情况不一样，结论也可能不同。'
    ],
    emojiDensity: 'low'
  },
  {
    id: 'comparison_before_after',
    label: '前后对比',
    persona: '像在做对比复盘，细节清楚，结论克制。',
    angle: '围绕“之前 vs 之后”，把变化写清楚（没有变化信息就不要硬写）。',
    openingOptions: [
      '开头一句对比：以前我会…，现在我更倾向于…',
      '开头一句：我用同一套标准对比了一下，差别主要在…'
    ],
    structure: [
      '先说对比标准（从素材里抽取：比如方便/效果/肤感/耗时等）。',
      '对比写 2-3 段，每段只写一个维度。',
      '最后收敛成“适合谁/不适合谁”。'
    ],
    styleRules: [
      '不要编造数据，不写具体百分比。',
      '不要把对比写成表格或固定小标题。'
    ],
    endingOptions: [
      '结尾一句：你更在意哪个维度？',
      '结尾一句：如果你只想先试试，建议从最小成本的方式开始。'
    ],
    emojiDensity: 'medium'
  },
  {
    id: 'micro_story',
    label: '小故事线',
    persona: '像讲一段小经历，有起伏，但不过度戏剧化。',
    angle: '起因-过程-转折-结果，用故事感降低AI模板味。',
    openingOptions: [
      '开头用一句小插曲：我当时真的差点放弃/差点踩坑…',
      '开头用一句“我没想到…”引出转折。'
    ],
    structure: [
      '起因 1 段（素材里有什么触发点就写什么）。',
      '过程 1-2 段（动作与感受交替写）。',
      '转折 1 段（必须来自素材，不要编）。',
      '结果 1 段（写你怎么判断“有用/没用/一般”的依据，素材没有就别补）。'
    ],
    styleRules: [
      '不要把故事写成鸡汤，不要上价值。',
      '情绪词适量，用“有点/挺/蛮”。'
    ],
    endingOptions: [
      '收尾一句：如果你也卡在这一步，真的可以换个思路试试。',
      '收尾一句：你们想看我把哪一步拆得更细？'
    ],
    emojiDensity: 'high'
  },
  {
    id: 'friend_advice',
    label: '朋友式建议',
    persona: '像闺蜜/兄弟在给建议，直给但不强推。',
    angle: '站在“我会怎么建议朋友”的角度输出，降低工业感。',
    openingOptions: [
      '开头一句：如果你是我朋友来问，我会先问一句…（但不要真的提问，直接给建议）。',
      '开头一句：我先把最实用的结论放前面：…'
    ],
    structure: [
      '先给 1 句结论（必须基于素材）。',
      '用 2-3 段解释原因/过程（素材不足就写成“更可能是…”）。',
      '最后给 1 个“可执行小建议”。'
    ],
    styleRules: [
      '不要官方口吻，尽量口语。',
      '避免“建议大家/强烈推荐”这类广告感。'
    ],
    endingOptions: [
      '结尾一句：你们更想要“省事”还是“更稳”？',
      '结尾一句：反正我自己会这样做，你可以按你的情况改。'
    ],
    emojiDensity: 'medium'
  },
  {
    id: 'minimalist_clean',
    label: '极简直给',
    persona: '像效率博主，短句、干净、信息密度高。',
    angle: '不铺垫，用很少的话讲清楚关键事实与结论。',
    openingOptions: [
      '开头一句：把重点先说完：…',
      '开头一句：一句话总结我的体验：…'
    ],
    structure: [
      '结论 1-2 句。',
      '细节 2-4 句（每句都要能从素材里找到对应点）。',
      '补充 1-2 句（适合/不适合/注意点）。'
    ],
    styleRules: [
      '不要长段落，不要连续使用相同句式。',
      'emoji 少量点缀即可。'
    ],
    endingOptions: [
      '结尾一句：希望能帮你少走弯路。',
      '结尾一句：如果你也试了，回来告诉我差别。'
    ],
    emojiDensity: 'low'
  },
  {
    id: 'scenario_entry',
    label: '场景代入',
    persona: '像把读者拉进一个具体场景里说话，画面感强但不夸张。',
    angle: '先写“我在什么情况下需要/遇到”，再把素材里的细节拆开讲。',
    openingOptions: [
      '用一句“你一定懂”的场景开头（素材里有就写，没有就写通用场景但不加具体事实）。',
      '开头直接给一个画面：我当时正好…（素材没有就不要写具体地点/人物）。'
    ],
    structure: [
      '场景 1 段（尽量短）。',
      '细节 2-3 段（每段 1 个细节，全部来自素材）。',
      '收尾 1 段：一句总结 + 一句互动。'
    ],
    styleRules: [
      '不要长段落，画面感用具体名词而不是形容词堆砌。',
      '避免“姐妹们/宝子们”这种过度统一的称呼。'
    ],
    endingOptions: [
      '结尾一句：你最常在什么场景遇到这个问题？',
      '结尾一句：如果你的场景不一样，做法也可以跟着改。'
    ],
    emojiDensity: 'high'
  },
  {
    id: 'decision_tree',
    label: '条件分支选择',
    persona: '像在帮读者做决策，逻辑清楚但不生硬。',
    angle: '用“如果…就…”的方式把不同情况分开说，避免一刀切。',
    openingOptions: [
      '开头一句：同一件事其实分情况，不用硬套一种写法。',
      '开头一句：我把几种常见情况分开讲，会更好判断。'
    ],
    structure: [
      '先用 1 句交代主线结论（基于素材）。',
      '写 2-3 个条件分支（分支内容必须能回到素材；素材不足就减少分支数量）。',
      '最后收尾 1 段：一句提醒 + 一句互动。'
    ],
    styleRules: [
      '分支不要用固定编号，用自然语言分段即可。',
      '不要出现“保证/一定/100%”。'
    ],
    endingOptions: [
      '结尾一句：你更像哪一种情况？',
      '结尾一句：评论区说说你的情况，一起讨论。'
    ],
    emojiDensity: 'low'
  },
  {
    id: 'balanced_pros_cons',
    label: '优缺点平衡',
    persona: '像认真做体验分享，不吹不黑，可信度更高。',
    angle: '用“我喜欢的点 + 我不太喜欢/要注意的点”把素材讲透。',
    openingOptions: [
      '开头一句：我先说优点，再说一个我觉得要注意的点。',
      '开头一句：它不是完美的，但我觉得最值的是…'
    ],
    structure: [
      '喜欢的点 2-3 句（必须来自素材）。',
      '要注意的点 1-2 句（素材没有就写成“可能更适合…”而不是断言）。',
      '最后 1 段：适合谁 + 怎么开始。'
    ],
    styleRules: [
      '不要用广告话术（“闭眼入/冲就完了”这种尽量少）。',
      '优点缺点不要对仗工整，避免模板感。'
    ],
    endingOptions: [
      '结尾一句：你更在意优点还是更怕踩雷？',
      '结尾一句：你们希望我下次把哪一块讲得更细？'
    ],
    emojiDensity: 'medium'
  },
  {
    id: 'soft_tips',
    label: '轻技巧分享',
    persona: '像分享几个小技巧，轻松、有用、不过度总结。',
    angle: '围绕“我做对的几件小事”，把细节写出来。',
    openingOptions: [
      '开头一句：这次我觉得最有用的其实是几个小细节。',
      '开头一句：别急着追求一步到位，先把这几件小事做好。'
    ],
    structure: [
      '先写 1 句总领（基于素材）。',
      '写 2-3 段“小技巧/小细节”（每段 1 个点，必须能从素材里找到对应信息）。',
      '收尾 1 段：一句鼓励 + 一句互动。'
    ],
    styleRules: [
      '不要出现“技巧1/技巧2/技巧3”这种固定标题。',
      '多用具体动词，少用抽象形容词。'
    ],
    endingOptions: [
      '结尾一句：你最想先从哪个小细节开始？',
      '结尾一句：如果你也有自己的小技巧，留言我去抄作业。'
    ],
    emojiDensity: 'high'
  }
];

const DEPTH_MODULE_POOL: string[] = [
  '把素材里出现的时间/地点/人群/场景写具体（素材没有就不写）。',
  '把素材里出现的关键动作展开成 2-4 个自然步骤（素材没有动作就不写步骤）。',
  '把素材里的“前后变化/对比点”写清楚（素材没有对比就不要硬写）。',
  '把素材里的体验写成可感知细节：气味/触感/口感/耗时/便利度（素材没有就不补）。',
  '把素材里的动机/原因写出来：你为什么这么做/为什么选它（素材没有就不写动机）。',
  '把素材里提到的限制条件写清楚：更适合谁/不适合谁（素材没有就用“可能更适合…”）。',
  '把结果写得“可验证”：你是怎么判断它有用/一般/没用的（素材没有判断依据就别编）。',
  '加入一句自我犹豫/自我修正（不引入新事实，例如“也可能是我当时状态不同”）。'
];

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min: number, max: number): number {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil;
}

function pickOne<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickManyUnique<T>(items: T[], count: number): T[] {
  const uniqueCount = clampNumber(count, 0, items.length);
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < uniqueCount; i++) {
    const index = randomInt(0, pool.length - 1);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

export function pickRandomVariant(): GenerationVariant {
  return pickOne(VARIANTS);
}

export function pickRandomDepthModules(minCount: number = 2, maxCount: number = 3): string[] {
  const count = randomInt(minCount, maxCount);
  return pickManyUnique(DEPTH_MODULE_POOL, count);
}

export function createRandomGenerationStyleConfig(): GenerationStyleConfig {
  const variant = pickRandomVariant();
  const opening = pickOne(variant.openingOptions);
  const ending = pickOne(variant.endingOptions);
  const depthModules = pickRandomDepthModules();
  const nonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  return { variant, opening, ending, depthModules, nonce };
}
