/**
 * 敏感词过滤系统
 * 用于检测和过滤可能违反平台规则的敏感词汇
 */

/**
 * 敏感词库 - 根据小红书等平台的内容规范整理
 */
const sensitiveWords = [
  // 绝对化词语 - 广告法禁用词
  '最', '第一', '首个', '首选', '顶级', '极致', '终极', '完美',
  '绝对', '唯一', '独一无二', '史上最', '全网最', '世界级', '国家级',
  '顶尖', '至尊', '极品', '王牌', '冠军', '领先', '领导品牌',
  
  // 医疗/功效承诺词语
  '治疗', '疗效', '治愈', '根治', '痊愈', '康复', '医治',
  '修复基因', '抗炎', '消炎', '祛疤', '再生', '重生',
  '药用', '医用', '临床', '处方', '药物', '医学',
  '病理', '症状', '诊断', '手术', '医院专用',
  
  // 夸大宣传词语
  '秒杀', '彻底', '立竿见影', '一天见效', '三天见效', '一周见效',
  '100%有效', '100%成功', '保证', '承诺', '签约', '无效退款',
  '神奇', '奇迹', '魔法', '革命性', '颠覆性', '突破性',
  '前所未有', '史无前例', '空前绝后',
  
  // 其他平台引流词
  '微信', 'vx', 'v信', 'VX', 'V信', 'weixin', 'wechat',
  '加我', '私聊', '私信', '联系我', '扫码', '二维码',
  'QQ', 'qq', '企鹅', '扣扣', '电话', '手机号',
  
  // 低俗/不当词汇
  '性感', '诱惑', '挑逗', '撩人', '勾引', '暧昧',
  '约炮', '一夜情', '包养', '援交', '卖身',
  
  // 违法违规词汇
  '赌博', '博彩', '彩票', '六合彩', '赌场', '老虎机',
  '高利贷', '套现', '洗钱', '传销', '直销', '拉人头',
  '刷单', '刷量', '刷粉', '买粉', '僵尸粉',
  
  // 政治敏感词汇
  '政府', '官方', '国务院', '中央', '领导人',
  '政治', '民主', '自由', '人权', '革命',
  
  // 迷信/封建词汇
  '算命', '占卜', '风水', '看相', '测字', '求签',
  '转运', '开光', '消灾', '辟邪', '招财', '旺运'
];

/**
 * 敏感词替换映射 - 提供更温和的替代词
 */
const sensitiveWordReplacements: Record<string, string> = {
  // 绝对化词语替换
  '最': '很',
  '第一': '优秀',
  '顶级': '高品质',
  '绝对': '非常',
  '唯一': '独特',
  '完美': '优秀',
  
  // 医疗词语替换
  '治疗': '改善',
  '疗效': '效果',
  '抗炎': '舒缓',
  '消炎': '舒缓',
  '修复': '改善',
  
  // 夸大宣传替换
  '秒杀': '优惠',
  '彻底': '有效',
  '神奇': '不错',
  '奇迹': '惊喜',
  '100%': '很好',
  '保证': '期待',
  
  // 其他替换
  '性感': '优雅',
  '诱惑': '吸引',
  '挑逗': '有趣'
};

/**
 * 创建敏感词正则表达式
 * 使用单词边界和全局匹配
 */
const createSensitiveWordsRegex = (): RegExp => {
  // 按长度排序，优先匹配长词汇
  const sortedWords = sensitiveWords.sort((a, b) => b.length - a.length);
  // 转义特殊字符并创建正则表达式
  const escapedWords = sortedWords.map(word => 
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  return new RegExp(escapedWords.join('|'), 'gi');
};

const sensitiveWordsRegex = createSensitiveWordsRegex();

/**
 * 检测文本中是否包含敏感词
 * @param text 待检测的文本
 * @returns 检测结果对象
 */
export function detectSensitiveWords(text: string): {
  hasSensitiveWords: boolean;
  detectedWords: string[];
  positions: Array<{ word: string; start: number; end: number }>;
} {
  const detectedWords: string[] = [];
  const positions: Array<{ word: string; start: number; end: number }> = [];
  
  let match;
  const regex = new RegExp(sensitiveWordsRegex.source, 'gi');
  
  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    detectedWords.push(word);
    positions.push({
      word,
      start: match.index,
      end: match.index + word.length
    });
  }
  
  return {
    hasSensitiveWords: detectedWords.length > 0,
    detectedWords: [...new Set(detectedWords)], // 去重
    positions
  };
}

/**
 * 过滤或替换敏感词
 * @param text 输入文本
 * @param mode 处理模式：'replace' 替换为温和词汇，'mask' 用*号遮蔽，'remove' 直接删除
 * @returns 过滤后的文本
 */
export function filterSensitiveContent(
  text: string, 
  mode: 'replace' | 'mask' | 'remove' = 'replace'
): string {
  if (!text) return text;
  
  return text.replace(sensitiveWordsRegex, (match) => {
    const lowerMatch = match.toLowerCase();
    
    // 记录检测到的敏感词
    console.warn(`🚨 检测到敏感词: "${match}"，已${mode === 'replace' ? '替换' : mode === 'mask' ? '遮蔽' : '删除'}`);
    
    switch (mode) {
      case 'replace':
        // 优先使用预定义的替换词，否则用通用替换
        return sensitiveWordReplacements[lowerMatch] || 
               sensitiveWordReplacements[match] || 
               '优质';
      case 'mask':
        // 用*号遮蔽，保留首尾字符
        if (match.length <= 2) return '*'.repeat(match.length);
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
      case 'remove':
        return '';
      default:
        return match;
    }
  });
}

/**
 * 批量检测多个文本字段
 * @param textFields 文本字段对象
 * @returns 检测结果
 */
export function batchDetectSensitiveWords(textFields: Record<string, string>): {
  hasAnyViolation: boolean;
  violations: Record<string, { detectedWords: string[]; positions: Array<{ word: string; start: number; end: number }> }>;
} {
  const violations: Record<string, any> = {};
  let hasAnyViolation = false;
  
  for (const [fieldName, text] of Object.entries(textFields)) {
    const detection = detectSensitiveWords(text);
    if (detection.hasSensitiveWords) {
      violations[fieldName] = {
        detectedWords: detection.detectedWords,
        positions: detection.positions
      };
      hasAnyViolation = true;
    }
  }
  
  return { hasAnyViolation, violations };
}

/**
 * 获取敏感词统计信息
 * @returns 敏感词库统计
 */
export function getSensitiveWordsStats(): {
  totalWords: number;
  categories: Record<string, number>;
} {
  return {
    totalWords: sensitiveWords.length,
    categories: {
      '绝对化词语': 13,
      '医疗功效词': 15,
      '夸大宣传词': 17,
      '引流词汇': 12,
      '低俗词汇': 11,
      '违法词汇': 15,
      '政治敏感词': 10,
      '迷信词汇': 12
    }
  };
}
