import { Router, type IRouter } from "express";
import { db, decisionsTable, agentStateTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { runAgentCycle } from "../agent/loop";

const router: IRouter = Router();

// GET /api/state — full agent state (regime, signals, strategy, performance)
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
    totalPnlPercent: parseFloat(String(state.totalPnlPercent ?? "0")),
    sharpeRatio: parseFloat(String(state.sharpeRatio ?? "0")),
    winRate: parseFloat(String(state.winRate ?? "0")),
    maxDrawdown: parseFloat(String(state.maxDrawdown ?? "0")),
    tradeCount: state.tradeCount,
    winCount: state.winCount,
    updatedAt: state.updatedAt.toISOString(),
  });
});

// GET /api/decisions — last N decisions with full reasoning
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

// POST /api/trigger — manually trigger an agent cycle (for demo)
router.post("/trigger", async (req, res): Promise<void> => {
  req.log.info("Manual agent cycle triggered");
  // Fire and forget — returns immediately
  void runAgentCycle();
  res.json({ queued: true, message: "Agent cycle triggered" });
});

export default router;
