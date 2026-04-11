import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ────────────────────────────────────────────
   步骤数据 — 8 个关键帧描述时间冻结全过程
   ──────────────────────────────────────────── */
const STEPS = [
  {
    id: 0,
    title: { en: 'Initial State', zh: '初始状态' },
    desc: {
      en: 'System ready. Heap has one scheduled event at 10:01.',
      zh: '系统就绪，堆中有 10:01 的调度事件。',
    },
    vTime: '10:00', rTime: 0, frozen: false,
    heap: ['1m@10:01'],
    tm: 'idle', trigger: 'idle', backend: 'idle',
    problems: [],
  },
  {
    id: 1,
    title: { en: 'Pop from Heap', zh: '从堆中弹出事件' },
    desc: {
      en: 'TimeManager pops the 10:01 event. Heap is now EMPTY.',
      zh: 'TimeManager 弹出 10:01 事件，堆变空。',
    },
    vTime: '10:00', rTime: 0, frozen: false,
    heap: [],
    tm: 'executing', trigger: 'idle', backend: 'idle',
    problems: [],
    arrow: 'tm→heap',
  },
  {
    id: 2,
    title: { en: 'Advance to 10:01', zh: '推进到 10:01' },
    desc: {
      en: 'Virtual clock advances. Tick sent to Trigger/LLM component.',
      zh: '虚拟时钟推进到 10:01，tick 发送给 Trigger/LLM。',
    },
    vTime: '10:01', rTime: 0, frozen: false,
    heap: [],
    tm: 'executing', trigger: 'receiving', backend: 'idle',
    problems: [],
    arrow: 'tm→trigger',
  },
  {
    id: 3,
    title: { en: 'Barrier Activated — LLM Starts', zh: 'Barrier 激活 — LLM 开始执行' },
    desc: {
      en: 'LLM call enters barrier. Main loop BLOCKS. Virtual time FREEZES.',
      zh: 'LLM 调用进入 barrier，主循环阻塞，虚拟时间冻结。',
    },
    vTime: '10:01', rTime: 0, frozen: true,
    heap: [],
    tm: 'blocked', trigger: 'llm', backend: 'waiting',
    problems: [],
  },
  {
    id: 4,
    title: { en: '1 Minute Passes…', zh: '过了 1 分钟…' },
    desc: {
      en: 'Real time: 60s elapsed. now() still returns 10:01. LLM sees stale data.',
      zh: '现实过了 60 秒，now() 仍返回 10:01。LLM 拿到过期数据。',
    },
    vTime: '10:01', rTime: 60, frozen: true,
    heap: [],
    tm: 'blocked', trigger: 'llm', backend: 'stalled',
    problems: ['P1'],
  },
  {
    id: 5,
    title: { en: '2 Minutes Pass…', zh: '过了 2 分钟…' },
    desc: {
      en: 'Backend engine stalled — stop-loss/take-profit orders can\'t match.',
      zh: '后端引擎停摆——止损止盈无法触发。',
    },
    vTime: '10:01', rTime: 120, frozen: true,
    heap: [],
    tm: 'blocked', trigger: 'llm', backend: 'stalled',
    problems: ['P1', 'P2'],
  },
  {
    id: 6,
    title: { en: '3 Minutes Pass…', zh: '过了 3 分钟…' },
    desc: {
      en: 'Events at 10:02, 10:03 never fired — heap was empty, _schedule_next never called.',
      zh: '10:02、10:03 的事件从未触发——堆为空，_schedule_next 未被调用。',
    },
    vTime: '10:01', rTime: 180, frozen: true,
    heap: [],
    tm: 'blocked', trigger: 'llm', backend: 'stalled',
    problems: ['P1', 'P2', 'P3'],
  },
  {
    id: 7,
    title: { en: 'Barrier Exits — 3 Min Late', zh: 'Barrier 结束 — 已晚 3 分钟' },
    desc: {
      en: 'Time resumes, but 3 minutes of market data were invisible to the system.',
      zh: '时间恢复，但 3 分钟的行情数据对系统完全不可见。',
    },
    vTime: '10:01', rTime: 180, frozen: false,
    heap: ['1m@10:02'],
    tm: 'resuming', trigger: 'done', backend: 'resuming',
    problems: ['P1', 'P2', 'P3'],
  },
];

