import { useEffect, useRef, useCallback } from 'react';
import useSectionFreeze from '../hooks/useSectionFreeze';
import '../styles/components/isometric-blocks.css';

/* ================================================================
   IsometricBlocksBackground — Canvas 2D 等距方块网格（线稿版）
   ================================================================ */

const CFG = {
  /* 方块尺寸（CSS 像素）
   * blockPx: 方块边长（默认 200），越大方块越大、数量越少
   * gap: 间距（默认 30）
   */
  blockPx: 200,
  gap: 30,
  /* 各断点最大列/行数（减少总量提升性能） */
  maxCols: { desktop: 10, tablet: 8, mobile: 6 },
  maxRows: { desktop: 8, tablet: 7, mobile: 7 },
  /* 移动端/平板尺寸（相应放大） */
  mobileBlockPx: 120, mobileGap: 20,
  tabletBlockPx: 150, tabletGap: 24,
  /* 波动 — 双频叠加海浪感 */
  waveSpeed1: 0.4,       // 主波速度（默认0.4）
  waveAmp1: 0.12,        // 主波幅度（默认0.12）
  waveSpeed2: 0.7,       // 副波速度（默认0.7）
  waveAmp2: 0.08,        // 副波幅度（默认0.08）
  spatialFreqCol: 0.35,  // 列方向空间频率
  spatialFreqRow: 0.25,  // 行方向空间频率
  /* 高度 */
  baseHeightMin: 0.8,    // 最低基础高度
  baseHeightMax: 4.0,    // 最高基础高度
  lerpSpeed: 0.06,       // 过渡速率（0-1，默认0.06，越大跟手越快）
  risePx: 100,           // 凸起高度乘数（px）
  /* 鼠标交互
   * mouseRadius: 鼠标影响半径（CSS 像素），越大影响范围越广
   * mouseStrength: 鼠标悬停时方块额外凸起量，越大凸起越高
   */
  mouseRadius: 320,
  mouseStrength: 3.0,
  /* 颜色 */
  wireColor: 'rgba(80, 220, 140, 0.5)',
  wireGlow: 'rgba(60, 200, 120, 0.25)',
  wireWidth: 1,
};

/* ── 等距投影常量 ── */
const COS45 = Math.cos(Math.PI / 4);        // ≈ 0.7071
const SIN58 = Math.sin(58 * Math.PI / 180); // ≈ 0.8480
const COS58 = Math.cos(58 * Math.PI / 180); // ≈ 0.5299
const SQRT2 = Math.SQRT2;                   // ≈ 1.4142

function getLayoutParams() {
  const vw = window.innerWidth;
  let blockPx, gap, maxCols, maxRows;
  if (vw < 768) {
    blockPx = CFG.mobileBlockPx; gap = CFG.mobileGap;
    maxCols = CFG.maxCols.mobile; maxRows = CFG.maxRows.mobile;
  } else if (vw < 1024) {
    blockPx = CFG.tabletBlockPx; gap = CFG.tabletGap;
    maxCols = CFG.maxCols.tablet; maxRows = CFG.maxRows.tablet;
  } else {
    blockPx = CFG.blockPx; gap = CFG.gap;
    maxCols = CFG.maxCols.desktop; maxRows = CFG.maxRows.desktop;
  }
  const cellSize = blockPx + gap;
  const cols = Math.min(Math.ceil((vw * 1.2) / cellSize), maxCols);
  const rows = Math.min(Math.ceil((window.innerHeight * 1.5) / cellSize), maxRows);
  return { cols, rows, blockPx, gap };
}

