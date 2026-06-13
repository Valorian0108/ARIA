import { useEffect, useState, useCallback } from "react";
import { Activity, BarChart2, TrendingUp, Zap, RefreshCw, Shield, Target, AlertTriangle, ChevronDown } from "lucide-react";

const API_BASE = "/api";

type Regime = "TRENDING" | "RANGING" | "VOLATILE" | "CRISIS";
type Action = "BUY" | "SELL" | "HOLD";

interface SignalData {
  price?: number;
  priceChange24h?: number;
  fundingRate?: number;
  macdSignal?: string;
  sentimentScore?: number;
  exchangeFlow?: string;
  exchangeFlowSigma?: number;
  whaleActivity?: string;
  volatility?: number;
  priceStructure?: string;
  fetchedAt?: string;
}

interface AgentState {
  regime: Regime;
  confidence: number;
  strategy: string;
  signals: SignalData;
  lastAction: Action;
  currentPair: string;
  totalPnlPercent: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  tradeCount: number;
  winCount: number;
  updatedAt: string;
}

interface Decision {
  id: number;
  regime: Regime;
  confidence: number;
  strategy: string;
  action: Action;
  pair: string;
  reasoning: string;
  entryPrice: number | null;
  pnlPercent: number | null;
  signals: Record<string, unknown>;
  createdAt: string;
}

interface PairInfo {
  symbol: string;
  label: string;
  name: string;
}

const REGIME_STYLES: Record<Regime, { glow: string; text: string; bg: string; border: string; icon: React.ReactNode }> = {
  TRENDING:  { glow: "shadow-[0_0_50px_rgba(124,58,237,0.3)]",  text: "text-violet-300", bg: "bg-violet-900/25",  border: "border-violet-500/40",  icon: <TrendingUp size={14} /> },
  RANGING:   { glow: "shadow-[0_0_50px_rgba(59,130,246,0.25)]", text: "text-blue-300",   bg: "bg-blue-900/25",    border: "border-blue-500/40",    icon: <Target size={14} /> },
  VOLATILE:  { glow: "shadow-[0_0_50px_rgba(245,158,11,0.2)]",  text: "text-amber-300",  bg: "bg-amber-900/20",   border: "border-amber-500/30",   icon: <Zap size={14} /> },
  CRISIS:    { glow: "shadow-[0_0_50px_rgba(239,68,68,0.2)]",   text: "text-red-400",    bg: "bg-red-900/20",     border: "border-red-500/30",     icon: <AlertTriangle size={14} /> },
};

const ACTION_STYLES: Record<Action, string> = {
  BUY:  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  SELL: "bg-red-500/10 text-red-400 border border-red-500/20",
  HOLD: "bg-gray-800/80 text-gray-400 border border-gray-700",
};

function fmt(n: number | undefined, decimals = 2, suffix = "") {
  if (n === undefined || n === null || !isFinite(n)) return "—";
  return n.toFixed(decimals) + suffix;
}

