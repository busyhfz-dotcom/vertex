import React, { useEffect, useRef } from 'react';
import { Activity, BarChart3, Clock3, ShieldAlert, TrendingUp } from 'lucide-react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import type { Dictionary } from '../locales/dictionary';
import type { MarketRecord } from './types';
import { formatPct, formatPrice, riskColor } from './panels';

type Candle = { time: number; open: number; high: number; low: number; close: number };

export default function SymbolDetail({
  record, candles, t, range, onRangeChange, loading, partial, interval, stale,
}: { record: MarketRecord | null; candles: Candle[]; t: Dictionary; range: string; onRangeChange: (range: string) => void; loading: boolean; partial: boolean; interval: string; stale: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);
  const fittedContext = useRef('');

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = createChart(canvasRef.current, {
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      layout: { background: { color: '#06111e' }, textColor: '#7e93a9', fontSize: 11 },
      grid: { vertLines: { color: 'rgba(69, 103, 138, .12)' }, horzLines: { color: 'rgba(69, 103, 138, .12)' } },
      rightPriceScale: { borderColor: 'rgba(73, 113, 148, .2)' },
      timeScale: { borderColor: 'rgba(73, 113, 148, .2)', timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { color: '#3b648c' }, horzLine: { color: '#3b648c' } },
    });
    const series = chart.addCandlestickSeries({
      upColor: '#10d9b0', downColor: '#f25e79',
      borderUpColor: '#10d9b0', borderDownColor: '#f25e79',
      wickUpColor: '#10d9b0', wickDownColor: '#f25e79',
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const observer = new ResizeObserver(() => {
      if (canvasRef.current) chart.applyOptions({ width: canvasRef.current.clientWidth, height: canvasRef.current.clientHeight });
    });
    observer.observe(canvasRef.current);
    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(candles as any);
    const context = `${record?.symbol}:${range}`;
    chartRef.current?.applyOptions({ timeScale: { timeVisible: interval !== '1d' } });
    if (candles.length && fittedContext.current !== context) {
      chartRef.current?.timeScale().fitContent();
      fittedContext.current = context;
    }
  }, [candles, record?.symbol, range, interval]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) {
      try { series.removePriceLine(line); } catch { /* chart may have been recreated */ }
    }
    priceLinesRef.current = [];
    const signal = record?.signal;
    if (!record?.data_available || signal?.status !== 'A_PLUS_SETUP' ||
        signal.entry == null || signal.sl == null || signal.tp == null) return;
    priceLinesRef.current = [
      series.createPriceLine({ price: signal.entry, color: '#4d9eff', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'ENTRY' }),
      series.createPriceLine({ price: signal.sl, color: '#f25e79', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SL' }),
      series.createPriceLine({ price: signal.tp, color: '#10d9b0', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TP' }),
    ];
  }, [record]);

  const available = record?.data_available === true;
  const change = record?.snapshot?.price_change_percent;
  const positive = typeof change === 'number' && change >= 0;
  const risk = riskColor(record?.risk?.risk_label || 'LOW');
  const time = record?.updated_at ? new Date(record.updated_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const riskReason = record?.risk?.news_embargo_active ? t.riskOverrideNews :
    record?.risk?.risk_label === 'HIGH' ? t.riskOverrideHigh : null;

  return (
    <section className="vx-panel vx-chart-panel" aria-label={t.activeMarket}>
      <div className="vx-chart-header">
        <div className="vx-chart-title">
          <span className="vx-market-icon"><BarChart3 size={19} /></span>
          <div>
            <h2 className="vx-mono">{record?.symbol || '—'}</h2>
            <span>{record ? record.asset_class + ' · ' + record.source : t.selectSymbol}</span>
          </div>
        </div>
        <div className="vx-chart-price">
          <strong className="vx-mono">{available ? formatPrice(record?.snapshot?.last_price, record?.symbol) : '—'}</strong>
          <span className={available ? (positive ? 'vx-mint' : 'vx-red') : 'vx-muted'}>{available ? formatPct(change) : t.dataUnavailable}</span>
        </div>
      </div>
      <div className="vx-chart-toolbar">
        <span className="vx-toolbar-label"><Activity size={14} />{available ? t.dataHealthy : t.dataUnavailable}</span>
        <div className="vx-chart-ranges" aria-label={t.chartRange}>
          {['1d', '1w', '1m', '3m', '6m', '1y'].map((option) => <button type="button" key={option} onClick={() => onRangeChange(option)} aria-pressed={range === option} className={range === option ? 'vx-timeframe' : 'vx-muted'}>{option.toUpperCase()}</button>)}
        </div>
        <span>{t.candleInterval}: {interval}</span>
        <span className="vx-toolbar-source">{record?.source || '—'}</span>
        <span className="vx-toolbar-updated"><Clock3 size={13} />{t.updatedAt} {time}</span>
      </div>
      <div className="vx-chart-stage">
        <div ref={canvasRef} className="vx-chart-canvas" />
        {(loading || candles.length === 0) && (
          <div className="vx-chart-overlay">
            <span className="vx-chart-empty-icon"><TrendingUp size={25} /></span>
            <strong>{loading ? t.loadingHistory : t.chartUnavailable}</strong>
            <span>{t.chartUnavailable}</span>
          </div>
        )}
      </div>
      {candles.length > 0 && <p className="px-4 py-2 text-xs text-[#95afc0]">{new Date(candles[0].time * 1000).toLocaleDateString()} — {new Date(candles[candles.length - 1].time * 1000).toLocaleDateString()}{partial ? ' · ' + t.partialHistory : ''}</p>}
      {stale && <p className="px-4 py-2 text-xs text-amber-300">{t.staleHistory}</p>}
      <div className="vx-chart-metrics">
        <div><span>{t.risk}</span><strong className={'vx-mono ' + risk.text}>{available ? (record?.risk?.risk_score ?? '—') + '/100' : '—'}</strong></div>
        <div><span>{t.volatility}</span><strong>{available ? record?.risk?.volatility_state || '—' : '—'}</strong></div>
        <div><span>{t.session}</span><strong>{available ? record?.signal?.checklist?.session_name || record?.signal?.session || '—' : '—'}</strong></div>
        <div><span>{t.status}</span><strong>{available ? record?.signal?.status === 'A_PLUS_SETUP' ? t.validated : t.scanning : t.dataUnavailable}</strong></div>
      </div>
      {riskReason && available && <div className="vx-chart-warning"><ShieldAlert size={15} />{riskReason}</div>}
    </section>
  );
}
