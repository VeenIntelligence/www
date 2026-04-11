import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── i18n ──────────────────────────────────────────────── */
const TEXT = {
  title:       { en: 'Realtime now() Formula', zh: 'Realtime 模式下的 now() 公式' },
  formula:     { en: 'The Formula', zh: '公式' },
  simulation:  { en: 'Live Simulation', zh: '实时模拟' },
  statePanel:  { en: 'State Panel', zh: '状态面板' },
  play:        { en: '▶ Play', zh: '▶ 播放' },
  pause:       { en: '⏸ Pause', zh: '⏸ 暂停' },
  prev:        { en: '◀', zh: '◀' },
  next:        { en: '▶', zh: '▶' },
  step:        { en: 'Step', zh: '步骤' },
  speed:       { en: 'Speed', zh: '速度' },
  barrierCount:{ en: 'Barrier Count', zh: '屏障计数' },
  anchorSet:   { en: 'ANCHOR SET!', zh: '锚点已设定！' },
  shared:      { en: 'SHARED! Anchor unchanged', zh: '共享！锚点不变' },
  paused:      { en: 'PAUSED', zh: '已暂停' },
  resumed:     { en: 'RESUMED', zh: '已恢复' },
  catchup:     { en: '→ CatchUp mode!', zh: '→ 进入 CatchUp 模式！' },
  naFf:        { en: 'N/A in FastForward', zh: '在 FastForward 模式下不适用' },
  ticking:     { en: '← ticking live', zh: '← 实时跳动' },
  realSec:     { en: 'real seconds', zh: '实际秒数' },
  pausedSec:   { en: 'paused', zh: '暂停' },
  effectiveSec:{ en: 'effective', zh: '有效' },
};
const t = (key, lang) => TEXT[key]?.[lang] ?? TEXT[key]?.en ?? key;

/* ─── step definitions ──────────────────────────────────── */
const STEPS = [
  {
    id: 0,
    title:   { en: 'Initial — FastForward mode', zh: '初始 — FastForward 模式' },
    desc:    { en: 'now() is static at 10:01:00. Formula not active.', zh: 'now() 静态停在 10:01:00。公式未激活。' },
    mode: 'fastforward',
    barrierCount: 0, anchorVirtual: null, anchorReal: null,
    monotonic: 1000.0, pausedDuration: 0, pauseStart: null,
    event: null,
  },
  {
    id: 1,
    title:   { en: 'Trigger A enters barrier (0→1)', zh: '触发器 A 进入屏障 (0→1)' },
    desc:    { en: 'Anchor is SET — virtual time and monotonic clock are recorded.', zh: '锚点被设定 — 记录虚拟时间和单调时钟。' },
    mode: 'realtime',
    barrierCount: 1, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1000.0, pausedDuration: 0, pauseStart: null,
    event: 'anchor-set',
  },
  {
    id: 2,
    title:   { en: '1 second passes', zh: '过了 1 秒' },
    desc:    { en: 'now() computes live: 10:01:00 + (1001 - 1000) - 0 = 10:01:01.0', zh: 'now() 实时计算: 10:01:00 + (1001 - 1000) - 0 = 10:01:01.0' },
    mode: 'realtime',
    barrierCount: 1, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1001.0, pausedDuration: 0, pauseStart: null,
    event: 'compute',
  },
  {
    id: 3,
    title:   { en: 'Trigger B enters barrier (1→2)', zh: '触发器 B 进入屏障 (1→2)' },
    desc:    { en: 'Anchor is SHARED — values do NOT change!', zh: '锚点被共享 — 值不会改变！' },
    mode: 'realtime',
    barrierCount: 2, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1002.0, pausedDuration: 0, pauseStart: null,
    event: 'shared-anchor',
  },
  {
    id: 4,
    title:   { en: '2 more seconds pass', zh: '又过了 2 秒' },
    desc:    { en: 'now() = 10:01:00 + (1003 - 1000) - 0 = 10:01:03.0', zh: 'now() = 10:01:00 + (1003 - 1000) - 0 = 10:01:03.0' },
    mode: 'realtime',
    barrierCount: 2, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1003.0, pausedDuration: 0, pauseStart: null,
    event: 'compute',
  },
  {
    id: 5,
    title:   { en: 'PAUSE called', zh: '调用 PAUSE' },
    desc:    { en: 'pause_start recorded at monotonic 1004.0. Time stops advancing.', zh: 'pause_start 记录为 1004.0。时间停止推进。' },
    mode: 'realtime',
    barrierCount: 2, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1004.0, pausedDuration: 0, pauseStart: 1004.0,
    event: 'pause',
  },
  {
    id: 6,
    title:   { en: 'RESUME called (2s later)', zh: '调用 RESUME（2 秒后）' },
    desc:    { en: 'paused_duration += (1006 - 1004) = 2.0. Paused time will be subtracted!', zh: 'paused_duration += (1006 - 1004) = 2.0。暂停时间将被扣除！' },
    mode: 'realtime',
    barrierCount: 2, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1006.0, pausedDuration: 2.0, pauseStart: null,
    event: 'resume',
  },
  {
    id: 7,
    title:   { en: '1 more second (7s real = 5s effective)', zh: '又过 1 秒（7 秒实际 = 5 秒有效）' },
    desc:    { en: 'now() = 10:01:00 + (1007 - 1000) - 2.0 = 10:01:05.0', zh: 'now() = 10:01:00 + (1007 - 1000) - 2.0 = 10:01:05.0' },
    mode: 'realtime',
    barrierCount: 2, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1007.0, pausedDuration: 2.0, pauseStart: null,
    event: 'time-math',
  },
  {
    id: 8,
    title:   { en: 'Trigger A exits (2→1)', zh: '触发器 A 退出 (2→1)' },
    desc:    { en: 'Anchor still active — barrier_count > 0.', zh: '锚点仍然有效 — barrier_count > 0。' },
    mode: 'realtime',
    barrierCount: 1, anchorVirtual: '10:01:00', anchorReal: 1000.0,
    monotonic: 1008.0, pausedDuration: 2.0, pauseStart: null,
    event: 'exit-a',
  },
  {
    id: 9,
    title:   { en: 'Trigger B exits (1→0) → CatchUp!', zh: '触发器 B 退出 (1→0) → CatchUp！' },
    desc:    { en: 'All barriers done. Transition to CatchUp mode!', zh: '所有屏障结束。切换到 CatchUp 模式！' },
    mode: 'catchup',
    barrierCount: 0, anchorVirtual: null, anchorReal: null,
    monotonic: 1009.0, pausedDuration: 2.0, pauseStart: null,
    event: 'catchup',
  },
];

