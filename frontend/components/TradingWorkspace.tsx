import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Globe2, RotateCw } from 'lucide-react';
import type { Dictionary } from '../locales/dictionary';
import type { MarketRecord, TradeAnalysis } from './types';
import { TradeDeskDetail } from './TradeDesk';

export function safeTradingUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (typeof window !== 'undefined' && url.origin === window.location.origin) return null;
    return url.href;
  } catch { return null; }
}

function symbolUrl(symbol: string | null) {
  return symbol?.endsWith('USDT') ? `https://www.binance.com/en/trade/${symbol.slice(0, -4)}_USDT?type=spot` : 'https://www.binance.com';
}

export default function TradingWorkspace({ records, selected, onSelect, analysis, t }: {
  records: MarketRecord[]; selected: string | null; onSelect: (symbol: string) => void; analysis: TradeAnalysis | null; t: Dictionary;
}) {
  const [address, setAddress] = useState(symbolUrl(selected));
  const [history, setHistory] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState(false);
  const currentUrl = history[index] || '';
  const validAddress = safeTradingUrl(address);
  const record = records.find((item) => item.symbol === selected);

  function navigate(value: string) {
    const url = safeTradingUrl(value);
    if (!url) { setError(true); return; }
    setError(false);
    setHistory((previous) => [...previous.slice(0, index + 1), url]);
    setIndex(index + 1);
    setAddress(url);
  }
  function move(next: number) {
    setIndex(next);
    setAddress(history[next]);
    setError(false);
  }

  return (
    <div className="vx-trading-workspace">
      <aside className="vx-stack">
        <div className="vx-panel p-4">
          <h1 className="mb-3 text-lg font-semibold">{t.tradingBrowser}</h1>
          <label className="block text-xs text-[#95afc0]" htmlFor="trading-symbol">{t.symbol}</label>
          <select id="trading-symbol" className="mt-2 w-full rounded border border-[#234459] bg-[#071522] p-2" value={selected || ''} onChange={(event) => onSelect(event.target.value)}>
            {records.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
          </select>
          <button type="button" className="mt-3 w-full rounded bg-[#17344d] p-2 text-sm" onClick={() => { setAddress(symbolUrl(selected)); setError(false); }}>{t.useSymbolPage}</button>
          <p className="mt-3 text-xs leading-5 text-[#95afc0]">{t.tradingBrowserNotice}</p>
        </div>
        <TradeDeskDetail analysis={analysis} unavailable={record?.data_available === false} t={t} />
      </aside>
      <section className="vx-panel p-3" aria-label={t.tradingBrowser}>
        <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); navigate(address); }}>
          <button type="button" aria-label={t.browserBack} disabled={index <= 0} onClick={() => move(index - 1)} className="p-2 disabled:opacity-30"><ArrowLeft size={17} /></button>
          <button type="button" aria-label={t.browserForward} disabled={index + 1 >= history.length} onClick={() => move(index + 1)} className="p-2 disabled:opacity-30"><ArrowRight size={17} /></button>
          <button type="button" aria-label={t.browserReload} disabled={!currentUrl} onClick={() => setRefreshKey((key) => key + 1)} className="p-2 disabled:opacity-30"><RotateCw size={17} /></button>
          <input dir="ltr" type="url" aria-label={t.browserAddress} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="https://…" className="min-w-[180px] flex-1 rounded border border-[#234459] bg-[#071522] px-3 py-2 text-sm" />
          <button type="submit" className="flex items-center gap-2 rounded bg-[#17344d] px-3 py-2 text-sm"><Globe2 size={16} />{t.openInsidePanel}</button>
          {validAddress && <a href={validAddress} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded bg-[#10d9b0] px-3 py-2 text-sm font-semibold text-[#05131d]"><ExternalLink size={16} />{t.openTradingWindow}</a>}
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-[#ff5a72]">{t.invalidTradingUrl}</p>}
        <p className="my-3 text-xs leading-5 text-[#95afc0]">{t.browserFrameNotice}</p>
        {currentUrl ? (
          <>
            <p dir="ltr" className="mb-2 break-all text-xs text-[#95afc0]">{currentUrl}</p>
            <iframe key={currentUrl + refreshKey} src={currentUrl} title={t.tradingBrowser} referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="h-[720px] w-full rounded border border-[#234459] bg-white" />
          </>
        ) : <div className="flex min-h-[520px] items-center justify-center px-6 text-center text-sm text-[#95afc0]">{t.browserReady}</div>}
      </section>
    </div>
  );
}
