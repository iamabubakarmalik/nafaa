/**
 * Warranty claims to the brand: parts and labour the shop spent on warranty
 * repairs, sent to the company and followed until the money comes — drafts
 * not sent yet, claims waiting on the brand, approved but unpaid, settled
 * and rejected, warranty repairs never claimed, and recovery by brand.
 *
 * Keys: N new claim · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock, Download, FileWarning, Filter, GraduationCap, ListChecks, Plus, Send, Shield,
  ShieldCheck, Trash2, Wallet, XCircle,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { warrantyClaimsApi, type ApplianceClaimStatus, type ClaimSummary, type WarrantyClaim } from '../api/warranty-claims.api';
import { SerialLookup } from '../components/jobDialogs';
import { Bars, Box, Chips, ListState, Pager, Panel, Pill, Strip } from '../components/ui';
import { CLAIM_KEY, MONEY_KEYS, SERVICE_KEY, WARRANTY_KIND, apiError, claimStatusOf, dayOnly, money } from '../components/meta';

type Tab = 'list' | 'missing' | 'analytics';
type View = 'open' | 'DRAFT' | 'waiting' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'all';
const VIEWS: Array<{ id: View; label: string; icon: typeof Shield }> = [
  { id: 'open', label: 'Khule claims', icon: Shield },
  { id: 'DRAFT', label: 'Bheje nahi', icon: FileWarning },
  { id: 'waiting', label: 'Company ke paas', icon: Clock },
  { id: 'APPROVED', label: 'Approve — paisa baqi', icon: Wallet },
  { id: 'SETTLED', label: 'Paisa mil gaya', icon: CheckCircle2 },
  { id: 'REJECTED', label: 'Mana', icon: XCircle },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: View) => VIEWS.find((x) => x.id === v)?.label ?? v;
function viewParams(v: View) {
  if (v === 'open') return { open: true };
  if (v === 'waiting') return { status: 'SUBMITTED' };
  if (v === 'all') return {};
  return { status: v };
}
const pendingOf = (c: WarrantyClaim) => c.pendingAmount ?? Math.max(Number(c.approvedAmount || c.claimedAmount) - Number(c.receivedAmount), 0);

export default function ApplianceWarrantyClaimsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const canManage = usePermission(PERMISSIONS.ELECTRONICS_WARRANTY_MANAGE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'list');
  const [view, setView] = useState<View>('open');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get('id'));
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, query]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== 'list') next.set('tab', tab);
    if (openId) next.set('id', openId);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, openId]);

  const q = { ...viewParams(view), search: query || undefined, page, limit: 40 };
  const listQ = useQuery({ queryKey: [CLAIM_KEY, 'page', q], queryFn: () => warrantyClaimsApi.list(q), placeholderData: (p) => p, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: [CLAIM_KEY, 'summary'], queryFn: warrantyClaimsApi.summary, refetchInterval: 120_000 });
  const missingQ = useQuery({ queryKey: [CLAIM_KEY, 'missing'], queryFn: warrantyClaimsApi.missing, enabled: tab === 'missing' });
  const fromService = useMutation({
    mutationFn: (id: string) => warrantyClaimsApi.fromService(id),
    onSuccess: (c) => { toast.success(`Claim ${c.claimNumber} ban gaya`); [CLAIM_KEY, SERVICE_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setOpenId(c.id); },
    onError: (e) => toast.error(apiError(e, 'Claim nahi bana')),
  });
  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const pick = (v: View) => { setTab('list'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setCreating(true); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const fetchAll = () => warrantyClaimsApi.list({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Warranty claims — ${viewLabel(view)}`,
      meta: [['Claims', String(all.meta.total)]],
      sections: [{ kind: 'table', columns: [{ label: '#' }, { label: 'Brand' }, { label: 'Product' }, { label: 'Serial', wideOnly: true }, { label: 'Halat' }, { label: 'Claim', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((c) => [c.claimNumber, c.brandName ?? '—', c.productName, c.serialNumber ?? '—', claimStatusOf(c.status).label, sales(c.claimedAmount), sales(pendingOf(c))]) }],
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('warranty-claims.csv', [
      ['Number', 'Date', 'Brand', 'Product', 'Model', 'Serial', 'Customer', 'Kharabi', 'Halat', 'Company ref', 'Parts', 'Mazdoori', 'Aur', 'Claim', 'Approve', 'Mila', 'Baqi'],
      ...all.items.map((c) => [c.claimNumber, dayOnly(c.claimDate), c.brandName ?? '', c.productName, c.modelNumber ?? '', c.serialNumber ?? '', c.customerName, c.issue, claimStatusOf(c.status).label,
        c.brandRef ?? '', c.partsCost, c.laborCost, c.otherCost, c.claimedAmount, c.approvedAmount, c.receivedAmount, pendingOf(c)]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Warranty claims"
        chip={<><Shield /> Company se paisa</>}
        meta="Warranty repair ke parts aur mazdoori company se wapas lein"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'list' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setCreating(true)} title="Naya claim (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya claim</button>}
        </>}
        stats={s ? [
          { label: 'Company se lena', value: sales(s.money.pending) },
          { label: 'Wapas mila', value: `${Math.round(s.money.recoveryRate)}%` },
          { label: 'Claim nahi kiye', value: s.missing.count, hint: s.missing.recoverable ? sales(s.missing.recoverable) : undefined },
        ] : [{ label: 'Company se lena', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={FileWarning} color={s.draft ? '#ea580c' : '#64748b'} label="Bheje nahi" value={s.draft} hint="Company ko bhejein" onClick={() => pick('DRAFT')} active={tab === 'list' && view === 'DRAFT'} />
          <KpiCard icon={Clock} color="#2563eb" label="Company ke paas" value={s.submitted + s.reviewing} hint={s.stale ? `${s.stale} purane — yaad dilayein` : 'Jawab ka intezar'} onClick={() => pick('waiting')} active={tab === 'list' && view === 'waiting'} />
          <KpiCard icon={Wallet} color="#d97706" label="Approve, paisa baqi" value={s.approved} hint={sales(s.money.pending)} onClick={() => pick('APPROVED')} active={tab === 'list' && view === 'APPROVED'} />
          <KpiCard icon={AlertTriangle} color={s.missing.count ? '#e11d48' : '#64748b'} label="Claim nahi kiye" value={s.missing.count} hint={s.missing.count ? `${sales(s.missing.recoverable)} reh gaye` : 'Sab claim ho gaye'} onClick={() => setTab('missing')} active={tab === 'missing'} />
        </>}
      </KpiRow>

      {tab === 'list' ? (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Claim #, brand, product, serial, customer…" label="Search" />}
          chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined}
          onClear={() => setSearch('')}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'open'} onChange={setView} width="w-60" options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
        </FilterBar>
      ) : <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tab === 'missing' ? 'Warranty me theek kiye kaam jin ka claim abhi nahi bana' : 'Brand war claims aur wusooli'}</p>} />}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'list', label: 'Claims', icon: ListChecks, count: data?.meta.total ?? null },
          { id: 'missing', label: 'Claim nahi kiye', icon: AlertTriangle, count: s?.missing.count ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <Analytics s={s} money={sales} /> : tab === 'missing' ? (
        <ListState loading={missingQ.isLoading} error={missingQ.isError} empty={!(missingQ.data?.items.length)} onRetry={() => missingQ.refetch()} icon={ShieldCheck}
          title="Har warranty kaam ka claim ban chuka" hint="Repair me 'Warranty me' wala kaam mukammal ho to yahan aata hai.">
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {(missingQ.data?.items ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{m.productName} <span className="font-mono text-[0.6875rem] text-slate-400">{m.requestNumber}</span></p>
                  <p className="truncate text-[0.8125rem] text-slate-600">{m.customerName} · {m.reportedIssue}{m.serialNumber ? ` · ${m.serialNumber}` : ''}</p>
                  <p className="text-[0.75rem] text-slate-500">{dayOnly(m.completedAt)} · {m.ageDays} din purana · {m.technicianName ?? ''}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-rose-700">{sales(m.recoverable)}</p>
                  {canManage && <Button size="sm" className="mt-1" leftIcon={<Plus className="h-3.5 w-3.5" />} loading={fromService.isPending && fromService.variables === m.id} onClick={() => fromService.mutate(m.id)}>Claim banayein</Button>}
                </div>
              </li>
            ))}
          </ul>
        </ListState>
      ) : (<>
        {data && data.meta.total > 0 && <Strip><span className="text-slate-500">{viewLabel(view)}</span><span className="font-semibold text-slate-900">{data.meta.total} claims</span></Strip>}
        <ListState loading={listQ.isLoading} error={listQ.isError && !data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={Shield}
          title={query ? 'Kuch nahi mila' : 'Koi claim nahi'} hint="Warranty repair mukammal karein to 'Company se claim' button aata hai — ya yahan khud likhein."
          actions={canManage ? <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>Naya claim</Button> : undefined}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpenId(c.id)} className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-slate-50 sm:px-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Shield className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5"><span className="truncate font-semibold text-slate-900">{c.brandName ?? 'Brand'} — {c.productName}</span><Pill meta={claimStatusOf(c.status)} /><span className="font-mono text-[0.6875rem] text-slate-400">{c.claimNumber}</span></span>
                    <span className="mt-0.5 block truncate text-[0.8125rem] text-slate-600">{c.issue}{c.serialNumber ? ` · ${c.serialNumber}` : ''} · {c.customerName}</span>
                    <span className="mt-0.5 block text-[0.75rem] text-slate-500">{dayOnly(c.claimDate)}{c.ageDays ? ` · ${c.ageDays} din` : ''}{c.brandRef ? ` · ref ${c.brandRef}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums text-slate-900">{sales(Number(c.claimedAmount) || 0)}</span>
                    {pendingOf(c) > 0 && c.status !== 'REJECTED' && c.status !== 'DRAFT' && <span className="block text-[0.75rem] font-medium tabular-nums text-amber-700">baqi {sales(pendingOf(c))}</span>}
                    <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-slate-400" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ListState>
        {data && <Pager page={page} pages={data.meta.totalPages} onPage={setPage} />}
      </>)}

      {creating && <NewClaimModal onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />}
      {openId && <ClaimCard id={openId} canManage={canManage} onClose={() => setOpenId(null)} />}
      {guide.isOpen && (
        <PageGuide title="Warranty claims — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Claim banayein', text: 'Warranty repair mukammal hone par "Company se claim" dabayein, ya "Claim nahi kiye" tab se. Parts aur mazdoori khud aa jate hain.' },
            { icon: Send, color: '#7c3aed', title: 'Company ko bhejein', text: 'Claim kholein → "Company ko bheja" — company ka reference number aur contact likhein.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Jawab', text: 'Company approve kare to kitna approve hua likhein; mana kare to wajah. Naya unit mile to us ka serial.' },
            { icon: Wallet, color: '#d97706', title: 'Paisa mila', text: '"Paisa mila" par kitna mila aur kaise (aksar bank) — galla / bank aur Profit me aata hai.' },
          ]}
          tips={['"Company ke paas" me purane claims par company ko yaad dilayein.', 'Claim sambhalne ke liye "Warranty manage" permission chahiye.']}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['1', 'claims'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function NewClaimModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [product, setProduct] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [invoice, setInvoice] = useState('');
  const [issue, setIssue] = useState('');
  const [kind, setKind] = useState('MAIN');
  const [parts, setParts] = useState('');
  const [labor, setLabor] = useState('');
  const [other, setOther] = useState('');
  const ok = product.trim().length >= 2 && customer.trim().length >= 2 && issue.trim().length >= 3;
  const save = useMutation({
    mutationFn: () => warrantyClaimsApi.create({
      serialTrackingId: serialId, serialNumber: serial.trim() || undefined, productId, productName: product.trim(), brandName: brand.trim() || undefined, modelNumber: model.trim() || undefined,
      customerName: customer.trim(), customerPhone: phone.trim() || undefined, invoiceNumber: invoice.trim() || undefined, issue: issue.trim(), warrantyKind: kind,
      partsCost: Number(parts) || 0, laborCost: Number(labor) || 0, otherCost: Number(other) || 0,
    }),
    onSuccess: (c) => { toast.success(`Claim ${c.claimNumber} ban gaya`); qc.invalidateQueries({ queryKey: [CLAIM_KEY] }); onCreated(c.id); },
    onError: (e) => toast.error(apiError(e, 'Claim nahi bana')),
  });
  const total = (Number(parts) || 0) + (Number(labor) || 0) + (Number(other) || 0);
  return (
    <Modal open onClose={onClose} size="lg" title="Naya warranty claim" description="Jo kharcha dukaan ne warranty kaam par kiya, company se lein"
      footer={<><span className="mr-auto text-[0.8125rem] text-slate-600">Claim: <strong>{formatPKR(total)}</strong></span><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} loading={save.isPending} onClick={() => save.mutate()}>Claim banayein</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (ok) save.mutate(); } }}>
        <SerialLookup value={serial} onChange={(v) => { setSerial(v); setSerialId(undefined); }} onFound={(r) => {
          const s = r.serial!;
          setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product); setBrand(s.product?.brand ?? brand); setModel(s.modelNumber ?? s.product?.modelNumber ?? model);
          setCustomer(s.customerName ?? customer); setPhone(s.customerPhone ?? phone); setInvoice(s.invoiceNumber ?? invoice);
        }} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Product" required value={product} onChange={(e) => setProduct(e.target.value)} />
          <Input label="Brand / company" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Haier" />
          <Input label="Model" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Customer" required value={customer} onChange={(e) => setCustomer(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Bill number" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
        </div>
        <Textarea label="Kharabi" required rows={2} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Compressor band ho gaya" />
        <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaunsi warranty</span><Chips options={Object.entries(WARRANTY_KIND).map(([value, label]) => ({ value, label }))} value={kind} onChange={setKind} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Parts" inputMode="decimal" value={parts} onChange={(e) => setParts(money(e.target.value))} />
          <Input label="Mazdoori" inputMode="decimal" value={labor} onChange={(e) => setLabor(money(e.target.value))} />
          <Input label="Aur kharcha" inputMode="decimal" value={other} onChange={(e) => setOther(money(e.target.value))} hint="Gas, safar" />
        </div>
      </form>
    </Modal>
  );
}

type Dialog = 'submit' | 'response' | 'settle' | null;

function ClaimCard({ id, canManage, onClose }: { id: string; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [CLAIM_KEY, 'one', id], queryFn: () => warrantyClaimsApi.getOne(id) });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [ref, setRef] = useState('');
  const [contact, setContact] = useState('');
  const [answer, setAnswer] = useState<ApplianceClaimStatus>('APPROVED');
  const [approved, setApproved] = useState('');
  const [response, setResponse] = useState('');
  const [replacement, setReplacement] = useState('');
  const [received, setReceived] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [confirmDrop, setConfirmDrop] = useState(false);
  const done = (msg: string) => { toast.success(msg); [CLAIM_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setDialog(null); };
  const fail = (e: unknown) => toast.error(apiError(e, 'Nahi hua'));
  const submit = useMutation({ mutationFn: () => warrantyClaimsApi.submit(id, { brandRef: ref.trim() || undefined, brandContact: contact.trim() || undefined }), onSuccess: () => done('Company ko bhej diya'), onError: fail });
  const respond = useMutation({
    mutationFn: () => warrantyClaimsApi.brandResponse(id, { status: answer, approvedAmount: answer === 'REJECTED' ? undefined : Number(approved) || 0, brandResponse: answer === 'REJECTED' ? undefined : response.trim() || undefined, rejectionReason: answer === 'REJECTED' ? response.trim() : undefined, replacementSerialNumber: replacement.trim() || undefined }),
    onSuccess: () => done('Jawab darj'), onError: fail,
  });
  const settle = useMutation({ mutationFn: () => warrantyClaimsApi.settle(id, { receivedAmount: Number(received) || 0, paymentMethod: method }), onSuccess: () => done('Paisa darj — galla / bank me'), onError: fail });
  const drop = useMutation({ mutationFn: () => warrantyClaimsApi.remove(id), onSuccess: () => { done('Claim hata diya'); onClose(); }, onError: fail });
  const c = q.data;
  const pending = c ? pendingOf(c) : 0;

  return (
    <Modal open onClose={onClose} size="lg" title={c ? `${c.claimNumber} — ${c.brandName ?? ''} ${c.productName}` : 'Claim'} description={c ? `${c.customerName}${c.serialNumber ? ` · ${c.serialNumber}` : ''}` : undefined}
      footer={c && canManage && <>
        {c.status === 'DRAFT' && (confirmDrop
          ? <Button variant="danger" size="sm" loading={drop.isPending} leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => drop.mutate()}>Haan, hatayein</Button>
          : <Button variant="ghost" size="sm" onClick={() => setConfirmDrop(true)}>Hatayein</Button>)}
        <span className="flex-1" />
        {c.status === 'DRAFT' && <Button leftIcon={<Send className="h-4 w-4" />} onClick={() => setDialog('submit')}>Company ko bheja</Button>}
        {(c.status === 'SUBMITTED' || c.status === 'BRAND_REVIEWING') && <Button onClick={() => { setApproved(String(Number(c.claimedAmount))); setDialog('response'); }}>Company ka jawab</Button>}
        {(c.status === 'APPROVED' || c.status === 'PARTIALLY_APPROVED') && pending > 0 && <Button leftIcon={<Wallet className="h-4 w-4" />} onClick={() => { setReceived(String(pending)); setDialog('settle'); }}>Paisa mila</Button>}
      </>}>
      {!c ? <Skeleton className="h-52 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2"><Pill meta={claimStatusOf(c.status)} />{c.warrantyKind && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-600">{WARRANTY_KIND[c.warrantyKind] ?? c.warrantyKind}</span>}</div>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.875rem] text-amber-900 ring-1 ring-amber-200"><strong>Kharabi:</strong> {c.issue}</p>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Box label="Claim" value={formatPKR(Number(c.claimedAmount))} /><Box label="Approve" value={formatPKR(Number(c.approvedAmount))} />
            <Box label="Mila" value={formatPKR(Number(c.receivedAmount))} tone="text-emerald-700" /><Box label="Baqi" value={formatPKR(c.status === 'REJECTED' ? 0 : pending)} tone={pending > 0 ? 'text-amber-700' : 'text-slate-900'} />
          </dl>
          <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
            <Row k="Parts" v={formatPKR(Number(c.partsCost))} /><Row k="Mazdoori" v={formatPKR(Number(c.laborCost))} />
            {c.brandRef && <Row k="Company ref" v={c.brandRef} />}{c.brandContact && <Row k="Contact" v={c.brandContact} />}
            {c.submittedAt && <Row k="Bheja" v={dayOnly(c.submittedAt)} />}{c.brandResponse && <Row k="Jawab" v={c.brandResponse} />}
            {c.rejectionReason && <Row k="Mana ki wajah" v={c.rejectionReason} />}{c.replacementSerialNumber && <Row k="Naya unit" v={c.replacementSerialNumber} />}
            {c.service && <Row k="Repair" v={`${c.service.requestNumber} · ${c.service.workDone ?? c.service.reportedIssue}`} />}
            {c.serial?.warrantyEndDate && <Row k="Warranty" v={`${dayOnly(c.serial.warrantyEndDate)} tak`} />}
          </dl>
          {c.notes && <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[0.8125rem] text-slate-600">{c.notes}</pre>}
        </div>
      )}
      {dialog === 'submit' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title="Company ko bheja" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button><Button loading={submit.isPending} onClick={() => submit.mutate()}>Darj karein</Button></>}>
          <div className="space-y-3"><Input label="Company ka reference / complaint #" value={ref} onChange={(e) => setRef(e.target.value)} autoFocus /><Input label="Kis se baat hui" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Naam / phone" /></div>
        </Modal>
      )}
      {dialog === 'response' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title="Company ka jawab"
          footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button><Button loading={respond.isPending} disabled={answer === 'REJECTED' ? response.trim().length < 3 : !(Number(approved) > 0)} onClick={() => respond.mutate()}>Darj karein</Button></>}>
          <div className="space-y-3">
            <Chips options={[{ value: 'APPROVED' as ApplianceClaimStatus, label: 'Poora approve' }, { value: 'PARTIALLY_APPROVED' as ApplianceClaimStatus, label: 'Thora approve' }, { value: 'REJECTED' as ApplianceClaimStatus, label: 'Mana' }]} value={answer} onChange={setAnswer} />
            {answer !== 'REJECTED' && <Input label="Kitna approve hua" inputMode="decimal" value={approved} onChange={(e) => setApproved(money(e.target.value))} />}
            <Textarea label={answer === 'REJECTED' ? 'Mana ki wajah' : 'Company ne kya kaha'} rows={2} value={response} onChange={(e) => setResponse(e.target.value)} />
            {answer !== 'REJECTED' && <Input label="Naya unit mila? Us ka serial" value={replacement} onChange={(e) => setReplacement(e.target.value)} hint="Marzi hai" />}
          </div>
        </Modal>
      )}
      {dialog === 'settle' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title="Company se paisa mila"
          footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button><Button loading={settle.isPending} disabled={!(Number(received) > 0) || Number(received) > pending + 0.01} onClick={() => settle.mutate()}>Darj karein</Button></>}>
          <div className="space-y-3">
            <Input label="Kitna mila" inputMode="decimal" value={received} onChange={(e) => setReceived(money(e.target.value))} error={Number(received) > pending + 0.01 ? `Baqi sirf ${formatPKR(pending)}` : undefined} />
            <PaymentMethodPicker value={method} onChange={setMethod} />
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 text-slate-900">{v || '—'}</dd></div>;
}

function Analytics({ s, money: m }: { s?: ClaimSummary; money: (n: number) => string }) {
  if (!s) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Paisa" hint="Company se aaya paisa galla / bank aur Profit me aata hai">
        <dl className="grid grid-cols-2 gap-3">
          <Box label="Claim kiya" value={m(s.money.claimed)} /><Box label="Approve" value={m(s.money.approved)} />
          <Box label="Mila" value={m(s.money.received)} tone="text-emerald-700" /><Box label="Baqi" value={m(s.money.pending)} tone="text-amber-700" />
          <Box label="Kam mila (nuqsan)" value={m(s.money.shortfall)} tone={s.money.shortfall > 0 ? 'text-rose-700' : 'text-slate-900'} /><Box label="Paisa aane me" value={`${Math.round(s.avgSettleDays)} din`} />
        </dl>
      </Panel>
      <Panel title="Brand war wusooli"><Bars rows={s.byBrand.map((b) => ({ key: b.brand, label: b.brand, value: b.claimed, color: '#2563eb', hint: `${m(b.received)} / ${m(b.claimed)} · ${Math.round(b.recoveryRate)}%` }))} /></Panel>
    </div>
  );
}
