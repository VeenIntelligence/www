import { Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { COPY } from '../config/i18n';
import Footer from '../components/Footer';
import { BLOG_POSTS } from './blog/registry';
import '../styles/pages/blog.css';

/**
 * BlogPage — 博客列表页
 *
 * 路由: /blog
 * 每张卡片点击后导航到 /blog/:slug（独立路由页面）
 *
 * 文章数据来源: src/pages/blog/registry.js
 * 每篇文章 = posts/<slug>/ 文件夹（meta.js + index.jsx）
 */
export default function BlogPage() {
  const { lang } = useLanguage();
  const copy = COPY.blog[lang];

  return (
    <main className="blog-page">
      <div className="blog-page__inner">
        <header className="blog-page__header">
          <h1 className="blog-page__title">{copy.title}</h1>
          <p className="blog-page__subtitle">{copy.subtitle}</p>
        </header>

        <div className="blog-list">
          {BLOG_POSTS.map((post, idx) => {
            const localMeta = post.meta[lang];
            return (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className={`blog-card ${idx === 0 ? 'blog-card--featured' : ''}`}
              >
                {/* 首篇大图区域 — 引用 quote 作为视觉焦点 */}
                {idx === 0 && (
                  <div className="blog-card__hero">
                    <div className="blog-card__hero-gradient" />
                    <p className="blog-card__hero-quote">{localMeta.heroQuote}</p>
                  </div>
                )}
                <div className="blog-card__body">
                  <time className="blog-card__date">{post.meta.date}</time>
                  <h2 className="blog-card__title">{localMeta.title}</h2>
                  <p className="blog-card__excerpt">{localMeta.excerpt}</p>
                  <span className="blog-card__cta">{copy.readMore} →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}
