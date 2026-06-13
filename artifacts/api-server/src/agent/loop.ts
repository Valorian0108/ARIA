import { db, decisionsTable, agentStateTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { fetchSignals } from "../lib/bitget";
import { classifyRegime, generateDecision } from "../lib/qwen";
import { getStrategy } from "./strategy";
import { computePerformance } from "./performance";
import { logger } from "../lib/logger";

const AGENT_STATE_ID = 1;
const LOOP_INTERVAL_MS = 45_000; // 45 seconds

let running = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

export async function initAgentState(): Promise<void> {
  const existing = await db
    .select()
    .from(agentStateTable)
    .where(eq(agentStateTable.id, AGENT_STATE_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(agentStateTable).values({
      id: AGENT_STATE_ID,
      regime: "RANGING",
      confidence: 50,
      strategy: "Mean Reversion",
      signals: {},
      lastAction: "HOLD",
    });
    logger.info("Agent state initialized");
  }
}

export async function runAgentCycle(): Promise<void> {
  if (running) {
    logger.warn("Agent cycle already running, skipping");
    return;
  }
  running = true;

  try {
    logger.info("Starting agent cycle");

    // 1. Fetch market signals
    const signals = await fetchSignals("BTCUSDT");
    logger.info({ price: signals.price, volatility: signals.volatility }, "Signals fetched");

    // 2. Classify regime
    const regimeResult = await classifyRegime({
      priceChange24h: signals.priceChange24h,
      volatility: signals.volatility,
      fundingRate: signals.fundingRate,
      macdSignal: signals.macdSignal,
      priceStructure: signals.priceStructure,
      exchangeFlowSigma: signals.exchangeFlowSigma,
      sentimentScore: signals.sentimentScore,
      whaleActivity: signals.whaleActivity,
    });
    logger.info({ regime: regimeResult.regime, confidence: regimeResult.confidence }, "Regime classified");

    // 3. Get strategy for regime
    const strategy = getStrategy(regimeResult.regime);

    // 4. Get current state for context
    const [currentState] = await db
      .select()
      .from(agentStateTable)
      .where(eq(agentStateTable.id, AGENT_STATE_ID))
      .limit(1);

    const lastAction = currentState?.lastAction ?? "HOLD";

    // 5. Generate decision
    const decision = await generateDecision({
      regime: regimeResult.regime,
      confidence: regimeResult.confidence,
      strategy: strategy.name,
      signals: {
        price: signals.price,
        priceChange24h: `${signals.priceChange24h.toFixed(2)}%`,
        fundingRate: `${signals.fundingRate.toFixed(4)}%`,
        macd: signals.macdSignal,
        sentiment: signals.sentimentScore,
        exchangeFlow: signals.exchangeFlow,
        whaleActivity: signals.whaleActivity,
      },
      lastAction,
      price: signals.price,
    });
    logger.info({ action: decision.action, confidence: decision.confidence }, "Decision generated");

    // 6. Compute sim P&L (simplified: random walk seeded by signal quality)
    let pnlPercent: string | null = null;
    if (decision.action !== "HOLD" && signals.price > 0) {
      // Simulate: entry now, projected +/- based on signal alignment
      const signalStrength = (decision.confidence - 60) / 35; // 0 to 1
      const directionMultiplier = decision.action === "BUY" ? 1 : -1;
      const base = signalStrength * directionMultiplier * (Math.random() * 2 + 0.5);
      pnlPercent = (Math.round(base * 100) / 100).toFixed(4);
    }

    // 7. Persist decision
    await db.insert(decisionsTable).values({
      regime: regimeResult.regime,
      confidence: regimeResult.confidence,
      strategy: decision.strategy,
      action: decision.action,
      pair: "BTC/USDT",
      reasoning: decision.reasoning,
      entryPrice: signals.price > 0 ? signals.price.toFixed(2) : null,
      pnlPercent,
      signals: signals as unknown as Record<string, unknown>,
    });

    // 8. Compute performance
    const perf = await computePerformance();

    // 9. Update agent state
    await db
      .update(agentStateTable)
      .set({
        regime: regimeResult.regime,
        confidence: regimeResult.confidence,
        strategy: strategy.name,
        signals: signals as unknown as Record<string, unknown>,
        lastAction: decision.action,
        totalPnlPercent: perf.totalPnlPercent.toFixed(4),
        sharpeRatio: perf.sharpeRatio.toFixed(4),
        winRate: perf.winRate.toFixed(4),
        maxDrawdown: perf.maxDrawdown.toFixed(4),
        tradeCount: perf.tradeCount,
        winCount: perf.winCount,
        updatedAt: new Date(),
      })
      .where(eq(agentStateTable.id, AGENT_STATE_ID));

    logger.info({ regime: regimeResult.regime, action: decision.action }, "Agent cycle complete");
  } catch (err) {
    logger.error({ err }, "Agent cycle failed");
  } finally {
    running = false;
  }
}

export function startAgentLoop(): void {
  logger.info({ intervalMs: LOOP_INTERVAL_MS }, "Starting agent loop");

  // Run immediately on start
  void runAgentCycle();

  intervalHandle = setInterval(() => {
    void runAgentCycle();
  }, LOOP_INTERVAL_MS);
}

export function stopAgentLoop(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Agent loop stopped");
  }
}
