import { useEffect, useState, useCallback, useRef } from "react";
import { Activity, BarChart2, TrendingUp, Zap, RefreshCw, Shield, Target, AlertTriangle, ChevronDown, Info } from "lucide-react";

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

interface PairInfo { symbol: string; label: string; name: string; }

const REGIME_STYLES: Record<Regime, { glow: string; text: string; bg: string; border: string; icon: React.ReactNode; desc: string }> = {
  TRENDING:  { glow: "shadow-[0_0_50px_rgba(124,58,237,0.3)]",  text: "text-violet-300", bg: "bg-violet-900/25", border: "border-violet-500/40", icon: <TrendingUp size={14} />, desc: "Strong directional momentum — Momentum Breakout active" },
  RANGING:   { glow: "shadow-[0_0_50px_rgba(59,130,246,0.25)]", text: "text-blue-300",   bg: "bg-blue-900/25",   border: "border-blue-500/40",   icon: <Target size={14} />,    desc: "Price bouncing in a range — Mean Reversion active" },
  VOLATILE:  { glow: "shadow-[0_0_50px_rgba(245,158,11,0.2)]",  text: "text-amber-300",  bg: "bg-amber-900/20",  border: "border-amber-500/30",  icon: <Zap size={14} />,       desc: "High uncertainty — waiting for direction to confirm" },
  CRISIS:    { glow: "shadow-[0_0_50px_rgba(239,68,68,0.2)]",   text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-500/30",    icon: <AlertTriangle size={14} />, desc: "Extreme conditions — capital preservation mode" },
};

const ACTION_STYLES: Record<Action, string> = {
  BUY:  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  SELL: "bg-red-500/10 text-red-400 border border-red-500/20",
  HOLD: "bg-gray-800/80 text-gray-400 border border-gray-700",
};

function fmt(n: number | undefined | null, decimals = 2, suffix = "") {
  if (n === undefined || n === null || !isFinite(n)) return "—";
  return n.toFixed(decimals) + suffix;
}
function fmtPrice(n: number | undefined) {
  if (!n || n === 0) return "—";
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function fmtChange(n: number | undefined) {
  if (n === undefined || n === null) return "0.00%";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
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
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${20 - ((v - min) / range) * 20}`).join(" L ");
  return (
    <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PnlChart({ decisions }: { decisions: Decision[] }) {
  const trades = decisions.filter((d) => d.pnlPercent !== null).slice().reverse();
  let cumulative = 0;
  const points = [0, ...trades.map((d) => { cumulative += d.pnlPercent ?? 0; return cumulative; })];
  if (points.length < 2) points.push(0, 0);
  const max = Math.max(...points, 0.01); const min = Math.min(...points, 0); const range = max - min || 1;
  const W = 200; const H = 50;
  const toSvg = (v: number, i: number) => `${(i / (points.length - 1)) * W},${H - ((v - min) / range) * H}`;
  const pathD = points.map((v, i) => `${i === 0 ? "M" : "L"} ${toSvg(v, i)}`).join(" ");
  const isPositive = (points[points.length - 1] ?? 0) >= 0;
  const lineColor = isPositive ? "#10b981" : "#ef4444";
  const fillColor = isPositive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pnl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>
      <path d={pathD + ` L ${W},${H} L 0,${H} Z`} fill="url(#pnl-g)" />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={10} className="text-gray-700 hover:text-gray-500 cursor-help ml-1 transition-colors" />
      {show && (
        <span className="absolute bottom-5 left-0 z-50 w-52 text-[10px] text-gray-300 bg-[#12121E] border border-gray-700/60 rounded-lg p-2.5 leading-relaxed shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

export default function Dashboard() {
  const fontSpace = { fontFamily: "'Space Grotesk', sans-serif" };
  const fontMono  = { fontFamily: "'JetBrains Mono', monospace" };

  const [state, setState]           = useState<AgentState | null>(null);
  const [decisions, setDecisions]   = useState<Decision[]>([]);
  const [pairs, setPairs]           = useState<PairInfo[]>([]);
  const [pairOpen, setPairOpen]     = useState(false);
  const [switching, setSwitching]   = useState(false);
  const [pendingPair, setPendingPair] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dropdownRect, setDropdownRect] = useState<{ top: number; right: number } | null>(null);
  const pairBtnRef = useRef<HTMLButtonElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [stateRes, decisionsRes, pairsRes] = await Promise.all([
        fetch(`${API_BASE}/state`),
        fetch(`${API_BASE}/decisions?limit=10`),
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
    setSwitching(true); setPairOpen(false); setPendingPair(symbol);
    try {
      const res = await fetch(`${API_BASE}/pair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pair: symbol }) });
      if (res.ok) {
        const data = await res.json() as { price?: number };
        // Optimistically patch the price from the quick-fetch response
        if (data.price && data.price > 0) {
          setState((s) => s ? { ...s, currentPair: symbol, signals: { ...s.signals, price: data.price } } : s);
        }
      }
      // Poll at 2s, 6s, 15s, 30s to catch the Qwen cycle completing
      for (const delay of [2000, 6000, 15000, 30000]) {
        setTimeout(() => void fetchData(), delay);
      }
    } finally {
      setTimeout(() => { setSwitching(false); setPendingPair(null); }, 30000);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await fetch(`${API_BASE}/trigger`, { method: "POST" });
      setTimeout(() => void fetchData(), 5000);
      setTimeout(() => void fetchData(), 12000);
    } finally { setTimeout(() => setTriggering(false), 12000); }
  };

  const regime       = state?.regime ?? "RANGING";
  const regimeStyle  = REGIME_STYLES[regime];
  const signals      = state?.signals ?? {};
  const currentPair  = pendingPair ?? state?.currentPair ?? "BTCUSDT";
  const pairLabel    = pairs.find((p) => p.symbol === currentPair)?.label ?? currentPair.replace("USDT", "/USDT");

  const priceChange  = signals.priceChange24h;
  const priceUp      = (priceChange ?? 0) >= 0;
  const fundingNum   = signals.fundingRate ?? 0;
  const fundingLabel = fundingNum > 0.01 ? "LONGS PAYING" : fundingNum < -0.01 ? "SHORTS PAYING" : "BALANCED";
  const fundingColor = fundingNum > 0.03 ? "text-amber-400" : fundingNum < -0.03 ? "text-red-400" : "text-gray-400";
  const sentimentVal = signals.sentimentScore ?? 0.5;
  const sentimentPct = Math.round(sentimentVal * 100);
  const sentimentLabel = sentimentPct > 60 ? "GREEDY" : sentimentPct < 40 ? "FEARFUL" : "NEUTRAL";
  const sentimentColor = sentimentPct > 60 ? "text-emerald-400" : sentimentPct < 40 ? "text-red-400" : "text-gray-400";
  const sentimentBar   = sentimentPct > 60 ? "bg-emerald-500" : sentimentPct < 40 ? "bg-red-500" : "bg-gray-600";
  const flowSigma    = signals.exchangeFlowSigma ?? 0;
  const flowLabel    = flowSigma > 1.5 ? "OUTFLOWS (BULLISH)" : flowSigma < -1.5 ? "INFLOWS (BEARISH)" : "NORMAL";
  const flowColor    = flowSigma > 1.5 ? "text-emerald-400" : flowSigma < -1.5 ? "text-red-400" : "text-gray-400";

  const totalPnl    = state?.totalPnlPercent ?? 0;
  const trades      = decisions.filter((d) => d.pnlPercent !== null);
  const hasTradeHistory = (state?.tradeCount ?? 0) > 0;

  return (
    <div className="min-h-screen text-gray-300 p-4 md:p-6 flex flex-col gap-5 relative overflow-hidden" style={{ backgroundColor: "#08080E" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');`}</style>
      <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${regime === "TRENDING" ? "bg-violet-900/10" : regime === "RANGING" ? "bg-blue-900/8" : regime === "VOLATILE" ? "bg-amber-900/8" : "bg-red-900/8"}`} />

      {/* ── HEADER ── */}
      <header className="flex justify-between items-center z-10 flex-wrap gap-3" style={fontSpace}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-600/30 border border-violet-500/40 flex items-center justify-center">
              <Shield size={12} className="text-violet-400" />
            </div>
            <span className="text-lg font-bold tracking-[0.2em] text-white">ARIA</span>
          </div>
          <span className="hidden md:inline text-[10px] text-gray-600 tracking-widest">ADAPTIVE REGIME INTELLIGENCE AGENT</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 rounded-full border border-emerald-800/40">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
            <span className="text-[10px] text-emerald-400 tracking-widest">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Pair selector dropdown — fixed position to escape overflow-hidden */}
          <div className="relative">
            <button
              ref={pairBtnRef}
              onClick={() => {
                const rect = pairBtnRef.current?.getBoundingClientRect();
                if (rect) setDropdownRect({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                setPairOpen((o) => !o);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#0D0D18] border border-gray-700/60 rounded-lg text-gray-300 hover:border-violet-600/50 transition-all"
              style={fontMono}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${switching ? "bg-amber-400 animate-pulse" : "bg-violet-400"}`} />
              {switching ? "SWITCHING…" : pairLabel}
              <ChevronDown size={12} className={`transition-transform duration-200 ${pairOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          {pairOpen && dropdownRect && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPairOpen(false)} />
              <div
                className="fixed z-50 w-48 bg-[#0E0E1A] border border-gray-700/60 rounded-xl overflow-hidden shadow-2xl"
                style={{ top: dropdownRect.top, right: dropdownRect.right }}
              >
                {pairs.map((p) => (
                  <button
                    key={p.symbol}
                    onClick={() => void switchPair(p.symbol)}
                    className={`w-full px-4 py-3 text-left text-xs flex items-center justify-between transition-colors active:bg-violet-900/30 ${
                      p.symbol === currentPair
                        ? "text-violet-300 bg-violet-900/10"
                        : "text-gray-400 hover:bg-violet-900/20 hover:text-gray-200"
                    }`}
                    style={fontMono}
                  >
                    <span className="font-semibold">{p.label}</span>
                    <span className="text-[10px] text-gray-600">{p.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <button onClick={() => void handleTrigger()} disabled={triggering}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-violet-900/30 border border-violet-700/40 rounded-lg text-violet-300 hover:bg-violet-900/50 transition-all disabled:opacity-50"
            style={fontSpace}>
            <RefreshCw size={12} className={triggering ? "animate-spin" : ""} />
            {triggering ? "RUNNING…" : "TRIGGER"}
          </button>

          <span className="text-xs text-gray-600 hidden md:inline" style={fontMono}>UTC <Clock /></span>
        </div>
      </header>

      {/* ── DISCLAIMER ── */}
      <div className="z-10 flex items-center gap-2 px-3 py-2 bg-amber-950/20 border border-amber-900/30 rounded-lg text-[10px] text-amber-700/80" style={fontSpace}>
        <AlertTriangle size={11} className="text-amber-700 flex-shrink-0" />
        <span><strong className="text-amber-600">Simulation only.</strong> ARIA is a demo AI agent. Decisions are not financial advice and no real trades are placed.</span>
      </div>

      {/* ── REGIME HERO ── */}
      <section className="flex flex-col items-center py-5 z-10">
        <div className="relative flex items-center justify-center mb-5">
          <div className={`absolute w-48 h-48 rounded-full blur-[50px] animate-pulse transition-colors duration-1000 ${regime === "TRENDING" ? "bg-violet-600/20" : regime === "RANGING" ? "bg-blue-600/15" : regime === "VOLATILE" ? "bg-amber-500/15" : "bg-red-600/15"}`} />
          <div className={`relative flex flex-col items-center justify-center w-44 h-44 rounded-full border backdrop-blur-sm transition-all duration-700 ${regimeStyle.glow} ${regimeStyle.border} ${regimeStyle.bg}`}>
            <div className={`text-xl font-bold tracking-widest ${regimeStyle.text}`} style={fontSpace}>{regime}</div>
            <div className={`text-xs mt-1.5 ${regimeStyle.text} opacity-75`} style={fontSpace}>{state?.confidence ?? 50}% CONFIDENCE</div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px]" style={fontMono}>
              <span className="text-gray-600">{pairLabel}</span>
              <span className="text-gray-800">·</span>
              <span className={priceUp ? "text-emerald-400" : "text-red-400"}>{fmtPrice(signals.price)}</span>
            </div>
          </div>
        </div>

        <p className={`text-[11px] text-center mb-4 ${regimeStyle.text} opacity-60 max-w-xs`} style={fontSpace}>
          {regimeStyle.icon && <span className="inline-flex items-center gap-1">{regimeStyle.icon} {regimeStyle.desc}</span>}
        </p>

        <div className="flex gap-2 flex-wrap justify-center">
          {(["TRENDING", "RANGING", "VOLATILE", "CRISIS"] as Regime[]).map((r) => (
            <div key={r} className={`px-3 py-1 rounded-full text-[10px] font-medium tracking-wider border transition-all ${r === regime ? `${REGIME_STYLES[r].bg} ${REGIME_STYLES[r].border} ${REGIME_STYLES[r].text}` : "bg-transparent border-gray-800 text-gray-700"}`} style={fontSpace}>{r}</div>
          ))}
        </div>
      </section>

      {/* ── SIGNAL GRID ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 z-10">
        {/* On-chain flow */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center">
              <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>EXCHANGE FLOW</h3>
              <Tooltip text="Measures how much BTC is moving onto or off exchanges. Outflows (↑σ) = people withdrawing to wallets = bullish. Inflows (↓σ) = people depositing to sell = bearish." />
            </div>
            <span className={`text-[9px] font-medium ${flowColor}`}>{flowSigma > 0 ? "▲" : flowSigma < 0 ? "▼" : "—"}</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-2" style={fontSpace}>{flowLabel}</div>
          <div className="text-xs text-gray-300 truncate" style={fontMono}>{signals.exchangeFlow ?? "—"}</div>
          <div className="mt-3 h-5 w-full">
            <MiniChart color={flowSigma >= 0 ? "#22c55e" : "#ef4444"} data={[0.2,0.4,0.3,0.6,0.5,0.8,0.7,1.0]} />
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center">
              <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>SENTIMENT</h3>
              <Tooltip text="Blended score 0–1 based on price momentum and funding rate. Above 0.6 = greedy/bullish. Below 0.4 = fearful/bearish. Extremes signal potential reversals." />
            </div>
            <span className={`text-[9px] font-medium ${sentimentColor}`}>{sentimentLabel}</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-2" style={fontSpace}>
            {sentimentPct > 60 ? "Market is greedy — caution" : sentimentPct < 40 ? "Market is fearful — opportunity" : "Balanced momentum"}
          </div>
          <div className="text-sm text-white" style={fontMono}>{fmt(sentimentVal, 2)} <span className="text-xs text-gray-700">/ 1.0</span></div>
          <div className="mt-3 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${sentimentBar} transition-all duration-700`} style={{ width: `${sentimentPct}%` }} />
          </div>
        </div>

        {/* Funding rate */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center">
              <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>FUNDING RATE</h3>
              <Tooltip text="Paid every 8h between long and short traders on perpetual futures. Positive = longs paying shorts (crowded longs, bearish signal). Negative = shorts paying longs (crowded shorts, bullish signal)." />
            </div>
            <span className={`text-[9px] font-medium ${fundingColor}`}>{fundingNum >= 0 ? "+" : ""}{fmt(fundingNum, 4)}%</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-2" style={fontSpace}>{fundingLabel}</div>
          <div className="text-sm text-white" style={fontMono}>/8h rate</div>
          <div className="mt-3 h-5 w-full">
            <MiniChart color="#6b7280" data={[0.5,0.52,0.48,0.5,0.53,0.5,0.49,0.51]} />
          </div>
        </div>

        {/* Price structure */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center">
              <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>PRICE STRUCTURE</h3>
              <Tooltip text="Detects whether price is making higher highs (uptrend) or lower lows (downtrend) over the last 6 hourly candles. Compression squeeze = a breakout is building." />
            </div>
            <span className={`text-[9px] font-medium ${priceUp ? "text-emerald-400" : "text-red-400"}`}>{fmtChange(priceChange)}</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-2" style={fontSpace}>
            {signals.macdSignal ?? "—"} MACD · {signals.whaleActivity ?? "Normal"} whales
          </div>
          <div className="text-xs text-gray-300" style={fontSpace}>{signals.priceStructure ?? "Consolidating"}</div>
          <div className="mt-3 text-[10px] text-gray-600" style={fontMono}>{fmtPrice(signals.price)}</div>
        </div>
      </section>

      {/* ── BOTTOM ── */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5 z-10 flex-1">
        {/* Reasoning trail */}
        <div className="md:col-span-7 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[10px] text-gray-500 flex items-center gap-2 tracking-widest" style={fontSpace}>
              <Activity size={12} /> REASONING TRAIL
            </h2>
            <Tooltip text="Every 45 seconds, ARIA fetches live market data, classifies the regime using Qwen AI, then generates a trade decision with a plain-English explanation. This is simulation only — no real orders are placed." />
          </div>
          <div className="flex flex-col gap-0 relative pl-5 border-l border-gray-800/80 flex-1">
            <div className="absolute top-0 left-[-1px] w-[2px] bg-gradient-to-b from-violet-500/60 via-violet-500/10 to-transparent" style={{ height: "50%" }} />
            {decisions.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-700" style={fontSpace}>Agent initializing — first decision arriving shortly…</div>
            ) : decisions.map((d, i) => (
              <div key={d.id} className="relative pb-4">
                <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full transition-colors ${i === 0 ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" : "bg-gray-800 border border-gray-700"}`} />
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-600" style={fontMono}>{new Date(d.createdAt).toISOString().slice(11, 19)}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider ${ACTION_STYLES[d.action as Action]}`}>{d.action}</span>
                  <span className="text-[9px] text-gray-700" style={fontMono}>{d.pair}</span>
                  <span className="text-[9px] text-gray-700" style={fontMono}>{d.confidence}% conf</span>
                  {d.pnlPercent !== null && (
                    <span className={`text-[9px] font-medium ${d.pnlPercent >= 0 ? "text-emerald-500" : "text-red-400"}`} style={fontMono}>
                      {d.pnlPercent >= 0 ? "+" : ""}{d.pnlPercent.toFixed(2)}% P&L
                    </span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${i === 0 ? "text-gray-300" : "text-gray-500"}`} style={fontSpace}>{d.reasoning}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-700" style={fontMono}>
            <span>Updated {lastRefresh.toISOString().slice(11, 19)} UTC</span>
            <span className="text-gray-800">·</span>
            <span>auto-refreshes every 15s</span>
          </div>
        </div>

        {/* Performance panel */}
        <div className="md:col-span-5 bg-[#0A0A10] border border-gray-800/50 rounded-2xl p-5 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/5 rounded-full blur-[30px]" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[10px] text-gray-500 flex items-center gap-2 tracking-widest" style={fontSpace}>
              <BarChart2 size={12} /> SIM PERFORMANCE
            </h2>
            <Tooltip text="Simulated P&L tracking — not real money. Updates each time ARIA makes a BUY or SELL decision. HOLD decisions don't affect the P&L. The equity curve below shows cumulative returns over time." />
          </div>

          {!hasTradeHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <div className="w-10 h-10 rounded-full bg-gray-800/50 border border-gray-700 flex items-center justify-center mb-3">
                <BarChart2 size={16} className="text-gray-600" />
              </div>
              <p className="text-xs text-gray-600 leading-relaxed max-w-[180px]" style={fontSpace}>
                Performance builds up once ARIA makes BUY or SELL decisions. HOLD decisions don't count.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>SIM PnL</div>
                  <div className={`text-xl font-medium ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`} style={fontMono}>
                    {totalPnl >= 0 ? "+" : ""}{fmt(totalPnl, 2)}%
                  </div>
                  <div className="text-[9px] text-gray-700 mt-0.5" style={fontSpace}>on simulated capital</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>Sharpe Ratio</div>
                  <div className="text-xl font-medium text-white" style={fontMono}>{fmt(state?.sharpeRatio, 2)}</div>
                  <div className="text-[9px] text-gray-700 mt-0.5" style={fontSpace}>return / risk</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>Win Rate</div>
                  <div className="text-xl font-medium text-white" style={fontMono}>{fmt(state?.winRate, 1)}%</div>
                  <div className="text-[9px] text-gray-700 mt-0.5" style={fontSpace}>{state?.winCount ?? 0} wins / {state?.tradeCount ?? 0} trades</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-600 mb-1 tracking-wider" style={fontSpace}>Max Drawdown</div>
                  <div className="text-xl font-medium text-red-400" style={fontMono}>-{fmt(Math.abs(state?.maxDrawdown ?? 0), 2)}%</div>
                  <div className="text-[9px] text-gray-700 mt-0.5" style={fontSpace}>worst peak-to-trough</div>
                </div>
              </div>

              <div className="mb-4 h-20 w-full border-b border-gray-800/50">
                <PnlChart decisions={decisions} />
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 mt-auto" style={fontSpace}>
            {[
              ["STRATEGY",    state?.strategy ?? "—"],
              ["ACTIVE PAIR", pairLabel],
              ["LAST SIGNAL", state?.lastAction ?? "HOLD"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-[10px]">
                <span className="text-gray-700 tracking-wider">{label}</span>
                <span className={label === "LAST SIGNAL"
                  ? (val === "BUY" ? "text-emerald-400 font-bold" : val === "SELL" ? "text-red-400 font-bold" : "text-gray-500")
                  : "text-gray-400"}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
