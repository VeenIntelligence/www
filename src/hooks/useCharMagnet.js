import { useEffect, useRef } from 'react';

/* ─────────── 逐字符磁吸交互 Hook ───────────
 *
 * 用途：让容器内带有 .magnet-char 类名的字符元素根据鼠标距离产生
 *       波浪式位移、缩放和旋转。
 *
 * 参数：
 *   containerRef — 包含 .magnet-char 元素的容器 React ref
 *   options      — 可选调节参数（见下方 DEFAULT_OPTIONS）
 *
 * 返回：
 *   mouseRef — mutable ref，消费方在 pointerMove/pointerLeave 中更新
 *              { x: clientX, y: clientY, active: boolean }
 *
 * 示例用法：
 *   const containerRef = useRef(null);
 *   const mouseRef = useCharMagnet(containerRef, { radius: 200 });
 *
 *   const onPointerMove = (e) => {
 *     mouseRef.current.x = e.clientX;
 *     mouseRef.current.y = e.clientY;
 *     mouseRef.current.active = true;
 *   };
 *
 * 性能说明：
 *   使用单个 RAF 循环 + 直接 DOM 操作，不触发 React 渲染。
 *   弹簧插值 + 死区优化，空闲时跳过 DOM 写入。
 * ─────────────────────────────────────────── */

const DEFAULT_OPTIONS = {
  /* 选择器；默认标准值：'.magnet-char'。用于在容器内查找目标字符元素。 */
  selector: '.magnet-char',
  /* 影响半径（px）；默认标准值：220。越大则影响范围越广。 */
  radius: 220,
  /* Y 位移最大值（px）；默认标准值：-14。负值向上推，正值向下推。 */
  maxY: -14,
  /* 缩放增益；默认标准值：0.18。数值越大字符放大越多。 */
  maxScale: 0.18,
  /* 旋转角度（deg）；默认标准值：4。越大旋转越明显。 */
  maxRotate: 4,
  /* 弹簧阻尼（0-1）；默认标准值：0.12。越小回弹越慢越柔和。 */
  damping: 0.12,
};

export default function useCharMagnet(containerRef, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  /* 存储 opts 到 ref 以避免 effect 依赖频繁变化 */
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const charEls = container.querySelectorAll(optsRef.current.selector);
    if (!charEls.length) return;

    /* 每个字符的弹簧状态 */
    const springs = Array.from({ length: charEls.length }, () => ({
      y: 0, scale: 0, rotate: 0,
      targetY: 0, targetScale: 0, targetRotate: 0,
    }));

    let animId = 0;

    const tick = () => {
      const o = optsRef.current;
      const mouse = mouseRef.current;
      const radiusSq = o.radius * o.radius;

      for (let i = 0; i < charEls.length; i++) {
        const el = charEls[i];
        const s = springs[i];

        if (mouse.active) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = mouse.x - cx;
          const dy = mouse.y - cy;
          const distSq = dx * dx + dy * dy;

          if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / o.radius;
            const ease = t * t; /* 二次衰减，中心强边缘柔和 */
            const sign = dx > 0 ? 1 : -1;

            s.targetY = o.maxY * ease;
            s.targetScale = o.maxScale * ease;
            s.targetRotate = o.maxRotate * ease * sign;
          } else {
            s.targetY = 0;
            s.targetScale = 0;
            s.targetRotate = 0;
          }
        } else {
          s.targetY = 0;
          s.targetScale = 0;
          s.targetRotate = 0;
        }

        /* 弹簧插值 */
        s.y += (s.targetY - s.y) * o.damping;
        s.scale += (s.targetScale - s.scale) * o.damping;
        s.rotate += (s.targetRotate - s.rotate) * o.damping;

        /* 死区优化 */
        if (Math.abs(s.y) < 0.01 && Math.abs(s.scale) < 0.001 && Math.abs(s.rotate) < 0.01
            && s.targetY === 0 && s.targetScale === 0 && s.targetRotate === 0) {
          if (el.style.transform !== '') {
            el.style.transform = '';
          }
          s.y = 0;
          s.scale = 0;
          s.rotate = 0;
        } else {
          el.style.transform =
            `translateY(${s.y.toFixed(2)}px) scale(${(1 + s.scale).toFixed(4)}) rotate(${s.rotate.toFixed(2)}deg)`;
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      charEls.forEach((el) => { el.style.transform = ''; });
    };
  /* containerRef.current 变化时（如语言切换导致重新渲染）需要重新初始化 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  return mouseRef;
}