export default function IsometricBlocksBackground() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animId = useRef(null);
  const freezeStart = useRef(0);
  const startTimeRef = useRef(performance.now());
  const simRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const canvasSizeRef = useRef({ w: 0, h: 0, ctx: null });

  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0 });

  const initState = useCallback((cols, rows) => {
    const total = cols * rows;
    const bases = new Float32Array(total);
    const phases = new Float32Array(total);
    const heights = new Float32Array(total);
    const old = simRef.current;
    for (let i = 0; i < total; i++) {
      if (old && i < old.total) {
        bases[i] = old.bases[i]; phases[i] = old.phases[i]; heights[i] = old.heights[i];
      } else {
        bases[i] = CFG.baseHeightMin + Math.random() * (CFG.baseHeightMax - CFG.baseHeightMin);
        phases[i] = Math.random() * Math.PI * 2;
        heights[i] = bases[i];
      }
    }
    simRef.current = { cols, rows, total, bases, phases, heights };
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    const cached = canvasSizeRef.current;
    if (cached.w !== w || cached.h !== h) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cached.w = w; cached.h = h; cached.ctx = ctx;
    }
    return { ctx: cached.ctx, w, h };
  }, []);

  const handleResize = useCallback(() => {
    const layout = getLayoutParams();
    initState(layout.cols, layout.rows);
    canvasSizeRef.current.w = 0;
    setupCanvas();
  }, [initState, setupCanvas]);

  /* ── 事件绑定 ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const layout = getLayoutParams();
    initState(layout.cols, layout.rows);
    setupCanvas();

    const section = el.parentElement;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
      mouseRef.current.active = true;
    };
    const onLeave = () => { mouseRef.current.active = false; };
    let resizeTimer = null;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(handleResize, 200); };

    if (section) { section.addEventListener('mousemove', onMove); section.addEventListener('mouseleave', onLeave); }
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(resizeTimer);
      if (section) { section.removeEventListener('mousemove', onMove); section.removeEventListener('mouseleave', onLeave); }
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId.current);
    };
  }, [initState, setupCanvas, handleResize]);

  /* ── 动画循环 ── */
  useEffect(() => {
    if (!shouldAnimate) { freezeStart.current = performance.now(); return; }
    if (freezeStart.current > 0) {
      startTimeRef.current += performance.now() - freezeStart.current;
      freezeStart.current = 0;
    }
    if (!canvasRef.current) return;
    setupCanvas();

    /*
     * 等距投影几何说明：
     *
     * 顶面菱形 4 角（相对于中心 cx,cy）：
     *   p0(左):  (-dx, 0)
     *   p1(上):  (0, -dy)
     *   p2(右):  (+dx, 0)
     *   p3(下):  (0, +dy)
     *
     * 其中 dx = √2 × halfSize,  dy = √2 × halfSize × cos58°
     *
     * 底面菱形 Y 坐标 = 对应顶面 Y + rise × sin58°（向下偏移）
     *
     * 可见的线稿边（wireframe edges）：
     *   1. 顶面菱形 4 条边
     *   2. 三条垂直柱线：p0→p0_bot, p2→p2_bot, p3→p3_bot
     *   3. 两条底面边：p0_bot→p3_bot, p3_bot→p2_bot
     */

    const tick = () => {
      animId.current = requestAnimationFrame(tick);

      const state = simRef.current;
      if (!state) return;
      const { cols, rows, total, bases, phases, heights } = state;
      const cached = canvasSizeRef.current;
      const ctx = cached.ctx;
      if (!ctx) return;
      const w = cached.w;
      const h = cached.h;

      const time = (performance.now() - startTimeRef.current) * 0.001;
      const mouse = mouseRef.current;
      const layout = getLayoutParams();
      const { blockPx, gap: blockGap } = layout;
      const cellSize = blockPx + blockGap;
      const halfSize = blockPx * 0.5;
      const mRadius = mouse.active ? (w < 768 ? 160 : CFG.mouseRadius) : 0;
      const mRadiusSq = mRadius * mRadius;

      ctx.clearRect(0, 0, w, h);

      const gridCenterX = (cols - 1) * cellSize * 0.5;
      const gridCenterY = (rows - 1) * cellSize * 0.5;
      const offsetX = w * 0.5;
      // 移动端网格上移，避免手机长页面顶部大片空白
      const isMobile = w < 768;
      const offsetY = isMobile ? h * 0.5 : h * 0.75;

      ctx.strokeStyle = CFG.wireColor;
      ctx.lineWidth = CFG.wireWidth;
      ctx.shadowColor = CFG.wireGlow;
      ctx.shadowBlur = 4;
      ctx.globalAlpha = 1;

      // 预计算菱形偏移（所有方块一样大，不再有近大远小）
      const dx = SQRT2 * halfSize;         // 菱形半宽（屏幕 X 方向）
      const dy = SQRT2 * halfSize * COS58; // 菱形半高（屏幕 Y 方向）

      // ── 从后往前绘制（画家算法，远行先画） ──
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          if (i >= total) break;

          // ── 物理模拟 ──
          const ph = phases[i];
          const wave1 = Math.sin(time * CFG.waveSpeed1 + col * CFG.spatialFreqCol + row * CFG.spatialFreqRow + ph) * CFG.waveAmp1;
          const wave2 = Math.sin(time * CFG.waveSpeed2 + col * 0.5 - row * 0.4 + ph * 1.7) * CFG.waveAmp2;
          let target = bases[i] + wave1 + wave2;

          // grid 坐标（以网格中心为原点）
          const gx = col * cellSize - gridCenterX;
          const gy = row * cellSize - gridCenterY;

          // 等距投影 XY 分量
          const rx = (gx + gy) * COS45;
          const ry = (-gx + gy) * COS45;

          // 鼠标交互
          if (mRadius > 0) {
            const riseApprox = heights[i] * CFG.risePx;
            const projX = rx + offsetX;
            const projY = ry * COS58 - riseApprox * SIN58 + offsetY;
            const mdx = mouse.x - projX;
            const mdy = mouse.y - projY;
            const distSq = mdx * mdx + mdy * mdy;
            if (distSq < mRadiusSq) {
              const influence = 1 - Math.sqrt(distSq) / mRadius;
              target = Math.max(target, bases[i] + influence * influence * CFG.mouseStrength);
            }
          }

          heights[i] += (target - heights[i]) * CFG.lerpSpeed;

          // 凸起像素
          const rise = heights[i] * CFG.risePx;
          const zShift = rise * SIN58; // rise 在屏幕 Y 方向的偏移（向上）

          // 中心屏幕坐标（顶面中心）
          const cx = rx + offsetX;
          const cy = ry * COS58 - zShift + offsetY;

          // 视口裁剪
          const extent = dx + zShift + 40;
          if (cx < -extent || cx > w + extent || cy < -extent - zShift || cy > h + extent) {
            continue;
          }

          // ── 顶面菱形 4 角 ──
          const p0x = cx - dx, p0y = cy;            // 左
          const p1x = cx,      p1y = cy - dy;       // 上
          const p2x = cx + dx, p2y = cy;            // 右
          const p3x = cx,      p3y = cy + dy;       // 下

          // ── 底面对应点（只需 Y 偏移 zShift） ──
          const p0by = p0y + zShift;                 // 左底
          const p2by = p2y + zShift;                 // 右底
          const p3by = p3y + zShift;                 // 下底

          // ── 绘制所有可见边（单一 path 批量绘制） ──
          ctx.beginPath();

          // 1. 顶面菱形：p0 → p1 → p2 → p3 → close
          ctx.moveTo(p0x, p0y);
          ctx.lineTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(p3x, p3y);
          ctx.closePath();

          if (rise > 0.5) {
            // 2. 三条垂直柱线
            ctx.moveTo(p0x, p0y);  ctx.lineTo(p0x, p0by);   // 左柱
            ctx.moveTo(p3x, p3y);  ctx.lineTo(p3x, p3by);   // 下柱（中间）
            ctx.moveTo(p2x, p2y);  ctx.lineTo(p2x, p2by);   // 右柱

            // 3. 两条底面可见边
            ctx.moveTo(p0x, p0by); ctx.lineTo(p3x, p3by);   // 左底 → 下底
            ctx.moveTo(p3x, p3by); ctx.lineTo(p2x, p2by);   // 下底 → 右底
          }

          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      const db = window.__GPU_DEBUG__;
      if (db) { db.reportFrame(); db.reportMetrics('canvas-iso', 1); }
    };

    tick();
    return () => cancelAnimationFrame(animId.current);
  }, [shouldAnimate, setupCanvas]);

  return (
    <div ref={containerRef} className="iso-bg">
      <div className="iso-bg__glow iso-bg__glow--1" />
      <div className="iso-bg__glow iso-bg__glow--2" />
      <div className="iso-bg__glow iso-bg__glow--3" />
      <canvas ref={canvasRef} className="iso-bg__canvas" />
    </div>
  );
}
