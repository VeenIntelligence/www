import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── i18n ─── */
const TEXT = {
  title: {
    en: 'Design Collapse: Three Fatal Flaws of the Pump',
    zh: '设计坍塌：Pump 方案的三个致命缺陷',
  },
  tabs: {
    en: ['Empty Heap', 'Race Condition', 'Semantic Split'],
    zh: ['空堆困境', '竞态危机', '语义分裂'],
  },
  verdict: {
    en: 'Pump strategy REJECTED: design premise doesn\'t hold',
    zh: 'Pump 方案被否决：设计前提不成立',
  },
  prev: { en: 'Prev', zh: '上一步' },
  next: { en: 'Next', zh: '下一步' },
  play: { en: 'Play', zh: '播放' },
  pause: { en: 'Pause', zh: '暂停' },
  reset: { en: 'Reset', zh: '重置' },
  step: { en: 'Step', zh: '步骤' },
  heapLabel: { en: 'Schedule Heap', zh: '调度堆' },
  mainLoop: { en: 'Main Loop', zh: '主循环' },
  pump: { en: 'Pump', zh: 'Pump 协程' },
  /* Tab 1 step captions */
  tab1Captions: {
    en: [
      'Initial state: the heap has one schedule — 1m@10:00. Main Loop and Pump are idle.',
      'Main Loop pops 1m@10:00 from the heap. The heap is now EMPTY.',
      'Main Loop starts executing the tick handler… but the trigger enters a barrier. Main Loop is BLOCKED.',
      'Pump coroutine activates! Scans the heap → finds NOTHING. The heap is empty.',
      '10:01, 10:02, 10:03 schedules were never created — _schedule_next only runs AFTER the blocked handler returns!',
    ],
    zh: [
      '初始状态：堆中有一个调度 — 1m@10:00。主循环和 Pump 均空闲。',
      '主循环从堆中弹出 1m@10:00。堆现在为空。',
      '主循环开始执行 tick 处理器……但触发器进入屏障，主循环被阻塞。',
      'Pump 协程启动！扫描堆 → 什么都没找到。堆是空的。',
      '10:01、10:02、10:03 的调度从未被创建 — _schedule_next 只在阻塞的处理器返回之后才运行！',
    ],
  },
  /* Tab 2 */
  tab2Caption: {
    en: 'Even if we force early rescheduling, two executors fight over the same heap — locks, deduplication, and ownership chaos.',
    zh: '即使强制提前重新调度，两个执行者同时争夺同一个堆 — 需要锁、去重，架构所有权混乱。',
  },
  tab2Conflict: { en: 'CONFLICT!', zh: '冲突！' },
  tab2Duplicate: { en: 'Duplicate entries!', zh: '重复条目！' },
  /* Tab 3 */
  tab3Caption: {
    en: 'Neither replay (should use 10:01 data) nor coalesce (should say 10:03). An undefined intermediate state.',
    zh: '既不是回放（应使用 10:01 数据），也不是合并（应标记为 10:03）。一个未定义的中间状态。',
  },
  tab3Wrapper: { en: 'Tick wrapper', zh: 'Tick 包装' },
  tab3Data: { en: 'Actual data', zh: '实际数据' },
};

const t = (key, lang) => TEXT[key]?.[lang] ?? TEXT[key]?.en ?? key;

/* ─── Shared sub-components ─── */

function ActorBox({ label, color, status, icon, className = '' }) {
  const borderColor = {
    blue: 'border-blue-500/60',
    purple: 'border-purple-500/60',
    orange: 'border-orange-500/60',
  }[color] ?? 'border-white/20';
  const bgColor = {
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    orange: 'bg-orange-500/10',
  }[color] ?? 'bg-white/5';
  const textColor = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
  }[color] ?? 'text-gray-400';

  return (
    <div className={`border ${borderColor} ${bgColor} rounded-lg px-3 py-2 text-center min-w-[100px] ${className}`}>
      <div className={`text-xs font-bold ${textColor} mb-1`}>{icon} {label}</div>
      {status && <div className="text-[10px] text-gray-500">{status}</div>}
    </div>
  );
}

function HeapNode({ value, isEmpty, isPopping, delay = 0 }) {
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay }}
        className="border-2 border-dashed border-gray-700 rounded-lg w-24 h-10 flex items-center justify-center"
      >
        <span className="text-gray-600 text-xs italic">empty</span>
      </motion.div>
    );
  }
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isPopping ? [1, 1.15, 0] : 1,
        opacity: isPopping ? [1, 1, 0] : 1,
      }}
      transition={{ duration: isPopping ? 0.5 : 0.3, delay }}
      className="border border-emerald-500/50 bg-emerald-500/10 rounded-lg px-3 py-1.5 text-center"
    >
      <span className="text-emerald-400 text-xs font-mono font-bold">{value}</span>
    </motion.div>
  );
}

/* ─── Tab 1: Empty Heap ─── */

const TOTAL_STEPS = 5;

