import { useEffect, useState, useCallback, useRef } from "react";
import { Activity, BarChart2, TrendingUp, Zap, RefreshCw, Shield, Target, AlertTriangle, ChevronDown, Info } from "lucide-react";

interface Candle { ts: number; open: number; high: number; low: number; close: number; volume: number; }

function PriceChart({ candles, decisions, pair }: { candles: Candle[]; decisions: Decision[]; pair: string }) {
  const W = 800; const H = 130; const PAD = { t: 12, r: 8, b: 28, l: 58 };
  if (candles.length < 2) {
    return <div className="flex items-center justify-center h-[130px] text-[10px] text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Loading chart…</div>;
  }
  const closes = candles.map(c => c.close);
  const hi = Math.max(...candles.map(c => c.high));
  const lo = Math.min(...candles.map(c => c.low));
  const pad = (hi - lo) * 0.08;
  const yMax = hi + pad; const yMin = lo - pad;
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const xOf = (i: number) => PAD.l + (i / (candles.length - 1)) * cW;
  const yOf = (v: number) => PAD.t + cH - ((v - yMin) / (yMax - yMin)) * cH;

  const linePts = candles.map((c, i) => `${xOf(i)},${yOf(c.close)}`).join(" ");
  const areaPath = `M${PAD.l},${PAD.t + cH} L${candles.map((c, i) => `${xOf(i)},${yOf(c.close)}`).join(" L")} L${PAD.l + cW},${PAD.t + cH} Z`;
  const priceUp = closes[closes.length - 1]! >= closes[0]!;
  const strokeColor = priceUp ? "#8b5cf6" : "#ef4444";
  const gradId = `cg-${pair}`;

  // Y-axis: 3 labels
  const yLabels = [yMin, (yMin + yMax) / 2, yMax].map(v => ({ v, y: yOf(v) }));
  // X-axis: every 6h
  const xLabels: { label: string; x: number }[] = [];
  candles.forEach((c, i) => {
    const h = new Date(c.ts).getUTCHours();
    if (h % 6 === 0) xLabels.push({ label: `${String(h).padStart(2, "0")}:00`, x: xOf(i) });
  });
  // Current price line
  const curY = yOf(closes[closes.length - 1]!);
  const curPrice = closes[closes.length - 1]!;

  // Decision markers — match to nearest candle by timestamp
  const markers: { x: number; y: number; action: string }[] = [];
  decisions.forEach(d => {
    const ts = new Date(d.createdAt).getTime();
    let best = 0; let bestDiff = Infinity;
    candles.forEach((c, i) => { const diff = Math.abs(c.ts - ts); if (diff < bestDiff) { bestDiff = diff; best = i; } });
    if (bestDiff < 4 * 3600 * 1000) {
      markers.push({ x: xOf(best), y: yOf(candles[best]!.close), action: d.action });
    }
  });

  const fmtPr = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="chart-clip"><rect x={PAD.l} y={PAD.t} width={cW} height={cH} /></clipPath>
      </defs>

      {/* Grid lines */}
      {yLabels.map(({ y }, i) => (
        <line key={i} x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y} stroke="#1f1f2e" strokeWidth="1" />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} clipPath="url(#chart-clip)" />

      {/* Price line */}
      <polyline points={linePts} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" clipPath="url(#chart-clip)" />

      {/* Current price dashed line */}
      <line x1={PAD.l} y1={curY} x2={PAD.l + cW} y2={curY} stroke={strokeColor} strokeWidth="0.75" strokeDasharray="3,3" opacity="0.6" />
      <rect x={PAD.l + cW + 2} y={curY - 8} width={W - PAD.l - cW - 4} height={16} rx="3" fill={strokeColor} opacity="0.15" />
      <text x={PAD.l + cW + 5} y={curY + 4} fill={strokeColor} fontSize="8.5" fontFamily="'JetBrains Mono', monospace">{fmtPr(curPrice)}</text>

      {/* Y labels */}
      {yLabels.map(({ v, y }, i) => (
        <text key={i} x={PAD.l - 5} y={y + 3} fill="#4b5563" fontSize="8" textAnchor="end" fontFamily="'JetBrains Mono', monospace">{fmtPr(v)}</text>
      ))}

      {/* X labels */}
      {xLabels.map(({ label, x }, i) => (
        <text key={i} x={x} y={H - 6} fill="#374151" fontSize="8" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">{label}</text>
      ))}

      {/* Decision markers */}
      {markers.map((m, i) => {
        const col = m.action === "BUY" ? "#22c55e" : m.action === "SELL" ? "#ef4444" : "#6b7280";
        return (
          <g key={i}>
            <line x1={m.x} y1={PAD.t} x2={m.x} y2={PAD.t + cH} stroke={col} strokeWidth="0.75" strokeDasharray="2,2" opacity="0.5" />
            <circle cx={m.x} cy={m.y} r="3.5" fill={col} opacity="0.9" />
            <text x={m.x} y={m.y - 6} fill={col} fontSize="7" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontWeight="700">{m.action}</text>
          </g>
        );
      })}
    </svg>
  );
}

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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(rect.left, window.innerWidth - 220);
      const top  = rect.top > 120 ? rect.top - 8 : rect.bottom + 8;
      setPos({ top, left });
    }
  };

  return (
    <span
      ref={ref}
      className="inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onClick={show}
    >
      <Info size={11} className="text-gray-600 hover:text-gray-400 cursor-help ml-1 transition-colors" />
      {pos && (
        <span
          className="fixed z-[9999] w-52 text-[10px] text-gray-300 bg-[#12121E] border border-gray-700/60 rounded-lg p-2.5 leading-relaxed shadow-2xl pointer-events-none -translate-y-full"
          style={{ top: pos.top, left: pos.left }}
        >
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
  const [candles, setCandles]       = useState<Candle[]>([]);
  const [pairs, setPairs]           = useState<PairInfo[]>([]);
  const [pairOpen, setPairOpen]     = useState(false);
  const [switching, setSwitching]   = useState(false);
  const [pendingPair, setPendingPair] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pairWrapRef = useRef<HTMLDivElement>(null);
  // Track active pair in a ref so fetchData (memoized) always reads the latest value
  const activePairRef = useRef("BTCUSDT");
  const switchingRef  = useRef(false); // guard: don't let state response override ref mid-switch

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!pairOpen) return;
    const handler = (e: MouseEvent) => {
      if (!pairWrapRef.current?.contains(e.target as Node)) setPairOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pairOpen]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch state first so we know the server's active pair before fetching candles
      const stateRes = await fetch(`${API_BASE}/state`);
      if (stateRes.ok) {
        const s = await stateRes.json() as AgentState;
        setState(s);
        // Sync ref with server's persisted pair — but not while user is mid-switch
        if (!switchingRef.current && s.currentPair && s.currentPair !== activePairRef.current) {
          activePairRef.current = s.currentPair;
        }
      }
      const pair = activePairRef.current;
      const [decisionsRes, pairsRes, candlesRes] = await Promise.all([
        fetch(`${API_BASE}/decisions?limit=10&pair=${pair}`),
        fetch(`${API_BASE}/pairs`),
        fetch(`${API_BASE}/candles?pair=${pair}&limit=24`),
      ]);
      if (decisionsRes.ok) setDecisions(await decisionsRes.json());
      if (pairsRes.ok)     setPairs(await pairsRes.json());
      if (candlesRes.ok)   setCandles(await candlesRes.json());
      setLastRefresh(new Date());
    } catch (_) { /* retry next tick */ }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => void fetchData(), 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const switchPair = async (symbol: string) => {
    activePairRef.current = symbol;  // update immediately so next fetch filters correctly
    switchingRef.current  = true;    // guard against state response overriding the ref
    setSwitching(true); setPairOpen(false); setPendingPair(symbol);
    setDecisions([]);  // clear trail instantly so old pair's decisions don't linger
    try {
      const res = await fetch(`${API_BASE}/pair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pair: symbol }) });
      if (res.ok) {
        const data = await res.json() as { price?: number };
        if (data.price && data.price > 0) {
          setState((s) => s ? { ...s, currentPair: symbol, signals: { ...s.signals, price: data.price } } : s);
        }
      }
      for (const delay of [2000, 6000, 15000, 30000]) {
        setTimeout(() => void fetchData(), delay);
      }
    } finally {
      setTimeout(() => { switchingRef.current = false; setSwitching(false); setPendingPair(null); }, 30000);
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
    <div className="min-h-screen text-gray-300 p-4 md:p-6 flex flex-col gap-5 relative overflow-x-hidden" style={{ backgroundColor: "#08080E" }}>
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
          {/* Pair selector — absolute inside relative wrapper, no overflow clipping */}
          <div ref={pairWrapRef} className="relative">
            <button
              onClick={() => setPairOpen((o) => !o)}
              style={{ ...fontMono, cursor: "pointer" }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#0D0D18] border border-gray-700/60 rounded-lg text-gray-300 hover:border-violet-600/50 transition-all"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${switching ? "bg-amber-400 animate-pulse" : "bg-violet-400"}`} />
              {switching ? "SWITCHING…" : pairLabel}
              <ChevronDown size={12} className={`transition-transform duration-200 ${pairOpen ? "rotate-180" : ""}`} />
            </button>
            {pairOpen && (
              <div
                ref={dropdownRef}
                className="absolute right-0 top-full mt-1 w-48 z-50 rounded-xl shadow-2xl border border-violet-900/50"
                style={{ background: "#0E0E1A" }}
              >
                {pairs.map((p) => (
                  <button
                    key={p.symbol}
                    onClick={() => void switchPair(p.symbol)}
                    style={{ ...fontMono, cursor: "pointer", display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", fontSize: "12px", textAlign: "left", borderLeft: `2px solid ${p.symbol === currentPair ? "#a78bfa" : "transparent"}`, background: p.symbol === currentPair ? "rgba(139,92,246,0.2)" : "transparent", color: p.symbol === currentPair ? "#fff" : "#d1d5db", transition: "background 0.1s" }}
                    onMouseEnter={e => { if (p.symbol !== currentPair) (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.15)"; }}
                    onMouseLeave={e => { if (p.symbol !== currentPair) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span style={{ fontSize: "10px", color: "#6b7280" }}>{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
        {/* Exchange Flow */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>EXCHANGE FLOW</h3>
            <span className={`text-[9px] font-medium ${flowColor}`}>{flowSigma > 0 ? "▲" : flowSigma < 0 ? "▼" : "—"}</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-1" style={fontSpace}>{flowLabel}</div>
          <div className="text-[9px] text-gray-700 mb-2 leading-tight" style={fontSpace}>
            {flowSigma > 1.5 ? "Outflows: wallets withdrawing → bullish" : flowSigma < -1.5 ? "Inflows: depositing to sell → bearish" : "Net flow within normal range"}
          </div>
          <div className="text-xs text-gray-300 truncate" style={fontMono}>{signals.exchangeFlow ?? "—"}</div>
          <div className="mt-3 h-5 w-full">
            <MiniChart color={flowSigma >= 0 ? "#22c55e" : "#ef4444"} data={[0.2,0.4,0.3,0.6,0.5,0.8,0.7,1.0]} />
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>SENTIMENT</h3>
            <span className={`text-[9px] font-medium ${sentimentColor}`}>{sentimentLabel}</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-1" style={fontSpace}>
            {sentimentPct > 60 ? "Market is greedy — caution" : sentimentPct < 40 ? "Market is fearful — opportunity" : "Balanced momentum"}
          </div>
          <div className="text-[9px] text-gray-700 mb-2 leading-tight" style={fontSpace}>
            Score 0–1: &gt;0.6 bullish · &lt;0.4 bearish
          </div>
          <div className="text-sm text-white" style={fontMono}>{fmt(sentimentVal, 2)} <span className="text-xs text-gray-700">/ 1.0</span></div>
          <div className="mt-3 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${sentimentBar} transition-all duration-700`} style={{ width: `${sentimentPct}%` }} />
          </div>
        </div>

        {/* Funding Rate */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>FUNDING RATE</h3>
            <span className={`text-[9px] font-medium ${fundingColor}`}>{fundingNum >= 0 ? "+" : ""}{fmt(fundingNum, 4)}%</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-1" style={fontSpace}>{fundingLabel}</div>
          <div className="text-[9px] text-gray-700 mb-2 leading-tight" style={fontSpace}>
            {fundingNum > 0.01 ? "Longs paying shorts — crowded long, bearish" : fundingNum < -0.01 ? "Shorts paying longs — crowded short, bullish" : "Balanced futures positioning"}
          </div>
          <div className="text-sm text-white" style={fontMono}>/8h rate</div>
          <div className="mt-3 h-5 w-full">
            <MiniChart color="#6b7280" data={[0.5,0.52,0.48,0.5,0.53,0.5,0.49,0.51]} />
          </div>
        </div>

        {/* Price Structure */}
        <div className="bg-[#0D0D16] border border-gray-800/50 p-4 rounded-xl group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[10px] text-gray-500 tracking-wider" style={fontSpace}>PRICE STRUCTURE</h3>
            <span className={`text-[9px] font-medium ${priceUp ? "text-emerald-400" : "text-red-400"}`}>{fmtChange(priceChange)}</span>
          </div>
          <div className="text-[9px] text-gray-600 mb-1" style={fontSpace}>
            {signals.macdSignal ?? "—"} MACD · {signals.whaleActivity ?? "Normal"} whales
          </div>
          <div className="text-[9px] text-gray-700 mb-2 leading-tight" style={fontSpace}>
            Higher highs = uptrend · lower lows = downtrend
          </div>
          <div className="text-xs text-gray-300" style={fontSpace}>{signals.priceStructure ?? "Consolidating"}</div>
          <div className="mt-3 text-[10px] text-gray-600" style={fontMono}>{fmtPrice(signals.price)}</div>
        </div>
      </section>

      {/* ── PRICE CHART ── */}
      <section className="z-10 bg-[#0D0D16] border border-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[10px] text-gray-500 flex items-center gap-2 tracking-widest" style={fontSpace}>
              <TrendingUp size={12} /> 24H PRICE  · {pairLabel}
            </h2>
            <span className={`text-[9px] font-medium ml-1 ${priceUp ? "text-emerald-400" : "text-red-400"}`} style={fontMono}>{fmtChange(priceChange)}</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-gray-700" style={fontSpace}>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />BUY</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />SELL</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />HOLD</span>
          </div>
        </div>
        <div className="h-[130px] w-full">
          <PriceChart candles={candles} decisions={decisions} pair={currentPair} />
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
