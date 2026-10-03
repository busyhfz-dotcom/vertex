# VERTEX — Global Market Intelligence

A 24/7 crypto + forex monitoring dashboard: continuous structural analysis
(liquidity sweeps, displacement, fair-value gaps, session/killzone context),
a composite risk score per symbol, an alert feed (with optional Telegram
push), an economic-news guard, and a **Trade Desk** that runs a
transparent, weighted multi-method read (market structure, multi-timeframe
trend, momentum, volume) on every watchlist symbol and turns it into a
uncalibrated confluence score, a conservative risk cap, and — only when a precise
structural trigger exists — an entry/stop/target plan. All in an
English-first, full-Persian-RTL interface.

**"VERTEX" and the visual identity here are placeholders** — rename freely,
it's one constant (`VERTEX_BRAND_NAME` in the backend, `t.brand` in the
frontend dictionary) plus the logo mark in `components/Dashboard.tsx`.

## What this is — and isn't

This platform reads market structure and flags risk conditions. It does
**not** place trades, hold funds, or predict outcomes. No confluence score,
risk score, Trade Desk recommendation, or alert here is a guarantee of
profit — treat it as one input into your own judgment, not a replacement
for it. The Trade Desk is designed to act with a professional trader's
discipline: it forces WAIT when a high-impact news embargo is active, news
status is unavailable, market data is incomplete, composite risk is HIGH,
or a confirmed structural entry trigger is absent — and
every analysis carries this same disclaimer.

## Architecture

Charts default to one year of real daily candles. Range controls provide 1D,
1W, 1M, 3M, 6M and 1Y; `/api/chart/{symbol}?range=1y` fetches bounded provider
history separately from the short-term analysis inputs. Newly listed markets
show their actual available coverage, and unavailable history stays empty.

At startup, the default crypto universe selects the first 30 CoinGecko
market-cap-ranked assets with a currently trading Binance spot USDT pair.
This excludes unsupported assets and the USDT quote currency itself. Ranking
source and timestamp are exposed in health/watchlist; ranking failure uses an
explicitly labelled configured fallback. `VERTEX_CRYPTO_WATCHLIST` overrides
this selection. Rankings are a startup snapshot, not continuously refreshed.

The Trading Browser keeps the selected market's Trade Desk beside a user-entered
HTTPS website. Binance spot links are provided per crypto symbol. Sites may
block embedding or embedded login using CSP/X-Frame-Options; the separate-window
link remains available. This is an iframe workspace, not a full browser engine.
VERTEX stores no exchange credentials and does not submit orders. Users sign in
and trade directly with their chosen exchange.

```
backend/   FastAPI. Binance public API for crypto (live, no key needed).
           Pluggable forex/metals provider (Twelve Data, free key) that
           degrades honestly to "not configured" rather than faking data.
           Background asyncio loop scans the whole watchlist every N
           seconds regardless of whether a dashboard is open, persists
           alerts/signals/risk history to SQLite, and can push to Telegram.
           Archives completed provider candles and audits subsequent call
           outcomes conservatively; these are not broker execution results.
frontend/  Next.js + Tailwind. English default, full Persian RTL locale.
           Live watchlist, risk heatmap, alert feed, signal log, economic
           calendar, per-symbol candlestick chart with entry/SL/TP lines.
```

## Quick start (local)

```bash
cp .env.example .env
docker compose --env-file .env up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000 (docs at /docs)

Crypto data (Binance) works immediately with zero configuration. Forex/metals
and the economic news guard need one free API key each — see `.env.example`
for exactly where to get them (both have no-credit-card free tiers).

## Deploying

Two supported paths:

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — your own VPS + Docker + Nginx + free
  HTTPS via Certbot. Full control, but you manage the server.
- [`DEPLOYMENT-RAILWAY-VERCEL.md`](./DEPLOYMENT-RAILWAY-VERCEL.md) — Railway
  (backend) + Vercel (frontend). No server to manage, both give you HTTPS
  and a public domain automatically, and both run outside Iran so
  Binance/Twelve Data/Finnhub stay reachable.

For durable research history on Railway, attach a volume to the backend at
`/data` (the location of `VERTEX_DATABASE_PATH`). Without it, the database
resets on redeployment. Archive coverage and storage status are visible at
`/api/research/readiness`; forward call audits are at `/api/research/outcomes`.
The [research register](./docs/research-evidence.md) records data provenance,
video-screening rules, and the validation requirements before a strategy is
allowed into live scoring.

## Backend tests

```bash
cd backend
pip install -r requirements.txt
python -m unittest discover -s tests -p "test_*.py" -v
```

## Extending it

- **More symbols**: edit `VERTEX_CRYPTO_WATCHLIST` / `VERTEX_FOREX_WATCHLIST`
  in `.env` — any Binance spot symbol, any Twelve Data forex pair.
- **New risk factors**: `backend/engine/risk_engine.py` — it's a small,
  explainable scoring function on purpose; add inputs, keep it explainable.
- **New alert channels** (email, Discord, Slack webhook): add another
  notifier next to `backend/alerts/telegram_notifier.py` and call it from
  `alerts/alert_engine.py`.
- **Persistent multi-user accounts, execution, PostgreSQL, observability**:
  none of that exists yet — this is a monitoring/alerting tool, not a broker
  connection. If you want it to eventually place trades, that is a
  materially bigger, separate project with its own risk controls.
