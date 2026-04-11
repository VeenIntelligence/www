import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── i18n ─── */
const TEXT = {
  title:       { en: 'CatchUp: Coalesce-to-Latest Algorithm', zh: 'CatchUp 阶段：Coalesce-to-Latest 算法' },
  step:        { en: 'Step', zh: '步骤' },
  prev:        { en: '◀ Prev', zh: '◀ 上一步' },
  next:        { en: 'Next ▶', zh: '下一步 ▶' },
  play:        { en: '▶ Play', zh: '▶ 播放' },
  pause:       { en: '⏸ Pause', zh: '⏸ 暂停' },
  reset:       { en: 'Reset', zh: '重置' },
  nowLabel:    { en: 'Current time', zh: '当前时间' },
  allOverdue:  { en: 'all overdue!', zh: '全部超时！' },
  heapEmpty:   { en: 'Heap empty', zh: '堆已清空' },
  staging:     { en: 'Popped items', zh: '弹出的条目' },
  groupTitle:  { en: 'Groups', zh: '分组' },
  discard:     { en: 'discard', zh: '丢弃' },
  keep:        { en: 'KEEP', zh: '保留' },
  onlyOne:     { en: 'only one, keep', zh: '仅一个，保留' },
  replayLabel: { en: 'Replay All (Naive)', zh: '全量回放（朴素方式）' },
  coalesceLabel: { en: 'Coalesce (Smart)', zh: 'Coalesce（聪明方式）' },
  dishonest:   { en: 'all see 10:04 data → semantically dishonest', zh: '全部看到 10:04 数据 → 语义不诚实' },
  honest:      { en: 'only latest, honest ✓', zh: '只取最新，诚实 ✓' },
  gridSnap:    { en: 'Grid-snapped (clean)', zh: '网格对齐（整洁）' },
  driftWarn:   { en: 'Based on now() → drifts!', zh: '基于 now() → 会漂移！' },
  summary:     { en: '5 overdue → 2 coalesced executions → clean grid', zh: '5 个超时 → 2 次合并执行 → 整洁网格' },
  handlerSees: { en: 'handler sees now()=10:04 data', zh: 'handler 看到 now()=10:04 的数据' },
  stepTitles: {
    en: [
      'Initial State — Heap with overdue items',
      'Pop all overdue from heap',
      'Group by interval',
      'Coalesce — Keep latest from each group',
      'Execute kept ticks',
      'Reschedule with _last_schedule_time',
      'Back to FastForward!',
    ],
    zh: [
      '初始状态 — 堆中有超时条目',
      '从堆中弹出所有超时项',
      '按 interval 分组',
      'Coalesce — 每组只保留最新的',
      '执行保留的 tick',
      '用 _last_schedule_time 重新调度',
      '回到 FastForward！',
    ],
  },
  stepDescs: {
    en: [
      'The min-heap contains 5 overdue schedules. now()=10:04, all items have next_time ≤ now().',
      'Pop items one by one (min first) while schedule.next_time ≤ now(). Heap empties.',
      'Collect popped items into groups by their interval. 1-min and 5-min are separate groups.',
      '4 overdue ticks → 2 executions. From each group, keep ONLY the schedule with the latest next_time.',
      'Run handlers for each kept schedule. Both handlers see the current market state at 10:04.',
      '_schedule_next uses last_schedule_time to snap the next tick to the clean grid, not now().',
      'Heap has clean future schedules. CatchUp complete, transition to FastForward mode.',
    ],
    zh: [
      '最小堆包含 5 个超时调度。now()=10:04，所有条目的 next_time ≤ now()。',
      '逐个弹出（最小优先），直到 schedule.next_time ≤ now()。堆清空。',
      '将弹出的条目按 interval 分组。1 分钟和 5 分钟各为一组。',
      '4 个超时 tick → 2 次执行。每组只保留 next_time 最大的那个调度。',
      '执行保留的调度对应的 handler。两个 handler 都看到 10:04 时刻的最新市场数据。',
      '_schedule_next 基于 last_schedule_time 把下一次 tick 对齐到网格，而非 now()。',
      '堆中是干净的未来调度。CatchUp 完成，切换到 FastForward 模式。',
    ],
  },
};
const t = (key, lang) => TEXT[key]?.[lang] ?? TEXT[key]?.en ?? key;

