import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ────────────────────────────────────────────
   三态定义
   ──────────────────────────────────────────── */
const STATES = {
  fastforward: {
    id: 'fastforward',
    label: 'FastForward',
    color: '#3b82f6',
    icon: '⚡',
    title: { en: 'FastForward', zh: 'FastForward（快进）' },
    nowBehavior: {
      en: 'self.current (static, jumps)',
      zh: 'self.current（静态，跳跃式推进）',
    },
    loop: {
      en: 'Pop heap → Advance time → Execute handler → _schedule_next',
      zh: 'Pop 堆 → 推进时间 → 执行回调 → _schedule_next',
    },
    heap: {
      en: 'Drives execution order — sorted by virtual time',
      zh: '驱动执行顺序 — 按虚拟时间排序',
    },
    key: {
      en: 'Time is discrete jumps, not continuous. No real waiting.',
      zh: '时间是离散跳跃，不连续流逝。无需真实等待。',
    },
    trigger: {
      en: 'Normal backtest mode — heap drives everything',
      zh: '正常回测模式 — 堆驱动一切',
    },
  },
  realtime: {
    id: 'realtime',
    label: 'Realtime',
    color: '#f59e0b',
    icon: '🕐',
    title: { en: 'Realtime', zh: 'Realtime（实时）' },
    nowBehavior: {
      en: 'anchor_virtual + (monotonic() - anchor_real) - paused_duration',
      zh: 'anchor_virtual + (monotonic() - anchor_real) - paused_duration',
    },
    loop: {
      en: 'Continues running! Uses asyncio.wait_for(timeout=…)',
      zh: '持续运行！使用 asyncio.wait_for(timeout=…)',
    },
    heap: {
      en: 'Still drives execution, but competes with wall-clock',
      zh: '仍驱动执行，但与挂钟时间竞争',
    },
    key: {
      en: 'Multiple triggers share ONE anchor (first-enters sets it). Barrier count tracks concurrent LLM calls.',
      zh: '多个 trigger 共享同一个锚点（先进者设定）。barrier_count 追踪并发 LLM 调用。',
    },
    trigger: {
      en: 'enter_barrier() — any trigger enters a barrier',
      zh: 'enter_barrier() — 任意 trigger 进入 barrier',
    },
  },
  catchup: {
    id: 'catchup',
    label: 'CatchUp',
    color: '#10b981',
    icon: '🔄',
    title: { en: 'CatchUp', zh: 'CatchUp（追赶）' },
    nowBehavior: {
      en: 'Still dynamic until fully caught up',
      zh: '仍然是动态时间，直到完全追上',
    },
    loop: {
      en: 'Pop ALL overdue → Group by interval → Coalesce to latest → Execute',
      zh: 'Pop 所有逾期 → 按 interval 分组 → 合并到最新 → 执行',
    },
    heap: {
      en: 'Being drained of overdue items',
      zh: '逾期项正在被消耗',
    },
    key: {
      en: 'Coalesce-to-latest, not replay-all. _last_schedule_time prevents grid drift.',
      zh: '合并到最新，不是全部重放。_last_schedule_time 防止时间网格漂移。',
    },
    trigger: {
      en: 'exit_barrier() — last barrier exits (barrier_count → 0)',
      zh: 'exit_barrier() — 最后一个 barrier 退出（barrier_count → 0）',
    },
  },
};

const STATE_ORDER = ['fastforward', 'realtime', 'catchup'];

/* ────────────────────────────────────────────
   转移边定义
   ──────────────────────────────────────────── */
const TRANSITIONS = [
  {
    from: 'fastforward',
    to: 'realtime',
    label: { en: 'enter_barrier()', zh: 'enter_barrier()' },
    desc: {
      en: 'First barrier enters',
      zh: '第一个 barrier 进入',
    },
  },
  {
    from: 'realtime',
    to: 'catchup',
    label: { en: 'exit_barrier()', zh: 'exit_barrier()' },
    desc: {
      en: 'barrier_count → 0',
      zh: 'barrier_count → 0',
    },
  },
  {
    from: 'catchup',
    to: 'fastforward',
    label: { en: 'all overdue done', zh: '所有逾期已处理' },
    desc: {
      en: 'All overdue ticks processed',
      zh: '所有逾期 tick 处理完毕',
    },
  },
];

