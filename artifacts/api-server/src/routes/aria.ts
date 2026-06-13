import { Router, type IRouter } from "express";
import { db, decisionsTable, agentStateTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { runAgentCycle, setActivePair } from "../agent/loop";
import { fetchQuickPrice } from "../lib/bitget";

const router: IRouter = Router();

const AVAILABLE_PAIRS = [
  { symbol: "BTCUSDT", label: "BTC/USDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", label: "ETH/USDT", name: "Ethereum" },
  { symbol: "SOLUSDT", label: "SOL/USDT", name: "Solana" },
  { symbol: "BNBUSDT", label: "BNB/USDT", name: "BNB" },
  { symbol: "XRPUSDT", label: "XRP/USDT", name: "Ripple" },
];

// GET /api/pairs — list tradeable pairs
router.get("/pairs", (_req, res): void => {
  res.json(AVAILABLE_PAIRS);
});

// POST /api/pair — switch the active pair, immediately patch price in state
router.post("/pair", async (req, res): Promise<void> => {
  const { pair } = req.body as { pair?: string };
  const valid = AVAILABLE_PAIRS.find((p) => p.symbol === pair);
  if (!valid) {
    res.status(400).json({ error: `Invalid pair. Choose from: ${AVAILABLE_PAIRS.map((p) => p.symbol).join(", ")}` });
    return;
  }
  await setActivePair(valid.symbol);

  // Immediately fetch ticker so price updates within ~1s (before Qwen cycle finishes)
  const quick = await fetchQuickPrice(valid.symbol);
  if (quick.price > 0) {
    const [current] = await db.select().from(agentStateTable).where(eq(agentStateTable.id, 1)).limit(1);
    if (current) {
      const patched = { ...(current.signals as Record<string, unknown>), price: quick.price, priceChange24h: quick.priceChange24h };
      await db.update(agentStateTable).set({ currentPair: valid.symbol, signals: patched }).where(eq(agentStateTable.id, 1));
    }
  }

  void runAgentCycle();
  res.json({ pair: valid.symbol, label: valid.label, price: quick.price, queued: true });
});

// GET /api/state — full agent state
router.get("/state", async (req, res): Promise<void> => {
  const [state] = await db
    .select()
    .from(agentStateTable)
    .where(eq(agentStateTable.id, 1))
    .limit(1);

  if (!state) {
    res.json({
      regime: "RANGING",
      confidence: 50,
      strategy: "Mean Reversion",
      signals: {},
      lastAction: "HOLD",
      currentPair: "BTCUSDT",
      totalPnlPercent: 0,
      sharpeRatio: 0,
      winRate: 0,
      maxDrawdown: 0,
      tradeCount: 0,
      winCount: 0,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json({
    regime: state.regime,
    confidence: state.confidence,
    strategy: state.strategy,
    signals: state.signals,
    lastAction: state.lastAction,
    currentPair: state.currentPair ?? "BTCUSDT",
    totalPnlPercent: parseFloat(String(state.totalPnlPercent ?? "0")),
    sharpeRatio: parseFloat(String(state.sharpeRatio ?? "0")),
    winRate: parseFloat(String(state.winRate ?? "0")),
    maxDrawdown: parseFloat(String(state.maxDrawdown ?? "0")),
    tradeCount: state.tradeCount,
    winCount: state.winCount,
    updatedAt: state.updatedAt.toISOString(),
  });
});

// GET /api/decisions — last N decisions
router.get("/decisions", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query["limit"] ?? 20), 50);
  const decisions = await db
    .select()
    .from(decisionsTable)
    .orderBy(desc(decisionsTable.createdAt))
    .limit(limit);

  res.json(
    decisions.map((d) => ({
      id: d.id,
      regime: d.regime,
      confidence: d.confidence,
      strategy: d.strategy,
      action: d.action,
      pair: d.pair,
      reasoning: d.reasoning,
      entryPrice: d.entryPrice ? parseFloat(String(d.entryPrice)) : null,
      pnlPercent: d.pnlPercent ? parseFloat(String(d.pnlPercent)) : null,
      signals: d.signals,
      createdAt: d.createdAt.toISOString(),
    }))
  );
});

// POST /api/trigger — manually trigger a cycle
router.post("/trigger", async (req, res): Promise<void> => {
  req.log.info("Manual agent cycle triggered");
  void runAgentCycle();
  res.json({ queued: true, message: "Agent cycle triggered" });
});

export default router;
