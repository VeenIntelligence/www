import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ────────────────────────────────────────────
   12 步骤数据 — 三态引擎完整执行流程
   mode: 'ff' | 'rt' | 'cu'
   ──────────────────────────────────────────── */
const STEPS = [
  {
    id: 0,
    title: { en: 'FastForward — processing instantly', zh: 'FastForward — 即时处理' },
    desc: {
      en: 'Engine is in FastForward mode. Virtual time jumps instantly between events. Heap has two scheduled triggers.',
      zh: '引擎处于 FastForward 模式，虚拟时间在事件间瞬间跳跃。堆中有两个待调度的触发器。',
    },
    mode: 'ff', now: '10:00', nowDynamic: false,
    barrier: 0, heap: ['1m@10:01', '5m@10:05'],
    handler: null, highlight: null,
    lanes: [],
  },
  {
    id: 1,
    title: { en: 'Pop 1m@10:01 from heap', zh: '从堆中弹出 1m@10:01' },
    desc: {
      en: 'TimeManager pops the earliest event from the min-heap. now() advances to 10:01.',
      zh: 'TimeManager 从最小堆弹出最早的事件，now() 推进到 10:01。',
    },
    mode: 'ff', now: '10:01', nowDynamic: false,
    barrier: 0, heap: ['5m@10:05'],
    handler: null, highlight: null,
    lanes: [{ from: 3, to: 0, label: 'pop', color: 'blue' }],
  },
  {
    id: 2,
    title: { en: 'Tick sent to Trigger A (LLM Strategy)', zh: 'Tick 发送给 Trigger A（LLM 策略）' },
    desc: {
      en: 'TimeManager fires tick(10:01) to Trigger A, which is an LLM strategy handler.',
      zh: 'TimeManager 向 Trigger A 发送 tick(10:01)，这是一个 LLM 策略处理器。',
    },
    mode: 'ff', now: '10:01', nowDynamic: false,
    barrier: 0, heap: ['5m@10:05'],
    handler: 'Strategy LLM', highlight: null,
    lanes: [{ from: 0, to: 1, label: 'tick(10:01)', color: 'blue' }],
  },
  {
    id: 3,
    title: { en: '⚡ Barrier entered — Realtime mode!', zh: '⚡ 进入 Barrier — 切换 Realtime 模式！' },
    desc: {
      en: 'Trigger A\'s LLM call enters barrier. barrier_count→1. Engine transitions to Realtime! Anchor set: virtual=10:01, real=monotonic().',
      zh: 'Trigger A 的 LLM 调用进入 barrier，barrier_count→1。引擎切换到 Realtime！锚点设置：virtual=10:01, real=monotonic()。',
    },
    mode: 'rt', now: '10:01', nowDynamic: false,
    barrier: 1, heap: ['1m@10:02', '5m@10:05'],
    handler: 'Strategy LLM (barrier)', highlight: 'transition',
    lanes: [
      { from: 1, to: 2, label: 'barrier_enter', color: 'amber' },
    ],
  },
  {
    id: 4,
    title: { en: 'Realtime: time is flowing', zh: 'Realtime：时间正在流逝' },
    desc: {
      en: 'now() is computed dynamically from the anchor + real elapsed time. The LLM is still running. Engine loop continues checking the heap!',
      zh: 'now() 根据锚点 + 真实流逝时间动态计算。LLM 仍在运行，引擎循环继续检查堆！',
    },
    mode: 'rt', now: '10:01', nowDynamic: true,
    barrier: 1, heap: ['1m@10:02', '5m@10:05'],
    handler: 'Strategy LLM (barrier)', highlight: null,
    lanes: [],
  },
  {
    id: 5,
    title: { en: '🎉 10:02 fires IN Realtime!', zh: '🎉 10:02 在 Realtime 中触发！' },
    desc: {
      en: 'The engine didn\'t stop! 1m@10:02 fires and Trigger B processes it instantly. Meanwhile, the LLM barrier is STILL running.',
      zh: '引擎没有停止！1m@10:02 触发，Trigger B 瞬间处理完成。与此同时，LLM barrier 仍在运行。',
    },
    mode: 'rt', now: '10:02', nowDynamic: true,
    barrier: 1, heap: ['1m@10:03', '5m@10:05'],
    handler: 'Strategy LLM (barrier)', highlight: 'triumph',
    lanes: [
      { from: 3, to: 0, label: 'pop', color: 'amber' },
      { from: 0, to: 1, label: 'tick(10:02)', color: 'amber', offset: 1 },
      { from: 1, to: 0, label: 'done ✓', color: 'green', offset: 2, reverse: true },
    ],
  },
  {
    id: 6,
    title: { en: '10:03 fires in Realtime', zh: '10:03 在 Realtime 中触发' },
    desc: {
      en: 'Another tick fires and completes immediately. Trigger A is still in barrier. Engine keeps running seamlessly.',
      zh: '又一个 tick 触发并立即完成。Trigger A 仍在 barrier 中。引擎保持无缝运行。',
    },
    mode: 'rt', now: '10:03', nowDynamic: true,
    barrier: 1, heap: ['5m@10:05'],
    handler: 'Strategy LLM (barrier)', highlight: null,
    lanes: [
      { from: 3, to: 0, label: 'pop', color: 'amber' },
      { from: 0, to: 1, label: 'tick(10:03)', color: 'amber', offset: 1 },
      { from: 1, to: 0, label: 'done ✓', color: 'green', offset: 2, reverse: true },
    ],
  },
  {
    id: 7,
    title: { en: 'LLM finishes! Barrier exits', zh: 'LLM 完成！退出 Barrier' },
    desc: {
      en: 'The LLM call finally returns. Trigger A exits barrier. barrier_count: 1→0. Time to transition!',
      zh: 'LLM 调用终于返回。Trigger A 退出 barrier，barrier_count: 1→0。即将切换模式！',
    },
    mode: 'rt', now: '10:04', nowDynamic: false,
    barrier: 0, heap: ['5m@10:05'],
    handler: null, highlight: 'transition',
    lanes: [
      { from: 2, to: 1, label: 'LLM done', color: 'green', reverse: true },
      { from: 1, to: 0, label: 'barrier_exit', color: 'green', offset: 1, reverse: true },
    ],
  },
  {
    id: 8,
    title: { en: '⚡ CatchUp mode — coalesce overdue ticks', zh: '⚡ CatchUp 模式 — 合并过期 tick' },
    desc: {
      en: 'barrier_count=0 → CatchUp mode! Engine checks for any overdue ticks that accumulated during Realtime.',
      zh: 'barrier_count=0 → CatchUp 模式！引擎检查 Realtime 期间堆积的过期 tick。',
    },
    mode: 'cu', now: '10:04', nowDynamic: false,
    barrier: 0, heap: ['5m@10:05'],
    handler: null, highlight: 'transition',
    lanes: [],
  },
  {
    id: 9,
    title: { en: 'Coalesce: group and keep latest', zh: 'Coalesce：分组合并，保留最新' },
    desc: {
      en: 'CatchUp coalesces any overdue ticks per trigger — keeps latest, discards stale. Then executes the coalesced ticks instantly.',
      zh: 'CatchUp 按触发器合并过期 tick —— 保留最新，丢弃过时的。然后即时执行合并后的 tick。',
    },
    mode: 'cu', now: '10:04', nowDynamic: false,
    barrier: 0, heap: ['5m@10:05'],
    handler: null, highlight: null,
    lanes: [
      { from: 0, to: 1, label: 'coalesced tick', color: 'emerald' },
      { from: 1, to: 0, label: 'done ✓', color: 'green', offset: 1, reverse: true },
    ],
  },
  {
    id: 10,
    title: { en: 'Back to FastForward', zh: '回到 FastForward' },
    desc: {
      en: 'CatchUp complete, no more overdue ticks. Engine returns to FastForward. Virtual time resumes instant jumps.',
      zh: 'CatchUp 完成，没有更多过期 tick。引擎回到 FastForward，虚拟时间恢复即时跳跃。',
    },
    mode: 'ff', now: '10:05', nowDynamic: false,
    barrier: 0, heap: ['5m@10:10'],
    handler: null, highlight: 'transition',
    lanes: [],
  },
  {
    id: 11,
    title: { en: 'Summary: Zero missed ticks', zh: '总结：零丢失 tick' },
    desc: {
      en: '3 minutes of LLM time. Engine never stopped. 0 missed ticks — 10:02 and 10:03 fired in Realtime. Clean cycle: FF → RT → CU → FF.',
      zh: '3 分钟 LLM 耗时，引擎从未停止，0 丢失 tick —— 10:02 和 10:03 在 Realtime 中触发。完整循环：FF → RT → CU → FF。',
    },
    mode: 'ff', now: '—', nowDynamic: false,
    barrier: 0, heap: [],
    handler: null, highlight: 'summary',
    lanes: [],
    stats: {
      en: ['3 min LLM time', 'Engine never stopped', '0 missed ticks', 'FF → RT → CU → FF'],
      zh: ['3 分钟 LLM 耗时', '引擎从未停止', '0 丢失 tick', 'FF → RT → CU → FF'],
    },
  },
];

