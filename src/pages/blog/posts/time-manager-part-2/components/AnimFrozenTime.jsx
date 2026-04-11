import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnimFrozenTime({ lang }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const steps = [
    { action: 'pop(1m@10:01)', heap: ['10:02'], vTime: '10:00', rTime: 0, blocked: false },
    { action: 'sleep_until(10:01)', heap: ['10:02'], vTime: '10:01', rTime: 0, blocked: false },
    { action: 'enter_barrier() (Trigger Starts LLM)', heap: ['10:02'], vTime: '10:01', rTime: 0, blocked: true },
    { action: '1 minute real time passes...', heap: ['10:02'], vTime: '10:01', rTime: 60, blocked: true, alert: 'now() completely frozen!' },
    { action: '2 minutes real time passes...', heap: ['10:02'], vTime: '10:01', rTime: 120, blocked: true, alert: 'Backend engine stalling!' },
    { action: '3 minutes real time passes...', heap: ['10:02'], vTime: '10:01', rTime: 180, blocked: true, alert: 'Missed 10:02, 10:03 events!' },
    { action: 'exit_barrier() (LLM Returns)', heap: ['10:02'], vTime: '10:01', rTime: 180, blocked: false },
    { action: 'Main loop resumes... 3 minutes late', heap: ['10:02'], vTime: '10:01', rTime: 180, blocked: false }
  ];

  useEffect(() => {
    let timer;
    if (playing && step < steps.length - 1) {
      timer = setTimeout(() => setStep(s => s + 1), 1800);
    } else if (playing && step === steps.length - 1) {
      setPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [playing, step]);

  const current = steps[step];

  return (
    <div className="w-full bg-black/40 border border-red-500/20 rounded-2xl p-6 my-10 backdrop-blur-md font-mono text-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-red-400">
             {lang === 'zh' ? '致命漏洞演示：时空冻结 (Space-Time Rift)' : 'Fatal Flaw Demo: Time Freezing (Space-Time Rift)'}
          </h3>
          <p className="text-gray-400 mt-1">What happens when the main loop waits for an LLM?</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep(Math.max(0, step - 1))} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded">Prev</button>
          <button onClick={() => { if (step === steps.length - 1) setStep(0); setPlaying(!playing); }} className="px-4 py-1 bg-red-500/20 text-red-300 font-bold rounded">
            {playing ? 'Pause' : (step === steps.length - 1 ? 'Replay' : 'Play')}
          </button>
          <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded">Next</button>
        </div>
      </div>

      <div className="relative bg-white/5 rounded-xl border border-white/10 p-6 flex flex-col gap-6">
        {/* Core State Indicators */}
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1 bg-black/50 p-4 rounded-lg border border-red-900/50">
            <div className="text-gray-500 text-xs mb-1">TimeSource return of now()</div>
            <div className="text-3xl font-bold font-mono flex items-center gap-3">
              <span className={current.blocked ? 'text-red-400' : 'text-white'}>{current.vTime}</span>
              {current.blocked && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded animate-pulse">FROZEN ❄️</span>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-black/50 p-4 rounded-lg border border-white/5">
            <div className="text-gray-500 text-xs mb-1">Real World Time Elapsed (seconds)</div>
            <div className="text-3xl font-bold font-mono text-blue-400">
              +{current.rTime}s
            </div>
          </div>
        </div>

        {/* Visual Engine Blockage */}
        <div className="relative h-20 bg-black/40 border border-white/5 rounded-lg flex items-center justify-center overflow-hidden">
           <AnimatePresence>
             {!current.blocked && (
               <motion.div 
                 initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent"
               />
             )}
           </AnimatePresence>
           
           <div className={`z-10 text-lg uppercase tracking-widest ${current.blocked ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
             {current.blocked ? 'Main Loop Suspended / System Stalled' : 'Main Loop Executing'}
           </div>
        </div>

        {/* Log messages */}
        <div className="h-24 overflow-hidden relative">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={step} 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: -20, opacity: 0 }}
              className="absolute inset-0 flex items-center p-4 bg-white/5 rounded text-gray-300"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500">[{step}]</span>
                <span className="font-bold text-base">{current.action}</span>
                {current.alert && (
                   <span className="ml-4 text-red-400 italic">⚠️ {current.alert}</span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
