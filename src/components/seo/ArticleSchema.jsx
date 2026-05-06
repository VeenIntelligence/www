import { useEffect } from 'react';

/**
 * ArticleSchema — 博客文章 JSON-LD 结构化数据注入
 *
 * 在 <head> 中注入 Article schema，让 AI Agent 和搜索引擎
 * 能结构化地理解每篇文章的标题、作者、日期、摘要等信息。
 *
 * 使用方式：在 BlogArticlePage 中渲染，传入文章 meta 数据。
 * 自动在 mount 时注入、unmount 时清理，不会泄漏。
 *
 * @param {Object} props
 * @param {string} props.slug - 文章 URL slug
 * @param {string} props.date - 发布日期 ISO 格式
 * @param {string} props.title - 当前语言的文章标题
 * @param {string} props.excerpt - 当前语言的文章摘要
 * @param {string[]} props.tags - 分类标签
 */
export default function ArticleSchema({ slug, date, title, excerpt, tags }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `article-schema-${slug}`;
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': title,
      'description': excerpt,
      'datePublished': date,
      'dateModified': date,
      'author': {
        '@type': 'Organization',
        'name': 'Venn Intelligence Foundation',
        'url': 'https://vennai.org',
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Venn Intelligence Foundation',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://vennai.org/brand/venn-avatar-black.png',
        },
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `https://vennai.org/blog/${slug}`,
      },
      'keywords': tags?.join(', ') || '',
      'url': `https://vennai.org/blog/${slug}`,
    });
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById(`article-schema-${slug}`);
      if (existing) existing.remove();
    };
  }, [slug, date, title, excerpt, tags]);

  return null;
}
