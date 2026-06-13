import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  regime: text("regime").notNull(),
  confidence: integer("confidence").notNull(),
  strategy: text("strategy").notNull(),
  action: text("action").notNull(),
  pair: text("pair").notNull().default("BTC/USDT"),
  reasoning: text("reasoning").notNull(),
  entryPrice: numeric("entry_price", { precision: 18, scale: 2 }),
  exitPrice: numeric("exit_price", { precision: 18, scale: 2 }),
  pnlPercent: numeric("pnl_percent", { precision: 10, scale: 4 }),
  signals: jsonb("signals"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;
