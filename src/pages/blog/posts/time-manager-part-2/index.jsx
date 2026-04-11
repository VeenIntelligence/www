import { useLanguage } from '../../../../context/useLanguage';
import Mermaid from '../../../../components/common/Mermaid';
import HybridStateDiagram from './components/HybridStateDiagram';
import AnimFrozenTime from './components/AnimFrozenTime';
import AnimPumpIssue from './components/AnimPumpIssue';
import AnimHybridEngine from './components/AnimHybridEngine';
import * as charts from './charts';

function CodeBlock({ children, lang }) {
  return (
    <pre className={`language-${lang} p-4 rounded-xl bg-[#0d1117] border border-white/10 overflow-x-auto my-6 text-sm`}>
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

function EnglishContent() {
  return (
    <>
      <h2 className="blog-h2">When Backtest Time Meets the Real World, The Dual-Mode Evolution of TimeManager</h2>
      
      <p className="blog-p">
        The story of many trading systems begins with these few lines of code:
      </p>

      <CodeBlock lang="python">
{`while True:
    await do_something()
    await asyncio.sleep(60)`}
      </CodeBlock>

      <p className="blog-p">
        In our <a href="/blog/time-manager-part-1" className="text-emerald-400 hover:underline">previous article</a>, we used these lines as a starting point to explain how a quantitative trading system's "time kernel"—the <code>TimeManager</code>—grew from scratch. We discussed unifying the time source, discrete Ticks, min-heap scheduling, <code>SafeExecutor</code>, and how the "two time philosophies" of backtesting and live trading were folded into a single set of interfaces.
      </p>
      
      <p className="blog-p">
        The conclusion of that article was written like this:
      </p>
      
      <Quote>
        Time must be unified and managed in one place.<br/>
        Scheduling should be expressed with data structures, rather than supported by a scattered pile of loops and if/else statements.
      </Quote>

      <p className="blog-p">
        That conclusion wasn't wrong. But we quickly discovered an even more interesting problem:
      </p>

      <Quote>
        <strong>What should happen to time when virtual time in backtesting meets an operation that requires real waiting (like an LLM call lasting 3 minutes)?</strong>
      </Quote>
      
      <p className="blog-p">
        This article is the complete story of how that pitfall was dug up, and how we filled it back in.
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">A "Perfect" Time Manager Meets an Imperfect Reality</h3>
      <p className="blog-p">
        Let's quickly recall the core architecture of TimeManager (detailed in the previous post):
      </p>

      <Mermaid chart={charts.chart_core} />

      <p className="blog-p">
        In this design, <code>BacktestTimeSource</code> acts like an omnipotent fast-forward remote control:
      </p>
      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
         <li><code>now()</code> returns a static <code>self.current</code> — the "virtual present".</li>
         <li><code>sleep_until(target)</code> directly sets <code>self.current = target</code>, instantly jumping to the future.</li>
         <li><code>needs_barrier()</code> returns <code>True</code>, ensuring everything finishes before advancing time.</li>
      </ul>

      <p className="blog-p">
        This means: one minute in backtesting can be completed in 1 millisecond. No data lookahead, reproducible results, and extremely fast. 
      </p>
      
      <p className="blog-p">
        If the entire system only contains millisecond-level operations like "query data → calculate indicators → make decisions → place orders", this setup is flawless.
      </p>

      <p className="blog-p">
        But in 2025, we introduced LLMs (Large Language Models) into our trading system. A Trigger driven by an LLM executing a single <code>check → action</code> pipeline might require 3~5 minutes of real time: it has to call APIs, wait for inference, parse returns, and potentially self-heal a failed function call.
      </p>

      <p className="blog-p">
        These 3 minutes are solid, flowing time in the real world.
      </p>

      <p className="blog-p font-bold text-white">
        The problem is: In these 3 minutes, what happens to virtual time?
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">Time Freezing: An Unexpected "Space-Time Rift"</h3>
      <p className="blog-p">
        The answer is: in the old design, virtual time was completely frozen. Let's trace a full execution cycle:
      </p>

      <AnimFrozenTime lang="en" />

      <p className="blog-p">
        Notice what happened during those 3 minutes: <strong>Absolutely nothing.</strong>
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><code>now()</code> keeps returning <code>10:01</code> because <code>self.current</code> hasn't changed.</li>
        <li>The LLM wants to check the latest K-line? Sorry, your "latest" data is stuck at 10:00 forever.</li>
        <li>Wants to place a limit order? The timestamp gets marked as 10:01, while in reality the world is already at 10:04.</li>
        <li><code>LocalBackend._on_1m_tick</code> was supposed to execute at 10:02 and 10:03? It's registered on a 1m interval, but the main loop is stuck inside <code>_execute_schedules</code>, entirely unable to pop the next schedule.</li>
      </ul>

      <p className="blog-p">
        The state machine of the old design was overly simple—just two states: FastForward and Blocked. All core issues pointed to the same root cause:
      </p>

      <Table 
        headers={['Problem', 'Symptom', 'Root Cause']}
        rows={[
          ['P1: Time Frozen', 'LLM cannot see new K-lines, order timestamp stuck in past', 'now() returns static self.current'],
          ['P2: Engine Stalled', 'Limit orders unmatched, SL/TP untriggered', 'Main loop blocked, _schedule_next() not called'],
          ['P3: 1m trigger unresponsive', 'New 1m events delayed until barrier releases', 'Heap only holds 1 schedule, cannot pop'],
        ]}
      />

      <p className="blog-p">
        It's like a DVD player: you can fast forward or play normally, but when you press the pause button, the entire universe freezes—characters don't age, WEATHER doesn't change, plots don't progress.
      </p>
      
      <p className="blog-p font-bold text-white">
        What we needed was a hybrid mode capable of both fast-forwarding and exhibiting "real passage".
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">The First Idea: A Background "Pump" during the barrier</h3>
      <p className="blog-p">
        Since the main loop is blocked, the most intuitive idea was: while the barrier is active, start a background coroutine to continuously scan the schedule heap and execute overdue handlers.
      </p>

      <p className="blog-p">
        This was our initial <strong>Pump Strategy (v1)</strong>. We even wrote the full design documentation for it. But when we rigorously audited this scheme, we discovered three fatal flaws.
      </p>

      <AnimPumpIssue lang="en" />

      <h4 className="blog-h4">Fatal Issue 1: Pump cannot obtain future ticks</h4>
      <p className="blog-p">
        Our scheduling model is <code>pop → execute → _schedule_next</code>. <strong>Each interval only retains one schedule in the heap.</strong> After the main loop pops and before <code>_schedule_next</code> occurs, the heap for that interval is completely empty. The Pump scanning the heap would never find 10:01, 10:02, or 10:03 because they literally haven't been created yet!
      </p>

      <h4 className="blog-h4">Fatal Issue 2: Dual executors competing for heap ownership</h4>
      <p className="blog-p">
        Even if we forced early rescheduling, we'd hit race conditions. Pump and the Main Loop simultaneously popping/pushing requires locks, deduplication logic, and risks duplicate schedules. This is an <strong>architectural chaos in ownership</strong>.
      </p>

      <h4 className="blog-h4">Fatal Issue 3: Split Semantic Time</h4>
      <p className="blog-p">
        If the Pump executed the 10:01 tick handler, what price would the engine load? It uses <code>tm.now()</code>. It would put the dynamic time (10:03:17) inside a handler meant for 10:01. This is neither a clean replay nor a clean coalesce—it's an undefined intermediate state.
      </p>

      <p className="blog-p">
        This taught us an invaluable lesson: <strong>The most intuitive solutions often collapse first in the details.</strong>
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">Stepping Back: What do we actually need?</h3>
      <p className="blog-p">
        We forced ourselves to rethink: <em>What truly needs to happen during the LLM execution?</em>
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>LLM itself needs fresh data</strong> → <code>now()</code> must advance.</li>
        <li><strong>Order timestamps must be accurate</strong> → Order placed at 10:03 should reflect 10:03.</li>
        <li><strong>Trading engine must recover</strong> → But it doesn't need to recover <em>immediately</em>. Waiting until the LLM finishes and running reconciliation against the newest state is enough.</li>
      </ul>

      <p className="blog-p">
        Point 3 is a cognitive breakthrough. Those 3 minutes of missing ticks (10:02, 10:03) are fabricated fictions in a backtest. Bypassing the engine for 3 minutes perfectly mirrors real life: The market doesn't freeze or politely queue up disjointed realities while you think. You wake up, look at the <em>current</em> ticker tape, and reconcile.
      </p>

      <p className="blog-p">
        This birthed our final solution: <strong>Coalesce-to-Latest</strong>.
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">New Design: FastForward, Realtime, CatchUp</h3>
      <p className="blog-p">
        Instead of actively "doing things" during the barrier (Pump), the Coalesce scheme is much smarter: <strong>Let time flow naturally during the barrier, then passively catch up and coalesce when the barrier ends.</strong>
      </p>

      <HybridStateDiagram lang="en" />

      <p className="blog-p">
        To truly appreciate the elegance of this, click through the complete lifecycle animation below:
      </p>

      <AnimHybridEngine lang="en" />

      <p className="blog-p">
        The difference between the old and new design is night and day:
      </p>

      <Mermaid chart={charts.chart_compare} />

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">Phase 1 Deep Dive: Bringing now() to Life</h3>
      <p className="blog-p">
        Phase 1 only modifies the <code>BacktestTimeSource</code>. The upper <code>TimeManager / Trigger / Strategy</code> logic requires zero changes. We record two anchors when entering Realtime mode: Virtual Anchor and Real Anchor.
      </p>
      
      <CodeBlock lang="javascript">
{`now() = anchor_virtual 
      + (monotonic() - anchor_real)
      - paused_duration`}
      </CodeBlock>

      <p className="blog-p">
        Using <code>time.monotonic()</code> immune to system clock shifts, enforcing single-anchor sharing across concurrent triggers, and clamping with <code>max(current, ...)</code> prevents time from moving backward.
      </p>

      <h4 className="blog-h4">Pause Accounting</h4>
      <p className="blog-p">
        What if the user clicks PAUSE during the LLM execution? <code>time.monotonic()</code> doesn't know about UI pauses. The solution was <strong>Pause Accounting</strong>. By intercepting pause events and explicitly aggregating paused durations, we subtract it out of the <code>now()</code> calculation, giving perfect accuracy without hot-path locks!
      </p>

      <h3 className="blog-h3">Phase 2 Deep Dive: CatchUp and Coalesce</h3>
      <p className="blog-p">
        Why not Replay? Why Coalesce? Replaying 3 past ticks using the price from minute 3 creates a contradiction between time semantics and data semantics. Coalesce simply discards intermediate ticks of the same interval (10:02, 10:03) and fires only the final cumulative 10:04 tick. 
      </p>

      <h4 className="blog-h4">_last_schedule_time</h4>
      <p className="blog-p">
        We also separated <code>_current_time</code> into a mathematically pristine <code>_last_schedule_time</code>. This variable ensures that dynamically registered handlers align to grid boundaries (e.g. 10:00:00), staying far away from the dynamic jitter of <code>now()</code>.
      </p>

      <h3 className="blog-h3">Conclusion: The Global Architecture</h3>
      
      <Mermaid chart={charts.chart_overall} />

      <p className="blog-p">
        Reviewing the evolution: At the expense of merely ~110 lines of architectural surgery at the lowest kernel layer, all consumer tiers benefited securely. No logic pollution. No phantom threads. Just one engine masterfully expanding and contracting space-time seamlessly.
      </p>

      <ul className="list-decimal pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>Unified Clock:</strong> The system strictness remains.</li>
        <li><strong>Runtime Switching:</strong> Backtest switches clocks on the fly.</li>
        <li><strong>Pause Accounting:</strong> First-class semantics for stopping real time.</li>
        <li><strong>Semantic Separation:</strong> <code>now()</code> vs schedule constraints.</li>
        <li><strong>CatchUp over Replay:</strong> Confront reality newest-first.</li>
      </ul>
    </>
  );
}

function ChineseContent() {
  return (
    <>
      <h2 className="blog-h2">当回测时间遇上真实世界，量化交易 TimeManager 的双模式进化</h2>
      
      <p className="blog-p">
        很多交易系统的故事，都是从这样几行代码开始的：
      </p>

      <CodeBlock lang="python">
{`while True:
    await do_something()
    await asyncio.sleep(60)`}
      </CodeBlock>

      <p className="blog-p">
        在上一篇文章里，我们用这几行代码作为起点，讲述了一个量化交易系统的"时间内核"——<code>TimeManager</code>——是如何从零开始长出来的。我们谈到了统一时间源、离散 Tick、最小堆调度、<code>SafeExecutor</code>、以及回测和实盘"两种时间哲学"如何被折叠进同一套接口。
      </p>
      
      <p className="blog-p">
        那篇文章的结尾是这样写的：
      </p>

      <Quote>
        时间要统一到一个地方管理。<br/>
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

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">"完美"的时间管理器，遇上了不完美的现实</h3>
      <p className="blog-p">
        先快速回忆一下 TimeManager 的核心架构（详见上篇）：
      </p>

      <Mermaid chart={charts.chart_core} />

      <p className="blog-p">
        在这套设计里，<code>BacktestTimeSource</code> 像一个万能的快进遥控器：
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><code>now()</code> 返回一个静态的 <code>self.current</code>——"虚拟现在"。</li>
        <li><code>sleep_until(target)</code> 直接把 <code>self.current = target</code>，瞬间跳到未来。</li>
        <li><code>needs_barrier()</code> 返回 <code>True</code>，确保所有 handler 完成后再推进时间。</li>
      </ul>

      <p className="blog-p">
        这意味着：回测中的一分钟，可以在 1 毫秒内完成。数据不穿越、结果可复现、速度极快。如果整个系统里只有"查数据 → 算指标 → 做决策 → 下单"这些毫秒级操作，这套是没问题的。
      </p>

      <p className="blog-p">
        但在 2025 年，我们在交易系统里引入了 LLM（大语言模型）。一个由 LLM 驱动的 Trigger，执行一次 <code>check → action</code> 的链路，可能需要 3~5 分钟真实时间：它要调用 API、等待推理、解析返回、可能还要自我修复一次失败的函数调用。 这 3 分钟，是真实世界里实打实流过去的时间。
      </p>

      <p className="blog-p font-bold text-white">
        问题来了：在这 3 分钟里，虚拟时间怎么办？
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">时间冻结：一个我们没预料到的"时空裂缝"</h3>
      <p className="blog-p">
        答案是：在旧设计里，虚拟时间完全冻结了。让我们体验一次这个“严重漏洞”的执行链路：
      </p>

      <AnimFrozenTime lang="zh" />

      <p className="blog-p">
        注意中间那 3 分钟发生了什么：<strong>什么都没有。</strong>
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><code>now()</code> 一直返回 <code>10:01</code>——因为 <code>self.current</code> 没有变。</li>
        <li>LLM 去查最新 K 线？对不起，你能看到的最新数据永远停在 10:00。</li>
        <li>想下一个限价单？时间戳会被标记为 10:01，实际上此刻真实世界已经是 10:04。</li>
        <li><code>LocalBackend._on_1m_tick</code> 本该在 10:02、10:03 被执行？它注册在 1m interval 上，但主循环卡在 <code>_execute_schedules</code> 里面，根本不会去 pop 下一个 schedule。</li>
      </ul>

      <p className="blog-p">
        旧设计的状态机极其简单——只有两个状态：FastForward 和 Blocked。三个核心问题全部指向同一个根因：
      </p>

      <Table 
        headers={['问题', '表现', '根因']}
        rows={[
          ['P1: 时间冻结', 'LLM 看不到新 K 线，开仓时间戳停在过去', 'now() 返回静态 self.current'],
          ['P2: 交易引擎停摆', '限价单不撮合、止损止盈不触发', '主循环阻塞，_schedule_next() 没被调用'],
          ['P3: 1m trigger 不响应', '新的 1m 事件被延迟到 barrier 释放后才追赶', '堆中只有 1 个 schedule，无法 pop'],
        ]}
      />

      <p className="blog-p">
        这就像是一台 DVD 播放器：你可以快进，也可以正常播放，但当你按下暂停键的时候，整个宇宙都凝固了——角色不会老，天气不会变，剧情不会推进。
      </p>
      
      <p className="blog-p font-bold text-white">
        而我们需要的，是一种既能快进又能"真实流逝"的混合模式。
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">第一个念头：在 barrier 期间开一个后台 "Pump"</h3>
      <p className="blog-p">
        既然主循环被堵死了，最直觉的想法是：在 barrier 生效期间，开一个后台协程来持续扫描调度堆、执行到期的 handler。这就是我们最初的 <strong>Pump 方案 (v1)</strong>。我们写出了完整的设计文档，但当我们认真审计时，发现了三个致命问题：
      </p>

      <AnimPumpIssue lang="zh" />

      <h4 className="blog-h4">致命问题 1：Pump 根本拿不到未来的 tick</h4>
      <p className="blog-p">
        当前调度模型是 <code>pop → execute → _schedule_next</code>，<strong>每个 interval 在堆中只保留一个 schedule</strong>。主循环 pop 之后、<code>_schedule_next</code> 之前，堆中该 interval 为空。Pump 从堆里根本找不到未来的 schedule ——因为主循环还没去生成它们。
      </p>

      <h4 className="blog-h4">致命问题 2：双执行体竞争堆所有权</h4>
      <p className="blog-p">
        Pump 和主循环同时 pop/push 同一个堆，需要锁。两个执行体各自 reschedule，极易产生重复 schedule。这是架构层面的所有权混乱。
      </p>

      <h4 className="blog-h4">致命问题 3：时间语义分裂</h4>
      <p className="blog-p">
        如果 Pump 确实执行了 10:01 的 tick handler，它用的不是 tick 的时间戳，而是 <code>tm.now()</code> 返回的当前动态时间 10:03:17。同一个"10:01 tick"的壳子里，装的是 10:03 的价格数据。这是一个极度扭曲的未定义中间态。
      </p>

      <p className="blog-p">
        这是一次很好的教训：<strong>看起来最直觉的方案，往往在细节上最先塌方。</strong>
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">退后一步：到底需要什么？</h3>
      <p className="blog-p">
        在推翻 Pump 方案后，我们重新回到原点思考：LLM 执行期间，系统真正需要发生什么？
      </p>

      <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>LLM 本身需要能看到新数据</strong> → <code>now()</code> 必须推进。</li>
        <li><strong>开仓/关仓的时间戳要准确</strong> → 如果 LLM 决策下单，时间戳要是当下真实的。</li>
        <li><strong>交易引擎需要恢复</strong> → 但不一定需要<strong>立即</strong>恢复。等完成任务后补跑即可。</li>
      </ul>

      <p className="blog-p">
        第 3 点是关键的认知转变：回测里那 3 分钟的"错过"事件本身也是虚构的——真正合理的做法是：<strong>等 LLM 做完决策，然后用最新的市场状态做一次"对账"。</strong>
      </p>

      <p className="blog-p">
        这就引出了我们最终采用的方案：<strong>Coalesce-to-Latest（合并到最新）</strong>。
      </p>

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">新设计：三态引擎——FastForward、Realtime、CatchUp</h3>
      <p className="blog-p">
        Pump 方案试图在 barrier 期间主动补跑。Coalesce 方案则选择了一条更聪明的路：<strong>在 barrier 期间让时间自然流动，barrier 结束后被动追赶并合并。</strong>
      </p>

      <HybridStateDiagram lang="zh" />

      <p className="blog-p">
        配合下方的完整执行交互面板，你能立刻明白这是如何完美解决堵塞与时间错误的：
      </p>

      <AnimHybridEngine lang="zh" />

      <p className="blog-p">
        对比旧设计一目了然：
      </p>

      <Mermaid chart={charts.chart_compare} />

      <hr className="my-10 border-white/10" />

      <h3 className="blog-h3">Phase 1 深入：让 now() "活"起来</h3>
      <p className="blog-p">
        进入 Realtime 模式时，记下两个"锚点"：Virtual Anchor 和 Realtime Anchor。
      </p>
      
      <CodeBlock lang="javascript">
{`now() = anchor_virtual 
      + (monotonic() - anchor_real)
      - paused_duration`}
      </CodeBlock>

      <p className="blog-p">
        使用 <code>time.monotonic()</code> 是单调递增的，不受系统时钟调整影响。而且多 Trigger 共享同一个锚点机制保证了哪怕同时并发，起点也高度一致。最巧妙的是 <strong>Pause Accounting（暂停时长会计）</strong>。当用户按暂停，由于 <code>time.monotonic()</code> 没有暂停的概念，我们记录了挂起时长并将其从 <code>now()</code> 的计算中精美地剥离，彻底摆脱了锁阻塞等复杂行为。
      </p>

      <h3 className="blog-h3">Phase 2 深入：CatchUp 与 Coalesce 的优雅</h3>
      <p className="blog-p">
        为什么不逐个 Replay？Replay 的核心矛盾在于：你号称在回放 10:02 的 tick，但实际用到的是 10:04 的价格，这不是 replay。Coalesce 更干净诚实——它摒弃了冗余的过往步骤，用一次最新数据重新对接市场。
      </p>
      <p className="blog-p">
        同时，我们通过拆分 <code>_current_time</code> 引入 <code>_last_schedule_time</code> 保护了所有基于网格注册的定时调度边缘不受到动态真实时间的秒级抖动污染。
      </p>

      <h3 className="blog-h3">整体架构全景</h3>
      
      <Mermaid chart={charts.chart_overall} />

      <p className="blog-p">
        回顾整个过程：<strong>最直觉的方案往往最危险。搞清楚"需求的本质"比"实现的细节"重要得多。好的抽象是最强的杠杆。</strong> 通过极其克制的内核层级微调（不到 110 行代码），所有上层引擎消费者在甚至不知情的情况下自动获益这套时空魔法：
      </p>

      <ul className="list-decimal pl-6 text-gray-300 space-y-2 mb-6">
        <li><strong>Unified Clock</strong>：系统仍然坚持只有一个时间内核。</li>
        <li><strong>Runtime Switching</strong>：在 backtest 时钟内部做运行时切换。</li>
        <li><strong>Pause Accounting</strong>：一旦时间流动，暂停必须成为一等语义。</li>
        <li><strong>Semantic Separation</strong>：<code>now()</code> 与调度时间解耦拆分。</li>
        <li><strong>CatchUp over Replay</strong>：面向最新状态对账，而不是刻板重复。</li>
      </ul>
    </>
  );
}

export default function TimeManager2Article() {
  const { lang } = useLanguage();
  return lang === 'zh' ? <ChineseContent /> : <EnglishContent />;
}
