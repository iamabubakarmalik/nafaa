/**
 * One job card: where the job stands and the next step, the work and parts
 * on it (parts leave stock when added and go back when removed), the money
 * (advances, what is due, the bill once the vehicle is handed back), the
 * vehicle and customer, and the job's history.
 *
 * Keys: P print · E edit · A add part · G guide · Esc back.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Ban, BookOpen, Car, CheckCircle2, Clock, Gauge, GraduationCap, Hammer, History, MessageCircle, Package, Pencil, PlayCircle,
  Plus, Printer, Receipt, ShieldCheck, Trash2, Truck, UserRound, Wallet, Wrench,
} from 'lucide-react';
import {
  Button, Card, Input, Modal, PageHero, PageShell, Skeleton, TBody, THead, Table, Td, Th, Tr, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { TakePaymentModal } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { mechanicsApi } from '../api/mechanics.api';
import { workshopJobsApi, type DeliverInput, type ExternalInput, type JobStatus, type JobUpdateInput, type LaborInput, type PartInput } from '../api/workshop-jobs.api';
import { AddPartModal } from '../components/AddPartModal';
import { AddWorkModal } from '../components/AddWorkModal';
import { DeliverJobModal } from '../components/DeliverJobModal';
import { EditJobModal } from '../components/EditJobModal';
import { jobMessage, printJobCard } from '../components/slips';
import {
  JOB_FLOW, JOB_KEY, MECHANIC_KEY, MONEY_KEYS, READY, REMINDER_KEY, VEHICLE_KEY, apiError, conditionOf, dateTime, dayOnly, isClosed, jobTypeOf, km,
  priorityOf, statusOf, vehicleName, waLink,
} from '../components/meta';
import { PART_FACTS_KEY } from '../hooks/usePartFacts';
import { t } from '@core/i18n';

type Dialog = null | 'part' | 'labour' | 'outside' | 'edit' | 'pay' | 'deliver' | 'cancel';

const SIDE: Array<{ status: JobStatus; label: string; icon: typeof Clock }> = [
  { status: 'WAITING_PARTS', label: t('Parts ka intezar'), icon: Package },
  { status: 'WAITING_APPROVAL', label: t('Customer ki haan'), icon: UserRound },
  { status: 'ON_HOLD', label: t('Rok dein'), icon: Clock },
];

/** Where the job is on the usual path. */
const stepOf = (s: JobStatus) => (s === 'DELIVERED' ? 3 : READY.includes(s) ? 2 : s === 'DRAFT' || s === 'QUOTED' ? 0 : 1);