/* ─── Heap data ─── */
const HEAP_ITEMS = [
  { id: 'a', interval: '1m', time: '10:01', color: '#3b82f6' },
  { id: 'b', interval: '1m', time: '10:02', color: '#3b82f6' },
  { id: 'c', interval: '5m', time: '10:01', color: '#a855f7' },
  { id: 'd', interval: '1m', time: '10:03', color: '#3b82f6' },
  { id: 'e', interval: '1m', time: '10:04', color: '#3b82f6' },
];

// Binary heap tree layout positions (relative %, for a 5-node tree)
// Level 0: root; Level 1: 2 children; Level 2: 2 children of left
const HEAP_LAYOUT = [
  { x: 50, y: 8 },   // node 0 (root) - 1m@10:01
  { x: 28, y: 38 },   // node 1 - 1m@10:02
  { x: 72, y: 38 },   // node 2 - 5m@10:01
  { x: 14, y: 68 },   // node 3 - 1m@10:03
  { x: 42, y: 68 },   // node 4 - 1m@10:04
];

const HEAP_EDGES = [[0,1],[0,2],[1,3],[1,4]];

// Pop order (min-heap extraction order by time, breaking ties)
const POP_ORDER = [0, 2, 1, 3, 4]; // 10:01(1m), 10:01(5m), 10:02, 10:03, 10:04

const TOTAL_STEPS = 7;
const AUTO_PLAY_MS = 2800;

/* ─── Subcomponents ─── */

function HeapNode({ item, layout, state, popIndex }) {
  // state: 'normal' | 'overdue' | 'popping' | 'popped' | 'hidden'
  const isOverdue = state === 'overdue' || state === 'normal';
  const isPopping = state === 'popping';
  const isGone = state === 'popped' || state === 'hidden';

  if (isGone) return null;

  const borderColor = isOverdue ? '#ef4444' : '#10b981';
  const bgColor = isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)';

  return (
    <motion.div
      className="absolute flex flex-col items-center justify-center rounded-lg border text-center select-none"
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 64,
        height: 48,
        borderColor,
        background: bgColor,
      }}
      initial={false}
      animate={isPopping
        ? { y: -80, opacity: 0, scale: 0.6 }
        : { y: 0, opacity: 1, scale: 1 }
      }
      transition={isPopping
        ? { duration: 0.5, delay: popIndex * 0.15 }
        : { duration: 0.3 }
      }
    >
      <span className="text-[10px] font-mono" style={{ color: item.color }}>
        {item.interval}
      </span>
      <span className="text-xs font-bold text-gray-200">{item.time}</span>
      {isOverdue && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

function HeapTree({ step, lang }) {
  const nodeStates = useMemo(() => {
    if (step === 0) return HEAP_ITEMS.map(() => 'overdue');
    if (step === 1) return HEAP_ITEMS.map(() => 'popping');
    return HEAP_ITEMS.map(() => 'hidden');
  }, [step]);

  const showTree = step <= 1;

  return (
    <div className="relative w-full" style={{ height: 160 }}>
      {/* Edges */}
      {showTree && (
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          {HEAP_EDGES.map(([from, to]) => {
            const f = HEAP_LAYOUT[from];
            const tgt = HEAP_LAYOUT[to];
            return (
              <motion.line
                key={`${from}-${to}`}
                x1={`${f.x}%`} y1={`${f.y}%`}
                x2={`${tgt.x}%`} y2={`${tgt.y}%`}
                stroke={step === 0 ? '#ef444466' : '#6b728044'}
                strokeWidth={1.5}
                animate={{ opacity: step === 1 ? 0 : 0.7 }}
                transition={{ duration: 0.4 }}
              />
            );
          })}
        </svg>
      )}

      {/* Nodes */}
      <AnimatePresence>
        {showTree && HEAP_ITEMS.map((item, i) => (
          <HeapNode
            key={item.id}
            item={item}
            layout={HEAP_LAYOUT[i]}
            state={nodeStates[i]}
            popIndex={POP_ORDER.indexOf(i)}
          />
        ))}
      </AnimatePresence>

      {/* Min label */}
      {step === 0 && (
        <motion.div
          className="absolute text-[10px] text-red-400/70 font-mono"
          style={{ left: `${HEAP_LAYOUT[0].x + 8}%`, top: `${HEAP_LAYOUT[0].y - 3}%` }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          ← min
        </motion.div>
      )}

      {/* Heap empty indicator */}
      {step >= 2 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <div className="text-gray-600 text-sm border border-dashed border-gray-700 rounded-lg px-6 py-3">
            {t('heapEmpty', lang)}
          </div>
        </motion.div>
      )}

      {/* Now indicator */}
      {step <= 1 && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 text-center text-[11px] text-gray-400"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          {t('nowLabel', lang)}: <span className="text-red-400 font-bold">10:04</span>
          {' '}
          <span className="text-red-400/60">({t('allOverdue', lang)})</span>
        </motion.div>
      )}
    </div>
  );
}

