/**
 * Warranty claims. A customer brings back a faulty unit: the claim is
 * opened from its serial, goes to repair or to the company, and is closed
 * with what was done (repaired, replaced, refunded, rejected). Charges,
 * repair costs and replacements go into the books on closing. The oldest
 * open claims show first; a claim open for a week turns red.
 *
 * Keys: N new claim · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, ChevronDown, CircleSlash, ClipboardList, Clock, Download, GraduationCap, Hash, MessageCircle, Plus, Receipt, ScanLine,
  ShieldCheck, TriangleAlert, Wallet, Wrench,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton,
  Textarea, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { waLink } from '@core/lib/whatsapp/templates';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { warrantyClaimsApi, type ClaimRow, type ClaimView, type WarrantyClaim } from '../api/warranty-claims.api';
import { CLAIM_KEYS, NewClaimModal } from '../components/NewClaimModal';
import { ResolveClaimModal } from '../components/ResolveClaimModal';
import { OUTCOME, apiError, claimStage, daysSince, shortDate } from '../components/meta';
import { t as tr } from '@core/i18n';

const TABS: Array<{ id: ClaimView; label: string; icon: typeof Clock }> = [
  { id: 'open', label: tr('Khule'), icon: Clock },
  { id: 'repair', label: tr('Repair mein'), icon: Wrench },
  { id: 'brand', label: tr('Company ke paas'), icon: Building2 },
  { id: 'stale', label: tr('Hafte se purane'), icon: TriangleAlert },
  { id: 'done', label: tr('Hal hue'), icon: ShieldCheck },
  { id: 'closed', label: tr('Cancel'), icon: CircleSlash },
  { id: 'all', label: tr('Sab'), icon: ClipboardList },
];
const OPEN_VIEWS: ClaimView[] = ['open', 'repair', 'brand', 'stale'];

/** The customer's receipt for the unit left at the shop. */
function claimSlip(c: WarrantyClaim): PrintDoc {
  const rows = [
    { label: 'Claim', value: c.claimNumber },
    { label: 'Tareekh', value: shortDate(c.claimDate) },
    { label: 'Customer', value: `${c.customerName}${c.customerPhone ? ` · ${c.customerPhone}` : ''}` },
    { label: 'Product', value: c.productName },
    ...(c.serialNumber ? [{ label: 'Serial', value: c.imei ? `${c.serialNumber} / ${c.imei}` : c.serialNumber }] : []),
    ...(c.invoiceNumber ? [{ label: 'Bill', value: `${c.invoiceNumber} · ${shortDate(c.purchaseDate)}` }] : []),
  ];
  return {
    title: 'Warranty claim parchi',
    subtitle: c.claimNumber,
    sections: [
      { kind: 'rows', rows },
      { kind: 'text', title: 'Kharabi', text: c.issueDescription },
      ...(c.resolvedAt ? [{ kind: 'rows' as const, title: 'Natija', rows: [
        { label: 'Kya hua', value: OUTCOME[c.resolutionType as keyof typeof OUTCOME]?.label ?? c.resolutionType ?? '' },
        ...(c.resolution ? [{ label: 'Tafseel', value: c.resolution }] : []),
        ...(c.paidByCustomer > 0 ? [{ label: 'Charge', value: formatPKR(c.paidByCustomer), strong: true }] : []),
      ] }] : []),
    ],
    footer: 'Unit lene ke liye ye parchi saath layein. Toota ya paani laga unit warranty mein nahi.',
  };
}

