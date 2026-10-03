"""Bounded chart history; the one-year view uses daily candles."""
from datetime import datetime, timedelta, timezone

RANGES = {"1d": ("5m", 290, 1), "1w": ("30m", 338, 7), "1m": ("4h", 188, 31),
          "3m": ("1d", 95, 93), "6m": ("1d", 188, 186), "1y": ("1d", 368, 366)}


def chart_payload(symbol, range_key, hub):
    interval, limit, days = RANGES[range_key]
    frame, source, asset_class = hub.get_candles(symbol, interval=interval, limit=limit)
    now = datetime.now(timezone.utc)
    cutoff = int((now - timedelta(days=days)).timestamp())
    candles = [{"time": int(row.time.timestamp()), "open": float(row.open), "high": float(row.high),
                "low": float(row.low), "close": float(row.close)}
               for row in frame.itertuples(index=False) if int(row.time.timestamp()) >= cutoff]
    provider, _ = hub.provider_for(symbol)
    seconds = {"5m": 300, "30m": 1800, "4h": 14400, "1d": 86400}[interval]
    return {"symbol": symbol, "range": range_key, "interval": interval, "candles": candles,
            "source": source, "asset_class": asset_class, "data_available": bool(candles),
            "coverage_start": candles[0]["time"] if candles else None,
            "coverage_end": candles[-1]["time"] if candles else None,
            "partial_history": bool(candles) and candles[0]["time"] > cutoff + seconds,
            "stale": bool(candles) and (not provider.healthy or candles[-1]["time"] < int(now.timestamp()) - seconds * 2),
            "fetched_at": int(now.timestamp())}