function fmtPrice(n: number | undefined) {
  if (!n) return "—";
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtChange(n: number | undefined) {
  if (n === undefined || n === null) return "0.00%";
  const sign = n >= 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}

function Clock() {
  const [time, setTime] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{time}</>;
}

function MiniChart({ color = "#7C3AED", data }: { color?: string; data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 20 - ((v - min) / range) * 20;
    return `${x},${y}`;
  }).join(" L ");
  return (
    <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
      <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PnlChart({ decisions }: { decisions: Decision[] }) {
  const trades = decisions.filter((d) => d.pnlPercent !== null).slice().reverse();
  let cumulative = 0;
  const points = [0, ...trades.map((d) => { cumulative += d.pnlPercent ?? 0; return cumulative; })];
  if (points.length < 2) points.push(0, 0);
  const max = Math.max(...points, 0.01);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const W = 200; const H = 50;
  const toSvg = (v: number, i: number) => `${(i / (points.length - 1)) * W},${H - ((v - min) / range) * H}`;
  const pathD = points.map((v, i) => `${i === 0 ? "M" : "L"} ${toSvg(v, i)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pnl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124,58,237,0.25)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0)" />
        </linearGradient>
      </defs>
      <path d={pathD + ` L ${W},${H} L 0,${H} Z`} fill="url(#pnl-g)" />
      <path d={pathD} fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Dashboard() {
  const fontSpace = { fontFamily: "'Space Grotesk', sans-serif" };
  const fontMono  = { fontFamily: "'JetBrains Mono', monospace" };

  const [state, setState]         = useState<AgentState | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [pairs, setPairs]         = useState<PairInfo[]>([]);
  const [pairOpen, setPairOpen]   = useState(false);
  const [switching, setSwitching] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [stateRes, decisionsRes, pairsRes] = await Promise.all([
        fetch(`${API_BASE}/state`),
        fetch(`${API_BASE}/decisions?limit=8`),
        fetch(`${API_BASE}/pairs`),
      ]);
      if (stateRes.ok)     setState(await stateRes.json());
      if (decisionsRes.ok) setDecisions(await decisionsRes.json());
      if (pairsRes.ok)     setPairs(await pairsRes.json());
      setLastRefresh(new Date());
    } catch (_) { /* retry next tick */ }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => void fetchData(), 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const switchPair = async (symbol: string) => {
    setSwitching(true);
    setPairOpen(false);
    try {
      await fetch(`${API_BASE}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair: symbol }),
      });
      setTimeout(() => void fetchData(), 3000);
      setTimeout(() => void fetchData(), 8000);
    } finally {
      setTimeout(() => setSwitching(false), 5000);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await fetch(`${API_BASE}/trigger`, { method: "POST" });
      setTimeout(() => void fetchData(), 5000);
      setTimeout(() => void fetchData(), 12000);
    } finally {
      setTimeout(() => setTriggering(false), 12000);
    }
  };

  const regime      = state?.regime ?? "RANGING";
  const regimeStyle = REGIME_STYLES[regime];
  const signals     = state?.signals ?? {};
  const currentPair = state?.currentPair ?? "BTCUSDT";
  const activePairInfo = pairs.find((p) => p.symbol === currentPair);
  const pairLabel   = activePairInfo?.label ?? currentPair.replace("USDT", "/USDT");

  const priceChange    = signals.priceChange24h;
  const priceUp        = (priceChange ?? 0) >= 0;
  const fundingNum     = signals.fundingRate ?? 0;
  const fundingLabel   = fundingNum > 0.01 ? "BULLISH" : fundingNum < -0.01 ? "BEARISH" : "NEUTRAL";
  const fundingColor   = fundingNum > 0.01 ? "text-emerald-400" : fundingNum < -0.01 ? "text-red-400" : "text-gray-400";
  const sentimentVal   = signals.sentimentScore ?? 0.5;
  const sentimentPct   = Math.round(sentimentVal * 100);
  const sentimentLabel = sentimentPct > 60 ? "POSITIVE" : sentimentPct < 40 ? "NEGATIVE" : "NEUTRAL";
  const sentimentColor = sentimentPct > 60 ? "text-emerald-400" : sentimentPct < 40 ? "text-red-400" : "text-gray-400";
  const sentimentBar   = sentimentPct > 60 ? "bg-emerald-500" : sentimentPct < 40 ? "bg-red-500" : "bg-gray-600";
  const flowSigma      = signals.exchangeFlowSigma ?? 0;
  const flowLabel      = flowSigma > 1 ? "BULLISH" : flowSigma < -1 ? "BEARISH" : "NEUTRAL";
  const flowColor      = flowSigma > 1 ? "text-emerald-400" : flowSigma < -1 ? "text-red-400" : "text-gray-400";

  return (
    <div className="min-h-screen text-gray-300 p-4 md:p-6 flex flex-col gap-5 relative overflow-hidden" style={{ backgroundColor: "#08080E" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      {/* Ambient glow */}
      <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
        regime === "TRENDING" ? "bg-violet-900/10" : regime === "RANGING" ? "bg-blue-900/8" : regime === "VOLATILE" ? "bg-amber-900/8" : "bg-red-900/8"
      }`} />

      {/* ── HEADER ── */}
      <header className="flex justify-between items-center z-10 flex-wrap gap-3" style={fontSpace}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-600/30 border border-violet-500/40 flex items-center justify-center">
              <Shield size={12} className="text-violet-400" />
            </div>
            <span className="text-lg font-bold tracking-[0.2em] text-white">ARIA</span>
          </div>
          <span className="text-[10px] text-gray-600 tracking-widest hidden md:inline">ADAPTIVE REGIME INTELLIGENCE AGENT</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 rounded-full border border-emerald-800/40">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
            <span className="text-[10px] text-emerald-400 tracking-widest">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Pair selector */}
          <div className="relative">
            <button
              onClick={() => setPairOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#0D0D18] border border-gray-700/60 rounded-lg text-gray-300 hover:border-violet-600/50 transition-all"
              style={fontMono}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${switching ? "bg-amber-400 animate-pulse" : "bg-violet-400"}`} />
              {switching ? "SWITCHING…" : pairLabel}
              <ChevronDown size={12} className={`transition-transform ${pairOpen ? "rotate-180" : ""}`} />
            </button>
            {pairOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-[#0D0D18] border border-gray-700/60 rounded-xl overflow-hidden z-50 shadow-xl">
                {pairs.map((p) => (
                  <button
                    key={p.symbol}
                    onClick={() => void switchPair(p.symbol)}
                    className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between hover:bg-violet-900/20 transition-colors ${p.symbol === currentPair ? "text-violet-300" : "text-gray-400"}`}
                    style={fontMono}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px] text-gray-600">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => void handleTrigger()}
            disabled={triggering}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-violet-900/30 border border-violet-700/40 rounded-lg text-violet-300 hover:bg-violet-900/50 transition-all disabled:opacity-50"
            style={fontSpace}
          >
            <RefreshCw size={12} className={triggering ? "animate-spin" : ""} />
            {triggering ? "RUNNING…" : "TRIGGER"}
          </button>

          <span className="text-xs text-gray-600" style={fontMono}>UTC <Clock /></span>
        </div>
      </header>

      {/* ── REGIME HERO ── */}
      <section className="flex flex-col items-center justify-center py-6 z-10">
        <div className="relative flex items-center justify-center mb-6">
          <div className={`absolute w-52 h-52 rounded-full blur-[50px] animate-pulse transition-colors duration-1000 ${
            regime === "TRENDING" ? "bg-violet-600/20" : regime === "RANGING" ? "bg-blue-600/15" : regime === "VOLATILE" ? "bg-amber-500/15" : "bg-red-600/15"
          }`} />
          <div className={`relative flex flex-col items-center justify-center w-48 h-48 rounded-full border backdrop-blur-sm transition-all duration-700 ${regimeStyle.glow} ${regimeStyle.border} ${regimeStyle.bg}`}>
            <div className={`text-xl font-bold tracking-widest ${regimeStyle.text}`} style={fontSpace}>{regime}</div>
            <div className={`text-xs mt-1.5 ${regimeStyle.text} opacity-75`} style={fontSpace}>{state?.confidence ?? 50}% CONFIDENCE</div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500" style={fontMono}>
              <span>{pairLabel}</span>
              <span className="text-gray-700">·</span>
              <span className={priceUp ? "text-emerald-400" : "text-red-400"}>{fmtPrice(signals.price)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(["TRENDING", "RANGING", "VOLATILE", "CRISIS"] as Regime[]).map((r) => (
            <div key={r} className={`px-3 py-1 rounded-full text-[10px] font-medium tracking-wider border transition-all ${r === regime ? `${REGIME_STYLES[r].bg} ${REGIME_STYLES[r].border} ${REGIME_STYLES[r].text}` : "bg-transparent border-gray-800 text-gray-700"}`} style={fontSpace}>
              {r}
            </div>
          ))}
        </div>

        <div className={`text-xs flex items-center gap-2 ${regimeStyle.text} opacity-70`} style={fontSpace}>
          {regimeStyle.icon}
          Sub-strategy: <span className="opacity-100 font-medium">{state?.strategy ?? "Mean Reversion"}</span>
        </div>
      </section>

      {/* ── SIGNAL GRID ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 z-10">
        {/* On-chain flow */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>ON-CHAIN FLOW</h3>
            <span className={`text-[9px] font-medium ${flowColor}`}>{flowLabel}</span>
          </div>
          <div className="text-xs text-gray-200 mt-1 truncate" style={fontSpace}>{signals.exchangeFlow ?? "—"}</div>
          <div className="mt-3 h-5 w-full">
            <MiniChart color={flowSigma >= 0 ? "#22c55e" : "#ef4444"} data={[0.2,0.4,0.3,0.6,0.5,0.8,0.7,1.0]} />
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>SENTIMENT</h3>
            <span className={`text-[9px] font-medium ${sentimentColor}`}>{sentimentLabel}</span>
          </div>
          <div className="text-base text-white mt-1" style={fontMono}>{fmt(sentimentVal, 2)} <span className="text-xs text-gray-600">/ 1.0</span></div>
          <div className="mt-3 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${sentimentBar} transition-all duration-700`} style={{ width: `${sentimentPct}%` }} />
          </div>
        </div>

        {/* Funding rate */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>FUNDING RATE</h3>
            <span className={`text-[9px] font-medium ${fundingColor}`}>{fundingLabel}</span>
          </div>
          <div className="text-base text-white mt-1" style={fontMono}>
            {fundingNum >= 0 ? "+" : ""}{fmt(fundingNum, 4)}% <span className="text-xs text-gray-600">/8h</span>
          </div>
          <div className="mt-3 h-5 w-full">
            <MiniChart color="#6b7280" data={[0.5,0.52,0.48,0.5,0.53,0.5,0.49,0.51]} />
          </div>
        </div>

        {/* Price structure */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>PRICE STRUCTURE</h3>
            <span className={`text-[9px] font-medium ${priceUp ? "text-emerald-400" : "text-red-400"}`}>{priceUp ? "BULLISH" : "BEARISH"}</span>
          </div>
          <div className="text-xs text-gray-200 mt-1 leading-tight" style={fontSpace}>{signals.priceStructure ?? "Consolidating"}</div>
          <div className="mt-3 text-[10px] flex items-center gap-1.5" style={fontMono}>
            <span className={priceUp ? "text-emerald-400" : "text-red-400"}>{fmtChange(priceChange)}</span>
            <span className="text-gray-700">24h</span>
          </div>
        </div>
      </section>

      {/* ── BOTTOM: REASONING TRAIL + PERFORMANCE ── */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5 z-10 flex-1">
        {/* Reasoning trail */}
        <div className="md:col-span-7 flex flex-col">
          <h2 className="text-[10px] text-gray-500 mb-4 flex items-center gap-2 tracking-widest" style={fontSpace}>
            <Activity size={12} /> REASONING TRAIL
          </h2>
          <div className="flex flex-col gap-0 relative pl-5 border-l border-gray-800/80 flex-1">
            <div className="absolute top-0 left-[-1px] w-[2px] bg-gradient-to-b from-violet-500/60 via-violet-500/10 to-transparent" style={{ height: "55%" }} />
            {decisions.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-700" style={fontSpace}>
                Agent is initializing… first decision in a moment.
              </div>
            ) : decisions.map((d, i) => (
              <div key={d.id} className="relative pb-5">
                <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full transition-colors ${i === 0 ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" : "bg-gray-800 border border-gray-700"}`} />
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-600" style={fontMono}>{new Date(d.createdAt).toISOString().slice(11, 19)}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider ${ACTION_STYLES[d.action as Action]}`}>{d.action}</span>
                  <span className="text-[9px] text-gray-600" style={fontMono}>{d.pair}</span>
                  <span className="text-[9px] text-gray-700" style={fontMono}>{d.confidence}%</span>
                  {d.pnlPercent !== null && (
                    <span className={`text-[9px] ${d.pnlPercent >= 0 ? "text-emerald-500" : "text-red-400"}`} style={fontMono}>
                      {d.pnlPercent >= 0 ? "+" : ""}{d.pnlPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${i === 0 ? "text-gray-300" : "text-gray-500"}`} style={fontSpace}>
                  {d.reasoning}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-gray-700" style={fontMono}>
            Refreshed {lastRefresh.toISOString().slice(11, 19)} UTC · every 15s
          </div>
        </div>

        {/* Performance panel */}
        <div className="md:col-span-5 bg-[#0A0A10] border border-gray-800/50 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/5 rounded-full blur-[30px]" />
          <h2 className="text-[10px] text-gray-500 mb-4 flex items-center gap-2 tracking-widest" style={fontSpace}>
            <BarChart2 size={12} /> PERFORMANCE
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>SIM PnL</div>
              <div className={`text-xl font-medium ${(state?.totalPnlPercent ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`} style={fontMono}>
                {(state?.totalPnlPercent ?? 0) >= 0 ? "+" : ""}{fmt(state?.totalPnlPercent, 2)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>Sharpe</div>
              <div className="text-xl font-medium text-white" style={fontMono}>{fmt(state?.sharpeRatio, 2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>Win Rate</div>
              <div className="text-xl font-medium text-white" style={fontMono}>{fmt(state?.winRate, 1)}%</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>Max DD</div>
              <div className="text-xl font-medium text-red-400" style={fontMono}>-{fmt(Math.abs(state?.maxDrawdown ?? 0), 2)}%</div>
            </div>
          </div>

          <div className="mb-4 h-20 w-full border-b border-gray-800/50">
            <PnlChart decisions={decisions} />
          </div>

          <div className="flex flex-col gap-2" style={fontSpace}>
            {[
              ["STRATEGY",      state?.strategy ?? "—"],
              ["TOTAL TRADES",  `${state?.tradeCount ?? 0} (${state?.winCount ?? 0}W)`],
              ["ACTIVE PAIR",   pairLabel],
              ["LAST ACTION",   state?.lastAction ?? "HOLD"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-[10px]">
                <span className="text-gray-600 tracking-wider">{label}</span>
                <span className={label === "LAST ACTION" ? (val === "BUY" ? "text-emerald-400 font-bold" : val === "SELL" ? "text-red-400 font-bold" : "text-gray-400") : "text-gray-300"}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