function EmptyHeapTab({ lang }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (step >= TOTAL_STEPS - 1) { setPlaying(false); return; }
    const id = setTimeout(() => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)), 1800);
    return () => clearTimeout(id);
  }, [playing, step]);

  const prev = useCallback(() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }, []);
  const next = useCallback(() => { setPlaying(false); setStep(s => Math.min(TOTAL_STEPS - 1, s + 1)); }, []);
  const togglePlay = useCallback(() => {
    if (step >= TOTAL_STEPS - 1) setStep(0);
    setPlaying(p => !p);
  }, [step]);
  const reset = useCallback(() => { setPlaying(false); setStep(0); }, []);

  const heapEmpty = step >= 1;
  const mainLoopActive = step >= 1;
  const mainLoopBlocked = step >= 2;
  const pumpActive = step >= 3;
  const pumpScanning = step >= 3;
  const showNothingFound = step >= 3;
  const isPopping = step === 1;

  const mainStatus = step === 0 ? 'IDLE'
    : step === 1 ? 'POPPING…'
    : mainLoopBlocked ? '🔒 BLOCKED' : 'EXECUTING';

  const pumpStatus = step < 3 ? 'IDLE'
    : step === 3 ? '🔍 SCANNING…'
    : '🔍 SCANNING… ∅';

  const captions = t('tab1Captions', lang);

  return (
    <div className="space-y-5">
      {/* Heap visualization */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t('heapLabel', lang)}</div>
        <div className="relative border border-white/10 bg-white/[0.02] rounded-xl p-4 min-h-[60px] min-w-[160px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!heapEmpty ? (
              <HeapNode key="node" value="1m@10:00" isPopping={isPopping} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="border-2 border-dashed border-gray-700/50 rounded-lg w-28 h-12 flex items-center justify-center">
                  <span className="text-gray-600 text-[11px]">[ ]</span>
                </div>
                {showNothingFound && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-xs font-bold"
                  >
                    ✕ {lang === 'zh' ? '空' : 'EMPTY'}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pop arrow */}
          <AnimatePresence>
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: 30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute -right-8 top-1/2 -translate-y-1/2 text-blue-400 text-lg"
              >
                →
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actors row */}
      <div className="flex items-center justify-center gap-6 flex-wrap">
        <motion.div animate={{ scale: mainLoopActive ? 1.05 : 1 }} transition={{ type: 'spring' }}>
          <ActorBox
            label={t('mainLoop', lang)}
            color="blue"
            icon="⚙️"
            status={mainStatus}
            className={mainLoopBlocked ? 'ring-1 ring-red-500/40' : ''}
          />
        </motion.div>

        <motion.div animate={{ scale: pumpActive ? 1.05 : 1, opacity: pumpActive ? 1 : 0.4 }} transition={{ type: 'spring' }}>
          <ActorBox
            label={t('pump', lang)}
            color="purple"
            icon="🔄"
            status={pumpStatus}
          />
        </motion.div>
      </div>

      {/* Scanning animation for pump */}
      <AnimatePresence>
        {pumpScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <div className="flex items-center gap-2 bg-purple-500/5 border border-purple-500/20 rounded-lg px-4 py-2">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-purple-400 text-sm"
              >
                🔍
              </motion.span>
              <span className="text-gray-500 text-xs font-mono">
                heap.peek() → <span className="text-red-400 font-bold">None</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-center text-sm text-gray-400 leading-relaxed min-h-[48px] px-2"
        >
          {captions[step]}
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-[10px] text-gray-600 mr-2">
          {t('step', lang)} {step + 1}/{TOTAL_STEPS}
        </span>
        <ControlButton onClick={reset} label={t('reset', lang)} />
        <ControlButton onClick={prev} label={t('prev', lang)} disabled={step === 0} />
        <ControlButton onClick={togglePlay} label={playing ? t('pause', lang) : t('play', lang)} accent />
        <ControlButton onClick={next} label={t('next', lang)} disabled={step >= TOTAL_STEPS - 1} />
      </div>
    </div>
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
            ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            : 'bg-white/5 text-gray-400 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Tab 2: Race Condition ─── */

function RaceConditionTab({ lang }) {
  return (
    <div className="space-y-5">
      {/* Heap center with two attackers */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {/* Main Loop arm */}
        <motion.div
          animate={{ x: [0, 12, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ActorBox label={t('mainLoop', lang)} color="blue" icon="⚙️" status="pop()" />
        </motion.div>

        {/* Conflict zone / Heap */}
        <div className="relative flex flex-col items-center gap-2">
          {/* Lightning bolts */}
          <motion.div
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.6 }}
            className="absolute -top-4 text-yellow-400 text-xl z-10"
          >
            ⚡
          </motion.div>

          <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-3 min-w-[140px]">
            <div className="text-[10px] text-gray-500 text-center mb-2 uppercase tracking-wider">{t('heapLabel', lang)}</div>
            <div className="space-y-1.5">
              {['1m@10:01', '1m@10:02'].map((v, i) => (
                <motion.div
                  key={v}
                  animate={{ x: i === 0 ? [-1, 1, -1] : [1, -1, 1] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="border border-emerald-500/40 bg-emerald-500/10 rounded px-2 py-1 text-center"
                >
                  <span className="text-emerald-400 text-[11px] font-mono">{v}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Lock icon */}
          <motion.div
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-red-400 text-sm"
          >
            🔒 {t('tab2Conflict', lang)}
          </motion.div>
        </div>

        {/* Pump arm */}
        <motion.div
          animate={{ x: [0, -12, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ActorBox label={t('pump', lang)} color="purple" icon="🔄" status="pop()" />
        </motion.div>
      </div>

      {/* Duplicate push illustration */}
      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg p-3 max-w-xs"
        >
          <div className="text-yellow-400 text-xs font-bold text-center mb-2">
            push(_schedule_next) ×2
          </div>
          <div className="flex gap-2 justify-center">
            {['1m@10:03', '1m@10:03'].map((v, i) => (
              <div key={i} className="border border-yellow-500/30 bg-yellow-500/5 rounded px-2 py-1">
                <span className="text-yellow-300 text-[11px] font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-red-400 text-xs font-bold">
            ⚠️ {t('tab2Duplicate', lang)}
          </div>
        </motion.div>
      </div>

      {/* Caption */}
      <p className="text-center text-sm text-gray-400 leading-relaxed px-2">
        {t('tab2Caption', lang)}
      </p>
    </div>
  );
}

/* ─── Tab 3: Semantic Split ─── */

function SemanticSplitTab({ lang }) {
  return (
    <div className="space-y-5">
      {/* Envelope visual */}
      <div className="flex items-stretch justify-center gap-4 flex-wrap">
        {/* Left: Tick wrapper */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="border border-blue-500/40 bg-blue-500/5 rounded-xl p-4 text-center flex flex-col justify-center min-w-[130px]"
        >
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{t('tab3Wrapper', lang)}</div>
          <div className="text-blue-400 font-mono font-bold text-lg">10:01</div>
          <div className="text-blue-400/60 text-[10px] mt-1">tick_handler()</div>
        </motion.div>

        {/* Center: Rift */}
        <div className="flex flex-col items-center justify-center gap-1">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-red-500 text-3xl font-bold"
          >
            ≠
          </motion.div>
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-16 bg-gradient-to-b from-transparent via-red-500/60 to-transparent"
          />
        </div>

        {/* Right: Actual data */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="border border-orange-500/40 bg-orange-500/5 rounded-xl p-4 text-center flex flex-col justify-center min-w-[130px]"
        >
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{t('tab3Data', lang)}</div>
          <div className="text-orange-400 font-mono font-bold text-lg">10:03:17</div>
          <div className="text-orange-400/60 text-[10px] mt-1">tm.now() → price</div>
        </motion.div>
      </div>

      {/* Code snippet showing the contradiction */}
      <div className="flex justify-center">
        <div className="bg-[#0a0e14] border border-white/10 rounded-lg p-3 text-[11px] font-mono text-gray-400 leading-relaxed max-w-sm">
          <div><span className="text-gray-600"># Pump executes "10:01" tick</span></div>
          <div>
            <span className="text-purple-400">def</span> <span className="text-blue-400">on_tick</span>(tick):
          </div>
          <div className="pl-4">
            price = tm.<span className="text-emerald-400">now</span>()
            <span className="text-gray-600"> # → </span>
            <span className="text-orange-400 font-bold">10:03:17</span>
          </div>
          <div className="pl-4">
            tick.time
            <span className="text-gray-600"> # → </span>
            <span className="text-blue-400 font-bold">10:01:00</span>
          </div>
          <div className="pl-4 text-red-400">
            <span className="text-gray-600"># </span>⚠️ tick.time ≠ actual data time
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-center text-sm text-gray-400 leading-relaxed px-2">
        {t('tab3Caption', lang)}
      </p>
    </div>
  );
}

/* ─── Main Component ─── */

const TAB_ICONS = ['📭', '⚡', '🔀'];
const TAB_COMPONENTS = [EmptyHeapTab, RaceConditionTab, SemanticSplitTab];

export default function AnimPumpDilemma({ lang = 'zh' }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabLabels = t('tabs', lang);

  return (
    <div className="bg-[#0d1117] border border-orange-500/20 rounded-2xl p-5 sm:p-6 my-8 overflow-hidden">
      {/* Title */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-orange-400 text-lg">⚠️</span>
        <h3 className="text-base sm:text-lg font-bold text-gray-200 leading-tight">
          {t('title', lang)}
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {tabLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === i
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                : 'bg-white/5 text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/8'
            }`}
          >
            <span>{TAB_ICONS[i]}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="border border-white/5 bg-white/[0.01] rounded-xl p-4 sm:p-5 min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {React.createElement(TAB_COMPONENTS[activeTab], { lang })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Verdict */}
      <div className="mt-5 flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
        <span className="text-red-400 text-lg">❌</span>
        <span className="text-red-400/90 text-sm font-medium">{t('verdict', lang)}</span>
      </div>
    </div>
  );
}
