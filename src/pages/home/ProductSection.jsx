import { useRef } from 'react';
import { motion as Motion, useScroll, useTransform } from 'framer-motion';
import BrandWordmark from '../../components/common/BrandWordmark';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/product-preview.css';

/** Update CSS custom properties so the cursor-reflection spot follows the mouse */
function trackGlassCursor(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  e.currentTarget.style.setProperty('--glass-cursor-x', `${x}px`);
  e.currentTarget.style.setProperty('--glass-cursor-y', `${y}px`);
}

/**
 * ProductSection — Landing Page 内的产品展示预览
 * 滚动驱动差动: 各元素以不同速率响应滚动
 * 图片从平面(0°)翻折到目标透视角度(33°)
 */
export default function ProductSection() {
  const { lang } = useLanguage();
  const copy = COPY.product[lang];
  const sectionRef = useRef(null);

  // 追踪 section 在视口中的滚动进度
  // offset: 元素底部碰到视口底部(0) → 元素顶部碰到视口顶部(1)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // 差动位移 — 加大幅度
  const ySubtitle = useTransform(scrollYProgress, [0, 0.4], [250, 0]);
  const yTitle    = useTransform(scrollYProgress, [0, 0.45], [380, 0]);
  const yActions  = useTransform(scrollYProgress, [0, 0.5], [500, 0]);
  const yImages   = useTransform(scrollYProgress, [0, 0.55], [600, 0]);

  // 透明度 — 同样差动
  const opSubtitle = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const opTitle    = useTransform(scrollYProgress, [0.03, 0.3], [0, 1]);
  const opActions  = useTransform(scrollYProgress, [0.06, 0.35], [0, 1]);
  const opImages   = useTransform(scrollYProgress, [0.08, 0.4], [0, 1]);

  // 文字缩放: 从稍大(1.12) → 正常(1.0)
  const scaleSubtitle = useTransform(scrollYProgress, [0, 0.4], [1.12, 1]);
  const scaleTitle    = useTransform(scrollYProgress, [0, 0.45], [1.15, 1]);
  const scaleActions  = useTransform(scrollYProgress, [0, 0.5], [1.1, 1]);

  // 图片翻折: 从 0° 到最终角度
  const foldAngle = useTransform(scrollYProgress, [0.05, 0.5], [0, 33]);

  // 图片缩放: 从放大(1.25) → 正常(1.0)
  const scaleImages = useTransform(scrollYProgress, [0.05, 0.55], [1.25, 1]);

  // 图片水平展开: 从两端扩散 → 回归原位
  const spreadLeft  = useTransform(scrollYProgress, [0.05, 0.5], [-120, 0]);
  const spreadRight = useTransform(scrollYProgress, [0.05, 0.5], [120, 0]);

  // 组合 transform 字符串
  const leftCardTransform = useTransform(
    [yImages, foldAngle, scaleImages, spreadLeft],
    ([y, angle, s, sx]) => `translateY(${y}px) translateX(${sx}px) rotateY(${angle}deg) scale(${s})`
  );
  const rightCardTransform = useTransform(
    [yImages, foldAngle, scaleImages, spreadRight],
    ([y, angle, s, sx]) => `translateY(${y}px) translateX(${sx}px) rotateY(-${angle}deg) scale(${s})`
  );

  return (
    <section
      ref={sectionRef}
      id="product"
      className="product-section relative min-h-screen flex items-center justify-center overflow-hidden border-t border-white/10 py-30"
    >
      {/* 双光源衍射光晕 */}
      <div className="product-glow absolute inset-0 z-0 pointer-events-none overflow-hidden" />

      <div className="relative z-1 w-full max-w-[1800px] px-10 flex items-center justify-between max-lg:flex-col max-lg:text-center max-lg:px-6">
        {/* 左侧文案 */}
        <div className="product-copy ml-[6%] z-10 flex flex-col gap-6 max-lg:flex-auto max-lg:w-full max-lg:ml-0 max-lg:mb-[-60px] max-lg:items-center max-md:mb-[-30px]">
          <Motion.h2
            className="product-title"
            style={{ y: ySubtitle, opacity: opSubtitle, scale: scaleSubtitle }}
          >
            <span className="product-title__brand-box">
              <BrandWordmark variant="full" size={28} className="product-title__brand" />
            </span>
            <span className="product-title__name" data-text={copy.titleName}>{copy.titleName}</span>
          </Motion.h2>
          <Motion.h3
            className="product-subtitle"
            style={{ y: yTitle, opacity: opTitle, scale: scaleTitle }}
          >
            <span className="product-subtitle__line">{copy.subtitleLineOne}</span>
            <span className="product-subtitle__line">
              {copy.subtitleLineTwoPrefix}{' '}
              <span className="product-subtitle__highlight gradient-pulse">{copy.subtitleHighlight}</span>
              {copy.subtitleLineTwoSuffix ? ` ${copy.subtitleLineTwoSuffix}` : ''}
            </span>
          </Motion.h3>
          <Motion.div
            className="flex gap-5 mt-4 flex-wrap max-lg:justify-center"
            style={{ y: yActions, opacity: opActions, scale: scaleActions }}
          >
            <button className="product-cta product-cta--primary" onMouseMove={trackGlassCursor}>
              {copy.primaryCta}
            </button>
            <button className="product-cta product-cta--ghost" onMouseMove={trackGlassCursor}>
              {copy.secondaryCta}
            </button>
          </Motion.div>
        </div>

        {/* 右侧 3D V 字形展示 */}
        <Motion.div
          className="flex-1 flex justify-end items-center -ml-[150px] mr-5 z-5 max-lg:justify-center max-lg:w-full max-lg:ml-0 max-lg:mr-0"
          style={{ perspective: '1000px', opacity: opImages }}
        >
          <div
            className="relative flex w-[1200px] max-w-full gap-0 max-lg:w-[900px] max-md:flex-col max-md:gap-5 max-md:pb-10"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Motion.div
              className="product-card flex-1 relative rounded-xl overflow-hidden border border-white/10 bg-black"
              style={{ transformOrigin: 'center left', transform: leftCardTransform }}
            >
              <img src="/screenshot1.jpg" alt={copy.episodesAlt} className="w-full h-auto block opacity-85 transition-opacity duration-500 hover:opacity-100" />
            </Motion.div>
            <Motion.div
              className="product-card flex-1 relative -ml-[80px] max-md:ml-0 rounded-xl overflow-hidden border border-white/10 bg-black"
              style={{ transformOrigin: 'center right', transform: rightCardTransform }}
            >
              <img src="/screenshot2.jpg" alt={copy.dashboardAlt} className="w-full h-auto block opacity-85 transition-opacity duration-500 hover:opacity-100" />
            </Motion.div>
          </div>
        </Motion.div>
      </div>
    </section>
  );
}
