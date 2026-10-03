import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch
import pandas as pd
from chart_history import chart_payload
from providers.crypto_universe import select_ranked_pairs, resolve_universe


class ChartAndUniverseTests(unittest.TestCase):
    def test_year_uses_daily_real_history_and_reports_partial(self):
        hub = Mock()
        hub.provider_for.return_value = (Mock(healthy=True), 'CRYPTO')
        now = datetime.now(timezone.utc)
        frame = pd.DataFrame([dict(time=now - timedelta(days=day), open=10, high=12, low=9, close=11)
                              for day in range(367, -1, -1)])
        hub.get_candles.return_value = (frame, 'BINANCE', 'CRYPTO')
        payload = chart_payload('BTCUSDT', '1y', hub)
        hub.get_candles.assert_called_once_with('BTCUSDT', interval='1d', limit=368)
        self.assertGreaterEqual(len(payload['candles']), 365)
        self.assertFalse(payload['partial_history'])
        hub.get_candles.return_value = (frame.tail(20), 'BINANCE', 'CRYPTO')
        self.assertTrue(chart_payload('BTCUSDT', '1y', hub)['partial_history'])

    def test_empty_history_is_unavailable(self):
        hub = Mock()
        hub.provider_for.return_value = (Mock(healthy=False), 'FOREX')
        hub.get_candles.return_value = (pd.DataFrame(), 'TWELVEDATA', 'FOREX')
        payload = chart_payload('EURUSD', '1y', hub)
        self.assertFalse(payload['data_available'])
        self.assertEqual(payload['candles'], [])
        self.assertIsNone(payload['coverage_start'])

    def test_rank_selection_skips_unsupported_and_duplicate_pairs(self):
        coins = [dict(id=base, symbol=base, name=base, market_cap_rank=rank)
                 for base, rank in [('unknown', 1), ('eth', 3), ('btc', 2), ('btc-copy', 4), ('paused', 5)]]
        coins[3]['symbol'] = 'btc'
        exchange = {'symbols': [dict(baseAsset=base, symbol=base+'USDT', quoteAsset='USDT',
                                     status=status, isSpotTradingAllowed=True)
                                for base, status in [('BTC', 'TRADING'), ('ETH', 'TRADING'), ('PAUSED', 'BREAK')]]}
        self.assertEqual([item['symbol'] for item in select_ranked_pairs(coins, exchange)], ['BTCUSDT', 'ETHUSDT'])

    @patch('providers.crypto_universe.requests.get', side_effect=RuntimeError('offline'))
    def test_fallback_never_claims_verified_ranking(self, _request):
        symbols, metadata = resolve_universe(['BTCUSDT'])
        self.assertEqual(symbols, ['BTCUSDT'])
        self.assertEqual(metadata['mode'], 'CONFIGURED_FALLBACK')
        self.assertIsNone(metadata['as_of'])


if __name__ == '__main__':
    unittest.main()
