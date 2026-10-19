/**
 * Serial register: every AC, fridge and LED by its serial number — units on
 * the shelf, units sold with their customer and warranty, warranties ending
 * soon, units waiting for installation, and each unit's service history.
 * New stock from a dealer is entered here in one go (scan or paste).
 *
 * Keys: N add serials · W warranty check · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, BarChart3, Barcode, Boxes, CheckCircle2, ClipboardPaste, Download, Filter, GraduationCap, HardHat, ListChecks, Package, Plus,
  Search, ShieldAlert, ShieldCheck, Trash2, Wrench,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { applianceSerialApi, type ApplianceSerial, type SerialSummary } from '../api/serial-tracking.api';
import { SerialLookup } from '../components/jobDialogs';
import { Bars, Box, ListState, Pager, Panel, Pill, Strip } from '../components/ui';
import { SERIAL_KEY, SERIAL_STATUSES, apiError, dayOnly, daysPhrase, installStatusOf, money, serialStatusOf, serviceStatusOf, todayKey } from '../components/meta';

type Tab = 'list' | 'analytics';
type View = 'stock' | 'sold' | 'expiring' | 'install' | 'all';
const VIEWS: Array<{ id: View; label: string; icon: typeof Package }> = [
  { id: 'stock', label: 'Stock me', icon: Boxes },
  { id: 'sold', label: 'Bik gaye', icon: CheckCircle2 },
  { id: 'expiring', label: 'Warranty khatam hone wali', icon: ShieldAlert },
  { id: 'install', label: 'Installation baqi', icon: HardHat },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: View) => VIEWS.find((x) => x.id === v)?.label ?? v;
function viewParams(v: View) {
  if (v === 'stock') return { status: 'IN_STOCK' };
  if (v === 'sold') return { status: 'SOLD' };
  if (v === 'expiring') return { warranty: 'expiring' as const };
  if (v === 'install') return { status: 'SOLD', installationStatus: 'PENDING' };
  return {};
}

export default function ApplianceSerialsPage() {
  const [params, setParams] = useSearchParams();
  const canManage = usePermission(PERMISSIONS.ELECTRONICS_SERIALS_MANAGE);
  const { sales, cost } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('list');
  const [view, setView] = useState<View>((params.get('view') as View) || 'stock');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get('id'));
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, status, query]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (view !== 'stock') next.set('view', view);
    if (query) next.set('q', query);
    if (openId) next.set('id', openId);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, query, openId]);

  const q = { ...viewParams(view), ...(status && view === 'all' ? { status } : {}), search: query || undefined, page, limit: 50 };
  const listQ = useQuery({ queryKey: [SERIAL_KEY, 'page', q], queryFn: () => applianceSerialApi.list(q), placeholderData: (p) => p, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: [SERIAL_KEY, 'summary'], queryFn: applianceSerialApi.summary, refetchInterval: 120_000 });
  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const pick = (v: View) => { setTab('list'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setAdding(true); }
      if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setChecking(true); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const fetchAll = () => applianceSerialApi.list({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Serial register — ${viewLabel(view)}`,
      meta: [['Units', String(all.meta.total)]],
      sections: [{ kind: 'table', columns: [{ label: 'Serial' }, { label: 'Product' }, { label: 'Halat' }, { label: 'Customer', wideOnly: true }, { label: 'Bill', wideOnly: true }, { label: 'Warranty' }],
        rows: all.items.map((u) => [u.serialNumber, u.product?.name ?? '—', serialStatusOf(u.status).label, u.customerName ?? '—', u.invoiceNumber ?? '—', u.warrantyEndDate ? dayOnly(u.warrantyEndDate) : '—']) }],
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('serials.csv', [
      ['Serial', 'Model', 'Product', 'Halat', 'Kharida', 'Khareed qeemat', 'Supplier', 'Bika', 'Bill', 'Qeemat', 'Customer', 'Phone', 'Warranty', 'Compressor', 'Motor', 'Installation'],
      ...all.items.map((u) => [u.serialNumber, u.modelNumber ?? '', u.product?.name ?? '', serialStatusOf(u.status).label, u.purchaseDate ? dayOnly(u.purchaseDate) : '', u.purchasePrice ?? '', u.supplierRef ?? '',
        u.soldAt ? dayOnly(u.soldAt) : '', u.invoiceNumber ?? '', u.soldPrice ?? '', u.customerName ?? '', u.customerPhone ?? '', u.warrantyEndDate ? dayOnly(u.warrantyEndDate) : '',
        u.compressorWarrantyEndDate ? dayOnly(u.compressorWarrantyEndDate) : '', u.motorWarrantyEndDate ? dayOnly(u.motorWarrantyEndDate) : '', installStatusOf(u.installationStatus).label]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Serial register"
        chip={<><Barcode /> Har unit ka number</>}
        meta="Stock, bika hua unit, customer, warranty aur service — serial se"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={() => setChecking(true)} title="Warranty check (W)" className={heroButton}><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Warranty check</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setAdding(true)} title="Serial jorein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Serial jorein</button>}
        </>}
        stats={s ? [
          { label: 'Stock me', value: s.inStock.units, hint: cost(s.inStock.value) },
          { label: 'Bik gaye', value: s.sold.units },
          { label: 'Warranty khatam hone wali', value: s.warrantyExpiringSoon },
        ] : [{ label: 'Stock me', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Boxes} color="#2563eb" label="Stock me" value={s.inStock.units} hint={cost(s.inStock.value)} onClick={() => pick('stock')} active={tab === 'list' && view === 'stock'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Bik gaye" value={s.sold.units} hint={`Profit ${sales(s.sold.profit)}`} onClick={() => pick('sold')} active={tab === 'list' && view === 'sold'} />
          <KpiCard icon={ShieldAlert} color={s.warrantyExpiringSoon ? '#ea580c' : '#64748b'} label="Warranty khatam hone wali" value={s.warrantyExpiringSoon} hint="AMC bechne ka mauqa" onClick={() => pick('expiring')} active={tab === 'list' && view === 'expiring'} />
          <KpiCard icon={HardHat} color={s.installation.pending ? '#d97706' : '#64748b'} label="Installation baqi" value={s.installation.pending} hint="Bika, laga nahi" onClick={() => pick('install')} active={tab === 'list' && view === 'install'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Serial, model, customer, phone, bill…" label="Search" />}
        chips={query || status ? <>{query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}{status && <FilterChip onRemove={() => setStatus('')}>{serialStatusOf(status).label}</FilterChip>}</> : undefined}
        onClear={() => { setSearch(''); setStatus(''); }}>
        <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'stock'} onChange={setView} width="w-64" options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
        {view === 'all' && <FilterMenu icon={Package} label={status ? serialStatusOf(status).label : 'Halat'} value={status} active={!!status} onChange={setStatus}
          options={[{ value: '', label: 'Sab' }, ...SERIAL_STATUSES.map((x) => ({ value: x, label: serialStatusOf(x).label }))]} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> jorein · </>}<Kbd>W</Kbd> warranty · <Kbd>/</Kbd> search</>}
        tabs={[{ id: 'list', label: 'Units', icon: ListChecks, count: data?.meta.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics s={s} sales={sales} cost={cost} /> : (<>
        {data && data.meta.total > 0 && <Strip><span className="text-slate-500">{viewLabel(view)}</span><span className="font-semibold text-slate-900">{data.meta.total} units</span></Strip>}
        <ListState loading={listQ.isLoading} error={listQ.isError && !data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={Barcode}
          title={query ? 'Ye serial nahi mila' : view === 'stock' ? 'Stock me koi serial nahi' : 'Kuch nahi'}
          hint="Dealer se maal aaye to Purchase se stock barhayein, phir yahan har unit ka serial scan ya paste karein."
          actions={canManage ? <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Serial jorein</Button> : undefined}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((u) => <UnitRow key={u.id} u={u} onOpen={() => setOpenId(u.id)} />)}
          </ul>
        </ListState>
        {data && <Pager page={page} pages={data.meta.totalPages} onPage={setPage} />}
      </>)}

      {adding && <AddSerialsModal onClose={() => setAdding(false)} />}
      {checking && <WarrantyCheckModal onClose={() => setChecking(false)} onOpen={(id) => { setChecking(false); setOpenId(id); }} />}
      {openId && <UnitCard id={openId} canManage={canManage} onClose={() => setOpenId(null)} />}
      {guide.isOpen && (
        <PageGuide title="Serial register — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Package, color: '#2563eb', title: 'Naya maal', text: 'Dealer se maal aaye: pehle Purchase banayein (stock aur dealer ka hisaab), phir "Serial jorein" — product chunein aur sab serial scan ya Excel se paste karein.' },
            { icon: Barcode, color: '#7c3aed', title: 'Bechna', text: 'POS par AC ya fridge tap karein to stock wale serial dikhte hain — jo unit diya wohi chunein. Warranty bill ki date se shuru hoti hai.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'Warranty check', text: 'Customer aaye to "Warranty check" (W) me serial likhein — warranty, compressor, motor aur AMC sab ek nazar me.' },
            { icon: Wrench, color: '#d97706', title: 'Service history', text: 'Unit kholein — us ki installation, har repair aur kharcha. Wapas ya void bill par unit khud stock me aa jata hai.' },
          ]}
          tips={['"Warranty khatam hone wali" list se customers ko AMC bechein.', 'Serial jorne ke liye "Serials manage" permission chahiye.']}
          shortcuts={[['N', 'serial jorein'], ['W', 'warranty check'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function UnitRow({ u, onOpen }: { u: ApplianceSerial; onOpen: () => void }) {
  const w = u.warranty;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-slate-50 sm:px-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Barcode className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono font-semibold text-slate-900">{u.serialNumber}</span>
            <Pill meta={serialStatusOf(u.status)} />
            {u.status === 'SOLD' && u.installationRequired && u.installationStatus !== 'COMPLETED' && <Pill meta={installStatusOf(u.installationStatus)} />}
          </span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-slate-600">{u.product?.name ?? 'Product'}{u.modelNumber ? ` · ${u.modelNumber}` : ''}</span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
            {u.status === 'SOLD' ? `${u.customerName ?? 'Customer'} · bill ${u.invoiceNumber ?? '—'} · ${dayOnly(u.soldAt)}` : `Aaya ${dayOnly(u.purchaseDate ?? u.createdAt)}${u.supplierRef ? ` · ${u.supplierRef}` : ''}`}
          </span>
        </span>
        <span className="shrink-0 text-right text-[0.75rem]">
          {u.status === 'SOLD' && w ? <span className={cn('font-medium', w.isUnderWarranty ? (w.soonestDays ?? 99) <= 30 ? 'text-orange-700' : 'text-emerald-700' : 'text-rose-700')}>{w.isUnderWarranty ? `Warranty ${daysPhrase(w.soonestDays)}` : 'Warranty khatam'}</span> : null}
          <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-slate-400" />
        </span>
      </button>
    </li>
  );
}

/** Product search for picking which product the serials belong to. */
function ProductSearch({ value, onPick }: { value: { id: string; name: string } | null; onPick: (p: { id: string; name: string; costPrice: number } | null) => void }) {
  const [term, setTerm] = useState('');
  const q = useQuery({ queryKey: ['appliance-product-search', term], queryFn: () => productsApi.list({ search: term, limit: 8, isActive: true }), enabled: term.trim().length >= 2 });
  if (value) return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem] ring-1 ring-slate-200"><span className="font-medium text-slate-900">{value.name}</span><button type="button" className="text-[0.8125rem] text-brand-700 hover:underline" onClick={() => onPick(null)}>Badlein</button></div>;
  return (
    <div>
      <Input label="Product" required value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Model ya naam likhein" leftIcon={<Search className="h-4 w-4" />} autoFocus />
      {(q.data?.items ?? []).length > 0 && (
        <ul className="mt-1 divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
          {q.data!.items.map((p) => <li key={p.id}><button type="button" onClick={() => onPick({ id: p.id, name: p.name, costPrice: Number(p.costPrice) || 0 })} className="flex w-full justify-between px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50"><span>{p.name}</span><span className="text-slate-500">stock {p.stock}</span></button></li>)}
        </ul>
      )}
    </div>
  );
}

function AddSerialsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [product, setProduct] = useState<{ id: string; name: string; costPrice: number } | null>(null);
  const [text, setText] = useState('');
  const [model, setModel] = useState('');
  const [batch, setBatch] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(todayKey());
  const [supplier, setSupplier] = useState('');
  const list = [...new Set(text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];
  const dupes = text.split(/[\s,;]+/).filter(Boolean).length - list.length;
  const save = useMutation({
    mutationFn: () => applianceSerialApi.bulkCreate({ productId: product!.id, serialNumbers: list, modelNumber: model.trim() || undefined, batchNumber: batch.trim() || undefined,
      purchasePrice: Number(price) || product!.costPrice || undefined, purchaseDate: date || undefined, supplierRef: supplier.trim() || undefined }),
    onSuccess: (r) => { toast.success(r.message || `${r.created} serial jur gaye`); if (r.skipped) toast.info(`${r.skipped} pehle se the: ${r.skippedSerials.slice(0, 5).join(', ')}`); qc.invalidateQueries({ queryKey: [SERIAL_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Serial nahi jure')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title="Serial jorein" description="Ek product ke saare units ek saath — scanner se ek ke baad ek, ya Excel column paste karein"
      footer={<><span className="mr-auto text-[0.8125rem] text-slate-600">{list.length} serial{dupes > 0 ? ` · ${dupes} do dafa likhe (ek gina)` : ''}</span><Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!product || !list.length} loading={save.isPending} leftIcon={<Plus className="h-4 w-4" />} onClick={() => save.mutate()}>{list.length} serial jorein</Button></>}>
      <div className="space-y-4">
        <ProductSearch value={product} onPick={(p) => { setProduct(p); if (p && !price) setPrice(p.costPrice ? String(p.costPrice) : ''); }} />
        <Textarea label="Serial numbers" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'SN12345\nSN12346\nSN12347'} hint="Har line me ek — scanner har scan ke baad khud nayi line deta hai" className="font-mono" />
        <p className="flex items-start gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[0.8125rem] text-blue-900 ring-1 ring-blue-200"><ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0" />Ye sirf number likhta hai, stock nahi barhata. Stock Purchase (dealer ka bill) se barhayein.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Model number" value={model} onChange={(e) => setModel(e.target.value)} placeholder="HSU-18HFCM" />
          <Input label="Batch / lot" value={batch} onChange={(e) => setBatch(e.target.value)} />
          <Input label="Khareed qeemat (ek unit)" inputMode="decimal" value={price} onChange={(e) => setPrice(money(e.target.value))} />
          <Input label="Kab aaya" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Input label="Dealer / bill number" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Haier distributor · INV-221" />
      </div>
    </Modal>
  );
}

function WarrantyCheckModal({ onClose, onOpen }: { onClose: () => void; onOpen: (id: string) => void }) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<string | null>(null);
  return (
    <Modal open onClose={onClose} size="md" title="Warranty check" description="Customer ka serial likhein ya scan karein"
      footer={<><Button variant="secondary" onClick={onClose}>Band karein</Button>{found && <Button onClick={() => onOpen(found)}>Unit kholein</Button>}</>}>
      <SerialLookup value={code} onChange={(v) => { setCode(v); setFound(null); }} onFound={(r) => setFound(r.serial?.id ?? null)} />
    </Modal>
  );
}

function UnitCard({ id, canManage, onClose }: { id: string; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [SERIAL_KEY, 'one', id], queryFn: () => applianceSerialApi.getOne(id) });
  const remove = useMutation({
    mutationFn: () => applianceSerialApi.remove(id),
    onSuccess: (r) => { toast.success(r.message || 'Register se hata diya'); qc.invalidateQueries({ queryKey: [SERIAL_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hata')),
  });
  const [confirm, setConfirm] = useState(false);
  const u = q.data;
  const w = u?.warranty;
  return (
    <Modal open onClose={onClose} size="lg" title={u ? u.serialNumber : 'Unit'} description={u ? `${u.product?.name ?? ''}${u.modelNumber ? ` · ${u.modelNumber}` : ''}` : undefined}
      footer={u && <>
        {canManage && u.status === 'IN_STOCK' && (confirm
          ? <><span className="text-[0.8125rem] text-rose-700">Galti se likha tha? Register se hatayein — record mehfooz rehta hai.</span><Button variant="danger" size="sm" loading={remove.isPending} onClick={() => remove.mutate()}>Haan, hatayein</Button></>
          : <Button variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Register se hatayein</Button>)}
        <span className="flex-1" />
        {u.status === 'SOLD' && <Link to={`/appliances/service-requests?new=1`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"><Wrench className="h-4 w-4" />Shikayat darj</Link>}
        {u.saleId && <Link to={`/sales/${u.saleId}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700">Bill {u.invoiceNumber}</Link>}
      </>}>
      {!u ? <Skeleton className="h-52 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2"><Pill meta={serialStatusOf(u.status)} />{u.installationRequired && <Pill meta={installStatusOf(u.installationStatus)} />}</div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Box label="Warranty" value={u.warrantyEndDate ? dayOnly(u.warrantyEndDate) : '—'} tone={w?.mainDaysLeft != null && w.mainDaysLeft < 0 ? 'text-rose-700' : 'text-slate-900'} />
            <Box label="Compressor" value={u.compressorWarrantyEndDate ? dayOnly(u.compressorWarrantyEndDate) : '—'} />
            <Box label="Motor" value={u.motorWarrantyEndDate ? dayOnly(u.motorWarrantyEndDate) : '—'} />
            <Box label="Service kharcha" value={formatPKR(u.serviceCost || 0)} />
          </dl>
          <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
            <Row k="Aaya" v={`${dayOnly(u.purchaseDate ?? u.createdAt)}${u.supplierRef ? ` · ${u.supplierRef}` : ''}`} />
            {u.status === 'SOLD' && <Row k="Customer" v={[u.customerName, u.customerPhone].filter(Boolean).join(' · ')} />}
            {u.status === 'SOLD' && <Row k="Bika" v={`${dayOnly(u.soldAt)} · bill ${u.invoiceNumber ?? '—'}`} />}
            {u.deliveryAddress && <Row k="Pata" v={u.deliveryAddress} />}
            {u.installedAt && <Row k="Laga" v={dayOnly(u.installedAt)} />}
          </dl>
          <Panel title="Installation aur repair">
            {u.installations.length + u.services.length === 0 ? <p className="text-[0.8125rem] text-slate-500">Abhi koi kaam nahi</p> : (
              <ul className="divide-y divide-slate-100 text-[0.8125rem]">
                {u.installations.map((i) => <li key={i.id} className="flex justify-between gap-2 py-1.5"><Link className="truncate hover:underline" to={`/appliances/installations?id=${i.id}`}>{i.installationNumber} · installation</Link><span className="flex shrink-0 items-center gap-2"><Pill meta={installStatusOf(i.status)} />{dayOnly(i.completedAt ?? i.scheduledDate)}</span></li>)}
                {u.services.map((r) => <li key={r.id} className="flex justify-between gap-2 py-1.5"><Link className="truncate hover:underline" to={`/appliances/service-requests?id=${r.id}`}>{r.requestNumber} · {r.reportedIssue}</Link><span className="flex shrink-0 items-center gap-2"><Pill meta={serviceStatusOf(r.status)} />{dayOnly(r.completedAt ?? r.requestedAt)}</span></li>)}
              </ul>
            )}
          </Panel>
          {u.notes && <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[0.8125rem] text-slate-600">{u.notes}</pre>}
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 text-slate-900">{v || '—'}</dd></div>;
}

function Analytics({ s, sales, cost }: { s?: SerialSummary; sales: (n: number) => string; cost: (n: number) => string }) {
  if (!s) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Paisa" hint="Serial wale units ka">
        <dl className="grid grid-cols-2 gap-3">
          <Box label="Stock ki qeemat" value={cost(s.inStock.value)} /><Box label="Sale" value={sales(s.sold.revenue)} />
          <Box label="Bike units ki cost" value={cost(s.sold.cost)} /><Box label="Profit" value={sales(s.sold.profit)} tone="text-emerald-700" />
        </dl>
      </Panel>
      <Panel title="Units kis halat me"><Bars rows={Object.entries(s.byStatus).filter(([, n]) => n > 0).map(([k, n]) => ({ key: k, label: serialStatusOf(k).label, value: n, color: serialStatusOf(k).color }))} /></Panel>
    </div>
  );
}
