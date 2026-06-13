import { db, decisionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface PerformanceMetrics {
  totalPnlPercent: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  tradeCount: number;
  winCount: number;
}

export async function computePerformance(): Promise<PerformanceMetrics> {
  try {
    const decisions = await db
      .select()
      .from(decisionsTable)
      .orderBy(desc(decisionsTable.createdAt))
      .limit(100);

    const trades = decisions.filter(
      (d) => d.action !== "HOLD" && d.pnlPercent !== null
    );

    const tradeCount = trades.length;
    if (tradeCount === 0) {
      return {
        totalPnlPercent: 0,
        sharpeRatio: 0,
        winRate: 0,
        maxDrawdown: 0,
        tradeCount: 0,
        winCount: 0,
      };
    }

    const pnls = trades.map((t) => parseFloat(String(t.pnlPercent ?? "0")));
    const winCount = pnls.filter((p) => p > 0).length;
    const totalPnlPercent = pnls.reduce((a, b) => a + b, 0);
    const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;

    // Sharpe (simplified: mean / std of returns, annualized naive)
    const mean = totalPnlPercent / tradeCount;
    const variance = pnls.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / tradeCount;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(tradeCount) : 0;

    // Max drawdown (from peak)
    let peak = 0;
    let cumulative = 0;
    let maxDrawdown = 0;
    for (const pnl of [...pnls].reverse()) {
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return {
      totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      tradeCount,
      winCount,
    };
  } catch (err) {
    logger.error({ err }, "Failed to compute performance");
    return {
      totalPnlPercent: 0,
      sharpeRatio: 0,
      winRate: 0,
      maxDrawdown: 0,
      tradeCount: 0,
      winCount: 0,
    };
  }
}
