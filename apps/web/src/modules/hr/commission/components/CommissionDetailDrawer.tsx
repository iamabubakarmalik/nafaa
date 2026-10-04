import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Package, Receipt, Layers, Printer, Download, TrendingUp,
  Undo2, ExternalLink, Trophy, Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useCommissionDetail, periodLabel } from '../hooks/useCommission';
import type { CommissionRow } from '../api/commission.api';

/* ═════════════════════════════════════════════════════════════
   EK BANDE KA POORA KHATA
   ─────────────────────────────────────────────────────────────
   Safhe par kul raqam dikh jati hai, magar asal sawal hamesha
   agla hota hai: "ye paisa aaya kahan se?"

   Teen nazariye, teen tab:
     📦 CHEEZ    — kaunsa maal kitna bika aur us par kitni bani
     🗂️ CATEGORY — kis khandaan se kitna aaya
     🧾 BILL     — ek ek bill, aur us par click karke asli receipt

   Har cheez ke samne miqdar, rate, munafa aur commission — chaar
   number. Is se dukaan-daar khud dekh leta hai ke kaunsi cheez
   bechne par bande ko faida hai, aur kahan wo sirf waqt laga raha.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'product' | 'category' | 'bill';

export function CommissionDetailDrawer({
  row, period, tone, shopName, hideAmounts, onClose,
}: {
  row: CommissionRow;
  period: string;
  tone: { grad: string; text: string };
  shopName?: string;
  hideAmounts?: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('product');
  const { data, isLoading, isError } = useCommissionDetail(row.userId, period);
  const money = (v: number) => (hideAmounts ? '••••' : formatPKR(v));
  const qty = (v: number) => Number(v || 0).toFixed(Number(v || 0) % 1 === 0 ? 0 : 2);

  const exportCsv = () => {
    if (!data) return;
    const head = ['Cheez', 'Category', 'Miqdar', 'Unit', 'Wapas aaya', 'Bikri', 'Lagat', 'Munafa', 'Commission'];
    const body = (data.byProduct ?? []).map((p) => [
      p.name, p.categoryName ?? '', p.qty, p.unit, p.returned,
      p.sale.toFixed(2), p.cost.toFixed(2), p.profit.toFixed(2), p.commission.toFixed(2),
    ]);
    const summary = [
      [`${row.name} — commission ki tafseel`],
      [`${shopName ?? ''}  •  ${periodLabel(period)}`],
      [`${row.bills} bill  •  bikri ${row.sale.toFixed(2)}  •  commission ${row.earned.toFixed(2)}`],
      [''],
    ];
    const csv = [...summary, head, ...body]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-${row.name.replace(/\s+/g, '-')}-${period}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Tafseel export ho gayi');
  };

  const TABS: Array<{ v: Tab; l: string; i: any; n?: number }> = [
    { v: 'product', l: 'Cheez ke hisab se', i: Package, n: data?.byProduct?.length },
    { v: 'category', l: 'Category', i: Layers, n: data?.byCategory?.length },
    { v: 'bill', l: 'Bill', i: Receipt, n: data?.billList?.length },
  ];

  return (
    <div className="fixed inset-0 z-[75] bg-slate-950/70 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">

        {/* ── Upar ── */}
        <header className={`p-5 bg-gradient-to-br ${tone.grad} text-white shrink-0`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/75">
                {periodLabel(period)} · poora khata
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl font-black truncate">{row.name}</h2>
              <p className="text-xs font-bold text-white/85 mt-0.5">
                {row.staff?.designation ?? 'Banda'}
                {row.staff?.staffNumber && ` · ${row.staff.staffNumber}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={exportCsv} title="CSV" disabled={!data}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-40 transition">
                <Download className="h-4 w-4" />
              </button>
              <button onClick={() => data && printDetail(data, row, period, shopName)} title="Print" disabled={!data}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-40 transition">
                <Printer className="h-4 w-4" />
              </button>
              <button onClick={onClose}
                className="h-10 w-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <HeroStat label="Bill" value={String(row.bills)} />
            <HeroStat label="Bikri" value={money(row.sale)} />
            <HeroStat label="Munafa" value={money(row.profit)} />
            <HeroStat label="Commission" value={money(row.earned)} big />
          </div>
        </header>

        {/* ── Hisab kaise bana ── */}
        <div className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 shrink-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 inline-flex items-center gap-1.5">
            <Gauge className="h-3 w-3" /> Hisab kaise bana
          </p>
          {row.lines.length === 0 ? (
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
              {row.blockedByMin
                ? `Hadd ${money(row.blockedByMin.need)} hai aur abhi ${money(row.blockedByMin.short)} kam hai — commission nahi bani.`
                : 'Is bande par koi chaalu rule lagu nahi hota.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {row.lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-black text-slate-800 dark:text-slate-100 truncate">{l.label}</div>
                    {l.rate > 0 && (
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                        {l.valueType === 'PERCENT'
                          ? `${money(l.base)} ka ${l.rate}%`
                          : `${qty(l.base)} × ${formatPKR(l.rate)}`}
                      </div>
                    )}
                  </div>
                  <div className={`text-sm font-black tabular-nums shrink-0 ${tone.text}`}>{money(l.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="px-4 sm:px-5 pt-3 shrink-0 flex gap-1.5 overflow-x-auto">
          {TABS.map((x) => (
            <button key={x.v} onClick={() => setTab(x.v)}
              className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 shrink-0 transition ${
                tab === x.v
                  ? `border-transparent bg-gradient-to-r ${tone.grad} text-white shadow`
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}>
              <x.i className="h-3.5 w-3.5" /> {x.l}
              {x.n !== undefined && (
                <span className={`px-1.5 rounded-md text-[9px] ${tab === x.v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {x.n}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tafseel ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : isError || !data ? (
            <div className="py-12 text-center">
              <p className="text-sm font-black text-slate-500">Tafseel nahi aa saki</p>
            </div>
          ) : tab === 'product' ? (
            data.byProduct.length === 0 ? <Empty text="Is mahine kuch nahi bika" /> : (
              <div className="space-y-1.5">
                {data.byProduct.map((p, i) => {
                  const max = data.byProduct[0]?.commission || 1;
                  return (
                    <div key={p.productId}
                      className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {i === 0 && p.commission > 0 && <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            <span className="text-sm font-black text-slate-900 dark:text-white truncate">{p.name}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                            {p.categoryName ?? 'Bina category'} · {p.bills} bill par
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-black tabular-nums ${tone.text}`}>{money(p.commission)}</div>
                          <div className="text-[9px] font-bold text-slate-400">commission</div>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-4 gap-2">
                        <Cell label="Miqdar" value={`${qty(p.qty)} ${p.unit}`} />
                        <Cell label="Bikri" value={money(p.sale)} />
                        <Cell label="Rate" value={p.qty > 0 ? money(p.sale / p.qty) : '—'} />
                        <Cell label="Munafa" value={money(p.profit)}
                          tone={p.profit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                      </div>

                      {p.returned > 0 && (
                        <p className="mt-1.5 text-[10px] font-black text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <Undo2 className="h-2.5 w-2.5" /> {qty(p.returned)} {p.unit} wapas aaya — commission me shamil nahi
                        </p>
                      )}

                      <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${tone.grad}`}
                          style={{ width: `${Math.max((p.commission / max) * 100, 1)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : tab === 'category' ? (
            data.byCategory.length === 0 ? <Empty text="Koi category nahi" /> : (
              <div className="space-y-2">
                {data.byCategory.map((cat, i) => {
                  const max = data.byCategory[0]?.commission || 1;
                  return (
                    <div key={cat.categoryId ?? `none-${i}`}
                      className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 dark:text-white truncate">{cat.name}</div>
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {cat.items} cheezein · {qty(cat.qty)} miqdar · {money(cat.sale)}
                          </div>
                        </div>
                        <div className={`text-base font-black tabular-nums shrink-0 ${tone.text}`}>
                          {money(cat.commission)}
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${tone.grad}`}
                          style={{ width: `${Math.max((cat.commission / max) * 100, 1)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            data.billList.length === 0 ? <Empty text="Koi bill nahi" /> : (
              <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.billList.map((b) => (
                    <Link key={b.id} to={`/sales/${b.id}/receipt`} target="_blank"
                      className="px-3 py-2.5 flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px] font-black text-slate-900 dark:text-white">{b.saleNumber}</span>
                          {b.status === 'PARTIALLY_RETURNED' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-[9px] font-black text-amber-700 dark:text-amber-300">
                              Kuch wapsi
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(b.soldAt))}
                          {' · '}{b.customer ?? 'Walk-in'}{' · '}{b.items} cheezein
                          {b.discount > 0 && ` · ${money(b.discount)} chhoot`}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-black text-slate-900 dark:text-white tabular-nums">{money(b.total)}</div>
                        <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          munafa {money(b.profit)}
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </Link>
                  ))}
                </div>
                {data.billList.length >= 200 && (
                  <p className="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold text-slate-500 text-center">
                    Pehle 200 bill — poori list ke liye Bikri ka safha dekhein
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, big }: any) {
  return (
    <div className={`rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-2.5 ${big ? 'ring-2 ring-white/40' : ''}`}>
      <div className="text-[9px] font-black uppercase tracking-widest text-white/75">{label}</div>
      <div className={`font-black tabular-nums truncate ${big ? 'text-lg' : 'text-sm'}`}>{value}</div>
    </div>
  );
}

function Cell({ label, value, tone }: any) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-black uppercase tracking-wide text-slate-400 truncate">{label}</div>
      <div className={`text-[12px] font-black tabular-nums truncate ${tone ?? 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <TrendingUp className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
      <p className="text-sm font-black text-slate-400">{text}</p>
    </div>
  );
}

/** Poori tafseel ki parchi — alag window me, taake safha na chhape */
function printDetail(data: any, row: CommissionRow, period: string, shopName?: string) {
  const rs = (v: number) => 'Rs ' + Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

  const prodRows = (data.byProduct ?? []).map((p: any) => `
    <tr>
      <td>${esc(p.name)}<div class="s">${esc(p.categoryName ?? '')}</div></td>
      <td class="r">${Number(p.qty).toFixed(Number(p.qty) % 1 === 0 ? 0 : 2)} ${esc(p.unit)}</td>
      <td class="r">${rs(p.sale)}</td>
      <td class="r">${rs(p.profit)}</td>
      <td class="r b">${rs(p.commission)}</td>
    </tr>`).join('');

  const lineRows = (row.lines ?? []).map((l) => `
    <tr><td>${esc(l.label)}</td>
      <td class="r">${l.rate > 0 ? (l.valueType === 'PERCENT' ? `${rs(l.base)} ka ${l.rate}%` : `${l.base} × ${rs(l.rate)}`) : '—'}</td>
      <td class="r b">${rs(l.amount)}</td></tr>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Commission — ${esc(row.name)}</title><style>
  body { font-family: system-ui,-apple-system,'Segoe UI',sans-serif; color:#0f172a; padding:26px; max-width:820px; margin:0 auto; }
  h1 { font-size:20px; margin:0; } h2 { font-size:13px; margin:18px 0 6px; text-transform:uppercase; letter-spacing:.06em; color:#64748b; }
  .sub { font-size:12px; color:#64748b; margin-top:2px; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; }
  .box { border:2px solid #e2e8f0; border-radius:12px; padding:10px; }
  .k { font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:#64748b; font-weight:800; }
  .v { font-size:16px; font-weight:800; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th,td { padding:6px 4px; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; }
  th { font-size:9px; text-transform:uppercase; color:#64748b; letter-spacing:.05em; }
  .r { text-align:right; } .b { font-weight:800; }
  .s { font-size:9px; color:#94a3b8; }
  .total { display:flex; justify-content:space-between; align-items:baseline; margin-top:12px; padding-top:10px; border-top:2px solid #0f172a; }
  .total .v { font-size:22px; }
  .sign { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:40px; font-size:11px; color:#64748b; }
  .sign div { border-top:1px solid #94a3b8; padding-top:6px; }
  @media print { body { padding:0; } @page { margin:12mm; } }
</style></head><body>
  <h1>${esc(shopName ?? 'Dukaan')} — Commission ki tafseel</h1>
  <div class="sub">${esc(row.name)}${row.staff?.designation ? ` · ${esc(row.staff.designation)}` : ''} · ${esc(periodLabel(period))}</div>

  <div class="grid">
    <div class="box"><div class="k">Bill</div><div class="v">${row.bills}</div></div>
    <div class="box"><div class="k">Bikri</div><div class="v">${rs(row.sale)}</div></div>
    <div class="box"><div class="k">Munafa</div><div class="v">${rs(row.profit)}</div></div>
    <div class="box"><div class="k">Commission</div><div class="v">${rs(row.earned)}</div></div>
  </div>

  <h2>Hisab kaise bana</h2>
  <table><thead><tr><th>Tafseel</th><th class="r">Hisab</th><th class="r">Raqam</th></tr></thead>
    <tbody>${lineRows || '<tr><td colspan="3">Koi rule lagu nahi hua</td></tr>'}</tbody></table>
  <div class="total"><span class="k">Kul commission</span><span class="v">${rs(row.earned)}</span></div>

  <h2>Kaunsi cheez se kitna</h2>
  <table><thead><tr><th>Cheez</th><th class="r">Miqdar</th><th class="r">Bikri</th><th class="r">Munafa</th><th class="r">Commission</th></tr></thead>
    <tbody>${prodRows || '<tr><td colspan="5">Kuch nahi bika</td></tr>'}</tbody></table>

  <div class="sign"><div>Dene wale ke dastkhat</div><div>Lene wale ke dastkhat</div></div>
</body></html>`;

  const w = window.open('', '_blank', 'width=860,height=940');
  if (!w) { toast.error('Browser ne nayi window rok di — popup chalne dein'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}