/* ────────────────────────────────────────────
   i18n 标签
   ──────────────────────────────────────────── */
const LABELS = {
  title: {
    en: 'Three-State Engine',
    zh: '三态引擎：从 2-State 到 3-State 的进化',
  },
  before: {
    en: '2 states: FastForward ↔ Blocked',
    zh: '2 态：FastForward ↔ Blocked',
  },
  after: {
    en: '3 states: FastForward → Realtime → CatchUp',
    zh: '3 态：FastForward → Realtime → CatchUp',
  },
  beforeLabel: { en: 'Before', zh: '旧设计' },
  afterLabel: { en: 'After', zh: '新设计' },
  autoCycle: { en: 'Auto 3s', zh: '自动 3s' },
  state: { en: 'State', zh: '状态' },
  nowFn: { en: 'now()', zh: 'now()' },
  loop: { en: 'Loop', zh: '循环' },
  heapLabel: { en: 'Heap', zh: '堆' },
  keyLabel: { en: 'Key', zh: '关键' },
  triggerLabel: { en: 'Trigger', zh: '触发条件' },
  stateDetail: { en: 'Active State Detail', zh: '当前状态详情' },
  stateMachine: { en: 'State Machine', zh: '状态机' },
  step: { en: 'Step', zh: '步骤' },
};

const t = (key, lang) => LABELS[key]?.[lang] || LABELS[key]?.en || key;

/* ────────────────────────────────────────────
   SVG 状态机图 — 圆弧布局
   ──────────────────────────────────────────── */

// 节点位置（SVG 坐标空间 480×300）
const NODE_POS = {
  fastforward: { x: 240, y: 60 },
  realtime: { x: 100, y: 230 },
  catchup: { x: 380, y: 230 },
};

