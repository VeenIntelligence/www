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

      {/* Content overlay */}
      <div className="hero__content">
        {/* Title — LEFT aligned, above divider */}
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

        {/* Divider line */}
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

        {/* Subtitle — LEFT aligned, below divider, with glow */}
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
          </div>
        </Motion.div>
      </div>
    </section>
  );
}
