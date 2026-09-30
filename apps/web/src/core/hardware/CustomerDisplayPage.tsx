import { useEffect, useState } from 'react';
import { formatPKR } from '@core/lib/format';
import { DISPLAY_CHANNEL, type DisplayMsg } from './customerDisplay';

/**
 * /customer-display — customer ki taraf wali screen. Full screen karein
 * (F11) aur doosre monitor par le jayein. Cashier ki window se chalti hai.
 */
export default function CustomerDisplayPage() {
  const [m, setM] = useState<DisplayMsg | null>(null);

  useEffect(() => {
    document.title = 'Customer display — Nafaa';
    if (typeof BroadcastChannel === 'undefined') return;
    const c = new BroadcastChannel(DISPLAY_CHANNEL);
    c.onmessage = (e) => setM(e.data as DisplayMsg);
    c.postMessage({ kind: 'hello' } satisfies DisplayMsg);
    return () => c.close();
  }, []);

  // Shukriya 10 second, phir khush-amdeed
  useEffect(() => {
    if (m?.kind !== 'thanks') return;
    const t = setTimeout(() => setM({ kind: 'idle', shopName: m.shopName }), 10_000);
    return () => clearTimeout(t);
  }, [m]);

  const shop = m && 'shopName' in m ? m.shopName : '';

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white" onDoubleClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <div className="text-2xl font-extrabold tracking-tight">{shop || 'Nafaa POS'}</div>
        <div className="text-sm font-semibold text-white/50">Double-click = full screen</div>
      </header>

      {m?.kind === 'cart' ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_420px]">
          <ul className="min-h-0 divide-y divide-white/10 overflow-y-auto px-8 py-4">
            {m.items.map((it, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 py-3 text-2xl">
                <span className="min-w-0 truncate font-bold">{it.name} <span className="text-lg font-semibold text-white/50">× {it.qty}</span></span>
                <span className="shrink-0 font-extrabold tabular-nums">{formatPKR(it.total)}</span>
              </li>
            )).reverse()}
          </ul>
          <aside className="flex flex-col justify-end gap-3 bg-emerald-600 p-8">
            <Row l="Items" v={String(m.items.length)} />
            {m.discount > 0 && <><Row l="Subtotal" v={formatPKR(m.subtotal)} /><Row l="Discount" v={`−${formatPKR(m.discount)}`} /></>}
            <div className="mt-2 border-t border-white/30 pt-4 text-lg font-bold uppercase tracking-widest text-white/80">Kul raqam</div>
            <div className="text-6xl font-black tabular-nums">{formatPKR(m.total)}</div>
          </aside>
        </div>
      ) : m?.kind === 'qr' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-2xl font-bold text-white/70">Scan karke pay karein — {m.label}</div>
          <div className="rounded-3xl bg-white p-4" dangerouslySetInnerHTML={{ __html: m.svg }} />
          <div className="text-5xl font-black tabular-nums">{formatPKR(m.amount)}</div>
          <div className="text-xl text-white/60">{m.merchantName}</div>
        </div>
      ) : m?.kind === 'thanks' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl font-black">Shukriya! 🙏</div>
          <div className="text-3xl font-bold text-white/80">Kul {formatPKR(m.total)} · Diye {formatPKR(m.paid)}</div>
          {m.change > 0 && <div className="rounded-3xl bg-emerald-600 px-10 py-6 text-5xl font-black tabular-nums">Wapsi {formatPKR(m.change)}</div>}
          <div className="text-xl text-white/60">Phir tashreef laiye</div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="text-5xl font-black">Khush-amdeed</div>
          <div className="text-2xl text-white/60">{shop || 'Cashier ki window se jura hua hai'}</div>
        </div>
      )}
    </div>
  );
}

const Row = ({ l, v }: { l: string; v: string }) => (
  <div className="flex justify-between text-2xl font-bold"><span className="text-white/80">{l}</span><span className="tabular-nums">{v}</span></div>
);