const MODE_META = {
  ff: { label: 'FastForward', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.5)' },
  rt: { label: 'Realtime', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)' },
  cu: { label: 'CatchUp', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.5)' },
};

const LANE_NAMES = [
  { en: 'TimeManager', zh: 'TimeManager' },
  { en: 'Trigger', zh: '触发器' },
  { en: 'Backend', zh: '后端' },
  { en: 'Heap', zh: '堆' },
];

/* 时间线阶段分段（用于 phase bar） */
const PHASES = [
  { mode: 'ff', start: 0, end: 1, t0: '10:00', t1: '10:01' },
  { mode: 'rt', start: 1, end: 4, t0: '10:01', t1: '10:04' },
  { mode: 'cu', start: 4, end: 5, t0: '10:04', t1: '10:05' },
  { mode: 'ff', start: 5, end: 6, t0: '10:05', t1: '10:06' },
];
const TOTAL_SPAN = 6; // 10:00 → 10:06

/* ── 动态时钟 hook ── */
function useDynamicClock(step) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!step.nowDynamic) { setElapsed(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [step.nowDynamic, step.id]);

  if (!step.nowDynamic) return step.now;
  const base = parseInt(step.now.split(':')[1], 10);
  const sec = Math.floor(elapsed / 1000) % 60;
  const extra = Math.floor(elapsed / 60000);
  const m = String(base + extra).padStart(2, '0');
  const s = String(sec).padStart(2, '0');
  return `10:${m}:${s}`;
}

