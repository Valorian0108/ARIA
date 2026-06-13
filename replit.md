# ARIA — Adaptive Regime Intelligence Agent

A live crypto trading agent for the Bitget AI Base Camp Hackathon S1 (Track 1). ARIA detects market regimes in real time (Trending / Ranging / Volatile / Crisis), routes each to a matching sub-strategy (Momentum Breakout / Mean Reversion / Volatility Breakout / Capital Preservation), and explains every trade decision in plain English using Qwen via the Bitget hackathon API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/web run dev` — run the React frontend (port 22333)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI-compatible client → Qwen `qwen3.6-plus` via `https://hackathon.bitgetops.com/v1`
- Market data: Bitget public REST API (candles, tickers, funding rates)
- Frontend: React 18 + Vite + TailwindCSS
- Fonts: JetBrains Mono + Space Grotesk (Neural/cognitive design)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/lib/bitget.ts` — Bitget public API client, signal computation (MACD, volatility, price structure, exchange flow)
- `artifacts/api-server/src/lib/qwen.ts` — Qwen AI calls: regime classification + decision generation
- `artifacts/api-server/src/agent/loop.ts` — main agent loop (45s interval), orchestrates fetch→classify→decide→persist
- `artifacts/api-server/src/agent/strategy.ts` — regime→strategy routing table
- `artifacts/api-server/src/agent/performance.ts` — Sharpe, win rate, max drawdown computation
- `artifacts/api-server/src/routes/aria.ts` — `/api/state`, `/api/decisions`, `/api/trigger`
- `artifacts/web/src/pages/dashboard.tsx` — full Neural-design dashboard with live polling
- `lib/db/src/schema/decisions.ts` — decisions table
- `lib/db/src/schema/agentState.ts` — agent_state table (singleton row id=1)
- `render.yaml` — Render deployment config

## Architecture decisions

- **Single agent state row**: `agent_state` table always uses `id=1` as a singleton. No versioning needed; the decisions table is the full audit log.
- **Sim trading only**: No BITGET_SECRET_KEY / BITGET_PASSPHRASE present → no real order placement. P&L is simulated based on signal quality and direction alignment.
- **Qwen JSON prompts**: Both regime and decision prompts instruct the model to return raw JSON (no markdown). Code strips code fences defensively before `JSON.parse`.
- **45-second loop**: Fast enough for demo, slow enough to not burn API quota.
- **Frontend polls every 15s**: Lightweight — no WebSocket needed for this refresh rate.

## Product

- **Live regime detection**: Qwen analyzes 8 technical and on-chain signals every 45s and classifies the BTC/USDT market regime with confidence score.
- **Adaptive strategy routing**: Each regime routes to its sub-strategy (4 strategies total).
- **Reasoning trail**: Every decision is logged with plain-English AI-generated explanation and displayed in the timeline.
- **Performance tracking**: Sim P&L, Sharpe ratio, win rate, max drawdown computed across all historical trades.
- **TRIGGER button**: Manually fire an agent cycle for live demos.

## Deployment (Render)

- `render.yaml` at project root configures a single web service.
- Build: install → build React → build Express → serve.
- Express serves `/api/*`; static files serve `/*` (React SPA).
- Set env vars on Render: `DATABASE_URL`, `QWEN_API_KEY`, `BITGET_API_KEY`.

## Required env

- `DATABASE_URL` — Postgres connection string
- `QWEN_API_KEY` — Bitget hackathon Qwen key (`https://hackathon.bitgetops.com/v1`)
- `BITGET_API_KEY` — Bitget API key (used for future authenticated endpoints)
- `SESSION_SECRET` — Express session secret

## User preferences

- Neural/cognitive visual direction: deep black `#08080E`, violet/purple accents, JetBrains Mono + Space Grotesk
- Target platform: Render (free tier) + GitHub

## Gotchas

- Bitget candle API returns `data` as `string[][]` where index 0 is timestamp. Verify format before parsing.
- Qwen sometimes wraps JSON in markdown code fences — always strip before parsing.
- Volatility will be `null` if candle data is unavailable on first fetch — stddev guards against empty arrays.
- Do NOT run `pnpm dev` at workspace root — no root dev script exists by design.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
