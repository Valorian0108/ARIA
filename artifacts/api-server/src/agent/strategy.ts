import type { Regime } from "../lib/qwen";

export interface StrategyConfig {
  name: string;
  description: string;
  regimeColor: string;
}

const STRATEGIES: Record<Regime, StrategyConfig> = {
  TRENDING: {
    name: "Momentum Breakout",
    description: "Rides directional momentum with trend-following entries on breakouts and volume confirmation.",
    regimeColor: "violet",
  },
  RANGING: {
    name: "Mean Reversion",
    description: "Buys at statistical lows and sells at highs within the established range.",
    regimeColor: "blue",
  },
  VOLATILE: {
    name: "Volatility Breakout",
    description: "Waits for volatility to resolve into a confirmed direction before entering.",
    regimeColor: "amber",
  },
  CRISIS: {
    name: "Capital Preservation",
    description: "Minimizes exposure during extreme market stress. Hold cash, reduce risk.",
    regimeColor: "red",
  },
};

export function getStrategy(regime: Regime): StrategyConfig {
  return STRATEGIES[regime];
}
