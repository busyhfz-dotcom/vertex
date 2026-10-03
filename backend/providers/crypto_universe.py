"""Rank supported spot pairs by CoinGecko market cap, with explicit fallback."""
from datetime import datetime, timezone
import requests

ALIASES = {"the-open-network": "TON"}


def select_ranked_pairs(coins, exchange, count=30):
    pairs = {row["baseAsset"]: row["symbol"] for row in exchange["symbols"]
             if row.get("quoteAsset") == "USDT" and row.get("status") == "TRADING"
             and row.get("isSpotTradingAllowed", False)}
    selected = []
    seen = set()
    for coin in sorted(coins, key=lambda item: item.get("market_cap_rank") or 10**9):
        base = ALIASES.get(coin["id"], coin["symbol"].upper())
        symbol = pairs.get(base)
        if symbol and symbol not in seen and coin.get("market_cap_rank"):
            selected.append({"symbol": symbol, "name": coin["name"], "coin_id": coin["id"], "market_cap_rank": coin["market_cap_rank"]})
            seen.add(symbol)
        if len(selected) == count:
            break
    return selected


def resolve_universe(fallback):
    try:
        coins = requests.get("https://api.coingecko.com/api/v3/coins/markets", params={
            "vs_currency": "usd", "order": "market_cap_desc", "per_page": 100, "page": 1, "sparkline": "false",
        }, timeout=8)
        coins.raise_for_status()
        exchange = requests.get("https://api.binance.com/api/v3/exchangeInfo", timeout=8)
        exchange.raise_for_status()
        selected = select_ranked_pairs(coins.json(), exchange.json())
        if len(selected) != 30:
            raise ValueError("Insufficient verified pairs")
        return [item["symbol"] for item in selected], {"mode": "MARKET_CAP_SUPPORTED", "source": "CoinGecko / Binance spot USDT", "as_of": datetime.now(timezone.utc).isoformat(), "items": selected}
    except Exception:
        return list(fallback), {"mode": "CONFIGURED_FALLBACK", "source": None, "as_of": None, "items": [{"symbol": symbol} for symbol in fallback]}
