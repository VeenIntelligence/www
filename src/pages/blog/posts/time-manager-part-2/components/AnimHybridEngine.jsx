import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnimHybridEngine({ lang }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const steps = [
    { id: 0, title: 'Idle', log: 'Wait for next tick...', heap: ['10:01', '10:02', '10:03', '10:04'], anchor: null, real: 0, vNow: '10:00' },
    { id: 1, title: 'Pop & Sleep', log: 'pop(1m@10:01), sleep_until(10:01)', heap: ['10:02', '10:03', '10:04'], anchor: null, real: 0, vNow: '10:01' },
    { id: 2, title: 'Enter Barrier', log: 'LLM starts, enter_barrier()', heap: ['10:02', '10:03', '10:04'], anchor: '10:01', real: 0, vNow: '10:01' },
    { id: 3, title: 'Realtime Tick', log: 'now() tracks elapsed real time', heap: ['10:02', '10:03', '10:04'], anchor: '10:01', real: 30, vNow: '10:01:30' },
    { id: 4, title: 'Realtime Query', log: 'LLM queries K-line → fresh data', heap: ['10:02', '10:03', '10:04'], anchor: '10:01', real: 128, vNow: '10:03:08' },
    { id: 5, title: 'Exit Barrier', log: 'LLM finished, exit_barrier() → fix current', heap: ['10:02', '10:03', '10:04'], anchor: null, real: 180, vNow: '10:04:00' },
    { id: 6, title: 'CatchUp Mode', log: 'Main loop resumes, peeks overdue ticks', heap: ['10:02', '10:03', '10:04'], anchor: null, real: 180, vNow: '10:04:00' },
    { id: 7, title: 'Coalesce', log: 'Pop overdue (10:02, 10:03, 10:04), coalesce to latest!', heap: [], anchor: null, real: 180, vNow: '10:04:00' },
    { id: 8, title: 'Reschedule', log: 'Execute 1m@10:04, push 10:05', heap: ['10:05'], anchor: null, real: 180, vNow: '10:04:00' },
  ];

  useEffect(() => {
    let timer;
    if (playing && step < steps.length - 1) {
      timer = setTimeout(() => setStep(s => s + 1), 1500);
    } else if (playing && step === steps.length - 1) {
      setPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [playing, step]);

  const current = steps[step];

  return (
    <div className="w-full bg-black/40 border border-emerald-500/20 rounded-2xl p-6 my-10 backdrop-blur-md font-mono text-sm shadow-[0_0_40px_rgba(16,185,129,0.05)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            {lang === 'zh' ? '交互演示：Hybrid Engine 执行流' : 'Interactive Demo: Hybrid Engine Flow'}
          </h3>
          <p className="text-gray-400 mt-1">Realtime & Coalesce-to-Latest</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep(Math.max(0, step - 1))} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors" disabled={step === 0}>Prev</button>
          <button onClick={() => { if (step === steps.length - 1) setStep(0); setPlaying(!playing); }} className="px-4 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 rounded transition-colors font-bold">
            {playing ? 'Pause' : (step === steps.length - 1 ? 'Replay' : 'Play')}
          </button>
          <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors" disabled={step === steps.length - 1}>Next</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Execution Log */}
        <div className="bg-black/60 rounded-xl p-4 border border-white/5 h-64 overflow-y-auto flex flex-col justify-end">
          {steps.slice(0, step + 1).map((s, idx) => (
            <motion.div 
              key={s.id} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className={`mb-2 ${idx === step ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}
            >
              <span className="opacity-50 select-none mr-2">[{s.id}]</span> {s.log}
            </motion.div>
          ))}
        </div>

        {/* Right: State visualizer */}
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 relative overflow-hidden">
            <div className="text-gray-400 text-xs uppercase mb-2">Time Source State</div>
            
            <div className="flex justify-between items-end mb-4">
              <div>
                 <div className="text-[10px] text-gray-500">Virtual now()</div>
                 <motion.div key={current.vNow} initial={{ scale: 1.1, color: '#34d399' }} animate={{ scale: 1, color: '#e5e7eb' }} className="text-2xl font-bold">{current.vNow}</motion.div>
              </div>
              <div className="text-right">
                 <div className="text-[10px] text-gray-500">Mono Elapsed (s)</div>
                 <div className="text-xl text-yellow-500 font-bold">+{current.real}s</div>
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Anchor: {current.anchor || 'None'}</span>
              <span className={`px-2 py-1 rounded ${current.anchor ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-500/20 text-gray-400'}`}>Realtime Mode: {current.anchor ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10 h-full">
            <div className="text-gray-400 text-xs uppercase mb-3">Schedule Heap</div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {current.heap.length === 0 && <div className="text-gray-600 text-sm italic py-1">Heap is empty</div>}
                {current.heap.map((hCode) => (
                  <motion.div 
                    key={hCode}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5, filter: 'blur(4px)' }}
                    transition={{ duration: 0.3 }}
                    className={`px-3 py-1.5 rounded-md text-sm border ${hCode === '10:04' && step === 7 ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10' : 'border-white/10 bg-white/5 text-gray-300'}`}
                  >
                    1m@{hCode}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {step === 7 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-emerald-400 text-xs">
                ✨ Coalescing! Discarding early ticks, executing only the latest 10:04 tick to align with newest market data.
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Timeline tracker */}
      <div className="mt-8 flex gap-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        {steps.map((s, i) => (
          <div key={i} className={`flex-1 transition-colors duration-300 ${i <= step ? 'bg-emerald-500' : 'bg-transparent'}`} />
        ))}
      </div>
    </div>
  );
}