/* ────────────────────────────────────────────
   问题定义
   ──────────────────────────────────────────── */
const PROBLEMS = {
  P1: {
    en: 'Time Frozen: LLM sees stale data',
    zh: '时间冻结：LLM 看不到新数据',
    icon: '❄️',
  },
  P2: {
    en: 'Engine Stalled: No SL/TP matching',
    zh: '引擎停摆：止损止盈不触发',
    icon: '⚙️',
  },
  P3: {
    en: 'Events Lost: 10:02, 10:03 missed',
    zh: '事件丢失：10:02, 10:03 被跳过',
    icon: '📅',
  },
};

/* ────────────────────────────────────────────
   状态颜色 / 标签映射
   ──────────────────────────────────────────── */
const STATUS_META = {
  idle:      { color: '#6b7280', label: { en: 'IDLE',      zh: '空闲' },   icon: '○' },
  executing: { color: '#3b82f6', label: { en: 'RUNNING',   zh: '运行中' }, icon: '▶' },
  receiving: { color: '#3b82f6', label: { en: 'RECEIVING', zh: '接收中' }, icon: '◇' },
  blocked:   { color: '#ef4444', label: { en: 'BLOCKED',   zh: '阻塞' },   icon: '■' },
  llm:       { color: '#f59e0b', label: { en: 'LLM EXEC',  zh: 'LLM 执行' }, icon: '◆' },
  waiting:   { color: '#6b7280', label: { en: 'WAITING',   zh: '等待中' }, icon: '…' },
  stalled:   { color: '#ef4444', label: { en: 'STALLED',   zh: '停摆' },   icon: '■' },
  resuming:  { color: '#22c55e', label: { en: 'RESUMING',  zh: '恢复中' }, icon: '▶' },
  done:      { color: '#22c55e', label: { en: 'DONE',      zh: '完成' },   icon: '✓' },
  has_item:  { color: '#3b82f6' },
  empty:     { color: '#ef4444' },
};

/* ────────────────────────────────────────────
   子组件：双时钟面板
   ──────────────────────────────────────────── */
