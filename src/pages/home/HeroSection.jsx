import { useLayoutEffect, useRef, useState } from 'react';
import {
  motion as Motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import WaveCanvas from '../../components/WaveCanvas';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/hero.css';

function HeroSubtitleLine({ line, index, total, scrollYProgress, pointerXSpring, pointerYSpring }) {
  const lineDepth = index + 1;
  const lineX = useTransform(pointerXSpring, [-1, 1], [-4 * lineDepth, 4 * lineDepth]);
  const lineYParallax = useTransform(pointerYSpring, [-1, 1], [-2.5 * lineDepth, 2.5 * lineDepth]);
  const lineBaseY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -18 - (total - index - 1) * 8]
  );
  const lineY = useTransform(() => lineBaseY.get() + lineYParallax.get());
  const lineScale = useTransform(scrollYProgress, [0, 1], [1, 0.985 - index * 0.004]);
  const lineOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.92, 0.7]);

  return (
    <Motion.span
      className="hero__subtitle-line"
      style={{
        x: lineX,
        y: lineY,
        opacity: lineOpacity,
        scale: lineScale,
      }}
    >
      {line}
    </Motion.span>
  );
}

/**
 * HeroSection — 纯视觉英雄区
 * 全屏背景 + 左对齐标题 + Hero 内信息带
 */
export default function HeroSection() {
  const { lang } = useLanguage();
  const copy = COPY.hero[lang];
  const isChinese = lang === 'zh';
  const sectionRef = useRef(null);
  const dividerSourceRef = useRef(null);
  const [dividerWidth, setDividerWidth] = useState(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const pointerXSpring = useSpring(pointerX, { stiffness: 140, damping: 22, mass: 0.5 });
  const pointerYSpring = useSpring(pointerY, { stiffness: 140, damping: 22, mass: 0.5 });
  const subtitleLines = copy.subtitleLines ?? (copy.subtitle ? [copy.subtitle] : []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const shellBaseY = useTransform(scrollYProgress, [0, 1], [0, -56]);
  const dividerBaseY = useTransform(scrollYProgress, [0, 1], [0, -72]);
  const dividerBaseOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 0.92, 0.62]);

  const shellX = useTransform(pointerXSpring, [-1, 1], [-10, 10]);
  const shellYParallax = useTransform(pointerYSpring, [-1, 1], [-8, 8]);
  const shellRotateX = useTransform(pointerYSpring, [-1, 1], [1.4, -1.4]);
  const shellRotateY = useTransform(pointerXSpring, [-1, 1], [-1.8, 1.8]);

  const shellY = useTransform(() => shellBaseY.get() + shellYParallax.get());
  const dividerX = useTransform(pointerXSpring, [-1, 1], [-12, 12]);
  const dividerYParallax = useTransform(pointerYSpring, [-1, 1], [-6, 6]);
  const dividerY = useTransform(() => dividerBaseY.get() + dividerYParallax.get());
  const dividerScaleX = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  useLayoutEffect(() => {
    const target = dividerSourceRef.current;
    if (!target) {
      return;
    }

    const updateDividerWidth = () => {
      setDividerWidth(target.getBoundingClientRect().width);
    };

    updateDividerWidth();

    const observer = new ResizeObserver(() => {
      updateDividerWidth();
    });

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [lang, copy.titleLines.length]);

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nextX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const nextY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerX.set(nextX);
    pointerY.set(nextY);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="hero-section"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="hero__stage hero__stage--interactive" aria-hidden="true">
        <WaveCanvas />
      </div>

      {/* Content overlay — 从底部向上堆叠：标题 → 分隔线 → 玻璃面板 */}
      <div className="hero__content">
        {/* 标题区 */}
        <div className="hero__title-area">
          <div className="hero__title-backdrop">
            <h1 className={`hero__title ${isChinese ? 'hero__title--compact' : ''}`}>
              {copy.titleLines.map((line, index) => (
                <span
                  key={line}
                  ref={index === copy.titleLines.length - 1 ? dividerSourceRef : undefined}
                  className={`hero__title-line ${index > 0 ? 'hero__title-line--secondary' : ''}`}
                >
                  {line}
                </span>
              ))}
            </h1>
          </div>
        </div>

        {/* 分隔线 — 在标题与玻璃面板之间 */}
        <Motion.div
          className="hero__divider"
          style={{
            width: dividerWidth ? `${dividerWidth}px` : undefined,
            x: dividerX,
            y: dividerY,
            opacity: dividerBaseOpacity,
            scaleX: dividerScaleX,
          }}
        />

        {/* 玻璃面板 — 底部锚定，1/6vh 高度 */}
        <Motion.div
          className="hero__subtitle-area"
          style={{
            x: shellX,
            y: shellY,
            rotateX: shellRotateX,
            rotateY: shellRotateY,
            transformPerspective: 1400,
          }}
        >
          <div className="hero__subtitle-shell">
            <Motion.p className={`hero__subtitle ${isChinese ? 'hero__subtitle--compact' : ''}`}>
              {subtitleLines.map((line, index) => (
                <HeroSubtitleLine
                  key={`${lang}-${line}`}
                  line={line}
                  index={index}
                  total={subtitleLines.length}
                  scrollYProgress={scrollYProgress}
                  pointerXSpring={pointerXSpring}
                  pointerYSpring={pointerYSpring}
                />
              ))}
            </Motion.p>

            {/* 社交链接条 */}
            <div className="hero__social-bar">
              <a
                href="https://x.com/veen_foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="hero__social-link"
                title={copy.socialTwitter}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="hero__social-icon">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>{copy.socialTwitter}</span>
              </a>
              <a
                href="https://github.com/VeenIntelligence/"
                target="_blank"
                rel="noopener noreferrer"
                className="hero__social-link"
                title={copy.socialGithub}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="hero__social-icon">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>{copy.socialGithub}</span>
              </a>
              <a
                href="mailto:contact@veenai.org"
                className="hero__social-link"
                title={copy.socialEmail}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hero__social-icon">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
                <span>{copy.socialEmail}</span>
              </a>
            </div>
          </div>
        </Motion.div>
      </div>
    </section>
  );
}