export default function WarrantyClaimsPage() {
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.ELECTRONICS_WARRANTY_MANAGE);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ClaimView>('open');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState<string | null>(params.get('serial'));
  const [slip, setSlip] = useState<WarrantyClaim | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [tab, query, range]);
  useEffect(() => { if (params.get('q') && tab === 'open') setTab('all'); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const period = resolveRange(range, startHour);
  const q = { view: tab, search: query || undefined, ...(period ?? {}), page, limit: 30 };
  const list = useQuery({ queryKey: ['electronics-claims', 'page', q], queryFn: () => warrantyClaimsApi.page(q), placeholderData: (p) => p });
  const sum = useQuery({ queryKey: ['electronics-claims-summary'], queryFn: warrantyClaimsApi.summary, refetchInterval: 60_000 });
  const data = list.data;
  const c = data?.counts;
  const s = sum.data;
  const rows = data?.items ?? [];
  const filtered = !!query || range.preset !== 'all';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setCreating(''); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const closeCreate = () => { setCreating(null); if (params.get('serial')) { params.delete('serial'); setParams(params, { replace: true }); } };

  const fetchAll = async () => {
    const all: ClaimRow[] = [];
    for (let p = 1; p <= 50; p++) {
      const r = await warrantyClaimsApi.page({ ...q, page: p, limit: 100 });
      all.push(...r.items);
      if (p >= r.pages) break;
    }
    return all;
  };
  const csv = async () => {
    const all = await fetchAll();
    downloadCsv(`warranty-claims-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Claim', 'Tareekh', 'Customer', 'Phone', 'Product', 'Serial', 'Kharabi', 'Haal', 'Charge', 'Repair kharcha', 'Company', 'Refund'],
      ...all.map((x) => [x.claimNumber, shortDate(x.claimDate), x.customerName, x.customerPhone ?? '', x.productName, x.serialNumber ?? '', x.issueDescription,
        claimStage(x).label, x.paidByCustomer, x.repairCost, x.paidByBrand, x.refundAmount]),
    ]);
  };
  const printList = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: 'Warranty claims',
      subtitle: TABS.find((t) => t.id === tab)?.label,
      meta: [['Claims', String(all.length)], ...(period ? [['Period', `${period.from} — ${period.to}`] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Claim' }, { label: 'Customer' }, { label: 'Product' }, { label: 'Din', align: 'right', wideOnly: true }, { label: 'Haal' }],
        rows: all.map((x) => [x.claimNumber, x.customerName, x.productName, String(daysSince(x.claimDate)), claimStage(x).label]),
      }],
    };
  };

  const kpi = (id: ClaimView) => ({ onClick: () => setTab(id), active: tab === id });
  const slipWa = slip ? waLink(slip.customerPhone, `Assalam o alaikum ${slip.customerName}, aap ka ${slip.productName} warranty claim ${slip.claimNumber} darj ho gaya hai. Tayyar hone par hum batayenge.`) : null;

  return (
    <PageShell>
      <PageHero
        title={tr('Warranty claims')}
        chip={<><ShieldCheck /> {' '}{tr('Kharab unit wapas')}</>}
        meta={tr('Serial se claim, repair ya company, phir natija aur hisaab')}
        busy={list.isFetching && !list.isLoading}
        loading={sum.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} disabled={!rows.length} /></span>
          <button type="button" onClick={() => void csv()} disabled={!rows.length} title={tr('Excel (CSV)')} className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setCreating('')} title={tr('Naya claim (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Naya claim')}</button>}
        </>}
        stats={s ? [
          { label: tr('Khule claim'), value: s.pending },
          { label: tr('Hafte se purane'), value: s.stale },
          { label: tr('Is mahine hal'), value: s.resolved },
          { label: tr('Is mahine dukaan ka kharcha'), value: money(s.cost.shopBore) },
        ] : [{ label: tr('Khule claim'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!c || !s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#2563eb" label={tr('Khule')} value={c.open} hint={tr('Jin par kaam baqi')} {...kpi('open')} />
          <KpiCard icon={Wrench} color="#ea580c" label={tr('Repair mein')} value={c.repair} hint={tr('Mistri ya service center')} {...kpi('repair')} />
          <KpiCard icon={Building2} color="#7c3aed" label={tr('Company ke paas')} value={c.brand} hint={tr('Brand ko bheje gaye')} {...kpi('brand')} />
          <KpiCard icon={TriangleAlert} color="#e11d48" label={tr('Hafte se purane')} value={c.stale} hint={c.stale ? tr('Customer intezar mein') : tr('Sab waqt par')} {...kpi('stale')} />
          <KpiCard icon={Wallet} color="#059669" label={tr('Customer se mila')} value={money(s.cost.paidByCustomer)} hint={tr('Kharcha {{repairCost}} · is mahine', { repairCost: money(s.cost.repairCost) })} {...kpi('done')} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Claim, customer, phone, serial, IMEI, bill…')} label={tr('Search')} />}
        chips={filtered ? <>
          {range.preset !== 'all' && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{period ? `${period.from} — ${period.to}` : tr('Period')}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Claim ki date')} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>/</Kbd> {' '}{tr('search')}{canManage && <> · <Kbd>N</Kbd> {' '}{tr('naya claim')}</>}</>}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: c?.[t.id] ?? null }))} />

      {list.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-3 font-semibold text-slate-900">{OPEN_VIEWS.includes(tab) && !filtered ? tr('Koi khula claim nahi') : tr('Is filter mein koi claim nahi')}</p>
          <p className="mt-1 text-sm text-slate-500">{tr('Customer kharab unit laye to serial scan kar ke claim kholein — parchi de dein.')}</p>
          {canManage && <Button className="mt-4" onClick={() => setCreating('')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya claim')}</Button>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((x) => <ClaimItem key={x.id} c={x} money={money} canManage={canManage} onSlip={() => setSlip(x)} />)}
        </ul>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: data.pages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
        </div>
      )}

      {creating !== null && <NewClaimModal initialCode={creating || undefined} onClose={closeCreate} onSaved={(cl) => { closeCreate(); setSlip(cl); }} />}
      {slip && (
        <Modal open onClose={() => setSlip(null)} size="sm" title={tr('Claim {{claimNumber}}', { claimNumber: slip.claimNumber })} description={tr('Customer ko parchi dein')}
          footer={<><Button variant="secondary" onClick={() => setSlip(null)}>{tr('Band karein')}</Button><PrintButton doc={() => claimSlip(slip)} /></>}>
          <p className="text-[0.8125rem] text-slate-600">{slip.productName} · {slip.customerName}</p>
          {slipWa && (
            <a href={slipWa}
              target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-emerald-700">
              <MessageCircle className="h-4 w-4" />{tr('WhatsApp par bhejein')}
            </a>
          )}
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title={tr('Warranty claims — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: ScanLine, color: '#2563eb', title: tr('Claim kholein'), text: tr('"Naya claim" dabayein aur unit ka serial ya IMEI scan karein. Hamara bika hua unit ho to product, customer, bill aur warranty khud aa jati hai.') },
            { icon: Receipt, color: '#0891b2', title: tr('Parchi dein'), text: tr('Save ke baad customer ki parchi print karein ya WhatsApp karein — unit lene isi parchi se aaye.') },
            { icon: Wrench, color: '#ea580c', title: tr('Repair ya company'), text: tr('Unit mistri ko diya to "Repair mein" karein. Company ko bheja to us ka reference likhein — list mein alag nazar aata hai.') },
            { icon: ShieldCheck, color: '#059669', title: tr('Hal karein'), text: tr('Theek hua, naya diya, paisa wapas ya warranty mein nahi — natija chunein. Charge ka bill khud banta hai, baqi khate mein.') },
            { icon: Wallet, color: '#475569', title: tr('Hisaab'), text: tr('Repair ka kharcha profit se ghatta hai. Galle se diya ho to switch on karein. Naya unit diya to stock se write-off hota hai.') },
            { icon: TriangleAlert, color: '#e11d48', title: tr('Purane claim'), text: tr('Hafte se zyada khula claim laal hai. Customer ko update dein — bharosa isi se banta hai.') },
          ]}
          tips={[
            tr('Paisa wapas karna ho to pehle Sales history mein asal bill par Return karein, phir claim band karein.'),
            tr('Naya unit dene ke liye Stock adjustment ki permission chahiye.'),
            tr('Hal karne par bill banta hai, is liye POS ki permission bhi chahiye.'),
          ]}
          shortcuts={[['N', tr('naya claim')], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function ClaimItem({ c, money, canManage, onSlip }: { c: ClaimRow; money: (n: number) => string; canManage: boolean; onSlip: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [resolve, setResolve] = useState(false);
  const [brand, setBrand] = useState(false);
  const st = claimStage(c);
  const isOpen = !c.resolvedAt && ['ACTIVE', 'CLAIMED', 'IN_REPAIR'].includes(c.status);
  const age = daysSince(c.claimDate);
  const late = isOpen && age >= 7;
  const refresh = () => CLAIM_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const toRepair = useMutation({
    mutationFn: () => warrantyClaimsApi.updateStatus(c.id, { status: 'IN_REPAIR' }),
    onSuccess: () => { toast.success(tr('Repair mein')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const cancel = useMutation({
    mutationFn: () => warrantyClaimsApi.remove(c.id),
    onSuccess: () => { toast.success(tr('Claim cancel ho gaya')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Cancel nahi hua'))),
  });
  const detail = useQuery({ queryKey: ['electronics-claims', 'one', c.id], queryFn: () => warrantyClaimsApi.getOne(c.id), enabled: open || resolve });
  const underWarranty = !!detail.data?.serial?.warrantyEndDate && new Date(detail.data.serial.warrantyEndDate).getTime() > new Date(c.claimDate).getTime();

  return (
    <li className={cn(late && 'bg-rose-50/40')}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-200" style={{ backgroundColor: `${st.color}14`, color: st.color }}><st.icon className="h-4 w-4" /></span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-w-0 flex-1 text-start">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-slate-900">{c.productName}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
            {late && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[0.6875rem] font-semibold text-white">{tr('{{age}} din', { age })}</span>}
            {c.bill && c.bill.creditAmount > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200">{tr('Udhaar {{creditAmount}}', { creditAmount: formatPKR(c.bill.creditAmount) })}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
            <span className="font-mono">{c.claimNumber}</span> · {c.customerName}{c.customerPhone ? ` · ${c.customerPhone}` : ''}{c.serialNumber ? tr(' · S/N {{serialNumber}}', { serialNumber: c.serialNumber }) : ''}
          </span>
        </button>
        <div className="ms-auto text-end">
          <p className="text-[0.8125rem] font-semibold text-slate-700">{shortDate(c.claimDate)}</p>
          <p className="text-[0.6875rem] text-slate-400">{c.resolvedAt ? tr('Hal {{resolvedAt}}', { resolvedAt: shortDate(c.resolvedAt) }) : isOpen ? tr('{{age}} din se', { age }) : ''}</p>
        </div>
        {isOpen && canManage && <Button size="sm" onClick={() => setResolve(true)}>{tr('Hal karein')}</Button>}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={tr('Details')} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] text-slate-700 sm:ps-[4.25rem]">
          <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"><b>{tr('Kharabi:')}</b> {c.issueDescription}</p>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <Fact k={tr('Khareed')} v={`${shortDate(c.purchaseDate)}${c.invoiceNumber ? ` · ${c.invoiceNumber}` : ''}`} />
            {detail.data?.serial?.warrantyEndDate && <Fact k={tr('Warranty tak')} v={shortDate(detail.data.serial.warrantyEndDate)} />}
            {c.diagnosis && <Fact k={tr('Masla')} v={c.diagnosis} />}
            {c.sentToBrand && <Fact k={tr('Company ref')} v={`${c.brandRef ?? '—'}${c.brandContactedAt ? ` · ${shortDate(c.brandContactedAt)}` : ''}`} />}
            {c.resolvedAt && <Fact k={tr('Natija')} v={OUTCOME[c.resolutionType as keyof typeof OUTCOME]?.label ?? c.resolutionType ?? '—'} />}
            {c.replacementSerialNumber && <Fact k={tr('Naya unit')} v={c.replacementSerialNumber} />}
            {c.paidByCustomer > 0 && <Fact k={tr('Customer charge')} v={formatPKR(c.paidByCustomer)} />}
            {c.repairCost > 0 && <Fact k={tr('Repair kharcha')} v={money(c.repairCost)} />}
            {c.paidByBrand > 0 && <Fact k={tr('Company ne diya')} v={money(c.paidByBrand)} />}
            {c.refundAmount > 0 && <Fact k={tr('Paisa wapas')} v={formatPKR(c.refundAmount)} />}
            {c.bill && <Fact k={tr('Bill')} v={`${c.bill.saleNumber} · ${formatPKR(c.bill.total)}`} />}
          </dl>
          {c.internalNotes && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">{c.internalNotes}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onSlip} leftIcon={<Receipt className="h-3.5 w-3.5" />}>{tr('Parchi')}</Button>
            {c.serialNumber && <Link to={`/electronics/serials?q=${encodeURIComponent(c.serialNumber)}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Hash className="h-3.5 w-3.5" />{tr('Unit')}</Link>}
            {isOpen && canManage && c.status !== 'IN_REPAIR' && <Button size="sm" variant="secondary" loading={toRepair.isPending} onClick={() => toRepair.mutate()} leftIcon={<Wrench className="h-3.5 w-3.5" />}>{tr('Repair mein')}</Button>}
            {isOpen && canManage && <Button size="sm" variant="secondary" onClick={() => setBrand(true)} leftIcon={<Building2 className="h-3.5 w-3.5" />}>{c.sentToBrand ? tr('Company ka jawab') : tr('Company ko bheja')}</Button>}
            {isOpen && canManage && !c.bill && (
              <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={async () => { if ((await confirmDialog({ title: tr('{{claimNumber}} cancel karein?', { claimNumber: c.claimNumber }), text: tr('Claim list mein rahega.'), danger: true }))) cancel.mutate(); }} leftIcon={<CircleSlash className="h-3.5 w-3.5" />}>{tr('Cancel')}</Button>
            )}
          </div>
        </div>
      )}
      {resolve && <ResolveClaimModal claim={c} underWarranty={underWarranty} onClose={() => setResolve(false)} />}
      {brand && <BrandModal c={c} onClose={() => setBrand(false)} />}
    </li>
  );
}

function BrandModal({ c, onClose }: { c: ClaimRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [ref, setRef] = useState(c.brandRef ?? '');
  const [reply, setReply] = useState(c.brandResponse ?? '');
  const save = useMutation({
    mutationFn: () => warrantyClaimsApi.contactBrand(c.id, { brandRef: ref.trim(), brandResponse: reply.trim() || undefined }),
    onSuccess: () => { toast.success(tr('Company ki tafseel save ho gayi')); CLAIM_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} title={tr('Company — {{claimNumber}}', { claimNumber: c.claimNumber })} description={c.productName}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={() => save.mutate()} loading={save.isPending} disabled={!ref.trim()}>{tr('Save karein')}</Button></>}>
      <div className="space-y-3">
        <Input label={tr('Company / service center ka reference')} required value={ref} onChange={(e) => setRef(e.target.value)} maxLength={80} placeholder={tr('Job # / ticket #')} hint={tr('Company se pochhne ke liye yahi number')} data-autofocus />
        <Textarea label={tr('Company ka jawab')} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} placeholder={tr('Panel aayega, 10 din')} hint={tr('Marzi hai')} />
      </div>
    </Modal>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 sm:block"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>;
}
