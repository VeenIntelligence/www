import { useLanguage } from '../../../../context/useLanguage';
import Mermaid from '../../../../components/common/Mermaid';
import AnimFrozenTimeline from './components/AnimFrozenTimeline';
import AnimPumpDilemma from './components/AnimPumpDilemma';
import ThreeStateEngine from './components/ThreeStateEngine';
import AnimHybridExecution from './components/AnimHybridExecution';
import AnimRealtimeNow from './components/AnimRealtimeNow';
import AnimCoalesceDemo from './components/AnimCoalesceDemo';
import * as charts from './charts';

function CodeBlock({ children, lang: language }) {
  return (
    <pre className={`language-${language} p-4 rounded-xl bg-[#0d1117] border border-white/10 overflow-x-auto my-6 text-sm`}>
      <code className="text-gray-300 font-mono leading-relaxed">{children}</code>
    </pre>
  );
}

function Quote({ children }) {
  return (
    <blockquote className="border-l-4 border-emerald-500 bg-white/5 p-4 my-6 italic text-gray-300 rounded-r-lg">
      {children}
    </blockquote>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {headers.map((h, i) => <th key={i} className="py-3 px-4 font-bold text-gray-200">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              {row.map((cell, j) => <td key={j} className="py-3 px-4 text-gray-400">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionDivider() {
  return <hr className="my-10 border-white/10" />;
}

/* ──────────────────── English ──────────────────── */

function EnglishContent() {
  return (
    <>
      <h2 className="blog-h2">When Backtest Time Meets the Real World</h2>
      <p className="text-lg text-gray-400 mb-8">The Dual-Mode Evolution of a Quantitative Trading TimeManager</p>

      <p className="blog-p">
        The story of many trading systems begins with these few lines of code:
      </p>

      <CodeBlock lang="python">
{`while True:
    await do_something()
    await asyncio.sleep(60)`}
      </CodeBlock>

      <p className="blog-p">
        In our <a href="/blog/time-manager-part-1" className="text-emerald-400 hover:underline">previous article</a>, we used these lines as a starting point to explain how a quantitative trading system&apos;s &quot;time kernel&quot; — the <code>TimeManager</code> — grew from scratch. We discussed unifying the time source, discrete Ticks, min-heap scheduling, <code>SafeExecutor</code>, and how the &quot;two time philosophies&quot; of backtesting and live trading were folded into a single set of interfaces.
      </p>

      <p className="blog-p">The conclusion of that article:</p>

      <Quote>
        Time must be unified and managed in one place.<br />
        Scheduling should be expressed with data structures, not scattered loops and if/else.
      </Quote>

      <p className="blog-p">
        That conclusion was correct. But we quickly discovered an even more interesting problem:
      </p>

      <Quote>
        <strong>When virtual time in backtesting encounters an operation requiring real waiting — say, a 3-minute LLM call — what should time do?</strong>
      </Quote>

      <p className="blog-p">
        This article is the complete story of how that pitfall was discovered and how we filled it back in.
      </p>

      <SectionDivider />
      <h3 className="blog-h3">A &quot;Perfect&quot; Time Manager Meets Imperfect Reality</h3>

      <p className="blog-p">Let&apos;s quickly recall the core architecture of TimeManager (detailed in the previous post):</p>

      <Mermaid chart={charts.chart_core} />

      <p className="blog-p">
        In this design, <code>BacktestTimeSource</code> acts like an omnipotent fast-forward remote control:
      </p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><code>now()</code> returns a static <code>self.current</code> — the &quot;virtual present&quot;.</li>
        <li><code>sleep_until(target)</code> directly sets <code>self.current = target</code>, jumping to the future instantly.</li>
        <li><code>needs_barrier()</code> returns <code>True</code>, ensuring all handlers complete before advancing time.</li>
      </ul>

      <p className="blog-p">
        This means: one minute in backtesting can be completed in 1 millisecond. No data lookahead, reproducible results, extremely fast.
      </p>

      <p className="blog-p">
        If the entire system only contains millisecond-level operations like &quot;query data → calculate indicators → make decisions → place orders&quot;, this setup is flawless.
      </p>

      <p className="blog-p">
        But in 2025, we introduced LLMs (Large Language Models) into our trading system. An LLM-driven Trigger executing a single <code>check → action</code> pipeline might require <strong>3–5 minutes of real time</strong>: calling APIs, waiting for inference, parsing results, and potentially self-healing a failed function call.
      </p>

      <p className="blog-p">Those 3 minutes are real, physical time flowing in the real world.</p>

      <p className="blog-p font-bold text-white">The question is: during these 3 minutes, what happens to virtual time?</p>

      <SectionDivider />
      <h3 className="blog-h3">Time Freeze: An Unexpected Space-Time Rift</h3>

      <p className="blog-p">
        The answer: in the old design, <strong>virtual time completely froze.</strong>
      </p>

      <p className="blog-p">
        Let&apos;s trace a complete execution chain. When the main loop pops a 1-minute schedule at 10:01 and the handler enters a barrier (LLM call), everything stops. <code>now()</code> keeps returning 10:01, the heap is empty (no future schedules exist yet), and the trading engine can&apos;t execute because the main loop is stuck inside <code>_execute_schedules</code>.
      </p>

      <AnimFrozenTimeline lang="en" />

      <p className="blog-p">
        Note what happened during those 3 minutes: <strong>absolutely nothing.</strong>
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><code>now()</code> keeps returning <code>10:01</code> — because <code>self.current</code> hasn&apos;t changed.</li>
        <li>LLM queries the latest K-line? Sorry, the newest data is forever stuck at 10:00.</li>
        <li>Want to place a limit order? The timestamp will be marked 10:01, but real time is already 10:04.</li>
        <li><code>LocalBackend._on_1m_tick</code> was supposed to fire at 10:02, 10:03? It&apos;s registered on the 1m interval, but the main loop is stuck — it never pops the next schedule.</li>
      </ul>

      <p className="blog-p">
        The old state machine was extremely simple — just two states:
      </p>

      <Table
        headers={['Problem', 'Symptom', 'Root Cause']}
        rows={[
          ['P1: Time frozen', 'LLM sees stale K-lines; order timestamps stuck in the past', 'now() returns static self.current'],
          ['P2: Engine stalled', 'Limit orders never match; SL/TP never triggers', 'Main loop blocked; _schedule_next() never called'],
          ['P3: Events lost', '1m events delayed until barrier releases', 'Only 1 schedule per interval in heap; nothing to pop'],
        ]}
      />

      <p className="blog-p">
        All three problems point to the same root cause. It&apos;s like a DVD player: you can fast-forward or play normally, but when you hit pause, the <em>entire universe</em> freezes — characters don&apos;t age, weather doesn&apos;t change, the plot doesn&apos;t advance.
      </p>

      <Quote>What we need is a hybrid mode that can both fast-forward <strong>and</strong> &quot;flow in real time&quot;.</Quote>

      <SectionDivider />
      <h3 className="blog-h3">First Instinct: A Background &quot;Pump&quot; During the Barrier</h3>

      <p className="blog-p">
        Since the main loop is blocked, the most intuitive idea: during the barrier, start a <strong>background coroutine</strong> to continuously scan the schedule heap and execute due handlers.
      </p>

      <p className="blog-p">
        This was our initial <strong>Pump approach (v1)</strong>. We wrote a complete design document with <code>_run_pump()</code>, <code>set_realtime_callbacks()</code>, a <code>_pump_processed</code> deduplication set, and more.
      </p>

      <p className="blog-p">
        But when we seriously audited this approach, we discovered three fatal flaws:
      </p>

      <AnimPumpDilemma lang="en" />

      <p className="blog-p">
        <strong>Flaw 1: The Pump can&apos;t find future ticks.</strong> The scheduling model is <code>pop → execute → _schedule_next</code>. Each interval keeps only ONE schedule in the heap. After the main loop pops 1m@10:00, the heap is empty for that interval. <code>_schedule_next</code> only runs AFTER execution completes. So the Pump scans and finds... nothing. 10:01, 10:02, 10:03 schedules simply don&apos;t exist yet.
      </p>

      <p className="blog-p">
        <strong>Flaw 2: Dual executor race conditions.</strong> Even if we force early rescheduling, now two executors (main loop + pump) both pop/push the same heap. This requires locks, deduplication, and risks duplicate schedules. This isn&apos;t solvable with a few locks — it&apos;s <strong>architectural ownership chaos</strong>.
      </p>

      <p className="blog-p">
        <strong>Flaw 3: Semantic split.</strong> If the Pump executes the &quot;10:01&quot; tick handler, <code>LocalBackend._on_1m_tick</code> calls <code>tm.now()</code> which returns dynamic time (e.g., 10:03:17). So the &quot;10:01 tick&quot; shell contains 10:03 price data. Neither replay nor coalesce — an <strong>undefined intermediate state</strong>.
      </p>

      <Quote>
        <strong>Verdict:</strong> Phase 1 (now() flowing) — ⚠️ Feasible with pause accounting<br />
        Phase 2 (Pump design) — ❌ Design premise doesn&apos;t hold
      </Quote>

      <p className="blog-p">
        A valuable lesson: <em>the most intuitive solution is often the most dangerous.</em> In concurrent systems, introducing a second executor (pump) to share mutable state (heap) with the first (main loop) almost inevitably leads to intractable race conditions.
      </p>

      <SectionDivider />
      <h3 className="blog-h3">Stepping Back: What Do We Actually Need?</h3>

      <p className="blog-p">
        After rejecting the Pump approach, we returned to first principles:
      </p>

      <Quote>During LLM execution, what does the system <em>actually</em> need to happen?</Quote>

      <p className="blog-p">
        Consider a concrete scenario: backtesting reaches 10:01, a Trigger starts an LLM call. 3 minutes later (real time 10:04), the LLM returns results. During those 3 minutes:
      </p>

      <ol className="blog-ol">
        <li><strong>LLM needs fresh data</strong> → <code>now()</code> must advance. If LLM queries K-lines at 10:03, it should get 10:02&apos;s latest data.</li>
        <li><strong>Timestamps must be accurate</strong> → If LLM places an order at 10:03, the timestamp shouldn&apos;t be 10:01.</li>
        <li><strong>Trading engine needs to recover</strong> → But not necessarily in <em>real-time</em>. Catching up once with the latest state after LLM finishes is enough.</li>
      </ol>

      <p className="blog-p">
        Point 3 was the key cognitive shift. We had assumed &quot;the trading engine must run in real-time&quot;, but think again:
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li>Those 3 minutes of &quot;missed ticks&quot; (10:02, 10:03) are <strong>fictional</strong> — real backtesting shouldn&apos;t consume virtual time for LLM execution.</li>
        <li>Replaying them tick-by-tick uses current price data anyway — semantically dishonest.</li>
        <li>The truly reasonable approach: <strong>wait for LLM to finish, then reconcile once with the latest market state.</strong></li>
      </ul>

      <Quote>
        This is <strong>Coalesce-to-Latest</strong> — and it&apos;s the philosophical foundation of our final design.
      </Quote>

      <SectionDivider />
      <h3 className="blog-h3">The New Design: Three-State Engine</h3>

      <p className="blog-p">
        The Pump approach tried to <em>proactively</em> execute during the barrier. The Coalesce approach chose a smarter path: <strong>let time flow naturally during the barrier, then passively catch up and merge after it ends.</strong>
      </p>

      <ThreeStateEngine lang="en" />

      <Table
        headers={['State', 'When', 'now() Behavior', 'Main Loop', 'Trading Engine']}
        rows={[
          ['FastForward', 'Normal backtesting', 'Returns static current', 'Instant jumps', 'Precise per-tick execution'],
          ['Realtime', 'Trigger executing LLM', 'anchor + real elapsed - paused', 'Continues running with timeouts', 'Paused'],
          ['CatchUp', 'After LLM completes', 'Returns fixed current', 'Batch pop overdue → coalesce', 'Single reconciliation with latest data'],
        ]}
      />

      <h3 className="blog-h3">A Complete Execution Timeline</h3>

      <p className="blog-p">
        Let&apos;s thread all three states together. Watch how a complete LLM execution flows through the engine:
      </p>

      <AnimHybridExecution lang="en" />

      <SectionDivider />
      <h3 className="blog-h3">Phase 1 Deep Dive: Making now() &quot;Come Alive&quot;</h3>

      <p className="blog-p">
        The entire solution is implemented in two phases. Phase 1 only modifies <code>BacktestTimeSource</code>&apos;s core methods — <strong>zero changes</strong> to TimeManager, Trigger, Strategy, or Episode.
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">Core Idea: Time Anchor + Real Elapsed</h4>

      <p className="blog-p">
        When entering Realtime mode, record two &quot;anchors&quot;:
      </p>

      <AnimRealtimeNow lang="en" />

      <p className="blog-p">
        This deceptively simple formula encodes several important design decisions:
      </p>

      <p className="blog-p">
        <strong>1. Uses <code>time.monotonic()</code> instead of <code>time.time()</code></strong> — <code>monotonic()</code> is monotonically increasing and immune to system clock adjustments (NTP sync, manual time changes, daylight saving). When measuring &quot;how much time has passed&quot;, it&apos;s the only correct choice.
      </p>

      <p className="blog-p">
        <strong>2. Multiple Triggers share a single anchor.</strong> Only the <em>first</em> Trigger to enter a barrier anchors time. Subsequent triggers share the same anchor. This ensures that even with concurrent LLM calls, they all see consistent <code>now()</code> values — all computed from the same starting point.
      </p>

      <CodeBlock lang="python">
{`# Trigger A enters → count: 0→1 → Anchor set!
# Trigger B enters → count: 1→2 → Shares A's anchor
# Trigger B exits  → count: 2→1 → Stay Realtime  
# Trigger A exits  → count: 1→0 → Fix current, → CatchUp`}
      </CodeBlock>

      <p className="blog-p">
        <strong>3. <code>current</code> never goes backward:</strong>
      </p>

      <CodeBlock lang="python">
{`self.current = max(self.current, min(advanced, self.end))
#              ^^^                          ^^^
#              Never backward               Never exceed end`}
      </CodeBlock>

      <p className="blog-p">
        The <code>max + min</code> &quot;pincer&quot; ensures two boundary conditions: <code>max</code> guarantees monotonic increase — even under anomalies, time never rewinds. <code>min</code> ensures we never exceed the backtest end time — or <code>is_finished()</code> semantics would break.
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">Pause Accounting: When the User Hits Pause</h4>

      <p className="blog-p">
        While auditing Phase 1, we discovered a subtle issue: what if the user pauses during LLM execution?
      </p>

      <p className="blog-p">
        <code>time.monotonic()</code> doesn&apos;t know what &quot;pause&quot; means. If the user pauses for 30 seconds, those 30 seconds shouldn&apos;t be counted as virtual time. The solution: <strong>pause duration accounting</strong> — precisely recording pause duration and subtracting it from the formula.
      </p>

      <p className="blog-p">
        There&apos;s an elegant subtlety: <strong>the pause callback is called explicitly by <code>TradeApp</code></strong>, not checked inside <code>now()</code> on every call. Why? Because <code>now()</code> is a hot path — called on every LLM query, every order, every log entry. Checking an Event lock on the hot path is unwise. Instead, pause/resume are low-frequency operations (manually triggered), and a single callback on the low-frequency path has negligible cost.
      </p>

      <SectionDivider />
      <h3 className="blog-h3">Phase 2 Deep Dive: The Elegance of CatchUp &amp; Coalesce</h3>

      <p className="blog-p">
        Phase 1 made <code>now()</code> stop freezing during barriers. But P2 (engine stalled) and P3 (events lost) remain unsolved — because the main loop is still blocked.
      </p>

      <p className="blog-p">
        Phase 2&apos;s strategy: <strong>don&apos;t do anything during the barrier — do one efficient &quot;catch-up&quot; after it ends.</strong>
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">The Coalesce-to-Latest Algorithm</h4>

      <p className="blog-p">
        When the main loop resumes and finds the heap&apos;s top schedule is overdue (e.g., top is 10:02 but <code>current</code> is already 10:04), it enters CatchUp mode:
      </p>

      <AnimCoalesceDemo lang="en" />

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">Why Not Replay Each One?</h4>

      <Table
        headers={['Dimension', 'Replay', 'Coalesce']}
        rows={[
          ['Executions', '3 times (10:02→10:03→10:04)', '1 time (10:04 only)'],
          ['Price source', 'All use tm.now() = 10:04', 'tm.now() = 10:04'],
          ['Actual difference', 'Same data run 3 times', 'Run once'],
          ['Semantics', '"Pretend" per-minute replay', 'Explicit latest-state reconciliation'],
          ['Code changes', 'Heap + Backend + Data layer', 'Only TimeManager minor modification'],
          ['Data integrity', 'Pseudo-replay (timestamp vs data mismatch)', 'True coalesce (consistent)'],
        ]}
      />

      <p className="blog-p">
        Replay&apos;s core contradiction: you <em>claim</em> to replay 10:02&apos;s tick, but <code>LocalBackend._on_1m_tick</code> actually uses <code>tm.now()</code> to get 10:04&apos;s price. This isn&apos;t replay — it&apos;s coalesce wearing replay&apos;s costume. Better to just coalesce honestly.
      </p>

      <p className="blog-p">
        The deeper philosophical question: are the ticks missed during the barrier truly events that &quot;should be individually observed&quot;, or are they a scheduling gap caused by a long-running decision? Force-replaying them would disguise &quot;strategy thinking time&quot; as &quot;the market gave you 3 independent decision opportunities.&quot; That&apos;s actually <em>less</em> realistic.
      </p>

      <p className="blog-p">
        It&apos;s much like real trading — you spend 3 minutes thinking, the world doesn&apos;t politely pause those 3 minutes for you. When you snap back, you face the <em>current</em> order book and <em>current</em> K-line, not a tape-rewound market replayed frame by frame.
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4"><code>_last_schedule_time</code>: Preventing Dynamic Time from Polluting Schedule Boundaries</h4>

      <p className="blog-p">
        Phase 2 also solved a more insidious problem. The old design had a <code>_current_time</code> field pulling double duty:
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>Role 1:</strong> Schedule anchor — align to grid (10:00, 10:01, 10:02…)</li>
        <li><strong>Role 2:</strong> Execution timestamp — used in Tick construction</li>
      </ul>

      <p className="blog-p">
        If this field gets set to <code>now() = 10:03:17</code>, then <code>align(10:03:17, 5m) = 10:03:17</code> — permanently offset from the clean grid. The fix: split into a new <code>_last_schedule_time</code> that is <strong>only updated with grid-aligned boundary times</strong>:
      </p>

      <CodeBlock lang="python">
{`# Normal path: always grid-aligned
self._last_schedule_time = target_time  # 10:01, 10:02... always on grid

# CatchUp path: also grid-aligned
self._last_schedule_time = max(s.next_time for s in to_execute)`}
      </CodeBlock>

      <p className="blog-p">
        The dynamic <code>now()</code> value (with seconds) is never assigned to this field. This ensures that no matter when a handler is dynamically registered, its first trigger always falls on a K-line boundary.
      </p>

      <p className="blog-p">Think of the new design as two layers of time:</p>

      <Table
        headers={['Field', 'Semantics', 'Example Values']}
        rows={[
          ['now()', 'Current observation time', 'Dynamic during Realtime (10:03:17)'],
          ['_last_schedule_time', 'Current schedule boundary', 'Always grid points (10:03:00)'],
        ]}
      />

      <p className="blog-p">
        This is a classic engineering convergence: not adding a field, but <em>splitting apart two semantics that were incorrectly merged</em>.
      </p>

      <SectionDivider />
      <h3 className="blog-h3">Overall Architecture: The Upgraded TimeManager Panorama</h3>

      <Mermaid chart={charts.chart_overall} />

      <SectionDivider />
      <h3 className="blog-h3">Risk Mitigation: Why We&apos;re Confident</h3>

      <p className="blog-p">Any architectural change must answer: &quot;Could this make things worse?&quot;</p>

      <Table
        headers={['Risk', 'Severity', 'Mitigation']}
        rows={[
          ['CatchUp skips "important" ticks', '🟡', 'Only skips intermediate ticks of the same interval; final execution uses latest price'],
          ['current goes backward', '🔴', 'exit_barrier uses max(current, adv)'],
          ['Exceeds end time', '🟡', 'Both now() and exit use min(candidate, end)'],
          ['Dynamic registration grid offset', '🔴', '_last_schedule_time always uses boundary times'],
          ['Time overcounts during pause', '🟡', 'Pause accounting precisely deducts pause duration'],
          ['Live mode affected', '✅', 'needs_barrier()=False, no new logic activates'],
        ]}
      />

      <p className="blog-p">
        The last row deserves special emphasis: <strong>the entire change is completely inert in Live mode.</strong> <code>LiveTimeSource.needs_barrier()</code> returns <code>False</code>, <code>enter_barrier()</code> / <code>exit_barrier()</code> are no-ops, <code>now()</code> is just <code>datetime.now()</code>. All new code paths — Realtime anchoring, pause accounting, CatchUp coalesce — only activate in backtest mode. We&apos;re doing surgery on the backtest engine while the live engine is completely isolated.
      </p>

      <SectionDivider />
      <h3 className="blog-h3">Change Scope: Minimal Changes, Maximum Impact</h3>

      <p className="blog-p"><strong>Phase 1: BacktestTimeSource changes (~50 lines)</strong></p>
      <Table
        headers={['Item', 'Content']}
        rows={[
          ['New fields', '_anchor_virtual, _anchor_real, _paused_duration, _pause_start'],
          ['Rewritten methods', 'now(), enter_barrier(), exit_barrier()'],
          ['New methods', 'on_pause(), on_resume()'],
        ]}
      />

      <p className="blog-p"><strong>Phase 2: TimeManager changes (~60 lines)</strong></p>
      <Table
        headers={['Item', 'Content']}
        rows={[
          ['Rename', '_current_time → _last_schedule_time'],
          ['New method', '_catchup()'],
          ['Main loop', 'New CatchUp branch (overdue detection)'],
        ]}
      />

      <p className="blog-p"><strong>Adapter layer (~2 lines)</strong></p>
      <Table
        headers={['Item', 'Content']}
        rows={[
          ['app.py', 'Pause toggle calls ts.on_pause() / ts.on_resume()'],
        ]}
      />

      <p className="blog-p">
        Total: about <strong>110 lines</strong> of new/modified code.
      </p>

      <p className="blog-p">
        The list of files that <em>don&apos;t</em> need changing is actually longer and more meaningful:
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>Trigger</strong> — already correctly uses enter_barrier()/exit_barrier(), zero changes</li>
        <li><strong>Strategy / Episode</strong> — only uses get_time_manager().now(), automatically benefits</li>
        <li><strong>LocalBackend</strong> — _on_1m_tick registered on 1m interval, CatchUp automatically drives it</li>
        <li><strong>DataService</strong> — time comes from tm.now(), automatically gets fresh data in Realtime</li>
      </ul>

      <Quote>
        This is the dividend of good abstraction design: <strong>one precise surgery at the kernel layer, and all upper-layer consumers automatically benefit without any modification.</strong>
      </Quote>

      <SectionDivider />
      <h3 className="blog-h3">Takeaways: What We Learned from TimeManager&apos;s Evolution</h3>

      <p className="blog-p">Looking back at the entire process, compressed into 5 key lessons:</p>

      <ol className="blog-ol">
        <li><strong>Unified Clock</strong> — The system still insists on a single time kernel. This baseline never changed.</li>
        <li><strong>Runtime Switching</strong> — New capability comes from runtime switching <em>within</em> the backtest clock, not building a second time system.</li>
        <li><strong>Pause Accounting</strong> — Once time starts flowing, pausing must become a first-class semantic, not just &quot;stopping the UI for a moment&quot;.</li>
        <li><strong>Semantic Separation</strong> — <code>now()</code> and <code>_last_schedule_time</code> represent different semantics and must be decoupled.</li>
        <li><strong>CatchUp over Replay</strong> — Facing overdue ticks during barriers, choose latest-state reconciliation over mechanical replay.</li>
      </ol>

      <p className="blog-p">Behind these five keywords are three deeper lessons:</p>

      <p className="blog-p">
        <strong>Lesson 1: The most intuitive approach is often the most dangerous.</strong> The Pump approach seemed perfectly reasonable: main loop blocked? Start a background coroutine to compensate! But it introduced dual-executor competition, heap ownership splitting, and undefined time semantics. In concurrent systems, &quot;add another executor&quot; is almost never the optimal solution.
      </p>

      <p className="blog-p">
        <strong>Lesson 2: Understanding &quot;what you actually need&quot; matters more than &quot;implementation details&quot;.</strong> The cognitive shift from &quot;we need to drive the trading engine during the barrier&quot; to &quot;we need to catch up with latest state after the barrier&quot; was the key moment that birthed the v2 design.
      </p>

      <p className="blog-p">
        <strong>Lesson 3: Good abstraction is the strongest leverage.</strong> Through an extremely restrained kernel-level tweak (under 110 lines of code), all upper-layer engine consumers automatically gain this &quot;space-time magic&quot; without even knowing it happened.
      </p>

      <Quote>The kernel absorbs complexity so the business layer isn&apos;t contaminated.</Quote>
    </>
  );
}

/* ──────────────────── Chinese ──────────────────── */

function ChineseContent() {
  return (
    <>
      <h2 className="blog-h2">当回测时间遇上真实世界</h2>
      <p className="text-lg text-gray-400 mb-8">量化交易 TimeManager 的双模式进化</p>

      <p className="blog-p">
        很多交易系统的故事，都是从这样几行代码开始的：
      </p>

      <CodeBlock lang="python">
{`while True:
    await do_something()
    await asyncio.sleep(60)`}
      </CodeBlock>

      <p className="blog-p">
        在<a href="/blog/time-manager-part-1" className="text-emerald-400 hover:underline">上一篇文章</a>里，我们用这几行代码作为起点，讲述了一个量化交易系统的&quot;时间内核&quot;——<code>TimeManager</code>——是如何从零开始长出来的。我们谈到了统一时间源、离散 Tick、最小堆调度、<code>SafeExecutor</code>、以及回测和实盘&quot;两种时间哲学&quot;如何被折叠进同一套接口。
      </p>

      <p className="blog-p">那篇文章的结尾是这样写的：</p>

      <Quote>
        时间要统一到一个地方管理。<br />
        调度要用数据结构表达，而不是靠一堆散落的循环和 if/else 支撑。
      </Quote>

      <p className="blog-p">
        这个结论没错。但我们很快发现了一个更有趣的问题：
      </p>

      <Quote>
        <strong>当回测中的虚拟时间碰上了需要真实等待的操作（比如一次持续 3 分钟的 LLM 调用），时间应该怎么办？</strong>
      </Quote>

      <p className="blog-p">
        这篇文章，就是讲这个坑怎么挖出来、怎么填回去的完整故事。
      </p>

      <SectionDivider />
      <h3 className="blog-h3">&quot;完美&quot;的时间管理器，遇上了不完美的现实</h3>

      <p className="blog-p">先快速回忆一下 TimeManager 的核心架构（详见上篇）：</p>

      <Mermaid chart={charts.chart_core} />

      <p className="blog-p">
        在这套设计里，<code>BacktestTimeSource</code> 像一个万能的快进遥控器：
      </p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><code>now()</code> 返回一个静态的 <code>self.current</code>——&quot;虚拟现在&quot;。</li>
        <li><code>sleep_until(target)</code> 直接把 <code>self.current = target</code>，瞬间跳到未来。</li>
        <li><code>needs_barrier()</code> 返回 <code>True</code>，确保所有 handler 完成后再推进时间。</li>
      </ul>

      <p className="blog-p">
        这意味着：回测中的一分钟，可以在 1 毫秒内完成。数据不穿越、结果可复现、速度极快。
      </p>

      <p className="blog-p">
        如果整个系统里只有&quot;查数据 → 算指标 → 做决策 → 下单&quot;这些毫秒级操作，这套是没问题的。
      </p>

      <p className="blog-p">
        但在 2025 年，我们在交易系统里引入了 LLM（大语言模型）。一个由 LLM 驱动的 Trigger，执行一次 <code>check → action</code> 的链路，可能需要 <strong>3~5 分钟真实时间</strong>：它要调用 API、等待推理、解析返回、可能还要自我修复一次失败的函数调用。
      </p>

      <p className="blog-p">这 3 分钟，是真实世界里实打实流过去的时间。</p>

      <p className="blog-p font-bold text-white">问题来了：在这 3 分钟里，虚拟时间怎么办？</p>

      <SectionDivider />
      <h3 className="blog-h3">时间冻结：一个我们没预料到的&quot;时空裂缝&quot;</h3>

      <p className="blog-p">答案是：在旧设计里，<strong>虚拟时间完全冻结了。</strong></p>

      <p className="blog-p">
        让我们追踪一次完整的执行链路。当主循环从堆中弹出 1m@10:01 的调度，handler 进入 barrier（LLM 调用）后，一切停止了。<code>now()</code> 始终返回 10:01，堆是空的（未来的调度还不存在），交易引擎无法执行因为主循环卡在 <code>_execute_schedules</code> 里面。
      </p>

      <AnimFrozenTimeline lang="zh" />

      <p className="blog-p">
        注意中间那 3 分钟发生了什么：<strong>什么都没有。</strong>
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><code>now()</code> 一直返回 <code>10:01</code>——因为 <code>self.current</code> 没有变。</li>
        <li>LLM 去查最新 K 线？对不起，你能看到的最新数据永远停在 10:00。</li>
        <li>想下一个限价单？时间戳会被标记为 10:01，实际上此刻真实世界已经是 10:04。</li>
        <li><code>LocalBackend._on_1m_tick</code> 本该在 10:02、10:03 被执行？它注册在 1m interval 上，但主循环卡在 <code>_execute_schedules</code> 里面，根本不会去 pop 下一个 schedule。</li>
      </ul>

      <p className="blog-p">旧设计的状态机极其简单——只有两个状态：</p>

      <Table
        headers={['问题', '表现', '根因']}
        rows={[
          ['P1: 时间冻结', 'LLM 看不到新 K 线，开仓时间戳停在过去', 'now() 返回静态 self.current'],
          ['P2: 交易引擎停摆', '限价单不撮合、止损止盈不触发', '主循环阻塞，_schedule_next() 没被调用'],
          ['P3: 1m trigger 不响应', '新的 1m 事件被延迟到 barrier 释放后才追赶', '堆中只有 1 个 schedule，无法 pop'],
        ]}
      />

      <p className="blog-p">
        三个核心问题全部指向同一个根因。这就像是一台 DVD 播放器：你可以快进，也可以正常播放，但当你按下暂停键的时候，<em>整个宇宙</em>都凝固了——角色不会老，天气不会变，剧情不会推进。
      </p>

      <Quote>而我们需要的，是一种既能快进又能&quot;真实流逝&quot;的混合模式。</Quote>

      <SectionDivider />
      <h3 className="blog-h3">第一个念头：在 barrier 期间开一个后台 &quot;Pump&quot;</h3>

      <p className="blog-p">
        既然主循环被堵死了，最直觉的想法是：在 barrier 生效期间，开一个<strong>后台协程</strong>来持续扫描调度堆、执行到期的 handler。
      </p>

      <p className="blog-p">
        这就是我们最初的 <strong>Pump 方案（v1）</strong>。我们写出了完整的设计文档，包括 <code>_run_pump()</code>、<code>set_realtime_callbacks()</code>、<code>_pump_processed</code> 去重集合等一系列代码。
      </p>

      <p className="blog-p">
        但当我们认真审计这个方案时，发现了三个致命问题：
      </p>

      <AnimPumpDilemma lang="zh" />

      <p className="blog-p">
        <strong>致命问题 1：Pump 根本拿不到未来的 tick。</strong>当前调度模型是 <code>pop → execute → _schedule_next</code>，每个 interval 在堆中只保留一个 schedule。主循环 pop 之后、<code>_schedule_next</code> 之前，堆中该 interval 为空。Pump 从堆里根本找不到 10:01、10:02、10:03 的 schedule——因为它们还没被创建。
      </p>

      <p className="blog-p">
        <strong>致命问题 2：双执行体竞争堆所有权。</strong>即使我们想办法让 Pump 能看到 schedule（比如提前 reschedule），新的问题马上浮现：Pump 和主循环同时 pop/push 同一个堆 → 需要锁。<code>_pump_processed</code> 去重集合无法覆盖所有边界情况。两个执行体各自 reschedule → 可能产生重复 schedule。这不是加几把锁就能解决的问题。这是<strong>架构层面的所有权混乱</strong>。
      </p>

      <p className="blog-p">
        <strong>致命问题 3：时间语义分裂。</strong>如果 Pump 确实执行了 10:01 的 tick handler，<code>LocalBackend._on_1m_tick</code> 会用 <code>tm.now()</code> 取价格——返回的是动态时间（比如 10:03:17）。同一个&quot;10:01 tick&quot;的壳子里，装的是 10:03 的价格数据。这既不是 replay，也不是 coalesce——是一个<strong>未定义的中间态</strong>。
      </p>

      <Quote>
        Phase 1: now() 时间流动 — ⚠️ 基本可行，需补 pause accounting<br />
        Phase 2: Pump 设计 — ❌ 设计前提不成立
      </Quote>

      <p className="blog-p">
        这是一次很好的教训：<em>看起来最直觉的方案，往往在细节上最先塌方。</em>在并发系统中，引入第二个执行体（pump）来和第一个（主循环）共享可变状态（堆），几乎必然带来难以收拾的竞态问题。
      </p>

      <SectionDivider />
      <h3 className="blog-h3">退后一步：到底需要什么？</h3>

      <p className="blog-p">在推翻 Pump 方案之后，我们重新回到原点思考：</p>

      <Quote>LLM 执行期间，系统<em>真正</em>需要发生什么？</Quote>

      <p className="blog-p">
        考虑一个实际场景：回测到 10:01，Trigger 开始执行 LLM 调用。3 分钟后（真实时间 10:04），LLM 返回了结果。在这 3 分钟里：
      </p>

      <ol className="blog-ol">
        <li><strong>LLM 本身需要能看到新数据</strong> → <code>now()</code> 必须推进。如果 LLM 在 10:03 查询 K 线，它应该能拿到 10:02 的最新数据。</li>
        <li><strong>开仓/关仓的时间戳要准确</strong> → 如果 LLM 在 10:03 下单，时间戳不该是 10:01。</li>
        <li><strong>交易引擎需要恢复</strong> → 但不一定需要<strong>立即</strong>恢复。等 LLM 完成后，补跑一次最新状态就够了。</li>
      </ol>

      <p className="blog-p">
        第 3 点是关键的认知转变。我们之前假设&quot;交易引擎必须实时运行&quot;，但仔细想想：
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li>回测里那 3 分钟的&quot;missed ticks&quot;（10:02、10:03）本身就是<strong>虚构</strong>的——真实回测本不该为 LLM 执行消耗虚拟时间。</li>
        <li>逐分钟 replay 这些 tick，用的还是当前时间的价格数据，语义上也是错的。</li>
        <li>真正合理的做法是：<strong>等 LLM 做完决策，然后用最新的市场状态做一次&quot;对账&quot;。</strong></li>
      </ul>

      <Quote>
        这就引出了我们最终采用的方案：<strong>Coalesce-to-Latest（合并到最新）</strong>——也是整个最终设计的哲学基础。
      </Quote>

      <SectionDivider />
      <h3 className="blog-h3">新设计：三态引擎——FastForward、Realtime、CatchUp</h3>

      <p className="blog-p">
        Pump 方案试图在 barrier 期间<em>主动补跑</em>。Coalesce 方案则选择了一条更聪明的路：<strong>在 barrier 期间让时间自然流动，barrier 结束后被动追赶并合并。</strong>
      </p>

      <ThreeStateEngine lang="zh" />

      <Table
        headers={['状态', '什么时候', 'now() 行为', '主循环', '交易引擎']}
        rows={[
          ['FastForward', '正常回测', '返回静态 current', '瞬间跳跃', '每个 tick 精确执行'],
          ['Realtime', 'Trigger 在执行 LLM', 'anchor + 真实流逝 - 暂停', '继续运行（带超时）', '暂停'],
          ['CatchUp', 'LLM 执行完毕', '返回固定 current', '批量弹出 overdue → 合并', '用最新数据补跑一次'],
        ]}
      />

      <h3 className="blog-h3">一次完整的执行时序</h3>

      <p className="blog-p">
        让我们把三个状态串起来，看一次完整的 LLM 执行是怎么走的：
      </p>

      <AnimHybridExecution lang="zh" />

      <SectionDivider />
      <h3 className="blog-h3">Phase 1 深入：让 now() &quot;活&quot;起来</h3>

      <p className="blog-p">
        整个方案分两个阶段实施。Phase 1 只改 <code>BacktestTimeSource</code> 的核心方法，<strong>上层 TimeManager / Trigger / Strategy / Episode 零改动</strong>。
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">核心思想：时间锚点 + 真实流逝</h4>

      <p className="blog-p">进入 Realtime 模式时，记下两个&quot;锚点&quot;：</p>

      <AnimRealtimeNow lang="zh" />

      <p className="blog-p">
        这个公式极其简洁，但蕴含了几个重要的设计决策：
      </p>

      <p className="blog-p">
        <strong>1. 使用 <code>time.monotonic()</code> 而非 <code>time.time()</code></strong>——<code>monotonic()</code> 是单调递增的，不受系统时钟调整（NTP 同步、手动改时间）影响。在需要测量&quot;经过了多久&quot;的场景下，它是唯一正确的选择。
      </p>

      <p className="blog-p">
        <strong>2. 多 Trigger 共享同一个锚点。</strong>只有<em>第一个</em>进入 barrier 的 Trigger 会锚定时间，后续进入的都共享同一个锚点。这保证了即使多个 Trigger 并发执行，它们看到的 <code>now()</code> 也是一致的——都从同一个起点开始计算。
      </p>

      <CodeBlock lang="python">
{`# Trigger A 进入 → count: 0→1 → 锚点设定！
# Trigger B 进入 → count: 1→2 → 共享 A 的锚点
# Trigger B 退出 → count: 2→1 → 保持 Realtime
# Trigger A 退出 → count: 1→0 → 固定 current，→ CatchUp`}
      </CodeBlock>

      <p className="blog-p">
        <strong>3. <code>current</code> 永远不回退：</strong>
      </p>

      <CodeBlock lang="python">
{`self.current = max(self.current, min(advanced, self.end))
#              ^^^                          ^^^
#              不回退                       不超过 end`}
      </CodeBlock>

      <p className="blog-p">
        这个 <code>max + min</code> 的&quot;夹击&quot;确保了两个边界条件：<code>max</code> 保证单调递增——即使出现某种异常，时间也不会倒流。<code>min</code> 保证不超过回测终点——否则 <code>is_finished()</code> 的语义会被打破。
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">Pause Accounting：你以为暂停了，时间真的暂停了吗？</h4>

      <p className="blog-p">
        在审计 Phase 1 设计时，我们发现了一个很容易被忽略的问题：如果用户在 LLM 执行期间按了暂停键呢？
      </p>

      <p className="blog-p">
        <code>time.monotonic()</code> 不知道什么是&quot;暂停&quot;。用户按暂停，真实世界里 30 秒过去了——但这 30 秒不该被算进虚拟时间。解决方案是引入 <strong>pause 时长会计</strong>——精确记录暂停时长，并从 <code>now()</code> 的计算中扣除。
      </p>

      <p className="blog-p">
        这个设计有一个精妙之处：<strong>pause 回调是由 <code>TradeApp</code> 显式调用的</strong>，而不是在 <code>now()</code> 中每次检查 <code>pause_event.is_set()</code>。为什么？因为 <code>now()</code> 是热路径——每次 LLM 查询数据、每次下单、每次日志记录都会调用。在热路径上做 Event 查询和锁竞争是不明智的。相反，pause/resume 是低频操作（用户手动触发），在低频路径上做一次回调，成本可以忽略不计。
      </p>

      <SectionDivider />
      <h3 className="blog-h3">Phase 2 深入：CatchUp 与 Coalesce 的优雅</h3>

      <p className="blog-p">
        Phase 1 让 <code>now()</code> 在 barrier 期间不再冻结。但 P2（交易引擎停摆）和 P3（1m trigger 不响应）还没解决——因为主循环还是被阻塞的。
      </p>

      <p className="blog-p">
        Phase 2 的策略是：<strong>不在 barrier 期间做什么，而是在 barrier 结束后做一次高效的&quot;追赶&quot;。</strong>
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">追赶算法：Coalesce-to-Latest</h4>

      <p className="blog-p">
        当主循环恢复时，它发现堆顶的 schedule 已经过期了（比如堆顶是 10:02，但 <code>current</code> 已经是 10:04）。此时进入 CatchUp 模式：
      </p>

      <AnimCoalesceDemo lang="zh" />

      <h4 className="text-lg font-semibold text-white mt-8 mb-4">为什么不逐个 Replay？</h4>

      <Table
        headers={['维度', 'Replay', 'Coalesce']}
        rows={[
          ['执行次数', '3 次 (10:02→10:03→10:04)', '1 次 (10:04)'],
          ['取价时间', '全用 tm.now() = 10:04', 'tm.now() = 10:04'],
          ['实际差异', '跑了 3 次相同数据的代码', '跑了 1 次'],
          ['语义', '"假装"逐分钟回放', '明确用最新状态"对账"'],
          ['改动范围', '堆结构 + Backend + Data 层', '仅 TimeManager 小修改'],
          ['数据正确性', '伪 replay（时间戳 vs 数据矛盾）', '真 coalesce（一致）'],
        ]}
      />

      <p className="blog-p">
        Replay 的核心矛盾在于：你<em>号称</em>在回放 10:02 的 tick，但 <code>LocalBackend._on_1m_tick</code> 实际用 <code>tm.now()</code> 拿到的是 10:04 的价格。这不是 replay，这是穿着 replay 外衣的 coalesce——还不如直接 coalesce 来得干净诚实。
      </p>

      <p className="blog-p">
        更重要的是哲学层面的问题：barrier 期间错过的这些 tick，到底是真实&quot;应该逐个被看见&quot;的事件，还是因为一次长耗时决策造成的调度空窗？如果我们强行 replay，很容易把&quot;策略思考耗时&quot;伪装成&quot;市场真的给了你 3 次独立决策机会&quot;。这反而不真实。
      </p>

      <p className="blog-p">
        这非常像真实交易里的情况——你花了 3 分钟思考，世界不会礼貌地把这 3 分钟暂停给你。等你回过神来，面对的是&quot;当前盘口&quot;和&quot;当前 K 线&quot;，而不是一个按录像带逐帧回放的市场。
      </p>

      <h4 className="text-lg font-semibold text-white mt-8 mb-4"><code>_last_schedule_time</code>：防止动态时间污染调度边界</h4>

      <p className="blog-p">
        Phase 2 还解决了一个更隐蔽的问题。旧设计里有一个 <code>_current_time</code> 字段，同时承担了两种完全不同的角色：
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>角色 1：</strong>调度锚点——对齐到网格（10:00, 10:01, 10:02…）</li>
        <li><strong>角色 2：</strong>执行时间戳——用于 Tick 构造</li>
      </ul>

      <p className="blog-p">
        如果这个字段被设置为 <code>now() = 10:03:17</code>，那么 <code>align(10:03:17, 5m) = 10:03:17</code>——永久偏离干净的网格。解决方案：将 <code>_current_time</code> 拆分，新增 <code>_last_schedule_time</code>，<strong>只在主循环执行时用边界对齐的 <code>target_time</code> 更新它</strong>：
      </p>

      <CodeBlock lang="python">
{`# 主循环正常路径：永远对齐
self._last_schedule_time = target_time  # 10:01, 10:02... 永远对齐

# CatchUp 路径：也是对齐的
self._last_schedule_time = max(s.next_time for s in to_execute)`}
      </CodeBlock>

      <p className="blog-p">
        永远不把 <code>now()</code> 的动态值（带秒数的）赋给这个字段。这保证了无论何时动态注册 handler，它的首触发都会落在 K 线边界上。
      </p>

      <p className="blog-p">可以把新设计理解成两层时间：</p>

      <Table
        headers={['字段', '语义', '可能的值']}
        rows={[
          ['now()', '当前观察时间', 'Realtime 期间动态递增（10:03:17）'],
          ['_last_schedule_time', '当前调度边界时间', '永远是网格点（10:03:00）'],
        ]}
      />

      <p className="blog-p">
        这是一次很典型的工程收敛：不是多加一个字段，而是把原来混在一起的两种语义彻底拆开。
      </p>

      <SectionDivider />
      <h3 className="blog-h3">整体架构：升级后的 TimeManager 全景</h3>

      <Mermaid chart={charts.chart_overall} />

      <SectionDivider />
      <h3 className="blog-h3">风险与缓解：为什么对这个方案有信心</h3>

      <p className="blog-p">任何架构变更都需要问一个问题：&quot;它会不会把事情搞得更糟？&quot;</p>

      <Table
        headers={['风险', '严重度', '缓解措施']}
        rows={[
          ['CatchUp 跳过了"重要" tick', '🟡', '只跳过同 interval 的中间 tick；最终执行的一次用最新价格'],
          ['current 回退', '🔴', 'exit_barrier 使用 max(current, adv)'],
          ['超过 end 时间', '🟡', 'now() 和 exit 均 min(candidate, end)'],
          ['动态注册对齐偏移', '🔴', '_last_schedule_time 永远用边界时间'],
          ['pause 期间时间多走', '🟡', 'pause accounting 精确扣除 pause 时长'],
          ['Live 模式受影响', '✅', 'needs_barrier()=False，不触发任何新逻辑'],
        ]}
      />

      <p className="blog-p">
        最后一行值得特别强调：<strong>整个改动在 Live 模式下完全不生效。</strong><code>LiveTimeSource.needs_barrier()</code> 返回 <code>False</code>，<code>enter_barrier()</code> / <code>exit_barrier()</code> 是 no-op，<code>now()</code> 就是 <code>datetime.now()</code>。新增的所有代码路径——Realtime 锚点、pause accounting、CatchUp coalesce——只在回测模式下激活。这是一个很重要的安全边界：我们在回测引擎上做手术，实盘引擎完全隔离。
      </p>

      <SectionDivider />
      <h3 className="blog-h3">变更范围：极小的改动，极大的效果</h3>

      <p className="blog-p"><strong>Phase 1: BacktestTimeSource 改动（~50 行）</strong></p>
      <Table
        headers={['项目', '内容']}
        rows={[
          ['新增字段', '_anchor_virtual, _anchor_real, _paused_duration, _pause_start'],
          ['重写方法', 'now(), enter_barrier(), exit_barrier()'],
          ['新增方法', 'on_pause(), on_resume()'],
        ]}
      />

      <p className="blog-p"><strong>Phase 2: TimeManager 改动（~60 行）</strong></p>
      <Table
        headers={['项目', '内容']}
        rows={[
          ['重命名', '_current_time → _last_schedule_time'],
          ['新增方法', '_catchup()'],
          ['主循环', '新增 CatchUp 分支（overdue 检测）'],
        ]}
      />

      <p className="blog-p"><strong>适配层（~2 行）</strong></p>
      <Table
        headers={['项目', '内容']}
        rows={[
          ['app.py', 'pause toggle 时调用 ts.on_pause() / ts.on_resume()'],
        ]}
      />

      <p className="blog-p">
        总共大约 <strong>110 行新增/修改</strong>的代码。
      </p>

      <p className="blog-p">
        不需要修改的文件列表反而更长也更有意义：
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>Trigger</strong> — 已正确使用 enter_barrier()/exit_barrier()，无需任何改动</li>
        <li><strong>Strategy / Episode</strong> — 只通过 get_time_manager().now() 获取时间，自动获益</li>
        <li><strong>LocalBackend</strong> — _on_1m_tick 注册在 1m interval 上，CatchUp 会自动驱动</li>
        <li><strong>DataService</strong> — 时间来自 tm.now()，Realtime 期间自动拿到新数据</li>
      </ul>

      <Quote>
        这就是好的抽象层设计带来的红利：<strong>在底层做了一次精确的手术，所有上层消费者自动获益，无需逐一修改。</strong>
      </Quote>

      <p className="blog-p italic text-gray-500 text-center">内核层吸收复杂度，业务层不被连带污染。</p>

      <SectionDivider />
      <h3 className="blog-h3">收尾：从 TimeManager 的演进中学到的</h3>

      <p className="blog-p">回顾整个过程，如果把这轮演进压缩成 5 个关键词：</p>

      <ol className="blog-ol">
        <li><strong>Unified Clock</strong>：系统仍然坚持只有一个时间内核。这条底线没有变。</li>
        <li><strong>Runtime Switching</strong>：新的能力不是新建第二套时间系统，而是在 backtest 时钟内部做运行时切换。</li>
        <li><strong>Pause Accounting</strong>：一旦时间开始流动，暂停就必须成为一等语义，而不是&quot;顺便停一下 UI&quot;。</li>
        <li><strong>Semantic Separation</strong>：<code>now()</code> 和 <code>_last_schedule_time</code> 代表不同语义，必须拆开。</li>
        <li><strong>CatchUp over Replay</strong>：面对 barrier 期间的 overdue ticks，选择面向最新状态对账，而不是机械 replay。</li>
      </ol>

      <p className="blog-p">这五个关键词背后，是三个更深的教训：</p>

      <p className="blog-p">
        <strong>教训一：最直觉的方案往往最危险。</strong>Pump 方案看起来合理得不能再合理：主循环阻塞了？开个后台协程来补位！但它引入了双执行体竞争、堆所有权分裂、时间语义未定义等一系列问题。在并发系统中，&quot;多加一个执行体&quot;几乎永远不是最优解。
      </p>

      <p className="blog-p">
        <strong>教训二：搞清楚&quot;需求的本质&quot;比&quot;实现的细节&quot;重要得多。</strong>从&quot;我们需要在 barrier 期间驱动交易引擎&quot;到&quot;我们需要在 barrier 结束后用最新状态补跑一次&quot;，这个认知转变才是 v2 方案诞生的关键。
      </p>

      <p className="blog-p">
        <strong>教训三：好的抽象是最强的杠杆。</strong>通过极其克制的内核层级微调（不到 110 行代码），所有上层引擎消费者在甚至不知情的情况下自动获益这套&quot;时空魔法&quot;。
      </p>

      <Quote>内核层吸收复杂度，业务层不被连带污染。</Quote>
    </>
  );
}

export default function TimeManager2Article() {
  const { lang } = useLanguage();
  return lang === 'zh' ? <ChineseContent /> : <EnglishContent />;
}