// 箭头弧线路径
function arcPath(from, to, curve = 30) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // 半径偏移（不碰到圆心）
  const r = 40;
  const nx = dx / dist;
  const ny = dy / dist;
  const sx = from.x + nx * r;
  const sy = from.y + ny * r;
  const ex = to.x - nx * r;
  const ey = to.y - ny * r;
  // 曲线中点偏移
  const mx = (sx + ex) / 2 - ny * curve;
  const my = (sy + ey) / 2 + nx * curve;
  return `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
}

// 箭头标签位置
function labelPos(from, to, curve = 30, offset = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist;
  const ny = dy / dist;
  const r = 40;
  const sx = from.x + nx * r;
  const sy = from.y + ny * r;
  const ex = to.x - nx * r;
  const ey = to.y - ny * r;
  // 二次贝塞尔曲线 t=0.5 的点
  const mx = (sx + ex) / 2 - ny * curve;
  const my = (sy + ey) / 2 + nx * curve;
  const lx = 0.25 * sx + 0.5 * mx + 0.25 * ex;
  const ly = 0.25 * sy + 0.5 * my + 0.25 * ey + offset;
  return { x: lx, y: ly };
}

function StateMachineSVG({ active, onSelect, lang }) {
  const activeTransIdx = STATE_ORDER.indexOf(active);
  // 当前活跃态要转移到下一态的边
  const activeTransition = TRANSITIONS[activeTransIdx];

  return (
    <svg viewBox="0 0 480 300" className="w-full max-w-[520px] mx-auto" role="img" aria-label="Three-state machine diagram">
      <defs>
        {/* 箭头头部 */}
        <marker id="arrow-dim" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 Z" fill="#4b5563" />
        </marker>
        <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 Z" fill="#e5e7eb" />
        </marker>
        {/* 节点光晕滤镜 */}
        {STATE_ORDER.map((sid) => (
          <filter key={sid} id={`glow-${sid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor={STATES[sid].color} floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* 转移箭头 */}
      {TRANSITIONS.map((tr, i) => {
        const from = NODE_POS[tr.from];
        const to = NODE_POS[tr.to];
        const isActive = tr === activeTransition;
        const curve = i === 2 ? -30 : 30; // catchup→fastforward 反向弯曲
        const path = arcPath(from, to, curve);
        const lp = labelPos(from, to, curve, -8);

        return (
          <g key={i}>
            {/* 底层发光线（仅激活时） */}
            {isActive && (
              <path
                d={path}
                fill="none"
                stroke={STATES[tr.to].color}
                strokeWidth="4"
                strokeOpacity="0.3"
                strokeLinecap="round"
              />
            )}
            <path
              d={path}
              fill="none"
              stroke={isActive ? '#e5e7eb' : '#4b5563'}
              strokeWidth={isActive ? 2 : 1.5}
              strokeDasharray={isActive ? '6 4' : 'none'}
              strokeLinecap="round"
              markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow-dim)'}
            >
              {isActive && (
                <animate
                  attributeName="stroke-dashoffset"
                  from="20"
                  to="0"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              )}
            </path>
            {/* 标签 */}
            <text
              x={lp.x}
              y={lp.y}
              textAnchor="middle"
              className="select-none pointer-events-none"
              fill={isActive ? '#e5e7eb' : '#6b7280'}
              fontSize="10"
              fontFamily="monospace"
            >
              {tr.label[lang] || tr.label.en}
            </text>
            {tr.desc && (
              <text
                x={lp.x}
                y={lp.y + 13}
                textAnchor="middle"
                className="select-none pointer-events-none"
                fill={isActive ? '#9ca3af' : '#4b5563'}
                fontSize="9"
              >
                {tr.desc[lang] || tr.desc.en}
              </text>
            )}
          </g>
        );
      })}

      {/* 状态节点 */}
      {STATE_ORDER.map((sid) => {
        const s = STATES[sid];
        const pos = NODE_POS[sid];
        const isActive = sid === active;
        return (
          <g
            key={sid}
            onClick={() => onSelect(sid)}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={s.label}
          >
            {/* 外圈光晕 */}
            {isActive && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r="42"
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeOpacity="0.4"
              >
                <animate
                  attributeName="r"
                  values="42;48;42"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.4;0.15;0.4"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {/* 主圆 */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r="38"
              fill={isActive ? s.color + '25' : '#1f2937'}
              stroke={isActive ? s.color : '#374151'}
              strokeWidth={isActive ? 2.5 : 1.5}
              filter={isActive ? `url(#glow-${sid})` : undefined}
            />
            {/* 图标 */}
            <text
              x={pos.x}
              y={pos.y - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="16"
              className="select-none pointer-events-none"
            >
              {s.icon}
            </text>
            {/* 名称 */}
            <text
              x={pos.x}
              y={pos.y + 16}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="600"
              fontFamily="monospace"
              fill={isActive ? '#ffffff' : '#9ca3af'}
              className="select-none pointer-events-none"
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ────────────────────────────────────────────
   详情面板行
   ──────────────────────────────────────────── */
function DetailRow({ label, value, color, mono = true }) {
  return (
    <div className="flex gap-3 items-start text-sm leading-relaxed">
      <span className="shrink-0 w-[56px] text-right text-gray-500 text-xs font-semibold pt-0.5">
        {label}:
      </span>
      <span
        className={`flex-1 text-gray-300 ${mono ? 'font-mono text-xs' : 'text-xs'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────
   详情面板
   ──────────────────────────────────────────── */
function DetailPanel({ stateId, lang }) {
  const s = STATES[stateId];
  return (
    <motion.div
      key={stateId}
      className="rounded-xl border p-4 space-y-2"
      style={{ borderColor: s.color + '55', background: s.color + '08' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {/* 面板标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{s.icon}</span>
        <span className="text-sm font-bold" style={{ color: s.color }}>
          {s.title[lang] || s.title.en}
        </span>
        <span
          className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border"
          style={{ borderColor: s.color + '66', color: s.color }}
        >
          {t('state', lang)}: {s.label}
        </span>
      </div>

      <DetailRow label={t('nowFn', lang)} value={s.nowBehavior[lang] || s.nowBehavior.en} color={s.color} />
      <DetailRow label={t('loop', lang)} value={s.loop[lang] || s.loop.en} />
      <DetailRow label={t('heapLabel', lang)} value={s.heap[lang] || s.heap.en} />
      <DetailRow label={t('keyLabel', lang)} value={s.key[lang] || s.key.en} mono={false} />

      {/* 触发条件 */}
      <div className="pt-2 border-t border-white/5">
        <DetailRow
          label={t('triggerLabel', lang)}
          value={s.trigger[lang] || s.trigger.en}
          color="#9ca3af"
          mono={false}
        />
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   对比 Badge
   ──────────────────────────────────────────── */
function ComparisonBadge({ lang }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
      <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
        <span className="text-gray-500">{t('beforeLabel', lang)}:</span>
        <span className="line-through text-gray-600">{t('before', lang)}</span>
      </span>
      <span className="text-gray-600">→</span>
      <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-1.5">
        <span className="text-emerald-400 font-semibold">{t('afterLabel', lang)}:</span>
        <span className="text-emerald-300 font-mono">{t('after', lang)}</span>
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────
   控制栏
   ──────────────────────────────────────────── */
function Controls({ active, playing, onPrev, onNext, onToggle, lang }) {
  const idx = STATE_ORDER.indexOf(active);
  const btnBase = 'px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors';
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mt-4">
      <div className="text-xs text-gray-500 font-mono">
        {t('step', lang)} {idx + 1}/{STATE_ORDER.length}
      </div>

      {/* 进度条 */}
      <div className="flex-1 mx-3 h-1 bg-white/10 rounded-full overflow-hidden min-w-[60px]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: STATES[active].color }}
          animate={{ width: `${((idx + 1) / STATE_ORDER.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      <div className="flex gap-2">
        <button
          className={`${btnBase} border-white/10 text-gray-400 hover:text-white hover:border-white/30`}
          onClick={onPrev}
          aria-label="Previous state"
        >
          ◀
        </button>
        <button
          className={`${btnBase} ${playing ? 'border-amber-500/50 text-amber-400' : 'border-blue-500/50 text-blue-400'} hover:brightness-125`}
          onClick={onToggle}
          aria-label={playing ? 'Pause' : 'Auto-cycle'}
        >
          {playing ? '⏸' : '▶'}{' '}
          {t('autoCycle', lang)}
        </button>
        <button
          className={`${btnBase} border-white/10 text-gray-400 hover:text-white hover:border-white/30`}
          onClick={onNext}
          aria-label="Next state"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   主组件
   ════════════════════════════════════════════ */
export default function ThreeStateEngine({ lang = 'zh' }) {
  const [active, setActive] = useState('fastforward');
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  // 自动轮播：3 秒切换
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        const idx = STATE_ORDER.indexOf(prev);
        return STATE_ORDER[(idx + 1) % STATE_ORDER.length];
      });
    }, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing]);

  const goPrev = useCallback(() => {
    setActive((prev) => {
      const idx = STATE_ORDER.indexOf(prev);
      return STATE_ORDER[(idx - 1 + STATE_ORDER.length) % STATE_ORDER.length];
    });
    setPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    setActive((prev) => {
      const idx = STATE_ORDER.indexOf(prev);
      return STATE_ORDER[(idx + 1) % STATE_ORDER.length];
    });
    setPlaying(false);
  }, []);

  const handleSelect = useCallback((sid) => {
    setActive(sid);
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-[#0d1117] p-5 my-8 select-none max-sm:p-3">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚡</span>
        <h3 className="text-base font-bold text-blue-400 m-0">
          {t('title', lang)}
        </h3>
      </div>

      {/* 对比 Badge */}
      <ComparisonBadge lang={lang} />

      {/* 状态机区域 */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-4">
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
          {t('stateMachine', lang)}
        </div>
        <StateMachineSVG active={active} onSelect={handleSelect} lang={lang} />
      </div>

      {/* 详情面板 */}
      <div className="mb-2">
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
          {t('stateDetail', lang)}
        </div>
        <AnimatePresence mode="wait">
          <DetailPanel key={active} stateId={active} lang={lang} />
        </AnimatePresence>
      </div>

      {/* 控制栏 */}
      <Controls
        active={active}
        playing={playing}
        onPrev={goPrev}
        onNext={goNext}
        onToggle={togglePlay}
        lang={lang}
      />
    </div>
  );
}
