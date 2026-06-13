import { logger } from "./logger";

const BITGET_BASE = "https://api.bitget.com";

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  fundingRate: number;
  volatility: number;
  macdSignal: "BULLISH" | "BEARISH" | "NEUTRAL";
  priceStructure: string;
  exchangeFlow: string;
  exchangeFlowSigma: number;
  sentimentScore: number;
  whaleActivity: string;
  fetchedAt: string;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Bitget API error: ${res.status} ${url}`);
  return res.json();
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0] ?? 0;
  for (const v of values) {
    const cur = v * k + prev * (1 - k);
    result.push(cur);
    prev = cur;
  }
  return result;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const clean = values.filter((v) => isFinite(v) && !isNaN(v));
  if (clean.length < 2) return 0;
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const variance = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / clean.length;
  return Math.sqrt(variance);
}

export async function fetchQuickPrice(pair = "BTCUSDT"): Promise<{ price: number; priceChange24h: number }> {
  try {
    const raw = await fetchJson(`${BITGET_BASE}/api/v2/spot/market/tickers?symbol=${pair}`) as { data?: { lastPr?: string; change24h?: string }[] };
    const t = raw.data?.[0];
    return {
      price: parseFloat(t?.lastPr ?? "0"),
      priceChange24h: parseFloat(t?.change24h ?? "0") * 100,
    };
  } catch {
    return { price: 0, priceChange24h: 0 };
  }
}

export async function fetchSignals(pair = "BTCUSDT"): Promise<SignalData> {
  try {
    const [candleRes, tickerRes, fundingRes] = await Promise.allSettled([
      fetchJson(`${BITGET_BASE}/api/v2/spot/market/candles?symbol=${pair}&granularity=1H&limit=48`),
      fetchJson(`${BITGET_BASE}/api/v2/spot/market/tickers?symbol=${pair}`),
      fetchJson(`${BITGET_BASE}/api/v2/mix/market/current-fund-rate?symbol=${pair}&productType=USDT-FUTURES`),
    ]);

    // Parse candles
    let candles: Candle[] = [];
    if (candleRes.status === "fulfilled") {
      const raw = candleRes.value as { data?: string[][] };
      candles = (raw.data ?? []).map((c) => ({
        ts: Number(c[0]),
        open: parseFloat(c[1] ?? "0"),
        high: parseFloat(c[2] ?? "0"),
        low: parseFloat(c[3] ?? "0"),
        close: parseFloat(c[4] ?? "0"),
        volume: parseFloat(c[5] ?? "0"),
      })).reverse();
    }

    // Parse ticker
    let price = 0;
    let priceChange24h = 0;
    let volume24h = 0;
    if (tickerRes.status === "fulfilled") {
      const raw = tickerRes.value as { data?: { lastPr?: string; change24h?: string; usdtVol?: string }[] };
      const t = raw.data?.[0];
      price = parseFloat(t?.lastPr ?? "0");
      priceChange24h = parseFloat(t?.change24h ?? "0") * 100;
      volume24h = parseFloat(t?.usdtVol ?? "0");
    }

    // Parse funding rate
    let fundingRate = 0;
    if (fundingRes.status === "fulfilled") {
      const raw = fundingRes.value as { data?: { fundingRate?: string } };
      fundingRate = parseFloat(raw.data?.fundingRate ?? "0") * 100;
    }

    // Compute derived signals
    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    // Volatility: std dev of hourly returns (last 24h)
    const returns = closes.slice(-25).map((c, i, arr) => i === 0 ? 0 : (c - arr[i - 1]) / arr[i - 1]);
    const volatility = stddev(returns.slice(1)) * 100;

    // MACD (12/26 EMA crossover)
    let macdSignal: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
    if (closes.length >= 26) {
      const ema12 = ema(closes, 12);
      const ema26 = ema(closes, 26);
      const last = closes.length - 1;
      const macdNow = (ema12[last] ?? 0) - (ema26[last] ?? 0);
      const macdPrev = (ema12[last - 1] ?? 0) - (ema26[last - 1] ?? 0);
      if (macdNow > 0 && macdNow > macdPrev) macdSignal = "BULLISH";
      else if (macdNow < 0 && macdNow < macdPrev) macdSignal = "BEARISH";
    }

    // Price structure (higher highs/lows vs lower highs/lows)
    let priceStructure = "Consolidating";
    if (candles.length >= 6) {
      const recent = candles.slice(-6);
      const highs = recent.map((c) => c.high);
      const lows = recent.map((c) => c.low);
      const risingHighs = highs[5]! > highs[2]! && highs[2]! > highs[0]!;
      const risingLows = lows[5]! > lows[2]! && lows[2]! > lows[0]!;
      const fallingHighs = highs[5]! < highs[2]! && highs[2]! < highs[0]!;
      const fallingLows = lows[5]! < lows[2]! && lows[2]! < lows[0]!;
      if (risingHighs && risingLows) priceStructure = "Higher highs forming";
      else if (fallingHighs && fallingLows) priceStructure = "Lower lows forming";
      else if (risingHighs && !risingLows) priceStructure = "Resistance test";
      else if (fallingHighs && risingLows) priceStructure = "Compression squeeze";
    }

    // Simulated exchange flow (based on volume deviation from mean)
    const avgVol = volumes.slice(-24).reduce((a, b) => a + b, 0) / 24;
    const lastVol = volumes[volumes.length - 1] ?? avgVol;
    const volDev = avgVol > 0 ? (lastVol - avgVol) / avgVol : 0;
    const exchangeFlowSigma = Math.round(volDev * 10) / 10;
    const btcFlow = Math.round((volDev * price * 1000) / 1e6) * -1; // negative = outflows (bearish)
    const exchangeFlow = `${btcFlow >= 0 ? "+" : ""}${btcFlow.toLocaleString()} BTC`;

    // Sentiment: proxy from price momentum + funding rate
    const momentumScore = Math.min(1, Math.max(0, (priceChange24h + 5) / 10));
    const fundingScore = Math.min(1, Math.max(0, (fundingRate + 0.05) / 0.1));
    const sentimentScore = Math.round((momentumScore * 0.6 + fundingScore * 0.4) * 100) / 100;

    // Whale activity proxy (large volume spike)
    let whaleActivity = "Normal";
    if (Math.abs(exchangeFlowSigma) > 2) whaleActivity = exchangeFlowSigma > 0 ? "Distribution" : "Accumulation";
    else if (Math.abs(exchangeFlowSigma) > 1) whaleActivity = "Active";

    return {
      price,
      priceChange24h,
      volume24h,
      fundingRate,
      volatility,
      macdSignal,
      priceStructure,
      exchangeFlow,
      exchangeFlowSigma,
      sentimentScore,
      whaleActivity,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error({ err }, "Failed to fetch signals, using fallback");
    // Return synthetic fallback so the agent still runs
    return {
      price: 0,
      priceChange24h: 0,
      volume24h: 0,
      fundingRate: 0,
      volatility: 1.2,
      macdSignal: "NEUTRAL",
      priceStructure: "Consolidating",
      exchangeFlow: "N/A",
      exchangeFlowSigma: 0,
      sentimentScore: 0.5,
      whaleActivity: "Normal",
      fetchedAt: new Date().toISOString(),
    };
  }
}
