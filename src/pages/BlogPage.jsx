import { Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { COPY } from '../config/i18n';
import Footer from '../components/Footer';
import { BLOG_POSTS } from './blog/registry';
import '../styles/pages/blog.css';

/**
 * BlogCover — 几何图形封面
 *
 * 使用 SVG 几何图形 + 渐变光效作为卡片封面，
 * 避免使用照片，保持科技感和统一调性。
 *
 * @param {object} cover - { bg, accent, glow }
 * @param {boolean} featured - 是否为首篇大图模式
 */
function BlogCover({ cover, featured }) {
  const h = featured ? 280 : 180;
  return (
    <div
      className="blog-card__cover"
      style={{ background: cover.bg, height: h }}
    >
      <svg
        className="blog-card__cover-svg"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* 发光球体 */}
        <circle cx="320" cy="60" r="80" fill={cover.glow} />
        <circle cx="80" cy="160" r="50" fill={cover.glow} opacity="0.5" />

        {/* 几何网格线 */}
        <line x1="0" y1="100" x2="400" y2="100" stroke={cover.accent} strokeWidth="0.5" />
        <line x1="200" y1="0" x2="200" y2="200" stroke={cover.accent} strokeWidth="0.5" />
        <line x1="0" y1="0" x2="400" y2="200" stroke={cover.accent} strokeWidth="0.3" opacity="0.6" />
        <line x1="400" y1="0" x2="0" y2="200" stroke={cover.accent} strokeWidth="0.3" opacity="0.6" />

        {/* 装饰圆环 */}
        <circle cx="200" cy="100" r="60" fill="none" stroke={cover.accent} strokeWidth="0.5" />
        <circle cx="200" cy="100" r="90" fill="none" stroke={cover.accent} strokeWidth="0.3" opacity="0.4" />

        {/* 角标点 */}
        <circle cx="40" cy="30" r="2" fill={cover.accent} />
        <circle cx="360" cy="170" r="2" fill={cover.accent} />
        <circle cx="300" cy="40" r="1.5" fill={cover.accent} opacity="0.6" />
      </svg>
    </div>
  );
}

/**
 * BlogPage — 博客列表页
 *
 * 路由: /blog
 * 布局: featured 大卡片 + 2列网格小卡片（桌面） / 1列（移动）
 * 每张卡片带几何封面、pill 标签、优雅 hover 效果
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
