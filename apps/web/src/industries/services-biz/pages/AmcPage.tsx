/**
 * AMC contracts: yearly maintenance for a customer's machines — visits
 * done and due, money still owed on the fee, and contracts ending soon.
 * Each visit becomes a job card; billing that job marks the visit done.
 *
 * Keys: N new contract · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, Ban, Briefcase, CalendarClock, CheckCircle2, Download, Filter, GraduationCap, MessageCircle, Plus, RefreshCw, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { TakePaymentModal } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { amcApi, type AmcContract, type AmcInput, type AmcStatus } from '../api/amc.api';
import { AmcModal } from '../components/AmcModal';
import { AMC_KEY, JOB_KEY, MONEY_KEYS, TONES, apiError, dayOnly, daysTo, statusOf, waLink } from '../components/meta';
import { t } from '@core/i18n';

const STATUS: Record<AmcStatus, { label: string; tone: string }> = {
  ACTIVE: { label: t('Chaalu'), tone: TONES.green }, RENEWAL_DUE: { label: t('Renew karna hai'), tone: TONES.amber }, EXPIRED: { label: t('Khatam'), tone: TONES.slate },
  CANCELLED: { label: t('Cancel'), tone: TONES.rose }, SUSPENDED: { label: t('Ruka hua'), tone: TONES.slate },
};
type Show = 'ACTIVE' | 'ENDING' | 'EXPIRED' | 'CANCELLED' | 'ALL';

export default function AmcPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales } = useMasked();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const canMoney = usePermission(PERMISSIONS.POS_USE);
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState<Show>('ACTIVE');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const openId = params.get('open');
  const setOpen = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set('open', id); else n.delete('open'); setParams(n, { replace: true }); };

  const listQ = useQuery({ queryKey: [AMC_KEY, 'all'], queryFn: () => amcApi.list() });
  const all = listQ.data ?? [];
  const ending = (a: AmcContract) => ['ACTIVE', 'RENEWAL_DUE'].includes(a.status) && (daysTo(a.endDate) ?? 99) <= 30 && (daysTo(a.endDate) ?? 0) >= 0;
  const rows = useMemo(() => {
    const w = search.trim().toLowerCase();
    return all.filter((a) => (show === 'ALL' || (show === 'ENDING' ? ending(a) : show === 'ACTIVE' ? ['ACTIVE', 'RENEWAL_DUE'].includes(a.status) : a.status === show))
      && (!w || `${a.amcNumber} ${a.customerName} ${a.customerPhone} ${a.serviceAddress}`.toLowerCase().includes(w)));
  }, [all, search, show]);
  const activeAll = all.filter((a) => ['ACTIVE', 'RENEWAL_DUE'].includes(a.status));
  const visitsDue = activeAll.flatMap((a) => a.visits.filter((v) => v.status !== 'COMPLETED' && !v.serviceJobId && (daysTo(v.scheduledDate) ?? 99) <= 7));

  const create = useMutation({
    mutationFn: (v: AmcInput) => amcApi.create(v),
    onSuccess: (a) => { toast.success(t('{{amcNumber}} ban gaya{{value}}', { amcNumber: a.amcNumber, value: a.sale ? t(' — bill {{saleNumber}}', { saleNumber: a.sale.saleNumber }) : '' })); [AMC_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setCreating(false); setOpen(a.id); },
    onError: (e) => toast.error(apiError(e, t('Contract nahi bana'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage && canMoney) { e.preventDefault(); setCreating(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, canMoney]);

  const exportCsv = () => downloadCsv('amc.csv', [
    ['AMC', t('Customer'), t('Phone'), t('Pata'), t('Shuru'), t('Khatam'), t('Visits'), t('Ho chuki'), t('Baqi visits'), t('Fee'), t('Mila'), t('Halat')],
    ...rows.map((a) => [a.amcNumber, a.customerName, a.customerPhone, a.serviceAddress, dayOnly(a.startDate), dayOnly(a.endDate), a.numberOfVisits, a.visitsUsed, a.visitsRemaining, a.contractValue, a.amountPaid, STATUS[a.status].label]),
  ]);

  return (
    <PageShell>
      <PageHero
        title={t('AMC contracts')}
        chip={<><Award /> {' '}{t('Saal bhar ki service')}</>}
        meta={t('Fee aaj bill, visits saal bhar — har visit ki job, renewal se pehle yaad-dihani')}
        loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">{t('CSV')}</span></button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && canMoney && <button type="button" onClick={() => setCreating(true)} title={t('Naya (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{t('Contract')}</button>}
        </>}
        stats={[
          { label: t('Chaalu contracts'), value: activeAll.length },
          { label: t('Saal ki fee'), value: sales(activeAll.reduce((s, a) => s + a.contractValue, 0)) },
          { label: t('Fee baqi'), value: sales(activeAll.reduce((s, a) => s + Math.max(a.contractValue - a.amountPaid, 0), 0)) },
        ]}
      />
      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Award} color="#7c3aed" label={t('Chaalu')} value={activeAll.length} onClick={() => setShow('ACTIVE')} active={show === 'ACTIVE'} />
          <KpiCard icon={CalendarClock} color={visitsDue.length ? '#0284c7' : '#64748b'} label={t('Visit is hafte')} value={visitsDue.length} hint={t('Job banani hai')} />
          <KpiCard icon={RefreshCw} color={all.filter(ending).length ? '#d97706' : '#64748b'} label={t('30 din me khatam')} value={all.filter(ending).length} hint={t('Renewal ki baat karein')} onClick={() => setShow('ENDING')} active={show === 'ENDING'} />
          <KpiCard icon={Wallet} color="#e11d48" label={t('Fee udhaar')} value={sales(activeAll.reduce((s, a) => s + Math.max(a.contractValue - a.amountPaid, 0), 0))} />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('AMC #, customer, phone, pata…')} label={t('Search')} />}>
        <FilterMenu icon={Filter} label={{ ACTIVE: 'Chaalu', ENDING: '30 din me khatam', EXPIRED: 'Khatam', CANCELLED: 'Cancel', ALL: 'Sab' }[show]} value={show} active={show !== 'ACTIVE'} onChange={setShow}
          options={[{ value: 'ACTIVE' as Show, label: t('Chaalu') }, { value: 'ENDING' as Show, label: t('30 din me khatam') }, { value: 'EXPIRED' as Show, label: t('Khatam') }, { value: 'CANCELLED' as Show, label: t('Cancel') }, { value: 'ALL' as Show, label: t('Sab') }]} />
      </FilterBar>
      <ViewTabs value="list" onChange={() => undefined} hint={<>{canManage && <><Kbd>N</Kbd> {' '}{t('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{t('search')}</>} tabs={[{ id: 'list', label: t('Contracts'), icon: Award, count: rows.length }]} />

      {listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Award className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{t('Is list me koi contract nahi')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('Daftar, school, hospital — saal bhar ki AC / generator service ka contract banayein, kamai pakki hoti hai.')}</p>
          {canManage && canMoney && <Button className="mt-4" onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>{t('Contract')}</Button>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((a) => {
            const left = daysTo(a.endDate) ?? 0;
            const due = Math.max(a.contractValue - a.amountPaid, 0);
            return (
              <li key={a.id}>
                <button type="button" onClick={() => setOpen(a.id)} className="flex w-full items-start gap-3 px-3 py-3 text-start hover:bg-slate-50 sm:px-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Award className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-slate-900">{a.customerName}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', STATUS[a.status].tone)}>{STATUS[a.status].label}</span>
                      {ending(a) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200">{t('{{left}} din baqi', { left })}</span>}
                      <span className="font-mono text-[0.6875rem] text-slate-400">{a.amcNumber}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.8125rem] text-slate-600">{(a.coveredItems ?? []).join(', ') || t('Maintenance')} — {a.serviceAddress}</span>
                    <span className="mt-1 flex items-center gap-2 text-[0.75rem] text-slate-500">
                      <span className="h-1.5 w-24 rounded-full bg-slate-100"><span className="block h-1.5 rounded-full bg-violet-500" style={{ width: `${(a.visitsUsed / Math.max(a.numberOfVisits, 1)) * 100}%` }} /></span>
                      {t('{{visitsUsed}}/{{numberOfVisits}} visits · {{endDate}} tak', { visitsUsed: a.visitsUsed, numberOfVisits: a.numberOfVisits, endDate: dayOnly(a.endDate) })}
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block font-semibold tabular-nums text-slate-900">{sales(a.contractValue)}</span>
                    {due > 0 && a.status !== 'CANCELLED' && <span className="text-[0.75rem] font-medium tabular-nums text-amber-700">{t('baqi {{due}}', { due: sales(due) })}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating && <AmcModal pending={create.isPending} onSave={(v) => create.mutate(v)} onClose={() => setCreating(false)} />}
      {openId && <AmcDetail id={openId} shopName={shopName} canManage={canManage} canMoney={canMoney} onClose={() => setOpen(null)} onJob={(id) => navigate(`/services-biz/jobs/${id}`)} />}

      {guide.isOpen && (
        <PageGuide title={t('AMC — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#7c3aed', title: t('Contract'), text: t('Customer, site, kya shamil hai, saal me kitni visits aur fee. Fee aaj ka bill banti hai; jo na mile wo khata me.') },
            { icon: Briefcase, color: '#0284c7', title: t('Visit = job'), text: t('Contract kholein → visit par "Job banayein". Kaam muft ho to job ka bill 0 — parts alag lag sakte hain. Job ka bill banate hi visit mukammal.') },
            { icon: Wallet, color: '#16a34a', title: t('Baqi fee'), text: t('"Paisa lein" se baqi fee — khata me jama hoti hai, galla aur day book me aati hai.') },
            { icon: RefreshCw, color: '#d97706', title: t('Renewal'), text: t('30 din pehle "khatam" list me aata hai — WhatsApp karein aur "Renew" se naya saal shuru karein.') },
          ]}
          tips={[t('Contract ka bill Sales se void karein to contract khud cancel ho jata hai. Paisa wapas karna ho to Sales → Return.')]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function AmcDetail({ id, shopName, canManage, canMoney, onClose, onJob }: { id: string; shopName: string; canManage: boolean; canMoney: boolean; onClose: () => void; onJob: (id: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [AMC_KEY, 'one', id], queryFn: () => amcApi.getOne(id) });
  const [dialog, setDialog] = useState<null | 'pay' | 'cancel' | 'renew'>(null);
  const [reason, setReason] = useState('');
  const [renewPaid, setRenewPaid] = useState('');
  const a = q.data;
  const refresh = (money = false) => [AMC_KEY, JOB_KEY, ...(money ? MONEY_KEYS : [])].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const visitJob = useMutation({
    mutationFn: (visitId: string) => amcApi.visitJob(id, visitId),
    onSuccess: (j) => { toast.success(t('Job {{jobNumber}} ban gayi', { jobNumber: j.jobNumber })); refresh(); onJob(j.id); },
    onError: (e) => toast.error(apiError(e, t('Job nahi bani'))),
  });
  const pay = useMutation({
    mutationFn: (v: { amount: number; method: PaymentMethod }) => amcApi.pay(id, v.amount, v.method),
    onSuccess: () => { toast.success(t('Paisa mil gaya')); refresh(true); setDialog(null); },
    onError: (e) => toast.error(apiError(e, t('Nahi hua'))),
  });
  const cancel = useMutation({
    mutationFn: () => amcApi.cancel(id, reason.trim()),
    onSuccess: () => { toast.success(t('Contract cancel')); refresh(); setDialog(null); },
    onError: (e) => toast.error(apiError(e, t('Nahi hua'))),
  });
  const renew = useMutation({
    mutationFn: () => amcApi.renew(id, { amountPaid: Number(renewPaid) || 0, paymentMode: 'CASH' }),
    onSuccess: (n) => { toast.success(t('Naya contract {{amcNumber}}', { amcNumber: n.amcNumber })); refresh(true); setDialog(null); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Renew nahi hua'))),
  });
  const wa = a ? waLink(a.customerPhone, `Assalam o alaikum ${a.customerName},\n${shopName}: aap ka AMC ${a.amcNumber} ${dayOnly(a.endDate)} ko khatam ho raha hai. ${a.visitsRemaining} visits baqi hain. Renew karwane ke liye jawab dein. Shukriya!`) : undefined;
  const active = !!a && ['ACTIVE', 'RENEWAL_DUE'].includes(a.status);

  return (
    <Modal open onClose={onClose} size="lg" title={a ? `${a.amcNumber} — ${a.customerName}` : t('AMC')} description={a ? t('{{startDate}} se {{endDate}} · {{serviceAddress}}', { startDate: dayOnly(a.startDate), endDate: dayOnly(a.endDate), serviceAddress: a.serviceAddress }) : undefined}
      footer={a ? <>
        {canManage && active && <Button variant="ghost" leftIcon={<Ban className="h-4 w-4" />} onClick={() => { setReason(''); setDialog('cancel'); }}>{t('Cancel')}</Button>}
        {wa && <a href={wa} target="_blank" rel="noreferrer"><Button variant="secondary" leftIcon={<MessageCircle className="h-4 w-4" />}>{t('WhatsApp')}</Button></a>}
        {canManage && canMoney && a.status !== 'CANCELLED' && <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setDialog('renew')}>{t('Renew')}</Button>}
        {canMoney && a.due > 0 && <Button leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog('pay')}>{t('Paisa lein')}</Button>}
      </> : undefined}>
      {!a ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-[0.8125rem] sm:grid-cols-4">
            <Box label={t('Fee')} value={formatPKR(a.contractValue)} />
            <Box label={t('Mila')} value={formatPKR(a.amountPaid)} />
            <Box label={t('Baqi (khata)')} value={formatPKR(a.due)} tone={a.due > 0 ? 'text-amber-700' : undefined} />
            <Box label={t('Visits')} value={`${a.visitsUsed}/${a.numberOfVisits}`} />
          </dl>
          <p className="text-[0.8125rem] text-slate-600">{(a.coveredItems ?? []).join(', ') || t('Maintenance')} · {a.includesLabour ? t('kaam muft') : t('kaam ka bill')} · {a.includesParts ? t('parts muft') : t('parts ka bill')}{a.sale && <> {' '}{t('· bill')}{' '} <Link to={`/sales?search=${encodeURIComponent(a.sale.saleNumber)}`} className="font-semibold text-brand-700 hover:underline">{a.sale.saleNumber}</Link></>}</p>
          {a.cancellationReason && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900">{t('Cancel: {{cancellationReason}}', { cancellationReason: a.cancellationReason })}</p>}
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {a.visits.length === 0 && <li className="px-3 py-4 text-center text-[0.8125rem] text-slate-500">{t('Koi visit tay nahi')}</li>}
            {a.visits.map((v) => {
              const job = a.jobs.find((j) => j.id === v.serviceJobId);
              return (
                <li key={v.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-[0.75rem] font-bold', v.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{v.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4" /> : v.visitNumber}</span>
                  <span className="min-w-0 flex-1 text-[0.8125rem]">
                    <span className="block font-medium text-slate-900">{t('Visit {{visitNumber}} — {{scheduledDate}}', { visitNumber: v.visitNumber, scheduledDate: dayOnly(v.scheduledDate) })}</span>
                    <span className="text-slate-500">{v.status === 'COMPLETED' ? t('Mukammal {{completedAt}}', { completedAt: dayOnly(v.completedAt) }) : job ? t('Job {{jobNumber}} · {{label}}', { jobNumber: job.jobNumber, label: statusOf(job.status).label }) : (daysTo(v.scheduledDate) ?? 0) < 0 ? t('Waqt guzar gaya') : t('Tay hai')}</span>
                  </span>
                  {job ? <Button size="sm" variant="ghost" onClick={() => onJob(job.id)}>{t('Job')}</Button>
                    : canManage && active && v.status !== 'COMPLETED' && <Button size="sm" leftIcon={<Briefcase className="h-3.5 w-3.5" />} loading={visitJob.isPending && visitJob.variables === v.id} onClick={() => visitJob.mutate(v.id)}>{t('Job banayein')}</Button>}
                </li>
              );
            })}
          </ul>
          {dialog === 'pay' && (
            <TakePaymentModal title={t('Fee — {{amcNumber}}', { amcNumber: a.amcNumber })} description={a.customerName} amount={a.due} max={a.due} loading={pay.isPending}
              onConfirm={(amount, method) => pay.mutate({ amount, method })} onClose={() => setDialog(null)} />
          )}
          {dialog === 'cancel' && (
            <Modal open onClose={() => setDialog(null)} size="sm" title={t('Contract cancel karein?')} description={t('Baqi visits band. Paisa wapas karna ho to Sales me is ke bill par Return karein.')}
              footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{t('Rehne dein')}</Button><Button variant="danger" disabled={reason.trim().length < 3} loading={cancel.isPending} onClick={() => cancel.mutate()}>{t('Cancel')}</Button></>}>
              <Input label={t('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Modal>
          )}
          {dialog === 'renew' && (
            <Modal open onClose={() => setDialog(null)} size="sm" title={t('Agle saal ka contract')} description={t('Usi fee ({{contractValue}}) aur visits par — {{endDate}} ke baad se', { contractValue: formatPKR(a.contractValue), endDate: dayOnly(a.endDate) })}
              footer={<><Button variant="secondary" onClick={() => setDialog(null)}>{t('Rehne dein')}</Button><Button loading={renew.isPending} onClick={() => renew.mutate()}>{t('Renew')}</Button></>}>
              <Input label={t('Abhi cash mila (Rs)')} inputMode="decimal" value={renewPaid} onChange={(e) => setRenewPaid(e.target.value.replace(/[^\d.]/g, ''))} hint={t('Baqi khata me — card / bank ho to baad me \'Paisa lein\' se')} />
            </Modal>
          )}
        </div>
      )}
    </Modal>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">{label}</dt><dd className={cn('text-base font-bold tabular-nums text-slate-900', tone)}>{value}</dd></div>;
}
