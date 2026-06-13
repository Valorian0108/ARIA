import React, { useEffect } from "react";
import { Activity, Clock, TrendingUp, BarChart2, Activity as ActivityIcon } from "lucide-react";

export function Neural() {
  useEffect(() => {
    // Inject fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); }
  }, []);

  const fontSpace = { fontFamily: "'Space Grotesk', sans-serif" };
  const fontMono = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div className="min-h-screen text-gray-300 p-6 flex flex-col gap-8 relative overflow-hidden" style={{ backgroundColor: "#08080E" }}>
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* TOP BAR */}
      <header className="flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-widest text-white" style={fontSpace}>ARIA</h1>
          <div className="flex items-center gap-2 px-2 py-1 bg-violet-950/30 rounded-full border border-violet-900/30">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-xs text-violet-200/70" style={fontSpace}>LIVE</span>
          </div>
        </div>
        <div className="text-sm text-gray-500" style={fontMono}>
          UTC {new Date().toISOString().slice(11, 19)}
        </div>
      </header>

      {/* REGIME PANEL */}
      <section className="flex flex-col items-center justify-center py-12 z-10 relative">
        <div className="relative flex items-center justify-center mb-10">
          <div className="absolute w-64 h-64 bg-violet-600/20 rounded-full blur-[40px] animate-pulse" />
          <div className="absolute w-48 h-48 bg-violet-500/10 rounded-full blur-[20px]" />
          <div className="relative flex flex-col items-center justify-center w-56 h-56 rounded-full border border-violet-500/20 bg-violet-950/20 backdrop-blur-sm shadow-[0_0_30px_rgba(124,58,237,0.15)]">
            <span className="text-3xl font-bold text-white tracking-wider" style={fontSpace}>TRENDING</span>
            <span className="text-violet-400 text-sm mt-2 font-medium" style={fontSpace}>87% CONFIDENCE</span>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          {['Trending', 'Ranging', 'Volatile', 'Crisis'].map((regime) => (
            <div 
              key={regime} 
              className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide border transition-all ${
                regime === 'Trending' 
                  ? 'bg-violet-900/40 border-violet-500/50 text-violet-200 shadow-[0_0_15px_rgba(124,58,237,0.2)]' 
                  : 'bg-transparent border-gray-800 text-gray-600'
              }`}
              style={fontSpace}
            >
              {regime.toUpperCase()}
            </div>
          ))}
        </div>

        <div className="text-sm text-violet-300/60 flex items-center gap-2" style={fontSpace}>
          <TrendingUp size={14} className="text-violet-400" />
          Active Sub-strategy: <span className="text-violet-300">Momentum Breakout Strategy</span>
        </div>
      </section>

      {/* SIGNAL GRID */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 z-10">
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xs text-gray-500" style={fontSpace}>ON-CHAIN FLOW</h3>
            <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-medium tracking-wider">BULLISH</span>
          </div>
          <div className="text-sm text-gray-200" style={fontSpace}>Exchange outflows +2.8σ</div>
          <div className="mt-4 h-6 w-full">
            <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
              <path d="M0,20 L10,18 L20,19 L30,15 L40,16 L50,12 L60,10 L70,12 L80,5 L90,8 L100,2" fill="none" stroke="#22c55e" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xs text-gray-500" style={fontSpace}>SENTIMENT SCORE</h3>
            <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-medium tracking-wider">POSITIVE</span>
          </div>
          <div className="text-lg text-white" style={fontMono}>0.74 <span className="text-sm text-gray-600">/ 1.0</span></div>
          <div className="mt-4 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-[74%]" />
          </div>
        </div>

        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xs text-gray-500" style={fontSpace}>FUNDING RATE</h3>
            <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded font-medium tracking-wider">NEUTRAL</span>
          </div>
          <div className="text-lg text-white" style={fontMono}>+0.012% <span className="text-sm text-gray-600">/ 8h</span></div>
          <div className="mt-4 h-6 w-full">
            <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
              <path d="M0,10 L20,11 L40,9 L60,10 L80,12 L100,10" fill="none" stroke="#6b7280" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xs text-gray-500" style={fontSpace}>PRICE STRUCTURE</h3>
            <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-medium tracking-wider">BULLISH</span>
          </div>
          <div className="text-sm text-gray-200" style={fontSpace}>Higher highs forming</div>
          <div className="mt-4 h-6 w-full">
            <svg viewBox="0 0 100 20" className="w-full h-full preserve-aspect-ratio-none">
              <path d="M0,15 L20,10 L40,12 L60,5 L80,8 L100,2" fill="none" stroke="#22c55e" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </section>

      {/* LOWER HALF */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 z-10 flex-1 min-h-[300px]">
        {/* DECISION LOG */}
        <div className="md:col-span-7 flex flex-col">
          <h2 className="text-sm text-gray-400 mb-6 flex items-center gap-2" style={fontSpace}>
            <ActivityIcon size={16} /> REASONING TRAIL
          </h2>
          <div className="flex flex-col gap-4 relative pl-4 border-l border-gray-800">
            <div className="absolute top-0 bottom-0 left-[-1px] w-[2px] bg-gradient-to-b from-violet-500/50 to-transparent h-1/2" />
            
            <div className="relative pb-4">
              <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-500" style={fontMono}>14:32:05</span>
                <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">BUY</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed font-light" style={fontSpace}>
                Entering long: exchange outflows exceeded 3σ threshold + funding rate neutral + trending regime confirmed. Confidence: 91%
              </p>
            </div>

            <div className="relative pb-4">
              <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gray-700" />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-600" style={fontMono}>14:15:22</span>
                <span className="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-bold">HOLD</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed font-light" style={fontSpace}>
                Maintaining position. Minor volatility detected on lower timeframes, but structural trend remains intact. Awaiting clear momentum signal. Confidence: 85%
              </p>
            </div>

            <div className="relative pb-4">
              <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gray-700" />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-600" style={fontMono}>13:42:10</span>
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">SELL</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed font-light" style={fontSpace}>
                Trimming exposure by 20%. Sentiment score dropped slightly and local resistance met. De-risking ahead of news event. Confidence: 78%
              </p>
            </div>
            
            <div className="relative pb-4">
              <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gray-700" />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-600" style={fontMono}>12:05:44</span>
                <span className="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-bold">HOLD</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed font-light" style={fontSpace}>
                Regime shift detected: Ranging → Trending. Initiating strategy rotation to Momentum Breakout. Preparing capital allocation.
              </p>
            </div>
          </div>
        </div>

        {/* PERFORMANCE PANEL */}
        <div className="md:col-span-5 bg-[#0A0A10] border border-gray-800/50 rounded-2xl p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-[30px]" />
          <h2 className="text-sm text-gray-400 mb-6 flex items-center gap-2" style={fontSpace}>
            <BarChart2 size={16} /> PERFORMANCE
          </h2>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs text-gray-500 mb-1" style={fontSpace}>PnL (90d)</div>
              <div className="text-xl text-green-400" style={fontMono}>+12.4%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1" style={fontSpace}>Sharpe Ratio</div>
              <div className="text-xl text-white" style={fontMono}>1.87</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1" style={fontSpace}>Win Rate</div>
              <div className="text-xl text-white" style={fontMono}>68%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1" style={fontSpace}>Max Drawdown</div>
              <div className="text-xl text-red-400" style={fontMono}>-4.2%</div>
            </div>
          </div>

          <div className="mb-6 h-24 w-full border-b border-gray-800/50 relative">
            <svg viewBox="0 0 200 50" className="w-full h-full preserve-aspect-ratio-none">
              <defs>
                <linearGradient id="pnl-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(124, 58, 237, 0.2)" />
                  <stop offset="100%" stopColor="rgba(124, 58, 237, 0)" />
                </linearGradient>
              </defs>
              <path d="M0,45 L10,42 L20,44 L30,35 L40,38 L50,30 L60,25 L70,28 L80,20 L90,22 L100,15 L110,18 L120,10 L130,5 L140,12 L150,8 L160,10 L170,4 L180,6 L190,2 L200,5 L200,50 L0,50 Z" fill="url(#pnl-grad)" />
              <path d="M0,45 L10,42 L20,44 L30,35 L40,38 L50,30 L60,25 L70,28 L80,20 L90,22 L100,15 L110,18 L120,10 L130,5 L140,12 L150,8 L160,10 L170,4 L180,6 L190,2 L200,5" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="flex flex-col gap-2 text-xs text-gray-500" style={fontSpace}>
            <div className="flex justify-between">
              <span>Strategy:</span>
              <span className="text-gray-300">Momentum Breakout</span>
            </div>
            <div className="flex justify-between">
              <span>Backtest period:</span>
              <span className="text-gray-300">90 days</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
