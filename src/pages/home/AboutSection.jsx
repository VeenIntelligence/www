import { useState, useEffect, useRef } from 'react';
import { motion as Motion, useScroll, useTransform, useInView } from 'framer-motion';
import WaterDropScene from '../../components/WaterDropScene';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/about.css';

const BRANDS = [
  'Opensense', 'DKNY', 'Under Armour', 'LIU·JO', 'ATOM', 'ECCO', 'ORUM',
];

/**
 * SVG Circular Progress — animates on mount via inView
 */
function ProgressCircle() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const id = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(id);
  }, [inView]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.75;
  const offset = circumference * (1 - (mounted ? progress : 0));

  return (
    <div ref={ref} className="about-progress">
      <svg viewBox="0 0 120 120" className="about-progress__ring">
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="hsl(0 0% 100% / 0.15)"
          strokeWidth="3"
        />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="hsl(0 0% 100%)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="about-progress__progress"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <span className="about-progress__label">75%</span>
    </div>
  );
}

/**
 * ArrowRight — tiny inline SVG to avoid an extra dependency
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
 * AboutSection — EVR-style full-screen section
 * Video background, large typography, progress ring, brand marquee
 */
export default function AboutSection() {
  const { lang } = useLanguage();
  const copy = COPY.about[lang];
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Parallax for heading
  const yHeading = useTransform(scrollYProgress, [0, 0.5], [120, 0]);
  const opHeading = useTransform(scrollYProgress, [0.05, 0.3], [0, 1]);

  // Parallax for stats
  const yStats = useTransform(scrollYProgress, [0, 0.55], [160, 0]);
  const opStats = useTransform(scrollYProgress, [0.08, 0.35], [0, 1]);

  return (
    <section ref={sectionRef} id="about" className="about-section" style={{ position: 'relative' }}>
      {/* Three.js water drop background */}
      <WaterDropScene />

      {/* Main content */}
      <div className="about-content">
        {/* Subheading */}
        <Motion.div
          className="about-subheading"
          style={{ opacity: opHeading }}
        >
          <ArrowRight className="about-subheading__icon" />
          <span>{copy.subheading}</span>
        </Motion.div>

        {/* Two-column layout: heading + stats */}
        <div className="about-columns">
          {/* Heading */}
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
          </Motion.div>

          {/* Stats / Progress */}
          <Motion.div
            className="about-stats"
            style={{ y: yStats, opacity: opStats }}
          >
            <ProgressCircle />
            <p className="about-stats__text">
              {copy.stats}
            </p>
          </Motion.div>
        </div>
      </div>

      {/* Marquee bar */}
      <div className="about-marquee-bar">
        <div className="about-marquee-bar__header">
          <span className="about-marquee-bar__label">{copy.partnersLabel}</span>
          <span className="about-marquee-bar__sublabel">
            {copy.partnersSublabel}
          </span>
        </div>
        <div className="about-marquee-bar__track">
          <div className="about-marquee-bar__scroll">
            {/* Duplicate list for seamless loop */}
            {[...BRANDS, ...BRANDS].map((name, i) => (
              <span key={i} className="about-marquee-bar__brand">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
