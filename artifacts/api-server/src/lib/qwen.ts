import OpenAI from "openai";
import { logger } from "./logger";

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? "",
  baseURL: "https://hackathon.bitgetops.com/v1",
});

const MODEL = "qwen3.6-plus";

export type Regime = "TRENDING" | "RANGING" | "VOLATILE" | "CRISIS";
export type Action = "BUY" | "SELL" | "HOLD";

export interface RegimeResult {
  regime: Regime;
  confidence: number;
  reasoning: string;
}

export interface DecisionResult {
  action: Action;
  reasoning: string;
  confidence: number;
  strategy: string;
}

export async function classifyRegime(signals: {
  priceChange24h: number;
  volatility: number;
  fundingRate: number;
  macdSignal: string;
  priceStructure: string;
  exchangeFlowSigma: number;
  sentimentScore: number;
  whaleActivity: string;
}): Promise<RegimeResult> {
  const prompt = `You are a crypto market regime classifier. Analyze these BTC/USDT signals and classify the market regime.

Signals:
- 24h price change: ${signals.priceChange24h.toFixed(2)}%
- Hourly volatility: ${signals.volatility.toFixed(2)}%
- Funding rate: ${signals.fundingRate.toFixed(4)}%
- MACD trend: ${signals.macdSignal}
- Price structure: ${signals.priceStructure}
- Exchange flow deviation: ${signals.exchangeFlowSigma.toFixed(1)}σ
- Sentiment score: ${signals.sentimentScore.toFixed(2)} (0=bearish, 1=bullish)
- Whale activity: ${signals.whaleActivity}

Regime definitions:
- TRENDING: Clear directional momentum, strong price structure, volume confirmation
- RANGING: Price oscillating in a defined range, no clear trend, neutral signals
- VOLATILE: High volatility spikes, uncertain direction, elevated funding rates
- CRISIS: Extreme drawdown, panic signals, high negative deviation

Return ONLY valid JSON, no markdown, no extra text:
{"regime": "TRENDING|RANGING|VOLATILE|CRISIS", "confidence": 50-99, "reasoning": "one sentence under 120 chars"}`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    // Strip any markdown code fences if present
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as RegimeResult;

    // Validate
    const validRegimes: Regime[] = ["TRENDING", "RANGING", "VOLATILE", "CRISIS"];
    if (!validRegimes.includes(parsed.regime)) parsed.regime = "RANGING";
    parsed.confidence = Math.min(99, Math.max(50, parsed.confidence));

    return parsed;
  } catch (err) {
    logger.error({ err }, "Regime classification failed, using heuristic");
    // Heuristic fallback
    const regime: Regime =
      Math.abs(signals.volatility) > 3 ? "VOLATILE" :
      Math.abs(signals.priceChange24h) > 4 ? "TRENDING" : "RANGING";
    return {
      regime,
      confidence: 62,
      reasoning: "Heuristic classification based on volatility and price momentum.",
    };
  }
}

export async function generateDecision(params: {
  regime: Regime;
  confidence: number;
  strategy: string;
  signals: Record<string, unknown>;
  lastAction: string;
  price: number;
}): Promise<DecisionResult> {
  const prompt = `You are ARIA, an autonomous crypto trading agent. Generate a trading decision.

Current state:
- Market regime: ${params.regime} (${params.confidence}% confidence)
- Active strategy: ${params.strategy}
- Current BTC price: $${params.price.toLocaleString()}
- Last action: ${params.lastAction}
- Key signals: ${JSON.stringify(params.signals, null, 0)}

Strategy rules:
- TRENDING regime → Momentum Breakout: BUY on bullish momentum (sentiment > 0.55, positive MACD), SELL on bearish breakdown, HOLD only if direction is genuinely unclear
- RANGING regime → Mean Reversion: BUY if sentiment < 0.45 or funding rate is negative (oversold), SELL if sentiment > 0.6 or funding rate is elevated (overbought), HOLD only if ALL signals are flat and mixed — commit to BUY or SELL when confidence ≥ 75%
- VOLATILE regime → Volatility Breakout: BUY or SELL on confirmed directional break (priceChange > 2% with sentiment alignment), HOLD only if direction is truly unresolved
- CRISIS regime → Capital Preservation: SELL to reduce exposure, HOLD only if already flat

Important: Bias toward action. HOLD is only correct when signals are genuinely contradictory. If confidence is ≥ 75% and signals lean in one direction, commit to BUY or SELL. Cite specific signal values in your reasoning.

Return ONLY valid JSON, no markdown:
{"action": "BUY|SELL|HOLD", "reasoning": "2-3 sentence plain English explanation citing specific signals", "confidence": 60-95, "strategy": "${params.strategy}"}`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as DecisionResult;

    const validActions: Action[] = ["BUY", "SELL", "HOLD"];
    if (!validActions.includes(parsed.action)) parsed.action = "HOLD";
    parsed.confidence = Math.min(95, Math.max(60, parsed.confidence));

    return parsed;
  } catch (err) {
    logger.error({ err }, "Decision generation failed, defaulting to HOLD");
    return {
      action: "HOLD",
      reasoning: `Maintaining current position in ${params.regime} regime. Awaiting clearer signal confirmation before committing capital.`,
      confidence: 60,
      strategy: params.strategy,
    };
  }
}

