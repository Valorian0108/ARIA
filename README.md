# ARIA — Adaptive Regime Intelligence Agent

> An autonomous AI agent that reads live crypto market conditions, classifies the current regime, and makes reasoned BUY / SELL / HOLD decisions — with a full explanation of its thinking.

🌐 **Live Demo:** [aria-7syb.onrender.com](https://aria-7syb.onrender.com)

---

## What is ARIA?

Most crypto dashboards show you data. ARIA *reasons* about it.

Every 45 seconds, ARIA:
1. Pulls live BTC/USDT market signals — price, funding rate, sentiment score, whale activity, exchange flows, MACD
2. Classifies the current **market regime** (Trending Up / Trending Down / Ranging / Volatile) using Qwen AI
3. Makes a simulated **trading decision** (BUY / SELL / HOLD) with a confidence score and full written reasoning
4. Updates the **Sim Performance** panel — tracking P&L, Win Rate, Sharpe Ratio, and Max Drawdown in real time
5. Logs every decision to the **Reasoning Trail** — a live audit log of ARIA's thought process

---

## Features

| Feature | Description |
|---|---|
| 🧠 **AI Regime Classification** | Qwen AI classifies the market as Trending Up, Trending Down, Ranging, or Volatile |
| 📊 **Live Signal Ingestion** | Price, funding rate, sentiment, whale activity, exchange flow, MACD — all live |
| ⚡ **Autonomous Decision Loop** | Agent cycles every 45 seconds without human input |
| 📈 **Sim Performance Metrics** | P&L, Win Rate, Sharpe Ratio, Max Drawdown tracked across all decisions |
| 🔍 **Reasoning Trail** | Every decision logged with confidence score and plain-English explanation |
| 🛡️ **Signal Heuristic Override** | If AI returns HOLD but signals clearly align, a rules-based override commits a trade |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite + Tailwind CSS |
| **Backend** | Express 5 + Node.js 24 |
| **Database** | PostgreSQL + Drizzle ORM |
| **AI** | Qwen AI via Bitget hackathon endpoint |
| **Validation** | Zod v4 + drizzle-zod |
| **Monorepo** | pnpm workspaces + esbuild |
| **Hosting** | Render |

---

## Architecture

```
┌─────────────────────────────────────┐
│           React Dashboard           │
│  Regime · Signals · Trail · Metrics │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│         Express API Server          │
│  /api/aria  ·  /api/healthz         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│           Agent Loop (45s)          │
│  fetchSignals → classifyRegime      │
│  → generateDecision → storeToDB     │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
  Qwen AI API      PostgreSQL
  (Bitget)         (Drizzle ORM)
```

---

## Getting Started

### Prerequisites
- Node.js 24+
- pnpm 9+
- PostgreSQL database
- Qwen AI API key (Bitget hackathon endpoint)

### Install & Run

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Start the API server (dev)
pnpm --filter @workspace/api-server run dev

# Build the web frontend
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web run build
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `QWEN_API_KEY` | Qwen AI API key |

---

## Built For

**Bitget Builder Base Camp Hackathon S1** — AI × Crypto Track

ARIA explores the question: *what if an AI agent could reason about market conditions the same way an experienced trader does — reading regime, weighing signals, and explaining its logic — rather than just reacting to price?*

---

## License

MIT
