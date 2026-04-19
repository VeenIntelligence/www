/**
 * Project Ω 文章元数据
 *
 * 文件位置: src/pages/blog/posts/project-omega-manifesto/meta.js
 * 状态: 占位 — 内容待补充
 */
const meta = {
  /** URL slug，必须与文件夹名一致 */
  slug: 'project-omega-manifesto',

  /** 发布日期（ISO 格式） */
  date: '2026-04-02',

  /** 分类标签（列表页 pill 展示） */
  tags: ['Trading', 'AI Agent'],

  /**
   * 封面配置 — 列表页卡片封面使用
   * bg: 底层背景渐变
   * palette: 抽象主体配色
   * variant: 构图预设
   * glassTint: 毛玻璃切片染色
   */
  cover: {
    bg: 'radial-gradient(circle at 72% 34%, rgba(255, 193, 97, 0.16) 0%, rgba(255, 193, 97, 0) 24%), linear-gradient(145deg, #191107 0%, #2d1808 42%, #120d09 100%)',
    palette: [
      'rgba(255, 176, 78, 0.9)',
      'rgba(255, 125, 89, 0.84)',
      'rgba(255, 238, 192, 0.9)',
    ],
    variant: 'prism',
    glassTint: 'rgba(255, 186, 112, 0.17)',
  },

  /** 英文元数据 */
  en: {
    title: 'Project Ω: The Complete Evolutionary Record of a Real Trading System',
    excerpt: 'Every serious team keeps their real system locked away. Project Ω is the first to change that — selling not the system, but the complete, commit-by-commit documented journey of building one.',
    heroQuote: '"A system that still earns never leaves its creator. What we sell is the journey of building one."',
  },

  /** 中文元数据 */
  zh: {
    title: 'Project Ω: 一个真实交易系统的完整演进记录',
    excerpt: '每个认真的团队都把真正的系统锁起来。Project Ω 是第一个改变这件事的——我们卖的不是系统，而是构建它的完整过程文档。',
    heroQuote: '"真正还在赚钱的系统，不会从创造者手里流出来。我们卖的是构建它的旅程。"',
  },
};

export default meta;
