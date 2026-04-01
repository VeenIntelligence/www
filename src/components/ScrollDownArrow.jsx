import { useEffect, useState } from 'react';
import '../styles/components/scroll-down-arrow.css';

/**
 * ScrollDownArrow — 全局滚动引导箭头
 *
 * 固定在视口底部，双层 V 形箭头微动闪烁，引导用户向下滚动。
 * 当页面滚动到最后一屏（距底部 < 1 屏高度）时自动隐藏。
 */
export default function ScrollDownArrow() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;

      /* 当距离页面底部不到一屏高度时隐藏箭头 */
      const nearBottom = scrollTop + winHeight * 2 >= docHeight;
      setHidden(nearBottom);
    };

    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <div
      className={`scroll-arrow ${hidden ? 'scroll-arrow--hidden' : ''}`}
      aria-hidden="true"
    >
      {/* 双层 chevron：两个 V 形叠加，各自有不同的动画延迟 */}
      <svg
        className="scroll-arrow__chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <svg
        className="scroll-arrow__chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