/* ── Phase Bar ── */
function PhaseBar({ step }) {
  const progress = useMemo(() => {
    const id = step.id;
    if (id <= 1) return 0.5 / TOTAL_SPAN;
    if (id <= 2) return 1.0 / TOTAL_SPAN;
    if (id <= 4) return 1.5 / TOTAL_SPAN;
    if (id === 5) return 2.0 / TOTAL_SPAN;
    if (id === 6) return 3.0 / TOTAL_SPAN;
    if (id === 7) return 4.0 / TOTAL_SPAN;
    if (id <= 9) return 4.5 / TOTAL_SPAN;
    if (id === 10) return 5.0 / TOTAL_SPAN;
    return 5.5 / TOTAL_SPAN;
  }, [step.id]);

  return (
    <div className="mb-4">
      {/* 阶段条 */}
      <div className="relative h-7 rounded-full overflow-hidden flex" style={{ background: '#1a1f2e' }}>
        {PHASES.map((p, i) => {
          const w = ((p.end - p.start) / TOTAL_SPAN) * 100;
          const meta = MODE_META[p.mode];
          const active = step.id >= 0; // always show
          return (
            <div
              key={i}
              className="h-full flex items-center justify-center text-xs font-bold tracking-wide relative overflow-hidden"
              style={{
                width: `${w}%`,
                background: active ? meta.bg : '#111827',
                color: meta.color,
                borderRight: i < PHASES.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              {w > 10 && meta.label}
            </div>
          );
        })}
        {/* 当前位置指示器 */}
        <motion.div
          className="absolute top-0 h-full w-0.5"
          style={{ background: MODE_META[step.mode].color, boxShadow: `0 0 8px ${MODE_META[step.mode].color}` }}
          animate={{ left: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
      {/* 时间标签 */}
      <div className="flex justify-between mt-1 px-1">
        {['10:00', '10:01', '10:02', '10:03', '10:04', '10:05', '10:06'].map((t, i) => (
          <span key={t} className="text-[10px] text-gray-500" style={{ width: 0, textAlign: 'center' }}>
            {i % 2 === 0 || i === 1 || i === 4 ? t : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 序列图箭头 ── */
const ARROW_COLORS = {
  blue: '#3b82f6', amber: '#f59e0b', green: '#22c55e', emerald: '#10b981',
};

function SequenceDiagram({ step, lang }) {
  const laneWidth = 25; // percentage per lane
  const laneCenter = (i) => `${i * laneWidth + laneWidth / 2}%`;

  return (
    <div className="relative rounded-lg border overflow-hidden" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.08)', minHeight: 220 }}>
      {/* 泳道头部 */}
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {LANE_NAMES.map((name, i) => (
          <div
            key={i}
            className="flex-1 text-center py-2 text-xs font-semibold"
            style={{ color: i === 0 ? '#3b82f6' : i === 3 ? '#a78bfa' : '#94a3b8' }}
          >
            {name[lang] || name.en}
          </div>
        ))}
      </div>

      {/* 泳道竖线 */}
      <div className="relative" style={{ minHeight: 180 }}>
        {LANE_NAMES.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: laneCenter(i), background: 'rgba(255,255,255,0.06)' }}
          />
        ))}

        {/* Barrier 指示（Realtime 期间 Trigger 泳道上的长条） */}
        {step.barrier > 0 && (
          <motion.div
            className="absolute rounded"
            style={{
              left: `calc(${laneCenter(1)} - 28px)`,
              top: 8, bottom: 8, width: 56,
              background: 'rgba(245,158,11,0.12)',
              border: '1px dashed rgba(245,158,11,0.4)',
            }}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-[10px] text-amber-400 text-center mt-2 font-mono">
              {lang === 'zh' ? 'LLM 运行中' : 'LLM running'}
            </div>
            <motion.div
              className="mx-auto mt-1 rounded-full"
              style={{ width: 6, height: 6, background: '#f59e0b' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          </motion.div>
        )}

        {/* 箭头 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            className="relative px-2 py-3"
            style={{ minHeight: 160 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {step.lanes.map((lane, idx) => {
              const row = (lane.offset || 0);
              const y = 16 + row * 42;
              const fromX = lane.from * laneWidth + laneWidth / 2;
              const toX = lane.to * laneWidth + laneWidth / 2;
              const minX = Math.min(fromX, toX);
              const maxX = Math.max(fromX, toX);
              const color = ARROW_COLORS[lane.color] || '#94a3b8';
              const isReverse = lane.reverse;

              return (
                <motion.div
                  key={`${step.id}-${idx}`}
                  className="absolute flex items-center"
                  style={{ top: y, left: `${minX}%`, width: `${maxX - minX}%`, height: 28 }}
                  initial={{ opacity: 0, x: isReverse ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15, duration: 0.35 }}
                >
                  {/* 箭头线 */}
                  <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: color }} />
                  {/* 箭头方向 */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{
                      [isReverse ? 'left' : 'right']: -2,
                      width: 0, height: 0,
                      borderTop: '4px solid transparent',
                      borderBottom: '4px solid transparent',
                      [isReverse ? 'borderRight' : 'borderLeft']: `6px solid ${color}`,
                    }}
                  />
                  {/* 标签 */}
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-mono whitespace-nowrap px-1 rounded"
                    style={{ color, background: 'rgba(13,17,23,0.9)' }}
                  >
                    {lane.label}
                  </div>
                </motion.div>
              );
            })}

            {/* 无箭头时的描述文字 */}
            {step.lanes.length === 0 && step.highlight !== 'summary' && (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                {step.mode === 'ff' && (step.id === 0 ? (lang === 'zh' ? '引擎就绪，等待事件…' : 'Engine ready, waiting...') : (lang === 'zh' ? '即时跳跃处理中…' : 'Instant jumps...'))}
                {step.mode === 'rt' && (lang === 'zh' ? '时间正在流逝，引擎持续运行…' : 'Time flowing, engine running...')}
                {step.mode === 'cu' && (lang === 'zh' ? '检查过期 tick…' : 'Checking overdue ticks...')}
              </div>
            )}

            {/* 总结统计 */}
            {step.stats && (
              <div className="flex items-center justify-center h-32">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {step.stats[lang]?.map((s, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-2 text-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.2 }}
                    >
                      <span className="text-emerald-400">✓</span>
                      <span className="text-gray-200">{s}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── 状态面板 ── */
function StatePanel({ step, dynamicNow, lang }) {
  const meta = MODE_META[step.mode];
  return (
    <div
      className="mt-3 rounded-lg px-4 py-3 font-mono text-xs grid grid-cols-2 gap-x-4 gap-y-1"
      style={{ background: '#0d1117', border: `1px solid ${meta.border}` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Mode:</span>
        <motion.span
          key={step.mode}
          className="font-bold px-1.5 py-0.5 rounded"
          style={{ color: meta.color, background: meta.bg }}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
        >
          {meta.label}
        </motion.span>
      </div>
      <div>
        <span className="text-gray-500">now(): </span>
        <motion.span
          key={dynamicNow}
          className="text-white"
          initial={step.nowDynamic ? { opacity: 0.5 } : {}}
          animate={{ opacity: 1 }}
        >
          {dynamicNow}
        </motion.span>
        {step.nowDynamic && (
          <motion.span
            className="ml-1 inline-block w-1.5 h-3 rounded-sm"
            style={{ background: meta.color }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        )}
      </div>
      <div>
        <span className="text-gray-500">barrier: </span>
        <span style={{ color: step.barrier > 0 ? '#f59e0b' : '#22c55e' }}>{step.barrier}</span>
      </div>
      <div className="truncate">
        <span className="text-gray-500">Heap: </span>
        <span className="text-purple-400">[{step.heap.join(', ')}]</span>
      </div>
      {step.handler && (
        <div className="col-span-2 truncate">
          <span className="text-gray-500">{lang === 'zh' ? '活跃处理器' : 'Active'}: </span>
          <span className="text-amber-300">{step.handler}</span>
        </div>
      )}
    </div>
  );
}

/* ── 主组件 ── */
export default function AnimHybridExecution({ lang = 'zh' }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = STEPS[stepIdx];
  const dynamicNow = useDynamicClock(step);

  const next = useCallback(() => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)), []);
  const prev = useCallback(() => setStepIdx((i) => Math.max(i - 1, 0)), []);

  /* 自动播放 2.5 秒/步 */
  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= STEPS.length - 1) { setPlaying(false); return; }
    const id = setTimeout(next, 2500);
    return () => clearTimeout(id);
  }, [playing, stepIdx, next]);

  /* 键盘控制 */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const meta = MODE_META[step.mode];
  const isTriumph = step.highlight === 'triumph';
  const isTransition = step.highlight === 'transition';

  return (
    <div
      className="relative rounded-xl border overflow-hidden p-4 sm:p-6 my-8 select-none"
      style={{
        background: '#0f1219',
        borderColor: isTransition || isTriumph ? meta.color : 'rgba(255,255,255,0.08)',
        boxShadow: isTransition ? `0 0 30px ${meta.color}33` : isTriumph ? '0 0 40px rgba(34,197,94,0.2)' : 'none',
        transition: 'border-color 0.5s, box-shadow 0.5s',
      }}
    >
      {/* 过渡闪光 */}
      <AnimatePresence>
        {(isTransition || isTriumph) && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center, ${meta.color}15, transparent 70%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚡</span>
        <h3 className="text-sm sm:text-base font-bold text-white">
          {lang === 'zh' ? '完整执行流程：三态引擎实战演示' : 'Complete Execution Flow: Three-State Engine in Action'}
        </h3>
      </div>

      {/* Phase Bar */}
      <PhaseBar step={step} />

      {/* 步骤标题 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          className="mb-3 px-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <div className="font-bold text-sm" style={{ color: meta.color }}>
            {step.title[lang] || step.title.en}
          </div>
          <div className="text-xs text-gray-400 mt-1 leading-relaxed">
            {step.desc[lang] || step.desc.en}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 序列图 */}
      <SequenceDiagram step={step} lang={lang} />

      {/* 状态面板 */}
      <StatePanel step={step} dynamicNow={dynamicNow} lang={lang} />

      {/* 控制栏 */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono tabular-nums">
          {lang === 'zh' ? `步骤 ${stepIdx + 1}/${STEPS.length}` : `Step ${stepIdx + 1}/${STEPS.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={stepIdx === 0}
            className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          >
            ◀ {lang === 'zh' ? '上一步' : 'Prev'}
          </button>
          <button
            onClick={() => {
              if (stepIdx >= STEPS.length - 1) setStepIdx(0);
              setPlaying((p) => !p);
            }}
            className="px-3 py-1 rounded text-xs font-bold transition-colors"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          >
            {playing ? '⏸' : '▶'} {playing ? (lang === 'zh' ? '暂停' : 'Pause') : (lang === 'zh' ? '播放' : 'Play')}
          </button>
          <button
            onClick={next}
            disabled={stepIdx >= STEPS.length - 1}
            className="px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          >
            {lang === 'zh' ? '下一步' : 'Next'} ▶
          </button>
        </div>
      </div>
    </div>
  );
}