function StagingArea({ step, lang }) {
  if (step < 1 || step > 2) return null;

  const items = [
    { id: 'a', interval: '1m', time: '10:01', color: '#3b82f6' },
    { id: 'c', interval: '5m', time: '10:01', color: '#a855f7' },
    { id: 'b', interval: '1m', time: '10:02', color: '#3b82f6' },
    { id: 'd', interval: '1m', time: '10:03', color: '#3b82f6' },
    { id: 'e', interval: '1m', time: '10:04', color: '#3b82f6' },
  ];

  return (
    <motion.div
      className="mt-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-[10px] text-gray-500 mb-1.5">{t('staging', lang)}</div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            className="flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-mono"
            style={{
              borderColor: item.color + '60',
              background: item.color + '14',
              color: item.color,
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: step === 1 ? i * 0.15 + 0.3 : 0 }}
          >
            <span className="text-gray-400">{item.interval}</span>
            <span className="text-gray-200">@{item.time}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function GroupView({ step, lang }) {
  if (step < 2 || step > 4) return null;

  const oneMinItems = [
    { time: '10:01', kept: false },
    { time: '10:02', kept: false },
    { time: '10:03', kept: false },
    { time: '10:04', kept: true },
  ];
  const fiveMinItems = [
    { time: '10:01', kept: true },
  ];

  const showCoalesce = step >= 3;
  const showExec = step === 4;

  return (
    <motion.div
      className="mt-4 space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-[10px] text-gray-500 mb-1">{t('groupTitle', lang)}</div>

      {/* 1-min group */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5">
        <div className="text-[10px] text-blue-400 font-medium mb-1.5">1-min group</div>
        <div className="flex flex-wrap gap-1.5">
          {oneMinItems.map((item, i) => {
            const discarded = showCoalesce && !item.kept;
            const kept = showCoalesce && item.kept;
            return (
              <motion.div
                key={item.time}
                className="relative rounded border px-2 py-1 text-[11px] font-mono"
                style={{
                  borderColor: kept ? '#22c55e' : discarded ? '#6b728066' : '#3b82f666',
                  background: kept ? 'rgba(34,197,94,0.12)' : discarded ? 'rgba(107,114,128,0.06)' : 'rgba(59,130,246,0.08)',
                  color: discarded ? '#6b7280' : '#e5e7eb',
                  textDecoration: discarded ? 'line-through' : 'none',
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: discarded ? 0.35 : 1,
                  x: 0,
                  scale: kept ? 1.05 : 1,
                }}
                transition={{ delay: step === 2 ? i * 0.1 : 0 }}
              >
                {item.time}
                {kept && (
                  <motion.span
                    className="ml-1 text-green-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, delay: 0.2 }}
                  >
                    ✓
                  </motion.span>
                )}
                {discarded && showCoalesce && (
                  <span className="ml-1 text-[9px] text-gray-600">{t('discard', lang)}</span>
                )}
                {/* Execution flash */}
                {showExec && kept && (
                  <motion.div
                    className="absolute inset-0 rounded border-2 border-green-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.8, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
        {showCoalesce && (
          <motion.div
            className="text-[10px] text-gray-500 mt-1.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            4 items → <span className="text-green-400 font-medium">{t('keep', lang)} 10:04</span>
          </motion.div>
        )}
      </div>

      {/* 5-min group */}
      <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-2.5">
        <div className="text-[10px] text-purple-400 font-medium mb-1.5">5-min group</div>
        <div className="flex gap-1.5">
          {fiveMinItems.map((item) => (
            <motion.div
              key={item.time}
              className="relative rounded border px-2 py-1 text-[11px] font-mono"
              style={{
                borderColor: showCoalesce ? '#22c55e' : '#a855f766',
                background: showCoalesce ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.08)',
                color: '#e5e7eb',
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, scale: showCoalesce ? 1.05 : 1 }}
            >
              {item.time}
              {showCoalesce && (
                <motion.span
                  className="ml-1 text-green-400"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, delay: 0.3 }}
                >
                  ✓
                </motion.span>
              )}
              {showExec && (
                <motion.div
                  className="absolute inset-0 rounded border-2 border-green-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.8 }}
                />
              )}
            </motion.div>
          ))}
        </div>
        {showCoalesce && (
          <motion.div
            className="text-[10px] text-gray-500 mt-1.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            1 item → <span className="text-green-400 font-medium">{t('onlyOne', lang)}</span>
          </motion.div>
        )}
      </div>

      {/* Handler note for exec step */}
      {showExec && (
        <motion.div
          className="text-center text-[11px] text-amber-400/80 bg-amber-500/8 border border-amber-500/20 rounded-lg py-1.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          💡 {t('handlerSees', lang)}
        </motion.div>
      )}
    </motion.div>
  );
}

function ComparisonPanel({ step, lang }) {
  if (step < 3) return null;

  return (
    <motion.div
      className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Replay */}
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
        <div className="text-[10px] text-red-400 font-medium mb-1.5">
          ✗ {t('replayLabel', lang)}
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          {['10:01', '10:02', '10:03', '10:04'].map((time) => (
            <div
              key={time}
              className="rounded border border-red-500/30 bg-red-500/8 px-1.5 py-0.5 text-[10px] font-mono text-red-300"
            >
              {time}→exec
            </div>
          ))}
        </div>
        <div className="text-[9px] text-red-400/60">{t('dishonest', lang)}</div>
      </div>
      {/* Coalesce */}
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-2.5">
        <div className="text-[10px] text-green-400 font-medium mb-1.5">
          ✓ {t('coalesceLabel', lang)}
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          {['1m@10:04', '5m@10:01'].map((label) => (
            <div
              key={label}
              className="rounded border border-green-500/30 bg-green-500/8 px-1.5 py-0.5 text-[10px] font-mono text-green-300"
            >
              {label}→exec
            </div>
          ))}
        </div>
        <div className="text-[9px] text-green-400/60">{t('honest', lang)}</div>
      </div>
    </motion.div>
  );
}

function RescheduleView({ step, lang }) {
  if (step < 5) return null;

  const gridTimes = ['10:02', '10:03', '10:04', '10:05', '10:06', '10:07'];
  const highlightIdx = { 3: '#3b82f6', 4: '#a855f7' }; // 10:05=1m, 10:06=5m

  return (
    <motion.div
      className="mt-4 space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Grid-snap number line */}
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="text-[10px] text-emerald-400 font-medium mb-2">
          _last_schedule_time → {t('gridSnap', lang)}
        </div>
        <div className="relative h-10 mx-2">
          {/* Line */}
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-600" />
          {/* Ticks */}
          {gridTimes.map((time, i) => {
            const pct = (i / (gridTimes.length - 1)) * 100;
            const hlColor = highlightIdx[i];
            const isPast = i < 2;
            return (
              <div
                key={time}
                className="absolute flex flex-col items-center"
                style={{ left: `${pct}%`, top: 0, transform: 'translateX(-50%)' }}
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full mb-0.5"
                  style={{ background: hlColor || (isPast ? '#6b7280' : '#9ca3af') }}
                  animate={hlColor ? { scale: [1, 1.6, 1], boxShadow: [`0 0 0 0 ${hlColor}44`, `0 0 8px 3px ${hlColor}66`, `0 0 0 0 ${hlColor}44`] } : {}}
                  transition={hlColor ? { duration: 1.2, repeat: Infinity } : {}}
                />
                <span
                  className="text-[9px] font-mono"
                  style={{ color: hlColor || (isPast ? '#6b7280' : '#9ca3af') }}
                >
                  {time}
                </span>
                {hlColor && (
                  <motion.span
                    className="text-[8px] font-mono mt-0.5"
                    style={{ color: hlColor }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {i === 3 ? '1m ↑' : '5m ↑'}
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drift warning */}
      <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-2.5">
        <div className="text-[10px] text-amber-400/80 font-medium mb-1">
          ⚠ {t('driftWarn', lang)}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-gray-500">now() = 10:04:00.<span className="text-amber-400">023</span></span>
          <span className="text-gray-600">→</span>
          <span className="text-gray-500">next = 10:05:00.<span className="text-amber-400">023</span></span>
          <span className="text-amber-400/60 text-[9px]">drift!</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono mt-1">
          <span className="text-gray-400">last_schedule_time = 10:04:00.<span className="text-emerald-400">000</span></span>
          <span className="text-gray-600">→</span>
          <span className="text-gray-400">next = 10:05:00.<span className="text-emerald-400">000</span></span>
          <span className="text-emerald-400/60 text-[9px]">clean ✓</span>
        </div>
      </div>
    </motion.div>
  );
}

function FinalSummary({ step, lang }) {
  if (step < 6) return null;

  // Show new heap with clean schedules
  const newItems = [
    { interval: '1m', time: '10:05', color: '#3b82f6' },
    { interval: '5m', time: '10:06', color: '#a855f7' },
  ];

  return (
    <motion.div
      className="mt-4 space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* New heap */}
      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
        <div className="text-[10px] text-emerald-400 font-medium mb-2">🌿 New Heap</div>
        <div className="flex justify-center gap-10">
          {/* Simple 2-node tree */}
          <div className="flex flex-col items-center gap-1">
            <motion.div
              className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-1.5 text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="text-[9px] font-mono text-blue-400">{newItems[0].interval}</div>
              <div className="text-xs font-bold text-gray-200">{newItems[0].time}</div>
            </motion.div>
            <div className="w-px h-3 bg-gray-700" />
            <motion.div
              className="rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-1.5 text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, delay: 0.15 }}
            >
              <div className="text-[9px] font-mono text-purple-400">{newItems[1].interval}</div>
              <div className="text-xs font-bold text-gray-200">{newItems[1].time}</div>
            </motion.div>
          </div>
        </div>
        <motion.div
          className="text-center text-[10px] text-emerald-400/70 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          → FastForward mode
        </motion.div>
      </div>

      {/* Summary */}
      <motion.div
        className="text-center text-sm font-medium text-emerald-300 bg-emerald-500/8 border border-emerald-500/20 rounded-lg py-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        ✨ {t('summary', lang)}
      </motion.div>
    </motion.div>
  );
}

function ControlButton({ onClick, label, disabled = false, accent = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
        disabled
          ? 'bg-white/5 text-gray-600 cursor-not-allowed'
          : accent
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-white/5 text-gray-400 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Main Component ─── */
export default function AnimCoalesceDemo({ lang = 'zh' }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCurrent((prev) => {
        if (prev >= TOTAL_STEPS - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
    }, AUTO_PLAY_MS);
    return () => clearInterval(id);
  }, [playing]);

  const goPrev = useCallback(() => {
    setCurrent((p) => Math.max(0, p - 1));
    setPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((p) => Math.min(TOTAL_STEPS - 1, p + 1));
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const reset = useCallback(() => {
    setCurrent(0);
    setPlaying(false);
  }, []);

  const stepTitles = t('stepTitles', lang);
  const stepDescs = t('stepDescs', lang);

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-[#0d1117] p-5 my-8 select-none max-sm:p-3">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🔄</span>
        <h3 className="text-sm font-bold text-emerald-300">{t('title', lang)}</h3>
      </div>

      {/* Step info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="mb-4"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-gray-400 mb-0.5">
            {t('step', lang)} {current + 1}/{TOTAL_STEPS}
          </div>
          <div className="text-sm font-semibold text-gray-200 mb-1">
            {stepTitles[current]}
          </div>
          <div className="text-[11px] text-gray-500 leading-relaxed">
            {stepDescs[current]}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Heap Tree */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-900/30 p-3 mb-1">
        <div className="text-[10px] text-gray-500 mb-1 font-medium">Min-Heap</div>
        <HeapTree step={current} lang={lang} />
        <StagingArea step={current} lang={lang} />
      </div>

      {/* Algorithm panels */}
      <GroupView step={current} lang={lang} />
      <ComparisonPanel step={current} lang={lang} />
      <RescheduleView step={current} lang={lang} />
      <FinalSummary step={current} lang={lang} />

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
        <ControlButton onClick={reset} label={t('reset', lang)} />
        <ControlButton onClick={goPrev} label={t('prev', lang)} disabled={current === 0} />
        <ControlButton
          onClick={togglePlay}
          label={playing ? t('pause', lang) : t('play', lang)}
          accent
        />
        <ControlButton onClick={goNext} label={t('next', lang)} disabled={current >= TOTAL_STEPS - 1} />

        {/* Progress bar */}
        <div className="flex-1 mx-2 h-1 bg-white/10 rounded-full overflow-hidden min-w-[60px] max-w-[120px]">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            animate={{ width: `${((current + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
    </div>
  );
}
