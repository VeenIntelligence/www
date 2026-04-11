import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnimPumpIssue({ lang }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const steps = [
    { id: 0, text: 'Main Loop pops 1m@10:00', heap: [], mainStr: 'pop(10:00)', pumpStr: 'Sleeping...', error: null },
    { id: 1, text: 'Main Loop executes 10:00 handlers', heap: [], mainStr: 'execute(10:00)', pumpStr: 'Sleeping...', error: null },
    { id: 2, text: 'Trigger enters barrier → Main Loop blocked', heap: [], mainStr: 'Blocked (Barrier)', pumpStr: 'Started by callback!', error: null },
    { id: 3, text: 'Pump scans heap for 10:01...', heap: [], mainStr: 'Blocked (Barrier)', pumpStr: 'scan → empty ❌', error: 'Heap is empty! 10:01 schedule was never created.' },
    { id: 4, text: 'Pump sleeps 1s and rescans...', heap: [], mainStr: 'Blocked (Barrier)', pumpStr: 'scan → empty ❌', error: 'Still empty. Main loop is needed to push next schedules.' },
    { id: 5, text: 'Trigger exits barrier', heap: [], mainStr: 'Trigger exits barrier', pumpStr: 'Stopped by callback!', error: null },
    { id: 6, text: 'Main Loop pushes 1m@10:01', heap: ['10:01'], mainStr: '_schedule_next(10:01)', pumpStr: 'Stopped', error: 'Too late! Pump is already dead.' },
  ];

  useEffect(() => {
    let timer;
    if (playing && step < steps.length - 1) {
      timer = setTimeout(() => setStep(s => s + 1), 2000);
    } else if (playing && step === steps.length - 1) {
      setPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [playing, step]);

  return (
    <div className="w-full bg-black/40 border border-orange-500/20 rounded-2xl p-6 my-10 backdrop-blur-md font-mono text-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-orange-400">
            {lang === 'zh' ? '设计坍塌：Pump 方案的致命缺陷' : 'Design Collapse: The Fatal Flaws of the Pump'}
          </h3>
          <p className="text-gray-400 mt-1">Why a background coroutine cannot solve the freeze</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep(Math.max(0, step - 1))} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded">Prev</button>
          <button onClick={() => { if (step === steps.length - 1) setStep(0); setPlaying(!playing); }} className="px-4 py-1 bg-orange-500/20 text-orange-300 font-bold rounded">
            {playing ? 'Pause' : (step === steps.length - 1 ? 'Replay' : 'Play')}
          </button>
          <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded">Next</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl relative">
            <h4 className="text-blue-400 font-bold mb-2">Main Loop Thread</h4>
            <div className="bg-black/50 p-2 rounded text-gray-300 min-h-[40px] flex items-center">
              {steps[step].mainStr}
            </div>
          </div>
          
          <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl relative">
            <h4 className="text-purple-400 font-bold mb-2">Background Pump Coroutine</h4>
            <div className="bg-black/50 p-2 rounded text-gray-300 min-h-[40px] flex items-center">
              {steps[step].pumpStr}
            </div>
            {steps[step].error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-red-400 text-xs flex items-start gap-2">
                <span>⚠️</span> {steps[step].error}
              </motion.div>
            )}
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col">
          <h4 className="text-gray-400 font-bold mb-4 uppercase text-xs">Schedule Heap Content</h4>
          <div className="flex-1 bg-black/40 rounded border border-white/5 p-4 flex items-center justify-center relative">
             <AnimatePresence>
               {steps[step].heap.length === 0 ? (
                 <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 italic">
                   [ Empty ]
                 </motion.span>
               ) : (
                 steps[step].heap.map(h => (
                   <motion.div key={h} initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-4 py-2 bg-white/10 border border-white/20 rounded shadow-lg text-white font-bold">
                     {h}
                   </motion.div>
                 ))
               )}
             </AnimatePresence>
          </div>
          <div className="mt-4 text-center text-xs text-gray-500">
            {step >= 3 && step <= 4 ? "Pump is desperately searching for schedules that the main loop hasn't pushed yet!" : " "}
          </div>
        </div>
      </div>
      
      <div className="w-full mt-6 text-center text-gray-400 text-sm">
        {steps[step].text}
      </div>
    </div>
  );
}
