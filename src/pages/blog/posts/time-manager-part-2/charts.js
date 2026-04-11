export const chart_core = `
graph TB
    TS["TimeSource<br/>(Live / Backtest)"]
    TM["TimeManager<br/>heap[Schedule...]"]
    S["Strategies<br/>(@on_interval)"]
    SVC["Services<br/>(Backend / Monitoring)"]

    TS -- "now() / sleep_until()" --> TM
    TM -- "Tick(interval, ts, seq)" --> S
    TM -- "Tick(interval, ts, seq)" --> SVC
`;

export const chart_overall = `
graph TB
    subgraph TimeSource["TimeSource"]
        Live["LiveTimeSource<br/>now() = real time<br/>barrier = noop"]
        BT["BacktestTimeSource<br/>FastForward: now() = static<br/>Realtime: now() = anchor + mono - pause"]
    end

    subgraph TM["TimeManager"]
        Heap["_schedule (min-heap)<br/>[1m@10:05, 5m@10:05, 1h@11:00]"]
        MainLoop["Main Loop:<br/>Normal: pop → sleep → exec<br/>CatchUp: pop all → coalesce → exec latest"]
        LST["_last_schedule_time<br/>(always grid-aligned)"]
    end

    subgraph Consumers["Consumers"]
        Strategy["Strategy<br/>@on_interval<br/>Trigger dispatch<br/>enter/exit barrier"]
        Backend["LocalBackend<br/>_on_1m_tick<br/>matching / SL / TP<br/>tm.now() for pricing"]
        Web["WebService<br/>/api/time/now"]
    end

    TimeSource -- "now() / sleep_until() / barrier" --> TM
    TM -- "Tick(interval, timestamp, sequence)" --> Strategy
    TM -- "Tick(interval, timestamp, sequence)" --> Backend
    TM -- "Tick(interval, timestamp, sequence)" --> Web
`;
