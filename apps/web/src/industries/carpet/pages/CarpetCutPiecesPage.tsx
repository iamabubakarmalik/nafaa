/**
 * Cut pieces: remnants left beside roll cuts, customer returns and pieces
 * added by hand. Tabs by status with server counts, search and paging;
 * edit, write off (damage) and add need their permissions. CSV and print
 * take the whole filter.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Download, GraduationCap, Layers, ListChecks, Lock, Pencil, Plus, Scissors, Trash2 } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
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
import { carpetCutPiecesApi, type CarpetCutPiece, type CarpetCutPieceSource, type CarpetCutPieceStatus, type CutPiecesListParams } from '../api/carpet-cut-pieces.api';
import { PieceFormModal } from '../components/PieceFormModal';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { PIECES_KEY, PIECE_SOURCE, PIECE_STATUS, SUMMARY_KEY, ftIn, r2, shortDate } from '../lib/meta';

type Tab = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DAMAGED' | 'all';
const LIMIT = 25;
const TABS: Array<{ id: Tab; label: string; icon: typeof Layers }> = [
  { id: 'AVAILABLE', label: 'Bikne ko tayyar', icon: CheckCircle2 },
  { id: 'RESERVED', label: 'Reserved', icon: Lock },
  { id: 'SOLD', label: 'Bik gaye', icon: Scissors },
  { id: 'DAMAGED', label: 'Damage / hataye', icon: Ban },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
type Source = CarpetCutPieceSource | 'all';
const SOURCES: Array<{ value: Source; label: string }> = [{ value: 'all', label: 'Har jagah se' }, ...(Object.keys(PIECE_SOURCE) as CarpetCutPieceSource[]).map((k) => ({ value: k, label: PIECE_SOURCE[k] }))];

async function fetchAll(q: CutPiecesListParams) {
  const out: CarpetCutPiece[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await carpetCutPiecesApi.list({ ...q, page, limit: 200 });
    out.push(...res.items);
    if (out.length >= res.meta.total || !res.items.length) break;
  }
  return out;
}

export default function CarpetCutPiecesPage() {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const { sales: money, cost } = useMasked();
  const canAdd = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canWriteOff = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>('AVAILABLE');
  const [source, setSource] = useState<Source>('all');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CarpetCutPiece | 'new' | null>(null);
  const [writeOff, setWriteOff] = useState<CarpetCutPiece | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const q = useDebounced(search.trim());

  const query: CutPiecesListParams = useMemo(() => ({
    status: tab === 'all' ? undefined : (tab as CarpetCutPieceStatus), sourceType: source === 'all' ? undefined : source, search: q || undefined, shopId,
  }), [tab, source, q, shopId]);
  const { data, isLoading, isFetching } = useQuery({ queryKey: [PIECES_KEY, 'page', query, page], queryFn: () => carpetCutPiecesApi.list({ ...query, page, limit: LIMIT }), placeholderData: keepPreviousData });
  const { data: stats } = useQuery({ queryKey: [PIECES_KEY, 'stats', shopId ?? ''], queryFn: () => carpetCutPiecesApi.stats(shopId) });
  const go = (t: Tab) => { setTab(t); setPage(1); };
  usePageKeys(searchRef, { n: () => canAdd && setForm('new'), g: guide.open });
  const refresh = () => { for (const k of [PIECES_KEY, SUMMARY_KEY, 'carpet-rolls']) void qc.invalidateQueries({ queryKey: [k] }); };

  const doWriteOff = async () => {
    if (!writeOff) return;
    setBusy(true);
    try { await carpetCutPiecesApi.remove(writeOff.id); toast.success(`${writeOff.pieceCode} stock se hat gaya`); setWriteOff(null); refresh(); }
    catch { toast.error('Nahi hua'); } finally { setBusy(false); }
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll(query);
      if (!rows.length) { toast.error('Is filter me koi tukra nahi'); return; }
      downloadCsv('carpet-tukre.csv', [['Code', 'Carpet', 'Size', 'Sqft', 'Qeemat', 'Cost', 'Kahan se', 'Roll', 'Halat', 'Rack', 'Status', 'Tareekh'],
        ...rows.map((p) => [p.pieceCode, p.product?.name ?? '', `${ftIn(p.widthFt, p.widthInch)} × ${ftIn(p.lengthFt, p.lengthInch)}`, r2(p.totalSqft), p.salePrice, p.costAmount, PIECE_SOURCE[p.sourceType], p.sourceRoll?.rollNumber ?? '', p.condition ?? '', p.rackNumber ?? '', PIECE_STATUS[p.status].label, p.createdAt.slice(0, 10)])]);
      toast.success(`${rows.length} tukre CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll(query);
    return {
      title: 'Carpet tukre', subtitle: TABS.find((t) => t.id === tab)?.label,
      meta: [['Tukre', String(rows.length)], ['Sqft', String(r2(rows.reduce((s, p) => s + p.totalSqft, 0)))]],
      sections: [{ kind: 'table', title: 'Tukre', columns: [{ label: 'Code' }, { label: 'Carpet' }, { label: 'Size' }, { label: 'Qeemat' }, { label: 'Rack', wideOnly: true }],
        rows: rows.map((p) => [p.pieceCode, p.product?.name ?? '', `${ftIn(p.widthFt, p.widthInch)} × ${ftIn(p.lengthFt, p.lengthInch)}`, String(p.salePrice), p.rackNumber ?? '']) }],
    };
  };

  const items = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const counts: Record<Tab, number | null> = stats
    ? { AVAILABLE: stats.available.count, RESERVED: stats.reserved.count, SOLD: stats.sold.count, DAMAGED: stats.damaged.count, all: stats.all }
    : { AVAILABLE: null, RESERVED: null, SOLD: null, DAMAGED: null, all: null };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Tukre — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Scissors, color: '#7c3aed', title: 'Tukra kaise banta hai', text: 'Roll se kam chaurai kaatne par bachi patti khud tukra banti hai (roll rate ka 80%). Wapsi ka carpet bhi tukra ban kar aata hai.' },
            { icon: Pencil, color: '#0891b2', title: 'Rate aur rack', text: 'Tukre par click kar ke qeemat, halat aur rack likhein — counter par yahi qeemat lagti hai.' },
            { icon: Trash2, color: '#e11d48', title: 'Bekaar tukra', text: '"Hatayein" se tukra damage me chala jata hai — record rehta hai, stock se nikal jata hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya tukra'], ['G', 'guide']]} />
      )}

      <PageHero title="Carpet tukre" chip={<><Scissors />{TABS.find((t) => t.id === tab)?.label}</>} busy={isFetching && !isLoading} loading={!stats}
        meta="Bache hue aur wapas aaye tukre — POS par seedha bikte hain"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <Link to="/carpet-rolls" className={heroButton}><Layers className="h-4 w-4" /><span className="hidden sm:inline">Rolls</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya tukra</button>}
        </>}
        stats={[
          { label: 'Bikne ko tayyar', value: String(stats?.available.count ?? 0) },
          { label: 'Sqft', value: Math.round(stats?.available.sqft ?? 0).toLocaleString('en-PK') },
          { label: 'Bechne par', value: money(stats?.available.value ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!stats ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CheckCircle2} color="#059669" label="Bikne ko tayyar" value={stats.available.count} hint={`${Math.round(stats.available.sqft)} sqft · cost ${cost(stats.available.cost)}`} onClick={() => go('AVAILABLE')} active={tab === 'AVAILABLE'} />
            <KpiCard icon={Lock} color="#7c3aed" label="Reserved" value={stats.reserved.count} onClick={() => go('RESERVED')} active={tab === 'RESERVED'} />
            <KpiCard icon={Scissors} color="#0891b2" label="Bik gaye" value={stats.sold.count} hint={`${Math.round(stats.sold.sqft)} sqft`} onClick={() => go('SOLD')} active={tab === 'SOLD'} />
            <KpiCard icon={Ban} color="#e11d48" label="Damage / hataye" value={stats.damaged.count} hint={`cost ${cost(stats.damaged.cost)}`} onClick={() => go('DAMAGED')} active={tab === 'DAMAGED'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Piece code, carpet, roll number, rack…" />}
        chips={search.trim() || source !== 'all' ? <>
          {source !== 'all' && <FilterChip onRemove={() => setSource('all')}>{PIECE_SOURCE[source]}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setSource('all'); }}>
        <FilterMenu icon={Scissors} label="Kahan se" value={source} active={source !== 'all'} onChange={(v) => { setSource(v); setPage(1); }} options={SOURCES} />
      </FilterBar>

      <ViewTabs value={tab} onChange={go} tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: counts[t.id] }))} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Scissors className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || tab !== 'AVAILABLE' || source !== 'all' ? 'Is filter me koi tukra nahi' : 'Abhi koi tukra nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Roll se kam chaurai kaatne par bachi patti yahan khud aati hai.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((p) => {
              const st = PIECE_STATUS[p.status];
              const editable = p.status !== 'SOLD';
              return (
                <li key={p.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1.2fr)_8rem_9rem_auto] lg:items-center">
                  <div>
                    <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{p.pieceCode}</p>
                    <p className="text-[0.75rem] text-slate-500">{shortDate(p.createdAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{p.product?.name}{p.variant?.name && <span className="font-normal text-slate-500"> · {p.variant.name}</span>}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{PIECE_SOURCE[p.sourceType]}{p.sourceRoll && <> · <Link to={`/carpet-rolls/${p.sourceRoll.id}`} className="text-brand-700 hover:underline">{p.sourceRoll.rollNumber}</Link></>}</p>
                  </div>
                  <p className="text-[0.8125rem] tabular-nums text-slate-700">{ftIn(p.widthFt, p.widthInch)} × {ftIn(p.lengthFt, p.lengthInch)} · {r2(p.totalSqft)} sqft<span className="block text-[0.75rem] text-slate-500">{[p.condition, p.rackNumber && `Rack ${p.rackNumber}`].filter(Boolean).join(' · ')}</span></p>
                  <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900 lg:text-right">{money(p.salePrice)}</p>
                  <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1 lg:justify-self-end', st.tone)}>{st.label}</span>
                  <div className="flex gap-1 lg:justify-self-end">
                    {canEdit && editable && <button type="button" aria-label="Edit" onClick={() => setForm(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
                    {canWriteOff && editable && p.status !== 'DAMAGED' && <button type="button" aria-label="Stock se hatayein" onClick={() => setWriteOff(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {total > LIMIT && (
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[0.8125rem] text-slate-600">
            <span>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((x) => x - 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Pichla</button>
              <button type="button" disabled={page >= pages} onClick={() => setPage((x) => x + 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Agla</button>
            </div>
          </footer>
        )}
      </section>

      {form && <PieceFormModal piece={form === 'new' ? undefined : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />}
      {writeOff && (
        <Modal open onClose={() => setWriteOff(null)} size="sm" title={`${writeOff.pieceCode} stock se hatayein?`} description="Tukra damage me chala jayega — record rehta hai, counter par nahi bikega."
          footer={<><Button variant="ghost" onClick={() => setWriteOff(null)}>Rehne dein</Button><Button variant="danger" loading={busy} onClick={() => void doWriteOff()}>Hatayein</Button></>}>
          <p className="text-[0.875rem] text-slate-700">{ftIn(writeOff.widthFt, writeOff.widthInch)} × {ftIn(writeOff.lengthFt, writeOff.lengthInch)} · {r2(writeOff.totalSqft)} sqft · cost {cost(writeOff.costAmount)}</p>
        </Modal>
      )}
    </PageShell>
  );
}
