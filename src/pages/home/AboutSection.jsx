import { useRef } from 'react';
import { motion as Motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import GlassCubeScene from '../../components/GlassCubeScene';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/about.css';

/**
 * ArrowRight — 内联 SVG 箭头图标
 */
function ArrowRight({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/**
 * PillarCard — Project Σ 四大支柱卡片
 * 序号与标题同行显示，节省移动端垂直空间
 */
function PillarCard({ pillar, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <Motion.div
      ref={ref}
      className="about-pillar"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* 序号 + 标题同一行 */}
      <div className="about-pillar__header">
        <span className="about-pillar__icon">{pillar.icon}</span>
        <h3 className="about-pillar__title">{pillar.title}</h3>
      </div>
      <p className="about-pillar__desc">{pillar.desc}</p>
    </Motion.div>
  );
}

/**
 * AboutSection — Project Σ 介绍
 *
 * 布局策略：
 * - Desktop (>767px)：单屏，内容底部对齐，方块居中
 * - Mobile (≤767px)：分两屏
 *   · 第一屏：Project Σ 标签 + 标题 + CTA + manifesto（上半留空给方块）
 *   · 第二屏：四大支柱卡片
 */
export default function AboutSection() {
  const { lang } = useLanguage();
  const copy = COPY.about[lang];
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // 视差 — heading
  const yHeading = useTransform(scrollYProgress, [0, 0.5], [120, 0]);
  const opHeading = useTransform(scrollYProgress, [0.05, 0.3], [0, 1]);

  // 视差 — manifesto + pillars
  const yBody = useTransform(scrollYProgress, [0, 0.55], [160, 0]);
  const opBody = useTransform(scrollYProgress, [0.08, 0.35], [0, 1]);

  return (
    <section ref={sectionRef} id="about" className="about-section" style={{ position: 'relative' }}>
      {/* Three.js 玻璃方块背景 */}
      <GlassCubeScene />

      {/* 主内容 */}
      <div className="about-content">
        {/* ═══ 第一屏（移动端）：标签 + 标题 + CTA + manifesto ═══ */}
        <div className="about-screen-1">
          {/* Project [Σ] 大标签 — 箭头 + 文字 + 白框Σ徽章 */}
          <Motion.div
            className="about-subheading"
            style={{ opacity: opHeading }}
          >
            <ArrowRight className="about-subheading__icon" />
            <span>{copy.subheading}</span>
            <span className="about-sigma-badge">Σ</span>
          </Motion.div>

          {/* 标题 + CTA + 宣言 */}
          <div className="about-columns">
            {/* 左侧：标题 + CTA 按钮 */}
            <Motion.div
              className="about-heading"
              style={{ y: yHeading, opacity: opHeading }}
            >
              <h2 className="about-heading__h2">
                <span className="about-heading__light">{copy.headingLines[0]}</span>
                <br />
                <span className="about-heading__light">{copy.headingLines[1]}</span>
                <br />
                <span className="about-heading__display">{copy.headingLines[2]}</span>
              </h2>

              {/* CTA 按钮紧跟标题下方 */}
              <div className="about-cta-inline">
                <Link to="/blog" className="about-cta-inline__btn">
                  {copy.ctaReadMore}
                  <ArrowRight className="about-cta-inline__arrow" />
                </Link>
              </div>
            </Motion.div>

            {/* 右侧：宣言摘要 */}
            <Motion.div
              className="about-manifesto"
              style={{ y: yBody, opacity: opBody }}
            >
              <p className="about-manifesto__text">{copy.manifesto}</p>
              <p className="about-manifesto__highlight">{copy.manifestoHighlight}</p>
            </Motion.div>
          </div>
        </div>

        {/* ═══ 第二屏（移动端）：四大支柱 ═══ */}
        <div className="about-screen-2">
          <div className="about-pillars">
            <span className="about-pillars__label">{copy.pillarTitle}</span>
            <div className="about-pillars__grid">
              {copy.pillars.map((pillar, i) => (
                <PillarCard key={pillar.icon} pillar={pillar} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
