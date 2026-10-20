/**
 * Serial / IMEI register. Every costly unit (TV, laptop, camera) has its
 * own row: when it came, from which bill, at what cost, who bought it, on
 * which bill, and how long its warranty runs. Views: stock, sold, under
 * warranty, warranty ending in 30 days, problem units, trade-ins. A second
 * tab answers "is this unit under warranty?" for the customer at the
 * counter.
 *
 * Keys: / search · N add units · T trade-in · W warranty check · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDownUp, Barcode, CheckCircle2, ChevronDown, ClipboardList, Download, GraduationCap, Hash, Package, Pencil, Plus, Recycle,
  ScanLine, Search, Shield, ShieldAlert, ShieldCheck, Trash2, TriangleAlert, Wallet, Wrench,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select,
  Skeleton, Textarea, ViewTabs, heroButton, heroIconButton, heroPrimaryButton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import {
  serialTrackingApi, type SerialPage, type SerialSort, type SerialStatus, type SerialView, type WarrantyCheck,
} from '../api/serial-tracking.api';
import { AddUnitsModal, SERIAL_KEYS } from '../components/AddUnitsModal';
import { TradeInModal } from '../components/TradeInModal';
import { SERIAL_STATUS, WARRANTY_STATUS, apiError, claimStage, daysLeft, shortDate } from '../components/meta';

type Tab = 'register' | 'check';
type Row = SerialPage['items'][number];

const VIEWS: Array<{ id: SerialView; label: string }> = [
  { id: 'all', label: 'Sab units' },
  { id: 'stock', label: 'Stock mein' },
  { id: 'sold', label: 'Bik gaye' },
  { id: 'warranty', label: 'Warranty chal rahi' },
  { id: 'expiring', label: '30 din mein khatam' },
  { id: 'problem', label: 'Kharab / gum' },
  { id: 'tradein', label: 'Trade-in' },
];
const SORTS: Array<{ value: SerialSort; label: string }> = [
  { value: 'new', label: 'Taaza pehle' },
  { value: 'old', label: 'Purane pehle' },
  { value: 'warranty', label: 'Warranty pehle khatam' },
  { value: 'cost', label: 'Mehnge pehle' },
];

export default function SerialTrackingPage() {
  const [params, setParams] = useSearchParams();
  const shopId = useShopParam();
  const { cost: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.ELECTRONICS_SERIALS_MANAGE);
  const canTradeIn = usePermission(PERMISSIONS.PURCHASES_CREATE) && canManage;
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('register');
  const [view, setView] = useState<SerialView>('all');
  const [sort, setSort] = useState<SerialSort>('new');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [tradeIn, setTradeIn] = useState(false);
  const productId = params.get('product') ?? undefined;

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, sort, query, productId, shopId]);

  const q = { view, sort, search: query || undefined, productId, page, limit: 30 };
  const list = useQuery({
    queryKey: ['electronics-serials', 'page', shopId, q],
    queryFn: () => serialTrackingApi.page(q),
    placeholderData: (p) => p,
  });
  const data = list.data;
  const c = data?.counts;
  const rows = data?.items ?? [];
  const productName = productId ? rows[0]?.product?.name : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'n' && canManage) { e.preventDefault(); setAdding(true); }
      if (k === 't' && canTradeIn) { e.preventDefault(); setTradeIn(true); }
      if (k === 'w') { e.preventDefault(); setTab('check'); }
      if (e.key === '/') { e.preventDefault(); setTab('register'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, canTradeIn]);

  const clearProduct = () => { params.delete('product'); setParams(params, { replace: true }); };
  const clear = () => { setSearch(''); setView('all'); clearProduct(); };
  const filtered = view !== 'all' || !!query || !!productId;

  const exportAll = async () => {
    const all: Row[] = [];
    for (let p = 1; p <= 50; p++) {
      const r = await serialTrackingApi.page({ ...q, page: p, limit: 100 });
      all.push(...r.items);
      if (p >= r.pages) break;
    }
    return all;
  };
  const csv = async () => {
    const all = await exportAll();
    downloadCsv(`serials-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Serial', 'IMEI', 'Product', 'Halat', 'Cost', 'Khareed bill', 'Bika', 'Bill', 'Warranty tak', 'Note'],
      ...all.map((s) => [s.serialNumber, s.imei ?? '', s.product?.name ?? '', SERIAL_STATUS[s.status]?.label ?? s.status, s.purchasePrice ?? '',
        s.supplierRef ?? '', s.soldAt ? shortDate(s.soldAt) : '', s.invoiceNumber ?? '', s.warrantyEndDate ? shortDate(s.warrantyEndDate) : '', s.notes ?? '']),
    ]);
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await exportAll();
    return {
      title: 'Serial / IMEI register',
      subtitle: VIEWS.find((v) => v.id === view)?.label,
      meta: [['Units', String(all.length)], ...(query ? [['Search', query] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Serial' }, { label: 'Product' }, { label: 'Halat' }, { label: 'Bill', wideOnly: true }, { label: 'Warranty tak', wideOnly: true }],
        rows: all.map((s) => [s.imei ? `${s.serialNumber} / ${s.imei}` : s.serialNumber, s.product?.name ?? '', SERIAL_STATUS[s.status]?.label ?? s.status, s.invoiceNumber ?? s.supplierRef ?? '', s.warrantyEndDate ? shortDate(s.warrantyEndDate) : '']),
      }],
    };
  };

  const kpi = (id: SerialView) => ({ onClick: () => { setTab('register'); setView(id); }, active: tab === 'register' && view === id });

  return (
    <PageShell>
      <PageHero
        title="Serial / IMEI"
        chip={<><Barcode /> Har unit ka hisaab</>}
        meta="Kab aaya, kis ko bika, warranty kab tak"
        busy={list.isFetching && !list.isLoading}
        loading={list.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" onClick={() => void csv()} disabled={!rows.length} title="Excel (CSV)" className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canTradeIn && <button type="button" onClick={() => setTradeIn(true)} title="Trade-in (T)" className={heroButton}><Recycle className="h-4 w-4" /><span className="hidden sm:inline">Trade-in</span></button>}
          {canManage && <button type="button" onClick={() => setAdding(true)} title="Units jorein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" />Units jorein</button>}
        </>}
        stats={c ? [
          { label: 'Stock mein units', value: c.stock },
          { label: 'Shelf ki cost', value: money(data?.shelfCost) },
          { label: 'Warranty chal rahi', value: c.warranty },
          { label: '30 din mein khatam', value: c.expiring },
        ] : [{ label: 'Stock mein units', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!c ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Package} color="#059669" label="Stock mein" value={c.stock} hint="Bechne ke liye tayyar" {...kpi('stock')} />
          <KpiCard icon={CheckCircle2} color="#2563eb" label="Bik gaye" value={c.sold} hint="Customer ke paas" {...kpi('sold')} />
          <KpiCard icon={ShieldCheck} color="#0891b2" label="Warranty chal rahi" value={c.warranty} hint="Claim aa sakta hai" {...kpi('warranty')} />
          <KpiCard icon={ShieldAlert} color="#d97706" label="Jald khatam" value={c.expiring} hint="30 din ke andar" {...kpi('expiring')} />
          <KpiCard icon={TriangleAlert} color="#e11d48" label="Kharab / gum" value={c.problem} hint={c.tradein ? `${c.tradein} trade-in` : 'Stock se bahar'} {...kpi('problem')} />
        </>}
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>/</Kbd> search · <Kbd>W</Kbd> warranty check{canManage && <> · <Kbd>N</Kbd> units</>}</>}
        tabs={[
          { id: 'register', label: 'Register', icon: ClipboardList, count: c?.all ?? null },
          { id: 'check', label: 'Warranty check', icon: Shield },
        ]} />

      {tab === 'check' ? <WarrantyChecker /> : (<>
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Serial, IMEI, product, bill number…" label="Search" />}
          chips={filtered ? <>
            {view !== 'all' && <FilterChip onRemove={() => setView('all')}>{VIEWS.find((v) => v.id === view)?.label}</FilterChip>}
            {productId && <FilterChip onRemove={clearProduct}>{productName ?? 'Ek product'}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Hash} label="Dikhayein" value={view} active={view !== 'all'} onChange={setView}
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, hint: c ? `${c[v.id]} units` : undefined }))} />
          <FilterMenu icon={ArrowDownUp} label="Tarteeb" value={sort} active={sort !== 'new'} onChange={setSort} align="right" options={SORTS} />
        </FilterBar>

        {list.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Barcode className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter mein koi unit nahi' : 'Abhi koi serial darj nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">TV, laptop jaisi cheez ka har piece alag ginta hai. Purchase receive karein, phir bill ki line par "Serial daalein" dabayein.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Units jorein</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((s) => <UnitRow key={s.id} s={s} money={money} canManage={canManage} />)}
          </ul>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {adding && <AddUnitsModal shopId={shopId} onClose={() => setAdding(false)} />}
      {tradeIn && <TradeInModal onClose={() => setTradeIn(false)} />}

      {guide.isOpen && (
        <PageGuide title="Serial / IMEI — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Package, color: '#059669', title: 'Maal aaye to', text: 'Purchase banayein aur receive karein. Bill ki har serial wali line par "Serial daalein" dabayein aur scanner se serial scan karte jayein.' },
            { icon: ScanLine, color: '#2563eb', title: 'Counter par', text: 'POS par product chunein to stock ke units ki list khulti hai — ya seedha serial/IMEI scan karein. Wohi unit bill par jata hai.' },
            { icon: ShieldCheck, color: '#0891b2', title: 'Warranty', text: 'Customer ki warranty bechne ke din se product ke mahinon tak chalti hai. "Warranty check" tab mein serial likhein — foran jawab.' },
            { icon: Wrench, color: '#ea580c', title: 'Kharab unit', text: 'Bika hua unit kharab aaye to Warranty claim kholein. Stock ka unit toot jaye to Stock adjustment se nikalein — unit khud "Kharab" ho jata hai.' },
            { icon: Recycle, color: '#7c3aed', title: 'Trade-in', text: 'Customer ka purana unit khareedein: stock mein aata hai, paisa galle se jata hai, baad mein aam unit ki tarah bikta hai.' },
            { icon: Wallet, color: '#475569', title: 'Ginti barabar', text: 'Products page par stock aur serial ki ginti barabar honi chahiye. Farq ho to jamni patti dikhti hai.' },
          ]}
          tips={[
            'Bika hua unit yahan se nahi badalta — bill ka Return, Void ya warranty claim hi us ka haal badalta hai.',
            'Ghalti se darj unit (kabhi na bika, stock mein) hataya ja sakta hai.',
            'Trade-in ke liye register khula hona chahiye aur Purchase ki permission chahiye.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['N', 'units jorein'], ['T', 'trade-in'], ['W', 'warranty check'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function UnitRow({ s, money, canManage }: { s: Row; money: (n: number) => string; canManage: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const st = SERIAL_STATUS[s.status] ?? SERIAL_STATUS.IN_STOCK;
  const left = s.status === 'SOLD' ? daysLeft(s.warrantyEndDate) : null;
  const openClaim = s.claims.find((x) => !x.resolvedAt && ['ACTIVE', 'CLAIMED', 'IN_REPAIR'].includes(x.status));
  const removable = canManage && s.status === 'IN_STOCK' && !s.saleId && !s.soldAt && !s.claims.length && !s.supplierRef?.startsWith('TI-');
  const remove = useMutation({
    mutationFn: () => serialTrackingApi.remove(s.id),
    onSuccess: () => { toast.success('Unit hata diya'); SERIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, 'Hataya nahi ja saka')),
  });

  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-slate-200" style={{ backgroundColor: `${st.color}14`, color: st.color }}>
          {s.product?.images?.[0]?.url ? <img src={s.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <st.icon className="h-4 w-4" />}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-slate-900">{s.serialNumber}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>
            {s.supplierRef?.startsWith('TI-') && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700 ring-1 ring-violet-200">Trade-in</span>}
            {openClaim && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[0.6875rem] font-medium text-orange-700 ring-1 ring-orange-200"><Wrench className="h-3 w-3" />{openClaim.claimNumber}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
            {s.product?.name ?? 'Product hata diya gaya'}{s.imei ? ` · IMEI ${s.imei}` : ''}{s.invoiceNumber ? ` · Bill ${s.invoiceNumber}` : s.supplierRef ? ` · ${s.supplierRef}` : ''}
          </span>
        </button>
        <div className="ml-auto text-right">
          {left != null ? (
            <p className={cn('text-[0.8125rem] font-semibold tabular-nums', left < 0 ? 'text-slate-400' : left <= 30 ? 'text-amber-700' : 'text-emerald-700')}>
              {left < 0 ? 'Warranty khatam' : `${left} din warranty`}
            </p>
          ) : <p className="text-[0.8125rem] font-semibold tabular-nums text-slate-700">{s.purchasePrice != null ? money(s.purchasePrice) : '—'}</p>}
          <p className="text-[0.6875rem] text-slate-400">{s.status === 'SOLD' ? `Bika ${shortDate(s.soldAt)}` : `Aaya ${shortDate(s.purchaseDate ?? s.createdAt)}`}</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Details" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] text-slate-700 sm:pl-[4.25rem]">
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <Fact k="Cost" v={s.purchasePrice != null ? money(s.purchasePrice) : '—'} />
            <Fact k="Khareed" v={`${shortDate(s.purchaseDate ?? s.createdAt)}${s.supplierRef ? ` · ${s.supplierRef}` : ''}`} />
            {s.soldPrice != null && <Fact k="Bika" v={`${formatPKR(s.soldPrice)} · ${shortDate(s.soldAt)}`} />}
            {s.warrantyEndDate && <Fact k="Warranty" v={`${shortDate(s.warrantyStartDate)} — ${shortDate(s.warrantyEndDate)}`} />}
            <Fact k="Warranty haal" v={WARRANTY_STATUS[s.warrantyStatus]?.label ?? s.warrantyStatus} />
            {s.imei2 && <Fact k="IMEI 2" v={s.imei2} />}
            {s.macAddress && <Fact k="MAC" v={s.macAddress} />}
            {s.physicalCondition && <Fact k="Dikhne mein" v={s.physicalCondition} />}
          </dl>
          {s.claims.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {s.claims.map((x) => {
                const t = claimStage({ status: x.status, resolvedAt: x.resolvedAt ?? undefined, sentToBrand: false, resolutionType: undefined });
                return <Link key={x.id} to={`/electronics/warranty-claims?q=${encodeURIComponent(x.claimNumber)}`} className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-medium ring-1 hover:underline', t.tone)}>{x.claimNumber} · {t.label}</Link>;
              })}
            </div>
          )}
          {s.notes && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">{s.notes}</p>}
          <div className="flex flex-wrap gap-2">
            {s.status === 'SOLD' && !openClaim && (
              <Link to={`/electronics/warranty-claims?serial=${encodeURIComponent(s.serialNumber)}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Wrench className="h-3.5 w-3.5" />Warranty claim kholein</Link>
            )}
            {s.saleId && <Link to={`/sales?q=${encodeURIComponent(s.invoiceNumber ?? '')}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Search className="h-3.5 w-3.5" />Bill dekhein</Link>}
            {canManage && <Button size="sm" variant="secondary" onClick={() => setEdit(true)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>Badlein</Button>}
            {removable && (
              <Button size="sm" variant="ghost" loading={remove.isPending} leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={async () => { if ((await confirmDialog({ title: `${s.serialNumber} hata dein?`, text: 'Sirf ghalti se darj unit hatayein.', danger: true }))) remove.mutate(); }}>Hatayein</Button>
            )}
          </div>
        </div>
      )}
      {edit && <EditUnitModal s={s} onClose={() => setEdit(false)} />}
    </li>
  );
}

function EditUnitModal({ s, onClose }: { s: Row; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    serialNumber: s.serialNumber, imei: s.imei ?? '', imei2: s.imei2 ?? '', macAddress: s.macAddress ?? '',
    physicalCondition: s.physicalCondition ?? '', notes: s.notes ?? '', status: s.status,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const shelf = s.status === 'IN_STOCK' || s.status === 'RESERVED';
  const save = useMutation({
    mutationFn: () => serialTrackingApi.update(s.id, {
      productId: s.productId, serialNumber: f.serialNumber.trim(), imei: f.imei.trim(), imei2: f.imei2.trim(), macAddress: f.macAddress.trim(),
      physicalCondition: f.physicalCondition.trim(), notes: f.notes, ...(shelf && { status: f.status }),
    }),
    onSuccess: () => { toast.success('Save ho gaya'); qc.invalidateQueries({ queryKey: ['electronics-serials'] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} title={`Unit ${s.serialNumber}`} description={s.product?.name}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.serialNumber.trim()}>Save karein</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Serial number" required value={f.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} className="font-mono" maxLength={80} hint="Ghalat likha ho to theek karein" />
        <Input label="IMEI" value={f.imei} onChange={(e) => set('imei', e.target.value.replace(/\s/g, ''))} className="font-mono" maxLength={40} hint="Marzi hai" />
        <Input label="IMEI 2" value={f.imei2} onChange={(e) => set('imei2', e.target.value.replace(/\s/g, ''))} className="font-mono" maxLength={40} hint="Dual SIM ho to" />
        <Input label="MAC address" value={f.macAddress} onChange={(e) => set('macAddress', e.target.value)} className="font-mono" maxLength={40} hint="Router / smart TV" />
        <Input label="Dikhne mein kaisa" value={f.physicalCondition} onChange={(e) => set('physicalCondition', e.target.value)} maxLength={120} wrapperClassName="sm:col-span-2" hint="Maslan: kharoch, dabba khula" />
        {shelf && (
          <Select label="Haal" value={f.status} onChange={(e) => set('status', e.target.value as SerialStatus)} wrapperClassName="sm:col-span-2"
            options={[{ value: 'IN_STOCK', label: 'Stock mein (bik sakta hai)' }, { value: 'RESERVED', label: 'Kisi ke liye rakha (POS par nahi aayega)' }]}
            hint="Bika, kharab ya gum — wo bill, Return ya Stock adjustment se hi hota hai" />
        )}
        <Textarea label="Note" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={2000} wrapperClassName="sm:col-span-2" hint="Sirf andar ke liye" />
      </div>
    </Modal>
  );
}

function WarrantyChecker() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<WarrantyCheck | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const check = async () => {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    try { setRes(await serialTrackingApi.warrantyCheck(c)); } catch (e) { toast.error(apiError(e, 'Check nahi hua')); } finally { setBusy(false); }
  };
  const w = res?.warranty;
  const s = res?.serial;
  const verdict = useMemo(() => {
    if (!res) return null;
    if (!res.found || !s) return { tone: 'bg-slate-50 ring-slate-200 text-slate-800', title: 'Ye serial / IMEI hamare record mein nahi', text: 'Shayad kisi aur dukaan se liya gaya — ya serial ghalat parha gaya.' };
    if (s.status !== 'SOLD') return { tone: 'bg-slate-50 ring-slate-200 text-slate-800', title: `Ye unit abhi ${SERIAL_STATUS[s.status]?.label.toLowerCase() ?? s.status} hai`, text: 'Customer ki warranty sirf bike hue unit par hoti hai.' };
    if (w?.isValid) return { tone: 'bg-emerald-50 ring-emerald-200 text-emerald-900', title: `Warranty chal rahi — ${w.daysRemaining} din baqi`, text: `${shortDate(w.startDate)} se ${shortDate(w.endDate)} tak${w.type ? ` · ${w.type}` : ''}` };
    return { tone: 'bg-rose-50 ring-rose-200 text-rose-900', title: w?.endDate ? `Warranty ${shortDate(w.endDate)} ko khatam ho gayi` : 'Is unit par warranty nahi', text: w?.status === 'VOID' ? 'Pichla claim rad hua tha — warranty khatam.' : 'Repair paid hoga — claim kholte waqt charge likhein.' };
  }, [res, s, w]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Warranty check</p>
        <p className="mt-0.5 text-[0.8125rem] text-slate-500">Customer ka serial ya IMEI scan karein ya likhein</p>
        <div className="mt-3 flex gap-2">
          <Input ref={ref} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void check(); }}
            placeholder="Serial / IMEI" className="font-mono" wrapperClassName="flex-1" leftIcon={<ScanLine className="h-4 w-4" />} />
          <Button onClick={() => void check()} loading={busy} disabled={!code.trim()}>Check</Button>
        </div>
      </div>
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        {!verdict ? (
          <div className="py-8 text-center text-sm text-slate-500"><Shield className="mx-auto mb-2 h-8 w-8 text-slate-300" />Natija yahan dikhega</div>
        ) : (
          <div className="space-y-3">
            <div className={cn('rounded-2xl px-4 py-3 ring-1', verdict.tone)}>
              <p className="font-semibold">{verdict.title}</p>
              <p className="mt-0.5 text-[0.8125rem] opacity-80">{verdict.text}</p>
            </div>
            {s && (
              <dl className="grid gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-2">
                <Fact k="Product" v={s.product?.name ?? '—'} />
                <Fact k="Serial" v={`${s.serialNumber}${s.imei ? ` / ${s.imei}` : ''}`} />
                {s.invoiceNumber && <Fact k="Bill" v={`${s.invoiceNumber} · ${shortDate(s.soldAt)}`} />}
                {s.customer && <Fact k="Customer" v={`${s.customer.name}${s.customer.phone ? ` · ${s.customer.phone}` : ''}`} />}
              </dl>
            )}
            {!!res?.claims?.length && (
              <p className="text-[0.8125rem] text-slate-600">Pichle claim: {res.claims.map((x) => x.claimNumber).join(', ')}</p>
            )}
            {s?.status === 'SOLD' && (
              <Link to={`/electronics/warranty-claims?serial=${encodeURIComponent(s.serialNumber)}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-brand-700">
                <Wrench className="h-4 w-4" />Claim kholein
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 sm:block"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>;
}