/* ─── helpers ───────────────────────────────────────────── */
const formatVTime = (anchorVirtual, elapsed) => {
  if (!anchorVirtual) return '10:01:00.0';
  const parts = anchorVirtual.split(':').map(Number);
  const baseSec = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  const totalSec = baseSec + elapsed;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
};

const getNow = (step) => {
  if (step.mode !== 'realtime' || !step.anchorVirtual) return null;
  if (step.pauseStart !== null) {
    const elapsed = (step.pauseStart - step.anchorReal) - step.pausedDuration;
    return formatVTime(step.anchorVirtual, Math.max(0, elapsed));
  }
  const elapsed = (step.monotonic - step.anchorReal) - step.pausedDuration;
  return formatVTime(step.anchorVirtual, Math.max(0, elapsed));
};

const spring = { type: 'spring', stiffness: 300, damping: 25 };

/* ─── Formula Display ───────────────────────────────────── */
function FormulaPanel({ step, lang, highlight }) {
  const isActive = step.mode === 'realtime' && step.anchorVirtual;
  const isPaused = step.pauseStart !== null;
  const nowResult = getNow(step);
  const elapsed = isActive ? (step.monotonic - step.anchorReal) : 0;
  const effective = isActive ? elapsed - step.pausedDuration : 0;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0a0f16] p-4 relative overflow-hidden">
      <div className="text-xs font-semibold text-gray-400 mb-3 font-mono tracking-wider uppercase">
        {t('formula', lang)}
      </div>

      {!isActive ? (
        <motion.div
          className="text-center py-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <span className="text-gray-600 font-mono text-sm italic">
            {step.mode === 'catchup' ? t('catchup', lang) : t('naFf', lang)}
          </span>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Main formula line */}
          <div className="flex flex-wrap items-baseline gap-1 font-mono text-sm sm:text-base justify-center">
            <motion.span
              className="text-cyan-300 font-bold"
              animate={highlight === 'result' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              now()
            </motion.span>
            <span className="text-gray-500">=</span>

            <motion.span
              className="px-1.5 py-0.5 rounded"
              animate={{
                backgroundColor: highlight === 'anchor' ? 'rgba(96,165,250,0.2)' : 'transparent',
                color: '#60a5fa',
              }}
              transition={{ duration: 0.3 }}
            >
              anchor_virtual
            </motion.span>
            <span className="text-gray-500">+</span>
            <span className="text-gray-500">(</span>

            <motion.span
              className="px-1.5 py-0.5 rounded"
              animate={{
                backgroundColor: highlight === 'elapsed' ? 'rgba(52,211,153,0.2)' : 'transparent',
                color: '#34d399',
              }}
              transition={{ duration: 0.3 }}
            >
              monotonic()
            </motion.span>
            <span className="text-gray-500">-</span>
            <motion.span
              className="px-1.5 py-0.5 rounded"
              animate={{
                backgroundColor: highlight === 'anchor' ? 'rgba(96,165,250,0.2)' : 'transparent',
                color: '#60a5fa',
              }}
              transition={{ duration: 0.3 }}
            >
              anchor_real
            </motion.span>
            <span className="text-gray-500">)</span>
            <span className="text-gray-500">-</span>

            <motion.span
              className="px-1.5 py-0.5 rounded"
              animate={{
                backgroundColor: highlight === 'paused' ? 'rgba(248,113,113,0.2)' : 'transparent',
                color: '#f87171',
              }}
              transition={{ duration: 0.3 }}
            >
              paused
            </motion.span>
          </div>

          {/* Value substitution line */}
          <div className="flex flex-wrap items-baseline gap-1 font-mono text-xs sm:text-sm justify-center">
            <span className="text-gray-600">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=</span>
            <span className="text-blue-400">{step.anchorVirtual}</span>
            <span className="text-gray-600">+</span>
            <span className="text-gray-600">(</span>
            <span className="text-emerald-400">{step.monotonic.toFixed(1)}</span>
            <span className="text-gray-600">-</span>
            <span className="text-blue-400">{step.anchorReal.toFixed(1)}</span>
            <span className="text-gray-600">)</span>
            <span className="text-gray-600">-</span>
            <span className="text-red-400">{step.pausedDuration.toFixed(1)}</span>
          </div>

          {/* Computation result */}
          <div className="flex flex-wrap items-baseline gap-1 font-mono text-xs sm:text-sm justify-center">
            <span className="text-gray-600">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=</span>
            <span className="text-blue-400">{step.anchorVirtual}</span>
            <span className="text-gray-600">+</span>
            <motion.span
              className="text-emerald-400 font-bold"
              animate={highlight === 'elapsed' ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              {elapsed.toFixed(1)}
            </motion.span>
            <span className="text-gray-600">-</span>
            <motion.span
              className="text-red-400 font-bold"
              animate={highlight === 'paused' ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              {step.pausedDuration.toFixed(1)}
            </motion.span>
            <span className="text-gray-600">=</span>
            <motion.span
              className="text-cyan-300 font-bold text-base sm:text-lg"
              animate={highlight === 'result' ? {
                textShadow: ['0 0 8px #22d3ee88', '0 0 20px #22d3eecc', '0 0 8px #22d3ee88'],
              } : { textShadow: '0 0 0px transparent' }}
              transition={highlight === 'result' ? { duration: 1, repeat: Infinity } : { duration: 0.3 }}
            >
              {nowResult}
            </motion.span>
          </div>

          {/* Time math callout for step 7 */}
          <AnimatePresence>
            {step.event === 'time-math' && (
              <motion.div
                className="text-center mt-2 text-xs font-mono"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              >
                <span className="text-emerald-400">{elapsed.toFixed(0)} {t('realSec', lang)}</span>
                <span className="text-gray-600"> − </span>
                <span className="text-red-400">{step.pausedDuration.toFixed(0)} {t('pausedSec', lang)}</span>
                <span className="text-gray-600"> = </span>
                <span className="text-cyan-300 font-bold">{effective.toFixed(0)} {t('effectiveSec', lang)}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-red-950/40 backdrop-blur-[1px] rounded-xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.span
              className="text-red-400 font-mono font-bold text-lg tracking-widest"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              ⏸ {t('paused', lang)}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Timeline ──────────────────────────────────────────── */
function Timeline({ current, lang }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const active = el.querySelector(`[data-step="${current}"]`);
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [current]);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0a0f16] p-4">
      <div className="text-xs font-semibold text-gray-400 mb-3 font-mono tracking-wider uppercase">
        {t('simulation', lang)}
      </div>
      <div ref={containerRef} className="space-y-0 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
        {STEPS.map((s, i) => {
          const isActive = i === current;
          const isPast = i < current;
          return (
            <div key={s.id} data-step={i} className="flex gap-3 min-h-[2.5rem]">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center w-4 shrink-0">
                <motion.div
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                  animate={{
                    backgroundColor: isActive ? '#22d3ee' : isPast ? '#1e3a5f' : '#1f2937',
                    boxShadow: isActive ? '0 0 10px #22d3ee88' : '0 0 0 transparent',
                    scale: isActive ? 1.3 : 1,
                  }}
                  transition={spring}
                />
                {i < STEPS.length - 1 && (
                  <div className={`w-px flex-1 ${isPast ? 'bg-cyan-900/40' : 'bg-gray-800'}`} />
                )}
              </div>
              {/* Content */}
              <motion.div
                className="pb-2 flex-1 min-w-0"
                animate={{ opacity: isActive ? 1 : isPast ? 0.5 : 0.3 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`text-xs font-mono leading-snug ${isActive ? 'text-cyan-200' : 'text-gray-500'}`}>
                  <span className="text-gray-600 mr-1">{s.id}s</span>
                  {s.title[lang]}
                </div>
                {isActive && (
                  <motion.div
                    className="text-[11px] text-gray-500 mt-0.5 leading-relaxed"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  >
                    {s.desc[lang]}
                  </motion.div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── State Panel ───────────────────────────────────────── */
function StatePanel({ step, lang, monotonicTick }) {
  const isActive = step.mode === 'realtime' && step.anchorVirtual;
  const displayMono = isActive ? monotonicTick : step.monotonic;
  const nowResult = isActive
    ? (() => {
        if (step.pauseStart !== null) {
          const e = (step.pauseStart - step.anchorReal) - step.pausedDuration;
          return formatVTime(step.anchorVirtual, Math.max(0, e));
        }
        const e = (monotonicTick - step.anchorReal) - step.pausedDuration;
        return formatVTime(step.anchorVirtual, Math.max(0, e));
      })()
    : '—';

  const rows = [
    { label: 'anchor_virtual', value: step.anchorVirtual ?? '—', color: '#60a5fa' },
    { label: 'anchor_real', value: step.anchorReal !== null ? step.anchorReal.toFixed(3) : '—', color: '#60a5fa' },
    { label: 'monotonic()', value: displayMono.toFixed(3), color: '#34d399', ticking: isActive && step.pauseStart === null },
    { label: 'paused_duration', value: step.pausedDuration.toFixed(3), color: '#f87171' },
    { label: 'barrier_count', value: String(step.barrierCount), color: '#a78bfa' },
    { label: 'now()', value: nowResult, color: '#22d3ee', bold: true },
  ];

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0a0f16] p-4">
      <div className="text-xs font-semibold text-gray-400 mb-3 font-mono tracking-wider uppercase">
        {t('statePanel', lang)}
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between font-mono text-xs">
            <span className="text-gray-500">{r.label}:</span>
            <span className="flex items-center gap-1.5">
              <motion.span
                className={r.bold ? 'font-bold text-sm' : ''}
                style={{ color: r.color }}
                animate={r.ticking ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
                transition={r.ticking ? { duration: 0.8, repeat: Infinity } : {}}
              >
                {r.value}
              </motion.span>
              {r.ticking && (
                <span className="text-[10px] text-gray-600">{t('ticking', lang)}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Event Badge ───────────────────────────────────────── */
function EventBadge({ event, lang }) {
  const badges = {
    'anchor-set':    { text: t('anchorSet', lang), color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    'shared-anchor': { text: t('shared', lang), color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    'pause':         { text: '⏸ ' + t('paused', lang), color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
    'resume':        { text: '▶ ' + t('resumed', lang), color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    'catchup':       { text: t('catchup', lang), color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  };
  const b = badges[event];
  if (!b) return null;

  return (
    <motion.div
      className="flex justify-center"
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={spring}
    >
      <motion.span
        className="px-3 py-1 rounded-full font-mono text-xs font-bold tracking-wide"
        style={{ color: b.color, backgroundColor: b.bg, border: `1px solid ${b.color}33` }}
        animate={event === 'anchor-set'
          ? { boxShadow: ['0 0 8px rgba(96,165,250,0.3)', '0 0 24px rgba(96,165,250,0.6)', '0 0 8px rgba(96,165,250,0.3)'] }
          : {}}
        transition={event === 'anchor-set' ? { duration: 1.2, repeat: 2 } : {}}
      >
        {b.text}
      </motion.span>
    </motion.div>
  );
}

/* ─── Controls ──────────────────────────────────────────── */
function Controls({ current, playing, onPrev, onNext, onToggle, speed, onSpeed, lang }) {
  const total = STEPS.length;
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 pt-3">
      <span className="text-xs text-gray-500 font-mono">
        {t('step', lang)} {current + 1}/{total}
      </span>

      {/* Progress */}
      <div className="flex-1 mx-3 h-1 rounded-full bg-gray-800 overflow-hidden max-md:order-last max-md:w-full max-md:mx-0">
        <motion.div
          className="h-full rounded-full bg-cyan-500/60"
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          transition={spring}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={onPrev} disabled={current === 0}
          className="px-2 py-1 rounded text-xs font-mono text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
          {t('prev', lang)}
        </button>
        <button onClick={onToggle}
          className="px-3 py-1 rounded bg-cyan-600/20 text-cyan-300 text-xs font-mono hover:bg-cyan-600/30 transition-colors">
          {playing ? t('pause', lang) : t('play', lang)}
        </button>
        <button onClick={onNext} disabled={current === total - 1}
          className="px-2 py-1 rounded text-xs font-mono text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
          {t('next', lang)}
        </button>

        {/* Speed selector */}
        <div className="flex items-center gap-1 ml-2 border-l border-gray-800 pl-2">
          <span className="text-[10px] text-gray-600">{t('speed', lang)}</span>
          {[1, 2, 5].map((s) => (
            <button key={s} onClick={() => onSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                speed === s ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-600 hover:text-gray-400'
              }`}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function AnimRealtimeNow({ lang = 'zh' }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [monotonicTick, setMonotonicTick] = useState(1000.0);

  const step = STEPS[current];

  // Determine which part of formula to highlight
  const highlight = (() => {
    if (step.mode !== 'realtime') return null;
    if (step.event === 'anchor-set' || step.event === 'shared-anchor') return 'anchor';
    if (step.event === 'pause' || step.event === 'resume') return 'paused';
    if (step.event === 'time-math') return 'result';
    if (step.event === 'compute') return 'elapsed';
    return null;
  })();

  // Auto-play: advance steps
  useEffect(() => {
    if (!playing) return;
    const ms = 2500 / speed;
    const id = setInterval(() => {
      setCurrent((p) => {
        if (p >= STEPS.length - 1) { setPlaying(false); return p; }
        return p + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [playing, speed]);

  // Monotonic tick simulation for state panel
  useEffect(() => {
    setMonotonicTick(step.monotonic);
    if (step.mode !== 'realtime' || !step.anchorVirtual || step.pauseStart !== null) return;
    let animId;
    const start = performance.now();
    const baseMono = step.monotonic;
    const tick = () => {
      const dt = (performance.now() - start) / 1000;
      setMonotonicTick(baseMono + dt * 0.3);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [current, step.mode, step.anchorVirtual, step.pauseStart, step.monotonic]);

  const handlePrev = useCallback(() => {
    setPlaying(false);
    setCurrent((p) => Math.max(0, p - 1));
  }, []);
  const handleNext = useCallback(() => {
    setPlaying(false);
    setCurrent((p) => Math.min(STEPS.length - 1, p + 1));
  }, []);
  const handleToggle = useCallback(() => setPlaying((p) => !p), []);
  const handleSpeed = useCallback((s) => setSpeed(s), []);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-[#0d1117] p-4 sm:p-5 space-y-4 not-prose">
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="text-base">🔬</span>
        <h3 className="text-sm sm:text-base font-semibold text-gray-200">
          {t('title', lang)}
        </h3>
      </div>

      {/* Event badge */}
      <AnimatePresence mode="wait">
        {step.event && <EventBadge key={step.event + current} event={step.event} lang={lang} />}
      </AnimatePresence>

      {/* Formula */}
      <FormulaPanel step={step} lang={lang} highlight={highlight} />

      {/* Timeline + State in 2-col on large, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Timeline current={current} lang={lang} />
        <StatePanel step={step} lang={lang} monotonicTick={monotonicTick} />
      </div>

      {/* Controls */}
      <Controls
        current={current} playing={playing}
        onPrev={handlePrev} onNext={handleNext} onToggle={handleToggle}
        speed={speed} onSpeed={handleSpeed} lang={lang}
      />
    </div>
  );
}
