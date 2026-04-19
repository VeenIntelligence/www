/**
 * Project Σ 文章元数据
 * 
 * 文件位置: src/pages/blog/posts/project-sigma-manifesto/meta.js
 * 功能: 提供文章的双语标题、摘要、引用语等结构化信息
 *       用于博客列表页展示，与渲染组件解耦
 */
const meta = {
  /** URL slug，必须与文件夹名一致 */
  slug: 'project-sigma-manifesto',

  /** 发布日期（ISO 格式） */
  date: '2026-03-26',

  /** 分类标签（列表页 pill 展示） */
  tags: ['Infrastructure', 'Protocol'],

  /**
   * 封面配置 — 列表页卡片封面使用
   * bg: 底层背景渐变
   * palette: 抽象主体配色
   * variant: 构图预设
   * glassTint: 毛玻璃切片染色
   */
  cover: {
    bg: 'radial-gradient(circle at 50% 42%, rgba(126, 198, 255, 0.18) 0%, rgba(126, 198, 255, 0) 28%), linear-gradient(140deg, #07101e 0%, #0b1730 45%, #07161a 100%)',
    palette: [
      'rgba(124, 176, 255, 0.92)',
      'rgba(127, 240, 214, 0.86)',
      'rgba(221, 246, 255, 0.88)',
    ],
    variant: 'bloom',
    glassTint: 'rgba(115, 193, 255, 0.18)',
  },

  /** 英文元数据 */
  en: {
    title: 'Project Σ: Building the Next-Gen Infrastructure Protocol for Human Collective Intelligence',
    excerpt: 'The internet gave humanity connection, but never gave humanity evolution. We\'re changing that. Project Σ is building the protocol-layer reconstruction of how information flows, evaluates, settles, and evolves between humans.',
    heroQuote: '"The internet gave humanity connection, but never gave humanity evolution. We\'re changing that."',
  },

  /** 中文元数据 */
  zh: {
    title: 'Project Σ: 打造下一代人类智慧传播的基础设施协议',
    excerpt: '"互联网给了人类连接，却没有给人类进化。我们要改变这一点。" Project Σ 正在对信息如何在人类之间流动、评估、沉淀、进化进行协议层重构。',
    heroQuote: '"互联网给了人类连接，却没有给人类进化。我们要改变这一点。"',
  },
};

export default meta;
