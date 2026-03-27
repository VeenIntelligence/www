/**
 * useSectionFreeze — 通用重型 section 冻结 hook
 *
 * 用途：判断某个 DOM 容器是否处于"活跃"状态（可见 + 页面前台）。
 * 重型组件（WebGL、视频、高成本动画）根据返回值决定是否跑 RAF。
 *
 * 用法：
 *   const containerRef = useRef(null);
 *   const { shouldAnimate } = useSectionFreeze(containerRef, {
 *     // 可见比例阈值。默认 0.15。容器可见面积占比 >= 此值时判为 active。
 *     // 越大 = 越严格（需要更多可见面积才激活）。
 *     activeThreshold: 0.15,
 *     // IntersectionObserver 阈值列表。默认 [0, 0.15, 0.35, 0.6]。
 *     // 控制回调触发频率。
 *     thresholds: [0, 0.15, 0.35, 0.6],
 *   });
 *
 * 返回值:
 *   shouldAnimate — 当前是否允许跑渲染循环。true = active, false = frozen。
 *
 * 冻结策略（不做卸载、不做 dispose）：
 *   - 离开视口 → shouldAnimate = false → 组件应停止 RAF
 *   - tab 切走 → shouldAnimate = false
 *   - 回到视口 / tab 切回 → shouldAnimate = true → 无缝恢复
 *
 * 回调：
 *   onFreeze — 从 active 变为 frozen 时调用（可用于暂停视频等）
 *   onThaw   — 从 frozen 变为 active 时调用（可用于恢复视频播放等）
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ── 默认配置 ──

// IntersectionObserver 回调触发的可见比例点。默认 [0, 0.15, 0.35, 0.6]。
const DEFAULT_THRESHOLDS = [0, 0.15, 0.35, 0.6];

// 容器可见面积占比 >= 此值时判为 active。默认 0.15。
const DEFAULT_ACTIVE_THRESHOLD = 0.15;

/**
 * @param {React.RefObject} containerRef — 需要监测可见性的 DOM 容器 ref
 * @param {Object} options
 * @param {number} [options.activeThreshold=0.15] — 可见比例阈值
 * @param {number[]} [options.thresholds=[0,0.15,0.35,0.6]] — IO 阈值列表
 * @param {Function} [options.onFreeze] — 冻结回调
 * @param {Function} [options.onThaw] — 解冻回调
 * @returns {{ shouldAnimate: boolean }}
 */
export default function useSectionFreeze(containerRef, options = {}) {
  const {
    activeThreshold = DEFAULT_ACTIVE_THRESHOLD,
    thresholds = DEFAULT_THRESHOLDS,
    onFreeze,
    onThaw,
  } = options;

  const [shouldAnimate, setShouldAnimate] = useState(false);

  // 用 ref 跟踪内部状态，避免在 observer 回调里依赖 useState 的闭包
  const stateRef = useRef({ sectionVisible: false, pageVisible: true });

  // 稳定引用回调，避免重建 observer
  const onFreezeRef = useRef(onFreeze);
  const onThawRef = useRef(onThaw);
  onFreezeRef.current = onFreeze;
  onThawRef.current = onThaw;

  const sync = useCallback(() => {
    const { sectionVisible, pageVisible } = stateRef.current;
    const next = sectionVisible && pageVisible;
    setShouldAnimate((prev) => {
      if (prev === next) return prev;
      if (next) onThawRef.current?.();
      else onFreezeRef.current?.();
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ── IntersectionObserver：判断 section 是否在视口内 ──
    const observer = new IntersectionObserver(
      ([entry]) => {
        stateRef.current.sectionVisible =
          entry.isIntersecting && entry.intersectionRatio >= activeThreshold;
        sync();
      },
      { threshold: thresholds },
    );
    observer.observe(el);

    // ── Page Visibility：判断 tab 是否在前台 ──
    stateRef.current.pageVisible = document.visibilityState === 'visible';
    const onVisChange = () => {
      stateRef.current.pageVisible = document.visibilityState === 'visible';
      sync();
    };
    document.addEventListener('visibilitychange', onVisChange);

    // 首次同步
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [containerRef, activeThreshold, sync, thresholds]);

  return { shouldAnimate };
}
