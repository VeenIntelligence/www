import { Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { COPY } from '../config/i18n';
import Footer from '../components/Footer';
import { BLOG_POSTS } from './blog/registry';
import BlogCover from './blog/components/BlogCover';
import '../styles/pages/blog.css';

/**
 * BlogPage — 博客列表页
 *
 * 路由: /blog
 * 布局: featured 大卡片 + 2列网格小卡片（桌面） / 1列（移动）
 * 每张卡片带抽象主体 + 毛玻璃切片封面，避免所有文章只靠底色区分
 *
 * 文章数据来源: src/pages/blog/registry.js
 */
export default function BlogPage() {
  const { lang } = useLanguage();
  const copy = COPY.blog[lang];

  const [featured, ...rest] = BLOG_POSTS;
  const featuredMeta = featured.meta[lang];

  return (
    <main className="blog-page">
      <div className="blog-page__inner">
        <header className="blog-page__header">
          <h1 className="blog-page__title">{copy.title}</h1>
          <p className="blog-page__subtitle">{copy.subtitle}</p>
        </header>

        {/* 首篇 — Featured 大卡片 */}
        <Link
          to={`/blog/${featured.slug}`}
          className="blog-card blog-card--featured"
        >
          <BlogCover cover={featured.meta.cover} featured />
          <div className="blog-card__body">
            <div className="blog-card__meta-row">
              <time className="blog-card__date">{featured.meta.date}</time>
              <div className="blog-card__tags">
                {featured.meta.tags.map(tag => (
                  <span key={tag} className="blog-card__tag">{tag}</span>
                ))}
              </div>
            </div>
            <h2 className="blog-card__title">{featuredMeta.title}</h2>
            <p className="blog-card__excerpt">{featuredMeta.excerpt}</p>
            <span className="blog-card__cta">
              {copy.readMore}
              <svg className="blog-card__arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M1 8h12M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </Link>

        {/* 其余文章 — 网格布局 */}
        {rest.length > 0 && (
          <div className="blog-grid">
            {rest.map(post => {
              const localMeta = post.meta[lang];
              return (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="blog-card"
                >
                  <BlogCover cover={post.meta.cover} featured={false} />
                  <div className="blog-card__body">
                    <div className="blog-card__meta-row">
                      <time className="blog-card__date">{post.meta.date}</time>
                      <div className="blog-card__tags">
                        {post.meta.tags.map(tag => (
                          <span key={tag} className="blog-card__tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <h2 className="blog-card__title">{localMeta.title}</h2>
                    <p className="blog-card__excerpt">{localMeta.excerpt}</p>
                    <span className="blog-card__cta">
                      {copy.readMore}
                      <svg className="blog-card__arrow" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M1 8h12M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
