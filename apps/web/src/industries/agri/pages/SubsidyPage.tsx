/**
 * Government subsidy claims (Kissan card, fertilizer and seed schemes).
 * The farmer pays the reduced price; the shop claims the subsidy part
 * from the scheme and tracks it: Baqi → Manzoor → Paisa mil gaya, or Radd.
 */

import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, Banknote, CheckCircle2, Clock, Download, FileCheck2, GraduationCap, Landmark, ListChecks, Plus, ShieldCheck, XCircle,
} from 'lucide-react';
import {
  Button, Checkbox, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Textarea, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { Farmer } from '../api/farmers.api';
import { subsidyApi, type ClaimInput, type SubsidyClaim } from '../api/subsidy.api';
import { FarmerPick } from '../components/FarmerPick';
import { Pager } from '../components/Pager';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { CLAIM_STATUS, amountInput, cnicOk, daysTo, errorText, formatCnic, qty, shortDate, isoDay } from '../lib/meta';
import { t } from '@core/i18n';

type Status = 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED';
type View = Status | 'all' | 'analytics';
const KEY = 'agri-subsidy';
const SCHEMES = ['Kissan Card', 'DAP subsidy', 'Urea subsidy', 'Beej subsidy', 'Spray subsidy', 'Machinery scheme'];
const DOCS = ['CNIC copy', 'Fard / zameen ka record', 'Kissan card', 'Bill ki copy', 'Scheme voucher'];

const who = (c: SubsidyClaim) => c.farmer?.fullName ?? t('Farmer');
const age = (c: SubsidyClaim) => -(daysTo(c.createdAt) ?? 0);

function claimDoc(c: SubsidyClaim, money: (n: number) => string): PrintDoc {
  return {
    title: `Subsidy claim ${c.claimNumber}`,
    subtitle: [who(c), c.farmerCnic, c.farmer?.village].filter(Boolean).join(' · '),
    meta: [['Date', shortDate(c.createdAt)], ['Status', CLAIM_STATUS[c.status]?.label ?? c.status]],
    sections: [
      { kind: 'rows', rows: [
        { label: 'Scheme', value: [c.schemeName, c.govtScheme].filter(Boolean).join(' · ') },
        { label: 'Maal', value: `${c.productType} × ${qty(c.quantity)}` },
        ...(c.cropTarget ? [{ label: 'Fasal', value: c.cropTarget }] : []),
        ...(c.landAreaAcres ? [{ label: 'Zameen', value: `${c.landAreaAcres} acre` }] : []),
        { label: 'Asal price', value: money(c.originalPrice) },
        { label: 'Subsidy', value: money(c.subsidyAmount), strong: true },
        { label: 'Farmer ne diya', value: money(c.finalPrice) },
      ] },
      ...(c.documentsSubmitted.length ? [{ kind: 'text' as const, title: 'Kagzaat', text: c.documentsSubmitted.join(', ') }] : []),
    ],
  };
}

export default function SubsidyPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.AGRI_ORDERS_MANAGE);
  const [params, setParams] = useSearchParams();
  const farmerId = params.get('farmer') ?? undefined;
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>(farmerId ? 'all' : 'PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<SubsidyClaim | null>(null);
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search.trim());
  const status = view === 'all' || view === 'analytics' ? undefined : view;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [KEY, q, status, farmerId, page],
    queryFn: () => subsidyApi.page({ search: q || undefined, status, farmerId, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
  usePageKeys(searchRef, canManage ? { n: () => setAdding(true) } : {});
  const rows = data?.items ?? [];
  const c = data?.counts ?? {};
  const amt = data?.amounts ?? {};
  const total = Object.values(c).reduce((a, n) => a + n, 0);
  const owed = (amt.PENDING ?? 0) + (amt.APPROVED ?? 0);
  const setTab = (v: View) => { setView(v); setPage(1); };

  const exportCsv = () => {
    if (!rows.length) { toast.error(t('Is list me koi claim nahi')); return; }
    downloadCsv('subsidy-claims.csv', [
      [t('Claim'), t('Date'), t('Farmer'), 'CNIC', t('Scheme'), t('Maal'), t('Qty'), t('Asal price'), t('Subsidy'), t('Farmer ne diya'), t('Status'), t('Manzoori'), t('Paisa mila'), t('Radd wajah')],
      ...rows.map((x) => [x.claimNumber, isoDay(x.createdAt), who(x), x.farmerCnic, x.schemeName, x.productType, x.quantity, x.originalPrice, x.subsidyAmount, x.finalPrice, CLAIM_STATUS[x.status]?.label, isoDay(x.approvalDate), isoDay(x.disbursementDate), x.rejectionReason]),
    ]);
  };
  const listDoc = (): PrintDoc => ({
    title: 'Subsidy claims', subtitle: status ? CLAIM_STATUS[status].label : 'Sab',
    meta: [['Sarkar se lena', money(owed)], ['Mil gaya', money(amt.DISBURSED ?? 0)]],
    sections: [{ kind: 'table', columns: [{ label: 'Claim' }, { label: 'Farmer' }, { label: 'Scheme', wideOnly: true }, { label: 'Subsidy', align: 'right' }, { label: 'Status' }], rows: rows.map((x) => [x.claimNumber, who(x), x.schemeName, money(x.subsidyAmount), CLAIM_STATUS[x.status]?.label ?? x.status]) }],
  });

  const chips = (search.trim() || farmerId) ? (
    <>
      {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
      {farmerId && <FilterChip onRemove={() => { params.delete('farmer'); setParams(params); }}>{t('Ek farmer')}</FilterChip>}
    </>
  ) : undefined;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Subsidy claims — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: t('Claim likhein'), text: t('Farmer, scheme, maal, asal price aur subsidy likhein. Farmer sirf baqi price deta hai.') },
            { icon: FileCheck2, color: '#16a34a', title: t('Kagzaat'), text: t('CNIC, fard, Kissan card — jo jama hue un par nishan lagayein. CNIC farmer ke record se aata hai.') },
            { icon: ShieldCheck, color: '#7c3aed', title: t('Manzoor / Radd'), text: t('Mahkama manzoor kare to "Manzoor", mana kare to wajah likh kar "Radd".') },
            { icon: Banknote, color: '#d97706', title: t('Paisa mil gaya'), text: t('Sarkar se paisa aaye to "Paisa mil gaya" dabayein. Ye sirf claim ka record hai — ye paisa abhi reports me nahi jata.') },
          ]}
          shortcuts={[['/', 'search'], ['N', t('naya claim')], ['G', 'guide']]} />
      )}

      <PageHero title={t('Govt subsidy claims')} chip={`${c.PENDING ?? 0} baqi`} busy={isFetching && !isLoading} loading={isLoading}
        meta={t('Kissan card, khaad aur beej ki subsidy — sarkar se kitna lena hai')}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{t('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={listDoc} label={t('Print')} /></span>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />{t('Naya claim')}</button>}
        </>}
        stats={[
          { label: t('Sarkar se lena'), value: money(owed) },
          { label: t('Mil gaya'), value: money(amt.DISBURSED ?? 0) },
          { label: t('Radd'), value: money(amt.REJECTED ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Clock} color="#d97706" label={t('Baqi')} value={c.PENDING ?? 0} onClick={() => setTab('PENDING')} active={view === 'PENDING'} />
            <KpiCard icon={ShieldCheck} color="#2563eb" label={t('Manzoor')} value={c.APPROVED ?? 0} onClick={() => setTab('APPROVED')} active={view === 'APPROVED'} />
            <KpiCard icon={Banknote} color="#16a34a" label={t('Paisa mil gaya')} value={c.DISBURSED ?? 0} onClick={() => setTab('DISBURSED')} active={view === 'DISBURSED'} />
            <KpiCard icon={XCircle} color="#e11d48" label={t('Radd')} value={c.REJECTED ?? 0} onClick={() => setTab('REJECTED')} active={view === 'REJECTED'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('Claim number, farmer, CNIC, scheme ya maal…')} />}
        chips={chips} onClear={() => { setSearch(''); if (farmerId) { params.delete('farmer'); setParams(params); } }} />

      <ViewTabs value={view} onChange={setTab} tabs={[
        { id: 'PENDING', label: t('Baqi'), icon: Clock, count: c.PENDING ?? 0 },
        { id: 'APPROVED', label: t('Manzoor'), icon: ShieldCheck, count: c.APPROVED ?? 0 },
        { id: 'DISBURSED', label: t('Mil gaya'), icon: Banknote, count: c.DISBURSED ?? 0 },
        { id: 'REJECTED', label: t('Radd'), icon: XCircle, count: c.REJECTED ?? 0 },
        { id: 'all', label: t('Sab'), icon: ListChecks, count: total },
        { id: 'analytics', label: t('Analytics'), icon: BarChart3 },
      ]} />

      {view === 'analytics' ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">{t('Scheme ke hisaab se subsidy')}</h3>
          {(data?.analytics.schemes ?? []).length === 0 ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">{t('Abhi koi claim nahi')}</p> : (() => {
            const list = data!.analytics.schemes;
            const max = Math.max(1, ...list.map((x) => x.amount));
            return (
              <ul className="space-y-2">{list.map((x) => (
                <li key={x.scheme} className="text-[0.8125rem]">
                  <div className="flex justify-between"><span className="font-medium text-slate-700">{t('{{scheme}} · {{claims}} claim', { scheme: x.scheme, claims: x.claims })}</span><span className="tabular-nums text-slate-600">{money(x.amount)}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(x.amount / max) * 100}%` }} /></div>
                </li>
              ))}</ul>
            );
          })()}
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : rows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Landmark className="h-7 w-7" /></span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? t('Is search me koi claim nahi') : t('Is list me koi claim nahi')}</h3>
                <p className="mt-1 text-[0.875rem] text-slate-500">{t('Subsidy par maal diya ho to claim yahan likhein — sarkar se lena yaad rahega.')}</p>
                {canManage && <Button className="mt-4" onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>{t('Naya claim')}</Button>}
              </div>
            ) : (
              <>
                <Table minWidth="56rem">
                  <THead><Tr><Th>{t('Claim')}</Th><Th>{t('Farmer')}</Th><Th>{t('Scheme / maal')}</Th><Th align="right">{t('Subsidy')}</Th><Th>{t('Status')}</Th></Tr></THead>
                  <TBody>{rows.map((x) => (
                    <Tr key={x.id} interactive onClick={() => setOpen(x)}>
                      <Td><p className="font-semibold text-slate-900">{x.claimNumber}</p><p className="text-[0.75rem] text-slate-500">{shortDate(x.createdAt)}</p></Td>
                      <Td><p className="font-medium text-slate-900">{who(x)}</p><p className="text-[0.75rem] text-slate-500">{[x.farmerCnic, x.farmer?.village].filter(Boolean).join(' · ')}</p></Td>
                      <Td><p className="text-slate-800">{x.schemeName}</p><p className="text-[0.75rem] text-slate-500">{x.productType} × {qty(x.quantity)}</p></Td>
                      <Td align="right"><p className="font-bold">{money(x.subsidyAmount)}</p><p className="text-[0.75rem] text-slate-500">{t('farmer ne diya {{finalPrice}}', { finalPrice: money(x.finalPrice) })}</p></Td>
                      <Td>
                        <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', CLAIM_STATUS[x.status]?.tone)}>{CLAIM_STATUS[x.status]?.label ?? x.status}</span>
                        {(x.status === 'PENDING' || x.status === 'APPROVED') && <p className={cn('mt-1 text-[0.6875rem]', age(x) > 60 ? 'font-semibold text-rose-700' : 'text-slate-500')}>{t('{{age}} din se', { age: age(x) })}</p>}
                      </Td>
                    </Tr>
                  ))}</TBody>
                </Table>
                <Pager page={data?.page ?? 1} limit={data?.limit ?? 25} total={data?.total ?? 0} onPage={setPage} />
              </>
            )}
        </section>
      )}

      {open && <ClaimModal claim={open} canManage={canManage} money={money} onClose={() => setOpen(null)} onChanged={(x) => { setOpen({ ...open, ...x }); qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['subsidy-claims-all'] }); }} />}
      {adding && <ClaimForm money={money} onClose={() => setAdding(false)} onSaved={(x) => { setAdding(false); setOpen(x); qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['subsidy-claims-all'] }); }} />}
    </PageShell>
  );
}

const STEPS: Status[] = ['PENDING', 'APPROVED', 'DISBURSED'];

function ClaimModal({ claim: x, canManage, money, onClose, onChanged }: {
  claim: SubsidyClaim; canManage: boolean; money: (n: number) => string; onClose: () => void; onChanged: (x: SubsidyClaim) => void;
}) {
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const act = useMutation({
    mutationFn: (v: 'approve' | 'disburse' | 'reject') => (v === 'approve' ? subsidyApi.approve(x.id, approvedBy.trim() || undefined) : v === 'disburse' ? subsidyApi.disburse(x.id) : subsidyApi.reject(x.id, reason.trim())),
    onSuccess: (r, v) => { onChanged(r); setReject(false); toast.success(v === 'approve' ? t('Claim manzoor') : v === 'disburse' ? t('Paisa mil gaya — record ho gaya') : t('Claim radd')); },
    onError: (e) => toast.error(errorText(e, t('Status nahi badla'))),
  });
  const at = STEPS.indexOf(x.status as Status);

  return (
    <Modal open onClose={onClose} size="lg" title={`${x.claimNumber} · ${who(x)}`} description={[x.farmerCnic, x.farmer?.phone, x.farmer?.village].filter(Boolean).join(' · ')}
      footer={<>
        <span className="me-auto"><PrintButton doc={() => claimDoc(x, money)} label={t('Print')} /></span>
        {canManage && (x.status === 'PENDING' || x.status === 'APPROVED') && <Button variant="ghost" onClick={() => setReject(true)} leftIcon={<XCircle className="h-4 w-4" />}>{t('Radd')}</Button>}
        {canManage && x.status === 'PENDING' && <Button loading={act.isPending} onClick={() => act.mutate('approve')} leftIcon={<ShieldCheck className="h-4 w-4" />}>{t('Manzoor')}</Button>}
        {canManage && x.status === 'APPROVED' && <Button loading={act.isPending} onClick={() => act.mutate('disburse')} leftIcon={<Banknote className="h-4 w-4" />}>{t('Paisa mil gaya')}</Button>}
      </>}>
      <div className="space-y-4">
        {x.status === 'REJECTED' ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.875rem] text-rose-800"><span className="font-semibold">{t('Radd:')}{' '} </span>{x.rejectionReason || '—'}</p>
        ) : (
          <ol className="flex items-center gap-2">{STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold', i <= at ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')}>{i < at || x.status === 'DISBURSED' ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</span>
              <span className={cn('text-[0.8125rem]', i <= at ? 'font-semibold text-slate-900' : 'text-slate-500')}>{CLAIM_STATUS[s].label}</span>
              {i < STEPS.length - 1 && <span className={cn('h-px flex-1', i < at ? 'bg-emerald-400' : 'bg-slate-200')} />}
            </li>
          ))}</ol>
        )}
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
          {([
            [t('Scheme'), [x.schemeName, x.govtScheme].filter(Boolean).join(' · ')], [t('Maal'), `${x.productType} × ${qty(x.quantity)}`], [t('Fasal'), x.cropTarget ?? ''],
            [t('Zameen'), x.landAreaAcres ? `${x.landAreaAcres} acre` : ''], [t('Claim date'), shortDate(x.createdAt)],
            [t('Manzoori'), x.approvalDate ? `${shortDate(x.approvalDate)}${x.approvedBy ? ` · ${x.approvedBy}` : ''}` : ''], [t('Paisa mila'), x.disbursementDate ? shortDate(x.disbursementDate) : ''],
          ] as Array<[string, string]>).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="text-[0.875rem] font-medium text-slate-800">{v}</dd></div>)}
        </dl>
        <dl className="ms-auto max-w-xs space-y-1 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-slate-500">{t('Asal price')}</dt><dd className="tabular-nums">{money(x.originalPrice)}</dd></div>
          <div className="flex justify-between font-bold text-sky-800"><dt>{t('Subsidy (sarkar se)')}</dt><dd className="tabular-nums">{money(x.subsidyAmount)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-1"><dt className="text-slate-500">{t('Farmer ne diya')}</dt><dd className="tabular-nums">{money(x.finalPrice)}</dd></div>
        </dl>
        {x.documentsSubmitted.length > 0 && <div className="flex flex-wrap gap-1.5">{x.documentsSubmitted.map((d) => <span key={d} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[0.75rem] font-medium text-emerald-800"><FileCheck2 className="h-3.5 w-3.5" />{d}</span>)}</div>}
        {x.notes && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{x.notes}</p>}
        {canManage && x.status === 'PENDING' && <Input label={t('Manzoor kis ne kiya')} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder={t('Agri officer / bank ka naam')} hint={t('Marzi hai — manzoor karne se pehle likhein')} />}
      </div>
      {reject && (
        <Modal open onClose={() => setReject(false)} size="sm" title={t('Claim radd karein?')} description={t('Radd claim wapas nahi khulta — zaroorat ho to naya claim likhein.')}
          footer={<><Button variant="secondary" onClick={() => setReject(false)}>{t('Wapas')}</Button><Button variant="danger" disabled={!reason.trim()} loading={act.isPending} onClick={() => act.mutate('reject')}>{t('Radd karein')}</Button></>}>
          <Input label={t('Wajah')} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Kagzaat poore nahi, scheme khatam…')} data-autofocus />
        </Modal>
      )}
    </Modal>
  );
}

interface Draft { farmer: Farmer | null; schemeName: string; govtScheme: string; productType: string; quantity: string; originalPrice: string; subsidyAmount: string; farmerCnic: string; cropTarget: string; landAreaAcres: string; docs: string[]; notes: string }

function ClaimForm({ money, onClose, onSaved }: { money: (n: number) => string; onClose: () => void; onSaved: (x: SubsidyClaim) => void }) {
  const [d, setD] = useState<Draft>({ farmer: null, schemeName: '', govtScheme: '', productType: '', quantity: '1', originalPrice: '', subsidyAmount: '', farmerCnic: '', cropTarget: '', landAreaAcres: '', docs: [], notes: '' });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const price = Number(d.originalPrice) || 0;
  const sub = Number(d.subsidyAmount) || 0;
  const errors = useMemo(() => {
    const e: Partial<Record<keyof Draft, string>> = {};
    if (!d.farmer) e.farmer = t('Farmer chunein');
    if (!d.schemeName.trim()) e.schemeName = t('Scheme ka naam likhein');
    if (!d.productType.trim()) e.productType = t('Kaunsa maal (DAP, beej…) likhein');
    if (!(Number(d.quantity) > 0)) e.quantity = t('Quantity 0 se zyada likhein');
    if (!(price > 0)) e.originalPrice = t('Asal price likhein');
    if (!(sub > 0)) e.subsidyAmount = t('Subsidy amount likhein');
    else if (sub > price) e.subsidyAmount = t('Subsidy asal price se zyada nahi ho sakti');
    if (!cnicOk(d.farmerCnic || d.farmer?.cnic || '')) e.farmerCnic = t('CNIC 13 hindsay ka hota hai');
    return e;
  }, [d, price, sub]);
  const show = (k: keyof Draft) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const body: ClaimInput = {
        farmerId: d.farmer!.id, schemeName: d.schemeName.trim(), govtScheme: d.govtScheme.trim() || undefined, productType: d.productType.trim(),
        quantity: Number(d.quantity), originalPrice: price, subsidyAmount: sub, farmerCnic: d.farmerCnic.trim() || undefined,
        cropTarget: d.cropTarget.trim() || undefined, landAreaAcres: Number(d.landAreaAcres) || undefined, documentsSubmitted: d.docs, notes: d.notes.trim() || undefined,
      };
      return subsidyApi.create(body);
    },
    onSuccess: (x) => { toast.success(t('Claim {{claimNumber}} likh liya', { claimNumber: x.claimNumber })); onSaved({ ...x, farmer: d.farmer ? { id: d.farmer.id, fullName: d.farmer.fullName, phone: d.farmer.phone, village: d.farmer.village ?? null } : null }); },
    onError: (e) => toast.error(errorText(e, t('Claim nahi bana'))),
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    if (!save.isPending) save.mutate();
  };
  useSaveKey(submit);

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false} title={t('Naya subsidy claim')} description={t('Ctrl+S se save')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button><Button loading={save.isPending} onClick={submit}>{t('Save')}</Button></>}>
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Farmer')}{' '} <span className="text-rose-600">*</span></span>
          <FarmerPick value={d.farmer} onChange={(f) => setD((p) => ({ ...p, farmer: f, farmerCnic: f?.cnic ?? '', landAreaAcres: f?.landAreaAcres ? String(f.landAreaAcres) : p.landAreaAcres }))} error={show('farmer')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Scheme')} required list="agri-schemes" value={d.schemeName} onChange={(e) => set('schemeName', e.target.value)} placeholder={t('Kissan Card')} error={show('schemeName')} hint={t('List se chunein ya likhein')} />
          <datalist id="agri-schemes">{SCHEMES.map((x) => <option key={x} value={x} />)}</datalist>
          <Input label={t('Mahkama / bank')} value={d.govtScheme} onChange={(e) => set('govtScheme', e.target.value)} placeholder={t('Punjab Agriculture, Bank of Punjab')} hint={t('Marzi hai')} />
          <Input label={t('Maal')} required value={d.productType} onChange={(e) => set('productType', e.target.value)} placeholder={t('DAP 50 kg')} error={show('productType')} />
          <Input label={t('Quantity')} required inputMode="decimal" value={d.quantity} onChange={(e) => set('quantity', amountInput(e.target.value))} error={show('quantity')} hint={t('Kitni boriyan / packet')} />
          <Input label={t('Kul asal price')} required inputMode="decimal" value={d.originalPrice} onChange={(e) => set('originalPrice', amountInput(e.target.value))} placeholder="28000" error={show('originalPrice')} hint={t('Subsidy se pehle poori price')} />
          <Input label={t('Subsidy amount')} required inputMode="decimal" value={d.subsidyAmount} onChange={(e) => set('subsidyAmount', amountInput(e.target.value))} placeholder="4000" error={show('subsidyAmount')} hint={price > 0 && sub > 0 && sub <= price ? t('Farmer dega {{value}}', { value: money(price - sub) }) : t('Jo sarkar se lena hai')} />
          <Input label={t('CNIC')} inputMode="numeric" value={d.farmerCnic} onChange={(e) => set('farmerCnic', formatCnic(e.target.value))} placeholder="35202-1234567-1" error={show('farmerCnic')} hint={t('Farmer ke record se aata hai')} />
          <Input label={t('Fasal')} value={d.cropTarget} onChange={(e) => set('cropTarget', e.target.value)} placeholder={t('Gandum')} />
          <Input label={t('Zameen (acre)')} inputMode="decimal" value={d.landAreaAcres} onChange={(e) => set('landAreaAcres', amountInput(e.target.value))} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Jama kiye kagzaat')}</span>
          <div className="grid gap-1.5 sm:grid-cols-2">{DOCS.map((doc) => (
            <Checkbox key={doc} label={doc} checked={d.docs.includes(doc)} onChange={(e) => set('docs', e.target.checked ? [...d.docs, doc] : d.docs.filter((x) => x !== doc))} />
          ))}</div>
        </div>
        <Textarea label={t('Note')} rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} hint={t('Marzi hai')} />
      </div>
    </Modal>
  );
}
