/**
 * 数据源管理模块
 * 提供安全、合规的数据获取方案
 */

import { ProcessedNote } from './types';

/**
 * 模拟的小红书热门笔记数据
 * 基于真实的小红书内容特征生成，用于演示和开发
 */
export const getMockHotPosts = (keyword: string): ProcessedNote[] => {
  const mockData: Record<string, ProcessedNote[]> = {
    '护肤': [
      {
        title: '🔥干皮救星！这款面霜让我告别起皮',
        desc: '姐妹们！我终于找到了适合干皮的神仙面霜！用了一周皮肤水润到发光✨ 之前试过无数款面霜都觉得不够滋润，这款真的是我的心头好！质地很厚润但不油腻，吸收也很快。早晚都在用，现在皮肤状态真的太好了！',
        interact_info: {
          liked_count: 2847,
          comment_count: 156,
          collected_count: 891
        },
        note_id: 'mock_001',
        user_info: {
          nickname: '护肤小达人Amy'
        }
      },
      {
        title: '平价护肤品测评｜学生党必看！',
        desc: '作为一个穷学生，我把开架护肤品都试了个遍！今天分享几款真正好用又便宜的宝藏产品💎 这些都是我亲测有效的，绝对不踩雷！预算不多的姐妹们冲！',
        interact_info: {
          liked_count: 1923,
          comment_count: 234,
          collected_count: 567
        },
        note_id: 'mock_002',
        user_info: {
          nickname: '学生党省钱攻略'
        }
      },
      {
        title: '敏感肌护肤心得｜踩坑3年总结',
        desc: '敏感肌真的太难了😭 这3年我踩过的坑能绕地球一圈！今天把我的血泪教训分享给大家，希望敏感肌的姐妹们少走弯路。这些成分一定要避开，这些产品真的温和有效！',
        interact_info: {
          liked_count: 3156,
          comment_count: 445,
          collected_count: 1234
        },
        note_id: 'mock_003',
        user_info: {
          nickname: '敏感肌自救指南'
        }
      }
    ],
    '美妆': [
      {
        title: '新手化妆教程｜10分钟出门妆',
        desc: '手残党福音！这套10分钟快手妆容真的太适合上班族了！步骤超简单，新手也能轻松上手💄 用的都是平价产品，效果却很惊艳！赶时间的早晨就靠它了！',
        interact_info: {
          liked_count: 4521,
          comment_count: 678,
          collected_count: 1567
        },
        note_id: 'mock_004',
        user_info: {
          nickname: '化妆师小雅'
        }
      },
      {
        title: '口红试色｜20支热门色号大测评',
        desc: '花了一个月工资买了20支网红口红！今天一次性试色给大家看👄 有些真的名不副实，有些却是意外之喜！黄皮白皮都有推荐，快来找你的命定色号！',
        interact_info: {
          liked_count: 2834,
          comment_count: 392,
          collected_count: 945
        },
        note_id: 'mock_005',
        user_info: {
          nickname: '口红收集癖患者'
        }
      }
    ],
    '穿搭': [
      {
        title: '小个子穿搭攻略｜显高10cm不是梦',
        desc: '155的我终于找到了显高的穿搭密码！这几个技巧真的太管用了👗 高腰线、同色系、选对鞋子...每一个都是显高利器！小个子姐妹们快学起来！',
        interact_info: {
          liked_count: 3789,
          comment_count: 567,
          collected_count: 1456
        },
        note_id: 'mock_006',
        user_info: {
          nickname: '小个子穿搭博主'
        }
      }
    ]
  };

  // 返回对应关键词的数据，如果没有则返回护肤数据作为默认
  return mockData[keyword] || mockData['护肤'] || [];
};

/**
 * 生成基于模拟数据的分析内容
 */
export const generateMockAnalysis = (keyword: string, posts: ProcessedNote[]): string => {
  if (posts.length === 0) {
    return `关键词"${keyword}"的模拟热门笔记分析（演示数据）：\n\n暂无相关笔记数据。`;
  }

  let result = `关键词"${keyword}"的热门笔记分析（基于模拟数据，仅供演示）：\n\n`;
  
  posts.forEach((post, index) => {
    result += `${index + 1}. 标题：${post.title}\n`;
    result += `   描述：${post.desc.substring(0, 100)}${post.desc.length > 100 ? '...' : ''}\n`;
    result += `   互动：点赞${post.interact_info.liked_count} 评论${post.interact_info.comment_count} 收藏${post.interact_info.collected_count}\n`;
    result += `   作者：${post.user_info.nickname}\n\n`;
  });

  result += `\n📊 数据说明：\n`;
  result += `• 以上数据为模拟数据，仅用于演示AI分析和内容生成功能\n`;
  result += `• 真实应用中建议使用官方API或合规的第三方数据服务\n`;
  result += `• 模拟数据基于真实小红书内容特征生成，具有一定的参考价值\n`;

  return result;
};

/**
 * 数据源配置
 */
export const DATA_SOURCE_CONFIG = {
  // 是否启用真实数据抓取（需要谨慎使用）
  ENABLE_REAL_SCRAPING: false,
  
  // 是否在开发环境显示数据来源警告
  SHOW_DATA_SOURCE_WARNING: true,
  
  // 模拟数据的更新频率（小时）
  MOCK_DATA_REFRESH_HOURS: 24,
  
  // 支持的关键词列表
  SUPPORTED_KEYWORDS: ['护肤', '美妆', '穿搭', '美食', '旅行', '健身'],
} as const;

/**
 * 安全的数据获取函数
 * 优先使用模拟数据，确保合规性
 */
export async function fetchSafeHotPosts(keyword: string): Promise<string> {
  try {
    // 检查是否启用真实数据抓取
    if (DATA_SOURCE_CONFIG.ENABLE_REAL_SCRAPING && process.env.XHS_COOKIE) {
      console.warn('⚠️ 警告：正在使用真实数据抓取，请确保符合平台使用条款');
      // 这里可以调用真实的抓取函数（如果用户明确启用且承担风险）
      // return await fetchRealHotPosts(keyword);
    }

    // 使用安全的模拟数据
    console.log('ℹ️ 使用模拟数据进行演示');
    const mockPosts = getMockHotPosts(keyword);
    return generateMockAnalysis(keyword, mockPosts);

  } catch (error) {
    console.error('数据获取失败:', error);
    
    // 降级到基础模拟数据
    const fallbackPosts = getMockHotPosts('护肤').slice(0, 2);
    return generateMockAnalysis(keyword, fallbackPosts) + '\n\n⚠️ 注意：由于数据获取异常，显示的是降级数据。';
  }
}

/**
 * 获取数据源状态信息
 */
export function getDataSourceStatus() {
  return {
    source: DATA_SOURCE_CONFIG.ENABLE_REAL_SCRAPING ? 'real' : 'mock',
    isRealScrapingEnabled: DATA_SOURCE_CONFIG.ENABLE_REAL_SCRAPING,
    supportedKeywords: DATA_SOURCE_CONFIG.SUPPORTED_KEYWORDS,
    warning: DATA_SOURCE_CONFIG.ENABLE_REAL_SCRAPING 
      ? '当前使用真实数据抓取，请确保合规使用' 
      : '当前使用模拟数据，安全且合规',
    recommendation: '建议使用官方API或合规的第三方数据服务'
  };
}
