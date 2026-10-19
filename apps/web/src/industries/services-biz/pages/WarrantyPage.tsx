/**
 * Warranty: jobs whose work warranty is still running (with days left),
 * and claims when a customer comes back with the same fault. An approved
 * repair or replacement opens a free job for the same technician; its
 * parts' cost shows as the claim's cost in profit.
 *
 * Keys: 1 register · 2 claims · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ClipboardList, Download, GraduationCap, ListChecks, Plus, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Textarea, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { warrantyApi, type ClaimStatus, type Resolution, type WarrantyClaim, type WarrantyJob } from '../api/warranty.api';
import { JOB_KEY, TONES, WARRANTY_KEY, apiError, dayOnly, daysTo, itemName } from '../components/meta';

type Tab = 'register' | 'claims';
const CLAIM: Record<ClaimStatus, { label: string; tone: string }> = {
  SUBMITTED: { label: 'Faisla baqi', tone: TONES.amber }, APPROVED: { label: 'Manzoor', tone: TONES.blue }, IN_PROGRESS: { label: 'Kaam chal raha', tone: TONES.violet },
  RESOLVED: { label: 'Hal ho gaya', tone: TONES.green }, REJECTED: { label: 'Mana', tone: TONES.rose },
};
const RESOLUTIONS: Array<{ value: Resolution; label: string }> = [
  { value: 'REPAIR', label: 'Muft marammat (job banegi)' }, { value: 'REPLACE', label: 'Part badalna (job banegi)' },
  { value: 'REFUND', label: 'Paisa wapas (Sales → Return)' }, { value: 'NO_FAULT', label: 'Koi kharabi nahi nikli' },
];

export default function WarrantyPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.ELECTRONICS_WARRANTY_MANAGE);
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'register');
  const [search, setSearch] = useState('');
  const [claimFor, setClaimFor] = useState<WarrantyJob | null>(null);
  const [issue, setIssue] = useState('');
  const [deciding, setDeciding] = useState<{ claim: WarrantyClaim; approve: boolean } | null>(null);
  const [resolution, setResolution] = useState<Resolution>('REPAIR');
  const [note, setNote] = useState('');

  const regQ = useQuery({ queryKey: [WARRANTY_KEY, 'register'], queryFn: () => warrantyApi.register() });
  const claimsQ = useQuery({ queryKey: [WARRANTY_KEY, 'claims'], queryFn: () => warrantyApi.claims() });
  const reg = regQ.data ?? [];
  const claims = claimsQ.data ?? [];

  // The job page opens this with ?claim=<jobId>.
  useEffect(() => {
    const jid = params.get('claim');
    const job = jid ? reg.find((j) => j.id === jid) : undefined;
    if (job) { setClaimFor(job); setIssue(''); const n = new URLSearchParams(params); n.delete('claim'); setParams(n, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regQ.data]);

  const w = search.trim().toLowerCase();
  const regRows = useMemo(() => reg.filter((j) => !w || `${j.jobNumber} ${j.customerName ?? ''} ${j.customerPhone ?? ''} ${j.serialNumber ?? ''} ${j.brand ?? ''}`.toLowerCase().includes(w)), [reg, w]);
  const claimRows = useMemo(() => claims.filter((c) => !w || `${c.claimNumber} ${c.customerName} ${c.customerPhone}`.toLowerCase().includes(w)), [claims, w]);
  const live = reg.filter((j) => (daysTo(j.jobWarrantyExpiryDate) ?? -1) >= 0);
  const soon = live.filter((j) => (daysTo(j.jobWarrantyExpiryDate) ?? 99) <= 7);
  const open = claims.filter((c) => ['SUBMITTED', 'APPROVED', 'IN_PROGRESS'].includes(c.status));
  const cost = claims.reduce((s, c) => s + (c.costToCompany || 0), 0);

  const refresh = () => [WARRANTY_KEY, JOB_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const create = useMutation({
    mutationFn: () => warrantyApi.create({ originalJobId: claimFor!.id, issueDescription: issue.trim() }),
    onSuccess: (c) => { toast.success(`Claim ${c.claimNumber} darj`); refresh(); setClaimFor(null); setTab('claims'); },
    onError: (e) => toast.error(apiError(e, 'Claim nahi bana')),
  });
  const decide = useMutation({
    mutationFn: () => (deciding!.approve ? warrantyApi.approve(deciding!.claim.id, resolution, note.trim() || undefined) : warrantyApi.reject(deciding!.claim.id, note.trim())),
    onSuccess: (c) => { toast.success(c.newJob ? `Manzoor — job ${c.newJob.jobNumber} ban gayi` : deciding!.approve ? 'Manzoor' : 'Mana kar diya'); refresh(); setDeciding(null); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('register');
      if (e.key === '2') setTab('claims');
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const exportCsv = () => (tab === 'register'
    ? downloadCsv('warranty-register.csv', [['Job', 'Kaam', 'Customer', 'Phone', 'Cheez', 'Mukammal', 'Warranty (din)', 'Kab tak', 'Shartein'],
      ...regRows.map((j) => [j.jobNumber, j.serviceName, j.customerName ?? '', j.customerPhone ?? '', itemName(j), dayOnly(j.completedAt), j.jobWarrantyDays, dayOnly(j.jobWarrantyExpiryDate), j.jobWarrantyTerms ?? ''])])
    : downloadCsv('warranty-claims.csv', [['Claim', 'Date', 'Customer', 'Phone', 'Shikayat', 'Asal job', 'Nayi job', 'Halat', 'Faisla', 'Cost'],
      ...claimRows.map((c) => [c.claimNumber, dayOnly(c.claimDate), c.customerName, c.customerPhone, c.issueDescription, c.originalJob?.jobNumber ?? '', c.newJob?.jobNumber ?? '', CLAIM[c.status].label, c.resolutionType ?? c.rejectionReason ?? '', c.costToCompany])]));

  return (
    <PageShell>
      <PageHero
        title="Warranty"
        chip={<><ShieldCheck /> Kaam ki warranty</>}
        meta="Kis kaam ki warranty chal rahi hai, aur shikayat aaye to muft kaam ka hisaab"
        loading={regQ.isLoading}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setTab('register')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> Claim</button>}
        </>}
        stats={[{ label: 'Warranty chal rahi', value: live.length }, { label: 'Khule claim', value: open.length }, { label: 'Warranty ka Cost', value: formatPKR(cost) }]}
      />
      <KpiRow cols={4}>
        {regQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShieldCheck} color="#16a34a" label="Warranty chal rahi" value={live.length} onClick={() => setTab('register')} active={tab === 'register'} />
          <KpiCard icon={ShieldAlert} color={soon.length ? '#d97706' : '#64748b'} label="7 din me khatam" value={soon.length} />
          <KpiCard icon={ClipboardList} color={open.length ? '#7c3aed' : '#64748b'} label="Khule claim" value={open.length} onClick={() => setTab('claims')} active={tab === 'claims'} />
          <KpiCard icon={XCircle} color="#e11d48" label="Warranty ka Cost" value={formatPKR(cost)} hint="Muft kaam me lage parts" />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Job / claim #, customer, phone, serial…" label="Search" />} />
      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>-<Kbd>2</Kbd> tabs · <Kbd>/</Kbd> search</>}
        tabs={[{ id: 'register', label: 'Register', icon: ListChecks, count: regRows.length }, { id: 'claims', label: 'Claims', icon: ClipboardList, count: claimRows.length }]} />

      {tab === 'register' ? (regQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : !regRows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><ShieldCheck className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-900">Kisi job ki warranty nahi chal rahi</p><p className="mt-1 text-sm text-slate-500">Bill banate waqt warranty ke din likhein — job yahan aa jayegi.</p></div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {regRows.map((j) => {
            const left = daysTo(j.jobWarrantyExpiryDate) ?? -1;
            return (
              <li key={j.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', left < 0 ? 'bg-slate-100 text-slate-400' : left <= 7 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}><ShieldCheck className="h-5 w-5" /></span>
                <Link to={`/services-biz/jobs/${j.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{j.serviceName} <span className="font-mono text-[0.6875rem] font-normal text-slate-400">{j.jobNumber}</span></span>
                  <span className="block truncate text-[0.8125rem] text-slate-600">{[j.customerName, j.customerPhone, itemName(j)].filter(Boolean).join(' · ')}</span>
                  <span className="text-[0.75rem] text-slate-500">{left < 0 ? `Khatam ${dayOnly(j.jobWarrantyExpiryDate)}` : `${dayOnly(j.jobWarrantyExpiryDate)} tak · ${left} din baqi`}</span>
                </Link>
                {canManage && left >= 0 && <Button size="sm" variant="secondary" onClick={() => { setClaimFor(j); setIssue(''); }}>Claim</Button>}
              </li>
            );
          })}
        </ul>
      )) : (claimsQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : !claimRows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><ClipboardList className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-900">Koi claim nahi</p><p className="mt-1 text-sm text-slate-500">Customer shikayat le kar aaye to Register se us ki job par "Claim" dabayein.</p></div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {claimRows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start gap-3 px-3 py-3 sm:px-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><ClipboardList className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-semibold text-slate-900">{c.customerName}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', CLAIM[c.status].tone)}>{CLAIM[c.status].label}</span>
                  <span className="font-mono text-[0.6875rem] text-slate-400">{c.claimNumber}</span>
                </div>
                <p className="mt-0.5 text-[0.8125rem] text-slate-600">{c.issueDescription}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-[0.75rem] text-slate-500">
                  <span>{dayOnly(c.claimDate)}</span>
                  {c.originalJob && <Link to={`/services-biz/jobs/${c.originalJob.id}`} className="text-brand-700 hover:underline">Asal: {c.originalJob.jobNumber}</Link>}
                  {c.newJob && <Link to={`/services-biz/jobs/${c.newJob.id}`} className="text-brand-700 hover:underline">Muft job: {c.newJob.jobNumber}</Link>}
                  {c.costToCompany > 0 && <span>Cost {formatPKR(c.costToCompany)}</span>}
                  {c.rejectionReason && <span>Mana: {c.rejectionReason}</span>}
                </p>
              </div>
              {canManage && c.status === 'SUBMITTED' && (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => { setNote(''); setDeciding({ claim: c, approve: false }); }}>Mana</Button>
                  <Button size="sm" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => { setNote(''); setResolution('REPAIR'); setDeciding({ claim: c, approve: true }); }}>Manzoor</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ))}

      {claimFor && (
        <Modal open onClose={() => setClaimFor(null)} size="sm" title={`Warranty claim — ${claimFor.jobNumber}`} description={`${claimFor.serviceName} · ${dayOnly(claimFor.jobWarrantyExpiryDate)} tak`}
          footer={<><Button variant="secondary" onClick={() => setClaimFor(null)}>Rehne dein</Button><Button disabled={issue.trim().length < 3} loading={create.isPending} onClick={() => create.mutate()}>Claim darj karein</Button></>}>
          <Textarea label="Customer ki shikayat" required rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} autoFocus placeholder="Do din baad phir se band ho gaya" />
        </Modal>
      )}
      {deciding && (
        <Modal open onClose={() => setDeciding(null)} size="sm" title={deciding.approve ? `Manzoor — ${deciding.claim.claimNumber}` : `Mana — ${deciding.claim.claimNumber}`}
          description={deciding.approve ? 'Marammat ya badalne par isi technician ke naam muft job banti hai' : 'Customer ko wajah batayein'}
          footer={<><Button variant="secondary" onClick={() => setDeciding(null)}>Rehne dein</Button><Button variant={deciding.approve ? 'primary' : 'danger'} disabled={!deciding.approve && note.trim().length < 3} loading={decide.isPending} onClick={() => decide.mutate()}>{deciding.approve ? 'Manzoor' : 'Mana karein'}</Button></>}>
          <div className="space-y-3">
            {deciding.approve && <Select label="Kya karenge" value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} options={RESOLUTIONS} />}
            <Input label={deciding.approve ? 'Note' : 'Wajah'} required={!deciding.approve} value={note} onChange={(e) => setNote(e.target.value)} placeholder={deciding.approve ? 'Marzi hai' : 'Customer ki ghalti se toota'} />
          </div>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Warranty — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ShieldCheck, color: '#16a34a', title: 'Register', text: 'Bill par jitne din ki warranty likhi, job yahan us din tak rehti hai. Customer aaye to number ya phone se dhoondein.' },
            { icon: ClipboardList, color: '#7c3aed', title: 'Claim', text: 'Job par "Claim" — shikayat likhein. Manzoor karte hi muft job isi technician ko jati hai.' },
            { icon: XCircle, color: '#e11d48', title: 'Cost', text: 'Muft job me dukaan ka part laga to us ka Cost profit me minus hota hai — yahan har claim ka Cost dikhta hai.' },
          ]}
          tips={['Warranty sambhalne ke liye "Warranty manage" ki permission chahiye.']}
          shortcuts={[['1', 'register'], ['2', 'claims'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
