/**
 * Carpet rolls: every roll in the branch with the length and sqft left,
 * rate and rack. Tabs for in-stock, running low, reserved, finished and
 * damaged; search, paging and counts come from the server; CSV and print
 * take the whole filter. Bills whose carpet is not yet cut from stock
 * (offline or booking bills) show on top with one-tap settling.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, CheckCircle2, Download, GraduationCap, Layers, ListChecks, Lock, Plus, Ruler, Scissors, Upload } from 'lucide-react';
import {
  FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useShopParam } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { carpetRollsApi, type CarpetRoll, type CarpetRollsListParams } from '../api/carpet-rolls.api';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { RollFormModal } from '../components/RollFormModal';
import { settleAll, useUnsettledBills } from '../pos/PendingCuts';
import { PIECES_KEY, ROLLS_KEY, ROLL_STATUS, SUMMARY_KEY, ftIn, r2, realFt } from '../lib/meta';

type Tab = 'stock' | 'low' | 'reserved' | 'finished' | 'damaged' | 'all';
const LIMIT = 25;
const LOW_FT = 10;

const TABS: Array<{ id: Tab; label: string; icon: typeof Layers }> = [
  { id: 'stock', label: 'Chalu', icon: Layers },
  { id: 'low', label: `Kam bache (${LOW_FT}ft)`, icon: AlertTriangle },
  { id: 'reserved', label: 'Reserved', icon: Lock },
  { id: 'finished', label: 'Khatam', icon: CheckCircle2 },
  { id: 'damaged', label: 'Damage', icon: Ban },
  { id: 'all', label: 'Sab', icon: ListChecks },
];

const tabParams = (t: Tab): Partial<CarpetRollsListParams> =>
  t === 'stock' ? { inStockOnly: true } : t === 'low' ? { lowFt: LOW_FT }
    : t === 'reserved' ? { status: 'RESERVED' } : t === 'finished' ? { status: 'FINISHED' } : t === 'damaged' ? { status: 'DAMAGED' } : {};

async function fetchAll(q: CarpetRollsListParams) {
  const out: CarpetRoll[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await carpetRollsApi.list({ ...q, page, limit: 200 });
    out.push(...res.items);
    if (out.length >= res.meta.total || !res.items.length) break;
  }
  return out;
}

const usedPct = (r: CarpetRoll) => {
  const orig = realFt(r.originalLengthFt, r.originalLengthInch);
  return orig > 0 ? Math.min(100, Math.max(0, Math.round((1 - realFt(r.remainingLengthFt, r.remainingLengthInch) / orig) * 100))) : 0;
};

export default function CarpetRollsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const { sales: money, cost } = useMasked();
  const canAdd = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const productId = params.get('productId') ?? undefined;
  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settling, setSettling] = useState(false);
  const q = useDebounced(search.trim());

  const query: CarpetRollsListParams = useMemo(() => ({ ...tabParams(tab), search: q || undefined, productId, shopId }), [tab, q, productId, shopId]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [ROLLS_KEY, 'page', query, page],
    queryFn: () => carpetRollsApi.list({ ...query, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const { data: stats } = useQuery({ queryKey: [ROLLS_KEY, 'stats', shopId ?? ''], queryFn: () => carpetRollsApi.stats(shopId, LOW_FT) });
  const { data: unsettled = [] } = useUnsettledBills();
  const go = (t: Tab) => { setTab(t); setPage(1); };
  usePageKeys(searchRef, { n: () => canAdd && setAdding(true), i: () => navigate('/carpet-bulk-import'), g: guide.open });

  const refresh = () => { for (const k of [ROLLS_KEY, PIECES_KEY, SUMMARY_KEY, 'carpet-unsettled']) void qc.invalidateQueries({ queryKey: [k] }); };
  const settle = async () => {
    setSettling(true);
    const failed = await settleAll(unsettled.map((b) => b.saleId));
    setSettling(false);
    refresh();
    if (failed) toast.error(`${failed} line nahi kati — roll number ya lambai check karein (bill khol kar dekhein)`);
    else toast.success('Sab bills ka carpet stock se kat gaya');
  };

  const row = (r: CarpetRoll) => [r.rollNumber, r.product?.name ?? '', r.variant?.name ?? '', ftIn(r.widthFt, r.widthInch), ftIn(r.originalLengthFt, r.originalLengthInch),
    ftIn(r.remainingLengthFt, r.remainingLengthInch), r2(r.remainingSqft), r.costPerSqft, r.salePricePerSqft, r.rackNumber ?? '', ROLL_STATUS[r.status].label];
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll(query);
      if (!rows.length) { toast.error('Is filter me koi roll nahi'); return; }
      downloadCsv('carpet-rolls.csv', [['Roll', 'Carpet', 'Design', 'Chaurai', 'Asal lambai', 'Bachi lambai', 'Sqft bacha', 'Cost/sqft', 'Rate/sqft', 'Rack', 'Status'], ...rows.map(row)]);
      toast.success(`${rows.length} roll CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll(query);
    return {
      title: 'Carpet rolls', subtitle: TABS.find((t) => t.id === tab)?.label,
      meta: [['Rolls', String(rows.length)], ['Sqft', String(r2(rows.reduce((s, r) => s + r.remainingSqft, 0)))]],
      sections: [{
        kind: 'table', title: 'Rolls',
        columns: [{ label: 'Roll' }, { label: 'Carpet' }, { label: 'Size bacha' }, { label: 'Sqft' }, { label: 'Rate', wideOnly: true }, { label: 'Rack', wideOnly: true }],
        rows: rows.map((r) => [r.rollNumber, [r.product?.name, r.variant?.name].filter(Boolean).join(' · '), `${ftIn(r.widthFt, r.widthInch)} × ${ftIn(r.remainingLengthFt, r.remainingLengthInch)}`, String(r2(r.remainingSqft)), String(r.salePricePerSqft), r.rackNumber ?? '']),
      }],
    };
  };

  const items = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const c = stats?.counts;
  const counts: Record<Tab, number | null> = { stock: stats?.inStockRolls ?? null, low: c?.low ?? null, reserved: c?.reserved ?? null, finished: c?.finished ?? null, damaged: c?.damaged ?? null, all: c?.all ?? null };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Carpet rolls — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Layers, color: '#059669', title: 'Roll kahan se aata hai', text: 'Supplier se aaya roll Purchase se daalein (payment bhi likhi jati hai). Dukaan me pehle se para roll "Naya roll" ya Import se.' },
            { icon: Scissors, color: '#7c3aed', title: 'Counter par kaatna', text: 'POS par carpet chunein, roll aur naap likhein. Bill ke baad roll khud kat jata hai aur bachi patti tukra ban jati hai.' },
            { icon: Ruler, color: '#0891b2', title: 'Naap galat ho', text: 'Roll kholein → Adjust. Har kami / zyadti ki wajah likhi jati hai. Roll khatam ho to "Khatam" — bacha hissa waste me jata hai.' },
            { icon: AlertTriangle, color: '#d97706', title: 'Kaatna baqi', text: 'Internet ke bagair ya booking se bana bill upar peeli patti me aata hai — "Ab kaatein" dabayein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya roll'], ['I', 'import'], ['G', 'guide']]} />
      )}

      <PageHero title="Carpet rolls" chip={<><Layers />{TABS.find((t) => t.id === tab)?.label}</>} busy={isFetching && !isLoading} loading={!stats}
        meta="Har roll ki bachi lambai, sqft, rate aur jagah"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <Link to="/carpet-cut-pieces" className={heroButton}><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Tukre</span></Link>
          {canAdd && <Link to="/carpet-bulk-import" className={heroButton}><Upload className="h-4 w-4" /><span className="hidden sm:inline">Import</span></Link>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya roll</button>}
        </>}
        stats={[
          { label: 'Chalu rolls', value: String(stats?.inStockRolls ?? 0) },
          { label: 'Sqft rolls me', value: Math.round(stats?.sqft ?? 0).toLocaleString('en-PK') },
          { label: 'Stock ki cost', value: cost(stats?.costValue ?? 0) },
        ]} />

      {unsettled.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1 text-[0.875rem]">
            <p className="font-semibold">{unsettled.length} bill ka carpet abhi stock se nahi kata</p>
            <p className="truncate text-[0.8125rem]">{unsettled.slice(0, 4).map((b) => `${b.saleNumber}${b.customerName ? ` (${b.customerName})` : ''}`).join(', ')}{unsettled.length > 4 ? '…' : ''}</p>
          </div>
          <button type="button" disabled={settling} onClick={() => void settle()} className="h-9 rounded-xl bg-amber-600 px-4 text-[0.875rem] font-semibold text-white disabled:opacity-50">{settling ? 'Kat raha…' : 'Ab kaatein'}</button>
        </div>
      )}

      <KpiRow cols={5}>
        {!stats ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Layers} color="#059669" label="Chalu rolls" value={stats.inStockRolls} hint={`${Math.round(stats.lengthFt)} ft lambai`} onClick={() => go('stock')} active={tab === 'stock'} />
            <KpiCard icon={AlertTriangle} color="#d97706" label="Kam bache" value={stats.counts.low} hint={`${LOW_FT}ft ya kam`} onClick={() => go('low')} active={tab === 'low'} />
            <KpiCard icon={Ruler} color="#0891b2" label="Bechne par" value={money(stats.saleValue)} hint="Chalu rolls, roll ke rate par" />
            <KpiCard icon={Scissors} color="#7c3aed" label="Tukre" value={stats.pieces.count} hint={`${Math.round(stats.pieces.sqft)} sqft`} onClick={() => navigate('/carpet-cut-pieces')} />
            <KpiCard icon={Ban} color="#e11d48" label="Damage" value={stats.counts.damaged} onClick={() => go('damaged')} active={tab === 'damaged'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Roll number, carpet, design, rack…" />}
        chips={search.trim() || productId ? <>
          {productId && <FilterChip onRemove={() => { params.delete('productId'); setParams(params); }}>Ek carpet{items[0]?.product?.name ? `: ${items[0].product.name}` : ''}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); if (productId) { params.delete('productId'); setParams(params); } }} />

      <ViewTabs value={tab} onChange={go} hint="Roll par click kar ke kholein" tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: counts[t.id] }))} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Layers className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || tab !== 'stock' || productId ? 'Is filter me koi roll nahi' : 'Abhi koi roll nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Supplier se roll Purchase se daalein, ya dukaan ka para roll "Naya roll" se.</p>
            <div className="mt-4 flex gap-2">
              <Link to="/purchases/new" className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold text-slate-700 ring-1 ring-slate-200">Purchase</Link>
              {canAdd && <button type="button" onClick={() => setAdding(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya roll</button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const st = ROLL_STATUS[r.status];
              const pct = usedPct(r);
              return (
                <li key={r.id}>
                  <Link to={`/carpet-rolls/${r.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:px-5 lg:grid-cols-[10rem_minmax(0,1.3fr)_minmax(0,1.4fr)_8rem_8rem] lg:items-center">
                    <div>
                      <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{r.rollNumber}</p>
                      <p className="text-[0.75rem] text-slate-500">{r.rackNumber ? `Rack ${r.rackNumber}` : 'Rack nahi likha'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{r.product?.name}</p>
                      <p className="flex items-center gap-1.5 truncate text-[0.75rem] text-slate-500">{r.variant?.colorHex && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: r.variant.colorHex }} />}{[r.variant?.name, r.designCode, r.quality].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                    <div className="min-w-0 text-[0.8125rem]">
                      <p className="tabular-nums text-slate-700">{ftIn(r.widthFt, r.widthInch)} × <b>{ftIn(r.remainingLengthFt, r.remainingLengthInch)}</b> bacha · {r2(r.remainingSqft)} sqft</p>
                      <div className="mt-1 h-1.5 w-full max-w-[16rem] overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', pct > 90 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} /></div>
                    </div>
                    <p className="text-[0.8125rem] tabular-nums text-slate-700 lg:text-right">{money(r.salePricePerSqft)}<span className="text-slate-400">/sqft</span></p>
                    <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1 lg:justify-self-end', st.tone)}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {total > LIMIT && (
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[0.8125rem] text-slate-600">
            <span>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Pichla</button>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Agla</button>
            </div>
          </footer>
        )}
      </section>

      {adding && <RollFormModal productId={productId} onClose={() => setAdding(false)} onSaved={(r) => { setAdding(false); refresh(); navigate(`/carpet-rolls/${r.id}`); }} />}
    </PageShell>
  );
}
