import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";

export const agentStateTable = pgTable("agent_state", {
  id: serial("id").primaryKey(),
  regime: text("regime").notNull().default("RANGING"),
  confidence: integer("confidence").notNull().default(50),
  strategy: text("strategy").notNull().default("Mean Reversion"),
  signals: jsonb("signals").notNull().default({}),
  lastAction: text("last_action").notNull().default("HOLD"),
  simBalance: numeric("sim_balance", { precision: 18, scale: 2 }).notNull().default("10000"),
  totalPnlPercent: numeric("total_pnl_percent", { precision: 10, scale: 4 }).notNull().default("0"),
  sharpeRatio: numeric("sharpe_ratio", { precision: 10, scale: 4 }).notNull().default("0"),
  winRate: numeric("win_rate", { precision: 10, scale: 4 }).notNull().default("0"),
  maxDrawdown: numeric("max_drawdown", { precision: 10, scale: 4 }).notNull().default("0"),
  tradeCount: integer("trade_count").notNull().default(0),
  winCount: integer("win_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgentState = typeof agentStateTable.$inferSelect;
