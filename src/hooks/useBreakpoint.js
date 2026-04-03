import { useState, useEffect } from 'react';

/**
 * useBreakpoint — 返回当前屏幕断点标识
 *
 * 断点定义（与 CSS media query 对齐）：
 *   'sm'  — < 768px  （手机）
 *   'md'  — 768–1023px（平板）
 *   'lg'  — ≥ 1024px  （桌面）
 *
 * 组件可根据返回值选择不同的内容排版方案。
 */
export default function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth;
    if (w < 768) return 'sm';
    if (w < 1024) return 'md';
    return 'lg';
  });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      let next;
      if (w < 768) next = 'sm';
      else if (w < 1024) next = 'md';
      else next = 'lg';
      setBp((prev) => (prev === next ? prev : next));
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return bp;
}

/**
 * resolveHeadingLines — 根据断点解析标题行数组
 *
 * headingLines 支持两种格式：
 *   1. 简单数组 ['line1', 'line2', 'line3']
 *      → 所有断点使用相同的行
 *   2. 断点对象 { lg: [...], sm: [...] }
 *      → 按断点选取，回退链：bp → lg → sm → 第一个可用
 *
 * @param {Array|Object} headingLines — i18n 中的标题行配置
 * @param {string} bp — 当前断点 ('sm' | 'md' | 'lg')
 * @returns {string[]} — 当前断点下的标题行数组
 */
export function resolveHeadingLines(headingLines, bp) {
  if (Array.isArray(headingLines)) return headingLines;
  return headingLines[bp] || headingLines.lg || headingLines.sm;
}
