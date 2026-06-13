import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Activity, Clock } from 'lucide-react';

export function WarRoom() {
  const [time, setTime] = useState('');
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.getUTCHours().toString().padStart(2, '0') + ':' +
        now.getUTCMinutes().toString().padStart(2, '0') + ':' +
        now.getUTCSeconds().toString().padStart(2, '0')
      );
      setBlink(b => !b);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const signals = [
    { name: 'Exchange Flow', value: '-1,420 BTC', status: 'BULL', color: '#10B981' },
    { name: 'Funding Rate', value: '0.0031%', status: 'NEUTRAL', color: '#F59E0B' },
    { name: 'Sentiment Score', value: '42.8', status: 'BEAR', color: '#EF4444' },
    { name: 'MACD Structure', value: 'Convergence', status: 'NEUTRAL', color: '#F59E0B' },
    { name: 'On-Chain Whale', value: 'Accumulation', status: 'BULL', color: '#10B981' },
  ];

  const decisionLog = [
    {
      time: '14:22:15 UTC',
      action: 'BUY',
      pair: 'BTC/USDT',
      color: '#10B981',
      reason: 'Entering long position. Ranging regime detected with 83% confidence. Mean-reversion setup confirmed: price at -1.8σ from 24h VWAP, funding rate neutral, sentiment recovering.',
      strategy: 'Mean Reversion',
      confidence: '83%'
    },
    {
      time: '12:05:32 UTC',
      action: 'HOLD',
      pair: 'BTC/USDT',
      color: '#F59E0B',
      reason: 'Maintaining current exposure. Volatility contraction detected. Waiting for MACD crossover confirmation on 4h timeframe before sizing up.',
      strategy: 'Volatility Breakout',
      confidence: '65%'
    },
    {
      time: '09:14:10 UTC',
      action: 'SELL',
      pair: 'ETH/USDT',
      color: '#EF4444',
      reason: 'Taking partial profits. Local top signals triggered: funding rate overheated (>0.05%), momentum divergence on 1h RSI. Reducing position risk.',
      strategy: 'Momentum Scalp',
      confidence: '92%'
    },
    {
      time: '04:55:01 UTC',
      action: 'BUY',
      pair: 'SOL/USDT',
      color: '#10B981',
      reason: 'Executing breakout trade. Price cleared major resistance at $142. On-chain volume spiked 3x average. Trend-following regime intact.',
      strategy: 'Trend Following',
      confidence: '78%'
    },
    {
      time: '01:22:44 UTC',
      action: 'HOLD',
      pair: 'BTC/USDT',
      color: '#F59E0B',
      reason: 'Regime transition detected. Moving from trending to ranging. Pausing new trend entries and switching logic to mean reversion.',
      strategy: 'Regime Monitor',
      confidence: '88%'
    }
  ];

  const dailyPnL = [
    { val: 1.2, isPositive: true },
    { val: -0.4, isPositive: false },
    { val: 2.1, isPositive: true },
    { val: 0.8, isPositive: true },
    { val: -1.5, isPositive: false },
    { val: 3.4, isPositive: true },
    { val: -0.2, isPositive: false },
    { val: 1.1, isPositive: true },
    { val: 0.5, isPositive: true },
    { val: -2.1, isPositive: false },
    { val: 1.8, isPositive: true },
    { val: 2.4, isPositive: true },
    { val: -0.7, isPositive: false },
    { val: 1.4, isPositive: true },
  ];

  return (
    <div 
      className="min-h-screen flex flex-col text-slate-300 font-sans overflow-hidden selection:bg-amber-500/30"
      style={{ backgroundColor: '#0D1117' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .font-mono-custom { font-family: 'IBM Plex Mono', monospace; }
        .text-amber-glow { color: #F59E0B; text-shadow: 0 0 12px rgba(245,158,11,0.4); }
        .bg-amber-glow { background-color: #F59E0B; box-shadow: 0 0 12px rgba(245,158,11,0.4); }
        .border-panel { border-color: rgba(255,255,255,0.06); }
        .bg-panel { background-color: rgba(255,255,255,0.02); }
        .blinking-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}} />

      {/* HEADER BAR */}
      <header className="h-14 border-b border-panel bg-[#090C10] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-amber-500">
            <Activity size={20} />
            <h1 className="font-bold text-lg tracking-wider text-white">ARIA</h1>
          </div>
          <div className="h-4 w-px bg-slate-800 mx-2"></div>
          <span className="text-xs text-slate-500 tracking-widest uppercase font-medium">Adaptive Regime Intelligence</span>
        </div>

        <div className="flex items-center gap-1 font-mono-custom text-xs">
          {['CRISIS', 'VOLATILE', 'RANGING — ACTIVE', 'TRENDING'].map((regime, i) => {
            const isActive = i === 2;
            return (
              <div 
                key={regime}
                className={`px-3 py-1 border border-panel flex items-center justify-center ${isActive ? 'bg-amber-900/20 border-amber-500/50 text-amber-500 font-semibold' : 'text-slate-600'}`}
              >
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-glow mr-2"></div>}
                {regime}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-xs text-slate-400 font-medium">LIVE</span>
          </div>
          <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-xs font-mono-custom">
            SIM MODE
          </div>
          <div className="font-mono-custom text-slate-300">
            {time} <span className="text-slate-600">UTC</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* LEFT COLUMN: Signal Intel */}
        <section className="w-[30%] bg-panel border border-panel rounded-sm flex flex-col">
          <div className="p-4 border-b border-panel">
            <h2 className="text-xs tracking-widest font-bold text-slate-300 flex flex-col">
              SIGNAL INTEL
              <span className="w-8 h-0.5 bg-amber-500 mt-2"></span>
            </h2>
          </div>
          
          <div className="flex-1 p-4 flex flex-col gap-6">
            <div className="space-y-4">
              {signals.map((sig, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <span className="text-sm text-slate-400 w-1/3">{sig.name}</span>
                  <span className="font-mono-custom text-slate-200 text-sm flex-1 text-center">{sig.value}</span>
                  <div className="w-1/4 flex justify-end items-center gap-2">
                    <span className="text-xs font-mono-custom" style={{ color: sig.color }}>{sig.status}</span>
                    <div className="w-2 h-2" style={{ backgroundColor: sig.color }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-panel">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Regime Confidence</span>
                <span className="font-mono-custom text-amber-500 text-sm">83%</span>
              </div>
              <div className="flex gap-1 h-2">
                {[...Array(10)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 ${i < 8 ? 'bg-amber-500' : 'bg-slate-800'}`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: Decision Log */}
        <section className="w-[40%] bg-panel border border-panel rounded-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none"></div>
          
          <div className="p-4 border-b border-panel flex items-center gap-2">
            <h2 className="text-xs tracking-widest font-bold text-slate-300">DECISION LOG</h2>
            <div className={`w-2 h-4 bg-amber-500 blinking-cursor`}></div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {decisionLog.map((log, i) => (
              <div key={i} className="relative pl-4">
                <div 
                  className="absolute left-0 top-0 bottom-0 w-0.5 opacity-70" 
                  style={{ backgroundColor: log.color }}
                ></div>
                
                <div className="flex items-center gap-3 mb-2 font-mono-custom text-xs">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span 
                    className="px-1.5 py-0.5 text-black font-semibold"
                    style={{ backgroundColor: log.color }}
                  >
                    {log.action}
                  </span>
                  <span className="text-slate-400">[Pair: {log.pair}]</span>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed mb-2 font-serif" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {log.reason}
                </p>
                
                <div className="text-xs text-slate-500 font-mono-custom flex gap-4">
                  <span>Strategy: <span className="text-slate-400">{log.strategy}</span></span>
                  <span>Confidence: <span className="text-slate-400">{log.confidence}</span></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN: Performance */}
        <section className="w-[30%] bg-panel border border-panel rounded-sm flex flex-col">
          <div className="p-4 border-b border-panel">
            <h2 className="text-xs tracking-widest font-bold text-slate-300">PERFORMANCE</h2>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-6">
            <div className="space-y-4">
              <div className="bg-[#090C10] p-4 border border-panel flex flex-col gap-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Total PnL</span>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="text-amber-500" size={24} />
                  <span className="text-3xl font-mono-custom text-amber-glow">+12.4%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#090C10] p-4 border border-panel flex flex-col gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Sharpe Ratio</span>
                  <span className="text-xl font-mono-custom text-slate-200">1.87</span>
                </div>
                <div className="bg-[#090C10] p-4 border border-panel flex flex-col gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Max Drawdown</span>
                  <span className="text-xl font-mono-custom text-red-400">-4.2%</span>
                </div>
              </div>

              <div className="bg-[#090C10] p-4 border border-panel flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Win Rate</span>
                  <span className="text-sm font-mono-custom text-slate-200">68%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full w-[68%]"></div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <span className="text-xs text-slate-500 mb-2 block uppercase">Daily PnL (14d)</span>
              <div className="flex items-end h-16 gap-1 w-full border-b border-slate-800 pb-1">
                {dailyPnL.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center h-full gap-1">
                    {d.isPositive ? (
                      <div className="w-full bg-amber-500/80 rounded-t-sm" style={{ height: `${d.val * 15}%` }}></div>
                    ) : (
                      <div className="w-full bg-red-500/40 rounded-b-sm translate-y-full" style={{ height: `${Math.abs(d.val) * 15}%` }}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-panel text-xs text-slate-500 font-mono-custom space-y-1">
              <div className="flex justify-between">
                <span>Active Strategy:</span>
                <span className="text-slate-300">Mean Reversion</span>
              </div>
              <div className="flex justify-between">
                <span>Regime uptime:</span>
                <span className="text-slate-300">4h 23m</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* BOTTOM STATUS BAR */}
      <footer className="h-8 bg-[#090C10] border-t border-panel flex items-center justify-between px-6 font-mono-custom text-[10px] text-slate-500 uppercase tracking-widest shrink-0">
        <div>Last signal update: 14s ago</div>
        <div className="flex items-center gap-4">
          <span>Trades today: 7</span>
          <span className="text-slate-700">|</span>
          <span className="text-green-500/70">Win: 5</span>
          <span className="text-slate-700">|</span>
          <span className="text-red-500/70">Loss: 2</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} />
          Next evaluation: 46s
        </div>
      </footer>
    </div>
  );
}