export default function WorkshopJobDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  useReceiptSetup();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');

  const jobQ = useQuery({ queryKey: [JOB_KEY, 'one', id], queryFn: () => workshopJobsApi.getOne(id), enabled: !!id });
  const mechQ = useQuery({ queryKey: [MECHANIC_KEY], queryFn: () => mechanicsApi.list(), staleTime: 5 * 60_000 });
  const j = jobQ.data;
  const open = !!j && !isClosed(j.status);
  const edit = open && canManage;

  const refresh = (stock = false) => {
    [JOB_KEY, VEHICLE_KEY, 'workshop-stats', ...(stock ? ['products-catalog', 'products-for-pos', PART_FACTS_KEY] : [])].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const act = <V,>(fn: (v: V) => Promise<unknown>, ok: string, opts: { stock?: boolean; money?: boolean; close?: boolean } = {}) => ({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(ok);
      refresh(opts.stock);
      if (opts.money) MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (opts.close !== false) setDialog(null);
    },
    onError: (e: unknown) => toast.error(apiError(e, t('Nahi hua — dobara koshish karein'))),
  });

  const status = useMutation(act((s: JobStatus) => workshopJobsApi.updateStatus(id, s), t('Halat badal di')));
  const cancel = useMutation(act((r: string) => workshopJobsApi.updateStatus(id, 'CANCELLED', { cancellationReason: r }), t('Job cancel — stock wale parts wapas shelf par'), { stock: true }));
  const save = useMutation(act((v: JobUpdateInput) => workshopJobsApi.update(id, v), t('Job save ho gaya')));
  const addPart = useMutation(act((v: PartInput) => workshopJobsApi.addPart(id, v), t('Part jor diya'), { stock: true }));
  const delPart = useMutation(act((partId: string) => workshopJobsApi.removePart(id, partId), t('Part hata diya'), { stock: true, close: false }));
  const addLabour = useMutation(act((v: LaborInput) => workshopJobsApi.addLabor(id, v), t('Mazdoori jor di')));
  const delLabour = useMutation(act((laborId: string) => workshopJobsApi.removeLabor(id, laborId), t('Mazdoori hata di'), { close: false }));
  const addOutside = useMutation(act((v: ExternalInput) => workshopJobsApi.addExternal(id, v), t('Bahar ka kaam jor diya')));
  const delOutside = useMutation(act((extId: string) => workshopJobsApi.removeExternal(id, extId), t('Bahar ka kaam hata diya'), { close: false }));
  const pay = useMutation(act((v: { amount: number; method: PaymentMethod }) =>
    workshopJobsApi.addPayment(id, { amount: v.amount, paymentMethod: v.method }), t('Payment mil gayi'), { money: true }));
  const deliver = useMutation({
    mutationFn: (v: DeliverInput) => workshopJobsApi.deliver(id, v),
    onSuccess: (r) => {
      toast.success(r.sale ? t('Gaari de di — bill {{saleNumber}}', { saleNumber: r.sale.saleNumber }) : t('Gaari de di'), { action: { label: t('Print'), onClick: () => printJobCard(r, shopName) } });
      [JOB_KEY, VEHICLE_KEY, REMINDER_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setDialog(null);
    },
    onError: (e) => toast.error(apiError(e, t('Gaari wapas nahi hui'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !j) return;
      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); printJobCard(j, shopName); }
      if (k === 'e' && edit) { e.preventDefault(); setDialog('edit'); }
      if (k === 'a' && edit) { e.preventDefault(); setDialog('part'); }
      if (e.key === 'Escape') navigate('/autoparts/jobs');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [j, edit, shopName, navigate]);

  if (jobQ.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 rounded-2xl lg:col-span-2" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (!j) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{t('Job nahi mili')}</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/autoparts/jobs')}>{t('Jobs par wapas')}</Button>
        </div>
      </PageShell>
    );
  }

  const st = statusOf(j.status);
  const step = stepOf(j.status);
  const late = open && !!j.promisedAt && new Date(j.promisedAt).getTime() < Date.now() && !READY.includes(j.status);
  const wa = waLink(j.customerPhone, jobMessage(j, shopName));
  const ready = READY.includes(j.status);
  const next: { label: string; icon: typeof Clock; run: () => void } | null = !edit ? null
    : ready ? { label: t('Gaari dein'), icon: Receipt, run: () => setDialog('deliver') }
      : j.status === 'IN_PROGRESS' ? { label: t('Kaam mukammal'), icon: CheckCircle2, run: () => status.mutate('COMPLETED') }
        : { label: t('Kaam shuru'), icon: PlayCircle, run: () => status.mutate('IN_PROGRESS') };
  const parts = j.partsUsed;
  const mechanics = mechQ.data ?? [];

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2">{j.registrationNumber ?? j.jobNumber}<span className="text-base font-medium text-white/80">{vehicleName(j)}</span></span>}
        chip={<><Wrench /> {st.label}</>}
        meta={t('{{jobNumber}} · {{jobType}} · aayi {{receivedAt}}', { jobNumber: j.jobNumber, jobType: jobTypeOf(j.jobType), receivedAt: dateTime(j.receivedAt) })}
        actions={<>
          <button type="button" onClick={() => navigate('/autoparts/jobs')} title={t('Wapas (Esc)')} className={heroIconButton}><ArrowLeft className="h-4 w-4 rtl-flip" /></button>
          <button type="button" onClick={() => printJobCard(j, shopName)} title={t('Parchi (P)')} className={heroButton}><Printer className="h-4 w-4" /><span className="hidden sm:inline">{t('Parchi')}</span></button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t('WhatsApp')}</span></a>}
          {edit && <button type="button" onClick={() => setDialog('edit')} title={t('Badlein (E)')} className={heroButton}><Pencil className="h-4 w-4" /><span className="hidden sm:inline">{t('Badlein')}</span></button>}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {next && <button type="button" onClick={next.run} disabled={status.isPending} className={heroPrimaryButton}><next.icon className="h-4 w-4" />{next.label}</button>}
        </>}
        stats={[
          { label: t('Bill'), value: formatPKR(j.total) },
          { label: t('Mila'), value: formatPKR(j.paidAmount) },
          { label: j.status === 'DELIVERED' ? t('Khata me baqi') : t('Baqi'), value: formatPKR(j.due) },
        ]}
      />

      {late && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] font-medium text-rose-900 ring-1 ring-rose-200">
          <AlertTriangle className="h-4 w-4" />{t('Waada {{promisedAt}} tha — customer ko bata dein', { promisedAt: dateTime(j.promisedAt) })}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="ms-auto font-semibold hover:underline">{t('WhatsApp →')}</a>}
        </div>
      )}
      {j.status === 'CANCELLED' && (
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-[0.875rem] text-slate-700">{t('Cancel {{cancelledAt}} — {{cancellationReason}}{{value}}', { cancelledAt: dayOnly(j.cancelledAt), cancellationReason: j.cancellationReason, value: j.advanceOnKhata > 0 ? t(' · Rs {{advanceOnKhata}} advance customer ke khata me jama hai', { advanceOnKhata: j.advanceOnKhata }) : '' })}</div>
      )}
      {j.status === 'DELIVERED' && j.sale && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-900 ring-1 ring-emerald-200">
          <Receipt className="h-4 w-4" />{t('Gaari {{deliveredAt}} ko di — bill', { deliveredAt: dateTime(j.deliveredAt) })}{' '} <strong>{j.sale.saleNumber}</strong>
          {j.due > 0 && <span className="text-amber-800">{t('· {{due}} khata me', { due: formatPKR(j.due) })}</span>}
          <Link to={`/sales?search=${encodeURIComponent(j.sale.saleNumber)}`} className="ms-auto font-semibold hover:underline">{t('Bill dekhein →')}</Link>
        </div>
      )}

      {/* Steps */}
      {j.status !== 'CANCELLED' && (
        <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
          <ol className="grid grid-cols-4 gap-2">
            {JOB_FLOW.map((s, i) => (
              <li key={s} className="min-w-0">
                <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-slate-200')} />
                <p className={cn('mt-1.5 truncate text-[0.75rem] font-medium', i === step ? 'text-brand-700' : i < step ? 'text-slate-700' : 'text-slate-400')}>
                  {s === 'DRAFT' ? t('Gaari aayi') : s === 'IN_PROGRESS' ? t('Kaam') : s === 'COMPLETED' ? t('Tayyar') : t('Di gayi')}
                </p>
              </li>
            ))}
          </ol>
          {edit && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
              <span className="me-1 text-[0.75rem] font-medium text-slate-500">{t('Ya:')}</span>
              {SIDE.map((x) => (
                <button key={x.status} type="button" onClick={() => status.mutate(j.status === x.status ? 'IN_PROGRESS' : x.status)} disabled={status.isPending}
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium ring-1',
                    j.status === x.status ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  <x.icon className="h-3.5 w-3.5" />{j.status === x.status ? t('{{label}} — khatam', { label: x.label }) : x.label}
                </button>
              ))}
              {ready && <button type="button" onClick={() => status.mutate('IN_PROGRESS')} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Hammer className="h-3.5 w-3.5" />{t('Kaam baqi hai')}</button>}
              <button type="button" onClick={() => { setReason(''); setDialog('cancel'); }} className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-rose-700 hover:bg-rose-50"><Ban className="h-3.5 w-3.5" />{t('Cancel')}</button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={t('Kaam')} actions={edit ? <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDialog('edit')}>{t('Badlein')}</Button> : undefined}>
            <dl className="grid gap-3 text-[0.875rem] sm:grid-cols-2">
              <Fact label={t('Shikayat')}>{j.customerComplaint || '—'}</Fact>
              <Fact label={t('Check me nikla')}>{j.diagnosis || <span className="text-slate-400">{t('Abhi nahi likha')}</span>}</Fact>
              <Fact label={t('Mechanic')}>{j.mechanicName || <span className="text-slate-400">{t('Koi nahi')}</span>}</Fact>
              <Fact label={t('Gaari kab deni hai')}>{j.promisedAt ? dateTime(j.promisedAt) : '—'}{j.priority !== 'NORMAL' && <span className={cn('ms-2 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', priorityOf(j.priority).tone)}>{priorityOf(j.priority).label}</span>}</Fact>
              {j.recommendations && <Fact label={t('Mashwara')}>{j.recommendations}</Fact>}
              {j.internalNotes && <Fact label={t('Andar ka note')}>{j.internalNotes}</Fact>}
            </dl>
          </Card>

          <Card className="rounded-2xl" flush title={t('Bill')}
            description={open ? t('Stock wala part jorte hi stock se nikalta hai; hatane par wapas shelf par') : undefined}
            actions={edit ? (
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" leftIcon={<Package className="h-3.5 w-3.5" />} onClick={() => setDialog('part')}>{t('Part')}</Button>
                <Button size="sm" variant="secondary" leftIcon={<Hammer className="h-3.5 w-3.5" />} onClick={() => setDialog('labour')}>{t('Mazdoori')}</Button>
                <Button size="sm" variant="secondary" leftIcon={<Truck className="h-3.5 w-3.5" />} onClick={() => setDialog('outside')}>{t('Bahar ka kaam')}</Button>
              </div>
            ) : undefined}>
            {j.laborItems.length + parts.length + j.externalWork.length === 0 ? (
              <div className="px-5 pb-6 pt-4 text-center">
                <p className="text-[0.875rem] text-slate-600">{t('Abhi koi kaam ya part nahi jora')}</p>
                {edit && <Button className="mt-3" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDialog('part')}>{t('Pehla part jorein (A)')}</Button>}
              </div>
            ) : (
              <Table className="mt-3" minWidth="36rem">
                <THead><Tr><Th>{t('Cheez')}</Th><Th align="right">{t('Kitne')}</Th><Th align="right">{t('Qeemat')}</Th><Th align="right">{t('Kul')}</Th>{edit && <Th />}</Tr></THead>
                <TBody>
                  {j.laborItems.map((l) => (
                    <Tr key={l.id}>
                      <Td><span className="font-medium text-slate-900">{l.description}</span><Sub>{t('Mazdoori{{value}}', { value: l.mechanicName ? ` · ${l.mechanicName}` : '' })}</Sub></Td>
                      <Td align="right">{l.hours !== 1 ? t('{{hours}} ghante', { hours: l.hours }) : '1'}</Td>
                      <Td align="right">{formatPKR(l.ratePerHour)}</Td>
                      <Td align="right" className="font-semibold text-slate-900">{formatPKR(l.total)}</Td>
                      {edit && <Td align="right"><Remove label={l.description} busy={delLabour.isPending} onClick={() => delLabour.mutate(l.id)} /></Td>}
                    </Tr>
                  ))}
                  {parts.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <span className="font-medium text-slate-900">{p.partName}</span>
                        <Sub>
                          {[p.partNumber, conditionOf(p.condition).label, p.isCustomerSupplied ? t('Customer ka apna') : p.productId ? (p.installedAt ? t('Stock se laga') : t('Dene par stock se niklega')) : t('Bahar se liya'),
                            p.warrantyMonths ? t('{{warrantyMonths}} mahine warranty', { warrantyMonths: p.warrantyMonths }) : null].filter(Boolean).join(' · ')}
                        </Sub>
                      </Td>
                      <Td align="right">{Number(p.quantity)}</Td>
                      <Td align="right">{formatPKR(p.unitPrice)}</Td>
                      <Td align="right" className="font-semibold text-slate-900">{formatPKR(p.total)}</Td>
                      {edit && <Td align="right"><Remove label={p.partName} busy={delPart.isPending} onClick={() => delPart.mutate(p.id)} /></Td>}
                    </Tr>
                  ))}
                  {j.externalWork.map((e) => (
                    <Tr key={e.id}>
                      <Td><span className="font-medium text-slate-900">{e.description}</span><Sub>{t('Bahar ka kaam{{value}} · cost {{cost}}', { value: e.vendorName ? ` · ${e.vendorName}` : '', cost: formatPKR(e.cost) })}</Sub></Td>
                      <Td align="right">1</Td>
                      <Td align="right">{formatPKR(e.total)}</Td>
                      <Td align="right" className="font-semibold text-slate-900">{formatPKR(e.total)}</Td>
                      {edit && <Td align="right"><Remove label={e.description} busy={delOutside.isPending} onClick={() => delOutside.mutate(e.id)} /></Td>}
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
            <dl className="space-y-1 border-t border-slate-100 px-5 py-4 text-[0.875rem]">
              <Line label={t('Mazdoori')} value={j.laborTotal} />
              <Line label={t('Parts')} value={j.partsTotal} />
              {j.externalTotal > 0 && <Line label={t('Bahar ka kaam')} value={j.externalTotal} />}
              {j.taxAmount > 0 && <Line label={t('Tax')} value={j.taxAmount} />}
              {j.discount > 0 && <Line label={t('Discount')} value={-j.discount} />}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><dt>{t('Kul bill')}</dt><dd className="tabular-nums">{formatPKR(j.total)}</dd></div>
            </dl>
          </Card>

          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-slate-500" />{t('Job ki history')}</span>}>
            <ol className="space-y-3 px-5 pb-5 pt-3">
              {j.statusLogs.map((l) => (
                <li key={l.id} className="flex gap-3 text-[0.8125rem]">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusOf(l.toStatus).color }} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{statusOf(l.toStatus).label}</span>
                    {l.notes && <span className="text-slate-600"> — {l.notes}</span>}
                  </span>
                  <span className="shrink-0 text-slate-500">{dateTime(l.createdAt)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Car className="h-4 w-4 text-brand-600" />{t('Gaari aur customer')}</span>}>
            <dl className="space-y-2 text-[0.875rem]">
              <Fact label={t('Gaari')}>
                {j.vehicle ? <Link to={`/autoparts/vehicles?open=${j.vehicle.id}`} className="font-semibold text-brand-700 hover:underline">{j.registrationNumber}</Link> : j.registrationNumber ?? '—'}
                <span className="text-slate-600"> {vehicleName(j)}</span>
              </Fact>
              <Fact label={t('Meter')}><span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5 text-slate-400" />{km(j.odometerKm)}</span></Fact>
              <Fact label={t('Customer')}>
                {j.customer ? <Link to={`/customers/${j.customer.id}`} className="font-semibold text-brand-700 hover:underline">{j.customer.name}</Link> : j.customerName || '—'}
                {j.customerPhone && <span className="text-slate-600"> · {j.customerPhone}</span>}
              </Fact>
              {j.customer && j.customer.balance !== 0 && (
                <Fact label={t('Khata')}>
                  <span className={j.customer.balance > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>
                    {j.customer.balance > 0 ? t('{{balance}} udhaar', { balance: formatPKR(j.customer.balance) }) : t('{{formatPKR}} jama (advance)', { formatPKR: formatPKR(-j.customer.balance) })}
                  </span>
                </Fact>
              )}
              {(j.fuelLevel || j.hasSpareTire || j.hasToolkit || j.externalDamages) && (
                <Fact label={t('Aate waqt')}>{[j.fuelLevel && `Petrol ${j.fuelLevel}`, j.hasSpareTire && 'Stepney', j.hasToolkit && 'Auzaar', j.externalDamages].filter(Boolean).join(' · ')}</Fact>
              )}
              {j.warrantyStatus === 'ACTIVE' && j.warrantyExpiry && (
                <Fact label={t('Warranty')}><span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />{t('{{warrantyExpiry}} tak', { warrantyExpiry: dayOnly(j.warrantyExpiry) })}</span></Fact>
              )}
            </dl>
          </Card>

          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" />{t('Paisa')}</span>}
            actions={canManage && j.status !== 'CANCELLED' && (j.due > 0 || (open && j.total <= 0)) ? <Button size="sm" variant="secondary" onClick={() => setDialog('pay')}>{j.status === 'DELIVERED' ? t('Wusooli') : t('Advance lein')}</Button> : undefined}>
            <dl className="space-y-1 px-5 pt-3 text-[0.875rem]">
              <Line label={t('Bill')} value={j.total} />
              <Line label={t('Mila')} value={j.paidAmount} />
              <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900"><dt>{t('Baqi')}</dt><dd className={cn('tabular-nums', j.due > 0 && 'text-amber-700')}>{formatPKR(j.due)}</dd></div>
            </dl>
            {j.payments.length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                {j.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-2 text-[0.8125rem]">
                    <span className="min-w-0 flex-1"><span className="block truncate text-slate-800">{p.notes || t('Payment')}</span><span className="text-[0.75rem] text-slate-500">{dateTime(p.paidAt)} · {p.paymentMethod}</span></span>
                    <span className={cn('font-semibold tabular-nums', p.amount < 0 ? 'text-rose-600' : 'text-slate-900')}>{formatPKR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 pb-4 pt-2 text-[0.8125rem] text-slate-500">{t('Abhi koi payment nahi')}</p>}
            {j.advanceOnKhata > 0 && j.status !== 'DELIVERED' && (
              <p className="mx-5 mb-4 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600"><BookOpen className="h-3.5 w-3.5" />{t('{{advanceOnKhata}} advance khata me jama — bill me katega', { advanceOnKhata: formatPKR(j.advanceOnKhata) })}</p>
            )}
            {(j.coreReturns?.length ?? 0) > 0 && (
              <div className="mx-5 mb-4 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
                <Link to="/autoparts/core-returns" className="font-semibold hover:underline">{t('Purane part')}</Link>
                {j.coreReturns!.map((c) => <span key={c.id} className="block">{c.description} · {formatPKR(c.value)}{c.saleId ? t(' · bill me laga') : t(' · agle bill me katega')}</span>)}
              </div>
            )}
          </Card>
        </div>
      </div>

      {dialog === 'part' && <AddPartModal vehicle={j} pending={addPart.isPending} onAdd={(v) => addPart.mutate(v)} onClose={() => setDialog(null)} />}
      {(dialog === 'labour' || dialog === 'outside') && (
        <AddWorkModal kind={dialog} mechanics={mechanics} defaultMechanicId={j.primaryMechanicId} pending={addLabour.isPending || addOutside.isPending}
          onLabour={(v) => addLabour.mutate(v)} onOutside={(v) => addOutside.mutate(v)} onClose={() => setDialog(null)} />
      )}
      {dialog === 'edit' && <EditJobModal job={j} mechanics={mechanics} pending={save.isPending} onSave={(v) => save.mutate(v)} onClose={() => setDialog(null)} />}
      {dialog === 'deliver' && <DeliverJobModal job={j} pending={deliver.isPending} onClose={() => setDialog(null)} onConfirm={(v) => { if (!deliver.isPending) deliver.mutate(v); }} />}
      {dialog === 'pay' && (
        <TakePaymentModal title={j.status === 'DELIVERED' ? t('Wusooli — {{jobNumber}}', { jobNumber: j.jobNumber }) : t('Advance — {{jobNumber}}', { jobNumber: j.jobNumber })}
          description={[j.registrationNumber, j.customerName].filter(Boolean).join(' · ')}
          amount={j.due > 0 ? j.due : 0} max={j.total > 0 ? j.due : undefined} loading={pay.isPending}
          onConfirm={(amount, method) => pay.mutate({ amount, method })} onClose={() => setDialog(null)} />
      )}
      {dialog === 'cancel' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title={t('Job cancel karein — {{jobNumber}}', { jobNumber: j.jobNumber })}
          description={t('Stock se lage parts wapas shelf par chale jayenge. Advance customer ke khata me jama rahega.')}
          footer={<>
            <Button variant="secondary" onClick={() => setDialog(null)}>{t('Rehne dein')}</Button>
            <Button variant="danger" disabled={reason.trim().length < 3} loading={cancel.isPending} onClick={() => cancel.mutate(reason.trim())}>{t('Cancel karein')}</Button>
          </>}>
          <Input label={t('Wajah')} required value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder={t('Customer ne mana kar diya')} />
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Job card — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: PlayCircle, color: '#7c3aed', title: t('Agla qadam'), text: t('Upar wala button job ko aage barhata hai: Kaam shuru → Kaam mukammal → Gaari dein. Parts ka intezar ya customer ki haan ho to neeche "Ya" se.') },
            { icon: Package, color: '#ea580c', title: t('Parts'), text: t('"Part" se dukaan ka part (stock se nikalta hai), bahar se liya ya customer ka apna jorein. Is gaari me lagne wale parts pehle dikhte hain.') },
            { icon: Hammer, color: '#2563eb', title: t('Mazdoori'), text: t('Har kaam ki mazdoori mechanic ke naam se — Mechanic page par us ka mahine ka kaam aur commission dikhta hai.') },
            { icon: Receipt, color: '#16a34a', title: t('Gaari dein'), text: t('Baqi paisa lein, agli service ka km/date aur warranty likhein. Bill banta hai; jo baqi rahe customer ke khata me.') },
            { icon: Ban, color: '#e11d48', title: t('Ghalti'), text: t('Gaari dene ke baad bill ghalat ho to Sales se void karein — job dobara khul jati hai. Cancel par parts wapas stock me.') },
          ]}
          shortcuts={[['P', 'parchi'], ['E', 'badlein'], ['A', t('part jorein')], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-[0.75rem] font-medium text-slate-500">{label}</dt><dd className="mt-0.5 text-slate-800">{children}</dd></div>;
}

function Line({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-slate-600"><dt>{label}</dt><dd className="tabular-nums">{formatPKR(value)}</dd></div>;
}

function Sub({ children }: { children: ReactNode }) {
  return <span className="mt-0.5 block text-[0.75rem] text-slate-500">{children}</span>;
}

function Remove({ label, busy, onClick }: { label: string; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} aria-label={t('{{label}} hatayein', { label })} title={t('Hatayein')}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
  );
}

