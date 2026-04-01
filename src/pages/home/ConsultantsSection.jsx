import { useRef } from 'react';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import LiquidGoldBackground from '../../components/LiquidGoldBackground';
import '../../styles/sections/consultants.css';
import {
  SECTION_OVERLAY_BG,
  PANEL_BG,
  PANEL_BG_HOVER,
  PANEL_BLUR,
  PANEL_SATURATE,
  PANEL_BORDER_BASE,
  PANEL_INSET_TOP,
  PANEL_PREMIUM_BG,
  PANEL_PREMIUM_BG_HOVER,
  PANEL_PREMIUM_GLOW,
  PANEL_BORDER_PREMIUM,
  PANEL_INSET_PREMIUM_TOP,
} from '../../config/consultantsLook';

// 把 JS 调参注入为 CSS 自定义属性，供 consultants.css 中的 var() 消费
const PANEL_CSS_VARS = {
  '--section-overlay-bg':       SECTION_OVERLAY_BG,
  '--panel-bg':                 PANEL_BG,
  '--panel-bg-hover':           PANEL_BG_HOVER,
  '--panel-blur':               PANEL_BLUR,
  '--panel-saturate':           String(PANEL_SATURATE),
  '--panel-border-base':        PANEL_BORDER_BASE,
  '--panel-inset-top':          PANEL_INSET_TOP,
  '--panel-premium-bg':         PANEL_PREMIUM_BG,
  '--panel-premium-bg-hover':   PANEL_PREMIUM_BG_HOVER,
  '--panel-premium-glow':       PANEL_PREMIUM_GLOW,
  '--panel-border-premium':     PANEL_BORDER_PREMIUM,
  '--panel-inset-premium-top':  PANEL_INSET_PREMIUM_TOP,
};

/**
 * ArrowRight — 内联箭头图标
 */
function ArrowRight({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

/**
 * ConsultantsSection — 顾问信息 + 双层级咨询卡片
 */
export default function ConsultantsSection({ children }) {
  const { lang } = useLanguage();
  const content = COPY.consultants[lang];
  const sectionRef = useRef(null);

  return (
    <section
      ref={sectionRef}
      id="consultants"
      className="consultants-section"
      style={PANEL_CSS_VARS}
    >
      {/* 液态金 WebGL shader 背景 */}
      <LiquidGoldBackground />

      <div className="consultants-content-wrapper">
        <div className="consultants-content">
          <header className="consultants-heading">
            <span className="consultants-heading__label">{content.sectionTitle}</span>
            <div className="consultants-heading__line" />
          </header>

          <div className="consultants-grid">
            {/* Panel 1: Profile */}
            <GlassPanel variant="profile">
              <div className="consultants-panel__inner consultants-panel__inner--profile">
                <div className="consultants-avatar">
                  <img
                    src="/consul-lines.png"
                    alt={content.name}
                    className="consultants-avatar__img"
                    loading="lazy"
                  />
                </div>

                <h2 className="consultants-profile__name">{content.name}</h2>

                <div className="consultants-profile__tags">
                  {content.tags.map((tag, idx) => (
                    <span key={idx} className="consultants-profile__tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="consultants-profile__bio">{content.bio1}</p>
                <p className="consultants-profile__bio consultants-profile__bio--emphasis">{content.bio2}</p>
              </div>
            </GlassPanel>

            {/* Panel 2 & 3: Consulting tiers */}
            {content.tiers.map((tier, idx) => {
              const isPremium = idx === 1;
              return (
                <GlassPanel key={tier.name} variant={isPremium ? 'premium' : 'standard'}>
                  <div className={`consultants-panel__inner consultants-tier ${isPremium ? 'consultants-tier--premium' : ''}`}>
                    <div className="consultants-tier__head">
                      <span className="consultants-tier__index">{tier.label}</span>
                      <h3 className="consultants-tier__name">{tier.name}</h3>
                    </div>

                    <div className="consultants-tier__price-wrap">
                      <span className="consultants-tier__price">{tier.price}</span>
                      <span className="consultants-tier__duration">{tier.duration}</span>
                    </div>

                    <ul className="consultants-tier__features">
                      {tier.features.map((feat, fIdx) => (
                        <li key={fIdx}>
                          <span className="consultants-tier__dot" aria-hidden="true" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={`consultants-cta ${isPremium ? 'consultants-cta--premium' : ''}`}
                    >
                      {tier.button}
                      <ArrowRight className="consultants-cta__arrow" />
                    </button>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

/**
 * GlassPanel — 三种面板底层玻璃壳
 */
function GlassPanel({ variant, children }) {
  const cssClass = `consultants-panel consultants-panel--${variant || 'standard'}`;

  return (
    <article className={cssClass}>
      {children}
    </article>
  );
}
