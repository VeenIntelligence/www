import { useLayoutEffect, useRef, useState } from 'react';
import WaveCanvas from '../../components/WaveCanvas';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/hero.css';

/**
 * HeroSection — 纯视觉英雄区
 * 全屏背景 + 左对齐标题 + Hero 内信息带
 */
export default function HeroSection() {
  const { lang } = useLanguage();
  const copy = COPY.hero[lang];
  const isChinese = lang === 'zh';
  const dividerSourceRef = useRef(null);
  const [dividerWidth, setDividerWidth] = useState(null);

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

  return (
    <section id="hero" className="hero-section">
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
        <div className="hero__divider" style={dividerWidth ? { width: `${dividerWidth}px` } : undefined} />

        {/* Subtitle — LEFT aligned, below divider, with glow */}
        <div className="hero__subtitle-area">
          <div className="hero__subtitle-shell">
            <p className="hero__subtitle">
              {copy.subtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