function DualClock({ step, lang }) {
  const { vTime, rTime, frozen } = step;
  return (
    <div className="flex flex-wrap gap-4 justify-center mb-5">
      {/* 虚拟时钟 */}
      <motion.div
        className="relative flex-1 min-w-[140px] max-w-[220px] rounded-xl border px-4 py-3 text-center"
        style={{ borderColor: frozen ? '#ef4444' : '#3b82f6' }}
        animate={frozen ? { boxShadow: ['0 0 8px #ef444488', '0 0 20px #ef4444cc', '0 0 8px #ef444488'] } : { boxShadow: '0 0 0px transparent' }}
        transition={frozen ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      >
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
          {lang === 'zh' ? '虚拟时间 now()' : 'Virtual Time now()'}
        </div>
        <motion.div
          className="text-2xl font-mono font-bold"
          style={{ color: frozen ? '#ef4444' : '#e5e7eb' }}
          key={vTime}
          initial={{ scale: 1.15, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {vTime}
        </motion.div>
        <AnimatePresence>
          {frozen && (
            <motion.div
              className="text-xs mt-1 font-semibold tracking-wide"
              style={{ color: '#ef4444' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              FROZEN ❄️
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 真实时钟 */}
      <motion.div
        className="relative flex-1 min-w-[140px] max-w-[220px] rounded-xl border border-gray-600 px-4 py-3 text-center"
      >
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
          {lang === 'zh' ? '现实流逝时间' : 'Real World Elapsed'}
        </div>
        <motion.div
          className="text-2xl font-mono font-bold text-gray-200"
          key={rTime}
          initial={{ scale: 1.15, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          +{rTime}s
        </motion.div>
        {rTime > 0 && frozen && (
          <div className="text-[11px] text-amber-400 mt-1">
            {lang === 'zh' ? `≈ ${Math.round(rTime / 60)} 分钟` : `≈ ${Math.round(rTime / 60)} min`}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────
   子组件：单个组件方块
   ──────────────────────────────────────────── */
function CompBox({ name, status, lang }) {
  const meta = STATUS_META[status] || STATUS_META.idle;
  return (
    <motion.div
      className="rounded-lg border px-3 py-2 min-w-[110px] text-center"
      style={{ borderColor: meta.color + '99', background: meta.color + '14' }}
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="text-[11px] text-gray-400 mb-0.5 truncate">{name}</div>
      <motion.div
        className="text-xs font-mono font-semibold flex items-center justify-center gap-1"
        style={{ color: meta.color }}
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span>{meta.icon}</span>
        <span>{meta.label[lang] || meta.label.en}</span>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   子组件：堆可视化
   ──────────────────────────────────────────── */
function HeapViz({ items, lang }) {
  const empty = items.length === 0;
  return (
    <motion.div
      className="rounded-lg border px-3 py-2 min-w-[110px] text-center"
      style={{
        borderColor: empty ? '#ef444499' : '#3b82f699',
        background: empty ? '#ef444414' : '#3b82f614',
      }}
      layout
    >
      <div className="text-[11px] text-gray-400 mb-0.5">
        {lang === 'zh' ? '调度堆 Heap' : 'Schedule Heap'}
      </div>
      <AnimatePresence mode="wait">
        {empty ? (
          <motion.div
            key="empty"
            className="text-xs font-mono text-red-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            [ empty ]
          </motion.div>
        ) : (
          <motion.div
            key={items.join(',')}
            className="flex flex-wrap gap-1 justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {items.map((item) => (
              <span key={item} className="text-[11px] font-mono bg-blue-500/20 text-blue-300 rounded px-1.5 py-0.5">
                {item}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   子组件：组件状态面板 + 连接箭头
   ──────────────────────────────────────────── */
function ComponentPanel({ step, lang }) {
  const { tm, trigger, backend, heap, arrow } = step;
  const arrowColor = tm === 'blocked' ? '#ef4444' : '#3b82f6';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-4">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">
        {lang === 'zh' ? '组件状态' : 'Component Status'}
      </div>

      {/* 上层：TM → Trigger */}
      <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
        <CompBox name="TimeManager" status={tm} lang={lang} />
        <motion.div
          className="text-lg font-mono select-none"
          style={{ color: arrowColor }}
          animate={arrow === 'tm→trigger' ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] } : {}}
          transition={{ duration: 0.8, repeat: arrow === 'tm→trigger' ? 2 : 0 }}
        >
          →
        </motion.div>
        <CompBox name="Trigger / LLM" status={trigger} lang={lang} />
      </div>

      {/* 连接线 */}
      <div className="flex items-start justify-center gap-3 flex-wrap">
        <div className="flex flex-col items-center gap-1 min-w-[110px]">
          <motion.span
            className="text-gray-600 text-sm select-none"
            animate={arrow === 'tm→heap' ? { color: '#3b82f6', scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.6, repeat: arrow === 'tm→heap' ? 2 : 0 }}
          >
            ↓
          </motion.span>
          <HeapViz items={heap} lang={lang} />
        </div>
        <div className="w-[30px]" />
        <div className="flex flex-col items-center gap-1 min-w-[110px]">
          <span className="text-gray-600 text-sm select-none">↓</span>
          <CompBox name={lang === 'zh' ? '后端引擎' : 'Backend Engine'} status={backend} lang={lang} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   子组件：问题指示器
   ──────────────────────────────────────────── */
function ProblemBar({ activeProblems, lang }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 mb-4">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
        {lang === 'zh' ? '检测到的问题' : 'Problems Detected'}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(PROBLEMS).map(([key, prob]) => {
          const active = activeProblems.includes(key);
          return (
            <motion.div
              key={key}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono"
              style={{
                borderColor: active ? '#ef4444' : '#374151',
                background: active ? '#ef444418' : 'transparent',
                color: active ? '#fca5a5' : '#6b7280',
              }}
              animate={active ? { boxShadow: ['0 0 4px #ef444466', '0 0 12px #ef444499', '0 0 4px #ef444466'] } : { boxShadow: '0 0 0 transparent' }}
              transition={active ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
            >
              <span>{prob.icon}</span>
              <span>{key}: {prob[lang] || prob.en}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   子组件：底部控制栏
   ──────────────────────────────────────────── */
function Controls({ current, total, playing, onPrev, onNext, onToggle, lang }) {
  const btnBase = 'px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors';
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="text-xs text-gray-500 font-mono">
        {lang === 'zh' ? `步骤 ${current + 1}/${total}` : `Step ${current + 1}/${total}`}
      </div>

      {/* 进度条 */}
      <div className="flex-1 mx-3 h-1 bg-white/10 rounded-full overflow-hidden min-w-[80px]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: '#3b82f6' }}
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      <div className="flex gap-2">
        <button
          className={`${btnBase} border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed`}
          onClick={onPrev}
          disabled={current === 0}
          aria-label="Previous step"
        >
          ◀ {lang === 'zh' ? '上步' : 'Prev'}
        </button>
        <button
          className={`${btnBase} ${playing ? 'border-amber-500/50 text-amber-400' : 'border-blue-500/50 text-blue-400'} hover:brightness-125`}
          onClick={onToggle}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing
            ? (lang === 'zh' ? '⏸ 暂停' : '⏸ Pause')
            : (lang === 'zh' ? '▶ 播放' : '▶ Play')}
        </button>
        <button
          className={`${btnBase} border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed`}
          onClick={onNext}
          disabled={current === total - 1 && !playing}
          aria-label="Next step"
        >
          {lang === 'zh' ? '下步' : 'Next'} ▶
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   主组件
   ════════════════════════════════════════════ */
export default function AnimFrozenTimeline({ lang = 'zh' }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = STEPS[current];

  // 自动播放：每 2 秒前进一步，到末尾循环
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCurrent((prev) => (prev >= STEPS.length - 1 ? 0 : prev + 1));
    }, 2000);
    return () => clearInterval(id);
  }, [playing]);

  const goPrev = useCallback(() => {
    setCurrent((p) => Math.max(0, p - 1));
    setPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((p) => {
      if (p >= STEPS.length - 1) return 0; // 循环
      return p + 1;
    });
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  return (
    <div className="rounded-2xl border border-red-500/20 bg-[#0d1117] p-5 my-8 select-none max-sm:p-3">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🚨</span>
        <h3 className="text-base font-bold text-red-400 m-0">
          {lang === 'zh' ? '旧设计致命缺陷：时空冻结' : 'Fatal Flaw: Space-Time Freeze'}
        </h3>
      </div>

      {/* 步骤标题 + 描述 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="mb-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-sm font-semibold text-gray-200 mb-1">
            {step.title[lang] || step.title.en}
          </div>
          <div className="text-xs text-gray-500 leading-relaxed">
            {step.desc[lang] || step.desc.en}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 双时钟 */}
      <DualClock step={step} lang={lang} />

      {/* 组件面板 */}
      <ComponentPanel step={step} lang={lang} />

      {/* 问题指示器 */}
      <ProblemBar activeProblems={step.problems} lang={lang} />

      {/* 控制栏 */}
      <Controls
        current={current}
        total={STEPS.length}
        playing={playing}
        onPrev={goPrev}
        onNext={goNext}
        onToggle={togglePlay}
        lang={lang}
      />
    </div>
  );
}
