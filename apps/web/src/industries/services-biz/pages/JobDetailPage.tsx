/**
 * One job card: where the job stands and the next step, who is on it, the
 * charges and parts (shelf parts leave stock with the bill), the money
 * (advances, what is due, the bill and later payments), the customer and
 * the place, warranty, rating and the job's history.
 *
 * Keys: P print · E edit · A add part · B bill · G guide · Esc back.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Ban, BookOpen, Car, CheckCircle2, Clock, GraduationCap, Hammer, History, MapPin, MessageCircle, Package, PauseCircle, Pencil,
  PlayCircle, Plus, Printer, Receipt, RotateCcw, ShieldCheck, Star, Trash2, UserCheck, UserRound, Wallet, Wrench,
} from 'lucide-react';
import { Button, Card, Input, Modal, PageHero, PageShell, Skeleton, TBody, THead, Table, Td, Th, Tr, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
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
import { jobsApi, type BillInput, type JobStatus, type PartInput } from '../api/jobs.api';
import { AddPartModal } from '../components/AddPartModal';
import { AssignModal } from '../components/AssignModal';
import { BillJobModal } from '../components/BillJobModal';
import { jobMessage, printJobCard } from '../components/slips';
import {
  BOOKED, JOB_KEY, MONEY_KEYS, READY, STEPS, TECH_KEY, WARRANTY_KEY, apiError, categoryOf, dateInput, dateTime, dayOnly, isClosed, isOnSite, itemName,
  locationOf, priorityOf, statusOf, stepOf, waLink,
} from '../components/meta';

type Dialog = null | 'part' | 'assign' | 'bill' | 'pay' | 'cancel' | 'return' | 'rate';

const SIDE: Array<{ status: JobStatus; label: string; icon: typeof Clock }> = [
  { status: 'AWAITING_PARTS', label: 'Parts ka intezar', icon: Package },
  { status: 'AWAITING_APPROVAL', label: 'Customer ki haan', icon: UserRound },
  { status: 'PAUSED', label: 'Rok dein', icon: PauseCircle },
  { status: 'UNABLE_TO_COMPLETE', label: 'Kaam nahi ho saka', icon: AlertTriangle },
];

export default function JobDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const canMoney = usePermission(PERMISSIONS.POS_USE);
  useReceiptSetup();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');
  const [visitDate, setVisitDate] = useState(dateInput(new Date(Date.now() + 86_400_000)));
  const [rating, setRating] = useState(5);

  const jobQ = useQuery({ queryKey: [JOB_KEY, 'one', id], queryFn: () => jobsApi.getOne(id), enabled: !!id });
  const j = jobQ.data;
  const open = !!j && !isClosed(j.status);
  const edit = open && canManage;

  const refresh = (money = false) => [JOB_KEY, TECH_KEY, WARRANTY_KEY, 'services-dashboard', 'jobs-dashboard', ...(money ? MONEY_KEYS : [])].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const act = <V,>(fn: (v: V) => Promise<unknown>, ok: string, opts: { money?: boolean; close?: boolean } = {}) => ({
    mutationFn: fn,
    onSuccess: () => { toast.success(ok); refresh(opts.money); if (opts.close !== false) setDialog(null); },
    onError: (e: unknown) => toast.error(apiError(e, 'Nahi hua — dobara koshish karein')),
  });

  const status = useMutation(act((s: JobStatus) => jobsApi.updateStatus(id, s), 'Halat badal di'));
  const cancel = useMutation(act((r: string) => jobsApi.cancel(id, r), 'Job cancel — advance customer ke khata me jama hai'));
  const assign = useMutation(act((v: { primary: string; helpers: string[] }) => jobsApi.assign(id, v.primary, v.helpers), 'Technician laga diya'));
  const addPart = useMutation(act((v: PartInput) => jobsApi.addPart(id, v), 'Part jor diya'));
  const delPart = useMutation(act((partId: string) => jobsApi.removePart(id, partId), 'Part hata diya', { close: false }));
  const pay = useMutation(act((v: { amount: number; method: PaymentMethod }) => jobsApi.addPayment(id, v.amount, v.method), 'Payment mil gayi', { money: true }));
  const returnVisit = useMutation({
    mutationFn: () => jobsApi.returnVisit(id, { returnVisitDate: new Date(`${visitDate}T10:00`).toISOString(), reason: reason.trim() }),
    onSuccess: (child) => { toast.success(`Wapsi visit ${child.jobNumber} ban gayi`); refresh(); setDialog(null); navigate(`/services-biz/jobs/${child.id}`); },
    onError: (e) => toast.error(apiError(e, 'Wapsi visit nahi bani')),
  });
  const rate = useMutation(act((v: { rating: number; feedback?: string }) => jobsApi.rate(id, v), 'Rating save ho gayi'));
  const bill = useMutation({
    mutationFn: (v: BillInput) => jobsApi.bill(id, v),
    onSuccess: (r) => {
      toast.success(r.sale ? `Bill ${r.sale.saleNumber} ban gaya${r.change > 0 ? ` — ${formatPKR(r.change)} wapas dein` : ''}` : 'Job mukammal', { action: { label: 'Print', onClick: () => printJobCard(r, shopName) } });
      refresh(true);
      setDialog(null);
    },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !j) return;
      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); printJobCard(j, shopName); }
      if (k === 'e' && edit) { e.preventDefault(); navigate(`/services-biz/jobs/${j.id}/edit`); }
      if (k === 'a' && edit) { e.preventDefault(); setDialog('part'); }
      if (k === 'b' && edit && canMoney) { e.preventDefault(); setDialog('bill'); }
      if (e.key === 'Escape') navigate('/services-biz/jobs');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [j, edit, canMoney, shopName, navigate]);

  if (jobQ.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 rounded-2xl lg:col-span-2" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (!j) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Job nahi mili</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/services-biz/jobs')}>Jobs par wapas</Button>
        </div>
      </PageShell>
    );
  }

  const st = statusOf(j.status);
  const step = stepOf(j.status);
  const onSite = isOnSite(j.locationType);
  const wa = waLink(j.customerPhone, jobMessage(j, shopName));
  const ready = READY.includes(j.status);
  const noTech = !j.primaryTechnicianId;
  const next: { label: string; icon: typeof Clock; run: () => void } | null = !edit ? null
    : ready ? (canMoney ? { label: 'Bill banayein', icon: Receipt, run: () => setDialog('bill') } : null)
      : noTech && BOOKED.includes(j.status) ? { label: 'Technician lagayein', icon: UserCheck, run: () => setDialog('assign') }
        : j.status === 'IN_PROGRESS' ? { label: 'Kaam mukammal', icon: CheckCircle2, run: () => status.mutate('QUALITY_CHECK') }
          : onSite && ['ASSIGNED', 'DISPATCHED', ...BOOKED].includes(j.status) ? { label: 'Raste me', icon: Car, run: () => status.mutate('EN_ROUTE') }
            : onSite && j.status === 'EN_ROUTE' ? { label: 'Pohanch gaya', icon: MapPin, run: () => status.mutate('ARRIVED') }
              : { label: 'Kaam shuru', icon: PlayCircle, run: () => status.mutate('IN_PROGRESS') };
  const charges: Array<[string, number]> = ([['Visit charge', j.visitCharge], ['Kaam (labour)', j.labourCharge], ['Transport', j.transportCharge], ['Emergency charge', j.emergencyCharge], ['Tax', j.taxAmount]] as Array<[string, number]>).filter(([, v]) => v > 0);
  const warrantyLeft = j.jobWarrantyExpiryDate ? Math.ceil((new Date(j.jobWarrantyExpiryDate).getTime() - Date.now()) / 86_400_000) : null;

  return (
    <PageShell>
      <PageHero
        title={j.serviceName}
        chip={<><Wrench /> {st.label}</>}
        meta={[j.jobNumber, itemName(j), categoryOf(j.category), `bani ${dateTime(j.createdAt)}`].filter(Boolean).join(' · ')}
        actions={<>
          <button type="button" onClick={() => navigate('/services-biz/jobs')} title="Wapas (Esc)" className={heroIconButton}><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => printJobCard(j, shopName)} title="Parchi (P)" className={heroButton}><Printer className="h-4 w-4" /><span className="hidden sm:inline">Parchi</span></button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></a>}
          {edit && <Link to={`/services-biz/jobs/${j.id}/edit`} title="Badlein (E)" className={heroButton}><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Badlein</span></Link>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {next && <button type="button" onClick={next.run} disabled={status.isPending} className={heroPrimaryButton}><next.icon className="h-4 w-4" />{next.label}</button>}
        </>}
        stats={[
          { label: 'Bill', value: formatPKR(j.totalCharge) },
          { label: 'Mila', value: formatPKR(j.paidAmount) },
          { label: j.status === 'COMPLETED' ? 'Khata me baqi' : 'Baqi', value: formatPKR(j.due) },
        ]}
      />

      {j.isLate && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] font-medium text-rose-900 ring-1 ring-rose-200">
          <AlertTriangle className="h-4 w-4" />Waqt {dateTime(j.scheduledEnd ?? j.scheduledStart)} tha — customer ko bata dein
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="ml-auto font-semibold hover:underline">WhatsApp →</a>}
        </div>
      )}
      {j.status === 'CANCELLED' && (
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-[0.875rem] text-slate-700">Cancel {dayOnly(j.cancelledAt)} — {j.cancellationReason}{j.advanceOnKhata > 0 && ` · ${formatPKR(j.advanceOnKhata)} advance customer ke khata me jama hai`}</div>
      )}
      {j.status === 'COMPLETED' && j.billSale && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-900 ring-1 ring-emerald-200">
          <Receipt className="h-4 w-4" />Mukammal {dateTime(j.completedAt)} — bill <strong>{j.billSale.saleNumber}</strong>
          {j.due > 0 && <span className="text-amber-800">· {formatPKR(j.due)} khata me</span>}
          <Link to={`/sales?search=${encodeURIComponent(j.billSale.saleNumber)}`} className="ml-auto font-semibold hover:underline">Bill dekhein →</Link>
        </div>
      )}
      {(j.amc || j.warrantyClaim || j.parentJobId) && (
        <div className="flex flex-wrap gap-2 text-[0.8125rem]">
          {j.amc && <Link to={`/services-biz/amc?open=${j.amc.id}`} className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-800 ring-1 ring-violet-200 hover:underline">AMC {j.amc.amcNumber}{j.amc.includesLabour ? ' · kaam muft' : ''}{j.amc.includesParts ? ' · parts muft' : ''}</Link>}
          {j.warrantyClaim && <Link to="/services-biz/warranty?tab=claims" className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 ring-1 ring-amber-200 hover:underline">Warranty claim {j.warrantyClaim.claimNumber}</Link>}
          {j.parentJobId && <Link to={`/services-biz/jobs/${j.parentJobId}`} className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 hover:underline">Pichli job dekhein</Link>}
        </div>
      )}

      {j.status !== 'CANCELLED' && (
        <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
          <ol className="grid grid-cols-5 gap-2">
            {STEPS.map((s, i) => (
              <li key={s} className="min-w-0">
                <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-slate-200')} />
                <p className={cn('mt-1.5 truncate text-[0.75rem] font-medium', i === step ? 'text-brand-700' : i < step ? 'text-slate-700' : 'text-slate-400')}>{s}</p>
              </li>
            ))}
          </ol>
          {edit && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
              <span className="mr-1 text-[0.75rem] font-medium text-slate-500">Ya:</span>
              {SIDE.map((x) => (
                <button key={x.status} type="button" onClick={() => status.mutate(j.status === x.status ? 'IN_PROGRESS' : x.status)} disabled={status.isPending}
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium ring-1',
                    j.status === x.status ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  <x.icon className="h-3.5 w-3.5" />{j.status === x.status ? `${x.label} — khatam` : x.label}
                </button>
              ))}
              {ready && <button type="button" onClick={() => status.mutate('IN_PROGRESS')} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Hammer className="h-3.5 w-3.5" />Kaam baqi hai</button>}
              <button type="button" onClick={() => { setReason(''); setDialog('cancel'); }} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-rose-700 hover:bg-rose-50"><Ban className="h-3.5 w-3.5" />Cancel</button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title="Kaam" actions={edit ? <Link to={`/services-biz/jobs/${j.id}/edit`}><Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />}>Badlein</Button></Link> : undefined}>
            <dl className="grid gap-3 text-[0.875rem] sm:grid-cols-2">
              <Fact label="Kharabi / kya karna hai">{j.problemDescription || '—'}</Fact>
              <Fact label="Cheez">{itemName(j) || <span className="text-slate-400">Nahi likha</span>}{j.underWarranty && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200">Company warranty</span>}</Fact>
              <Fact label="Technician">
                {j.technician ? <span>{j.technician.staff.fullName}{j.technician.staff.phone ? <span className="text-slate-500"> · {j.technician.staff.phone}</span> : null}</span> : <span className="text-slate-400">Koi nahi</span>}
                {j.assistantNames.length > 0 && <span className="block text-[0.75rem] text-slate-500">Helper: {j.assistantNames.join(', ')}</span>}
                {edit && <button type="button" onClick={() => setDialog('assign')} className="ml-2 text-[0.8125rem] font-semibold text-brand-700 hover:underline">{noTech ? 'Lagayein' : 'Badlein'}</button>}
              </Fact>
              <Fact label={onSite ? 'Visit ka waqt' : 'Kab tayyar'}>{j.scheduledStart ? dateTime(j.scheduledStart) : '—'}{j.priority !== 'NORMAL' && <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', priorityOf(j.priority).tone)}>{priorityOf(j.priority).label}</span>}</Fact>
              {j.technicianNotes && <Fact label="Technician ke liye">{j.technicianNotes}</Fact>}
              {j.internalNotes && <Fact label="Andar ka note">{j.internalNotes}</Fact>}
            </dl>
          </Card>

          <Card className="rounded-2xl" flush title="Bill"
            description={open ? 'Dukaan ka part bill banne par stock se nikalta hai' : undefined}
            actions={edit ? <Button size="sm" leftIcon={<Package className="h-3.5 w-3.5" />} onClick={() => setDialog('part')}>Part (A)</Button> : undefined}>
            {charges.length + j.parts.length === 0 ? (
              <div className="px-5 pb-6 pt-4 text-center">
                <p className="text-[0.875rem] text-slate-600">Abhi koi charge ya part nahi</p>
                {edit && <div className="mt-3 flex justify-center gap-2"><Link to={`/services-biz/jobs/${j.id}/edit`}><Button size="sm" variant="secondary">Charges likhein</Button></Link><Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDialog('part')}>Part jorein</Button></div>}
              </div>
            ) : (
              <Table className="mt-3" minWidth="34rem">
                <THead><Tr><Th>Cheez</Th><Th align="right">Kitne</Th><Th align="right">Qeemat</Th><Th align="right">Kul</Th>{edit && <Th />}</Tr></THead>
                <TBody>
                  {charges.map(([label, v]) => (
                    <Tr key={label}><Td><span className="font-medium text-slate-900">{label}</span></Td><Td align="right">1</Td><Td align="right">{formatPKR(v)}</Td><Td align="right" className="font-semibold text-slate-900">{formatPKR(v)}</Td>{edit && <Td />}</Tr>
                  ))}
                  {j.parts.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <span className="font-medium text-slate-900">{p.partName}</span>
                        <Sub>{[p.isCustomerSupplied ? 'Customer ka apna' : p.productId ? (j.status === 'COMPLETED' ? 'Stock se laga' : 'Bill par stock se niklega') : 'Bahar se liya', p.isUnderWarranty ? 'Warranty me muft' : null, p.serialNumber ? `SN ${p.serialNumber}` : null].filter(Boolean).join(' · ')}</Sub>
                      </Td>
                      <Td align="right">{Number(p.quantity)}</Td>
                      <Td align="right">{formatPKR(p.isUnderWarranty ? 0 : p.unitPrice)}</Td>
                      <Td align="right" className="font-semibold text-slate-900">{formatPKR(p.isUnderWarranty ? 0 : p.total)}</Td>
                      {edit && <Td align="right"><button type="button" onClick={() => delPart.mutate(p.id)} disabled={delPart.isPending} aria-label={`${p.partName} hatayein`} title="Hatayein" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></Td>}
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
            <dl className="space-y-1 border-t border-slate-100 px-5 py-4 text-[0.875rem]">
              {j.partsCharge > 0 && <Line label="Parts" value={j.partsCharge} />}
              {j.discountAmount > 0 && <Line label="Discount" value={-j.discountAmount} />}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><dt>Kul bill</dt><dd className="tabular-nums">{formatPKR(j.totalCharge)}</dd></div>
            </dl>
          </Card>

          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-slate-500" />Job ki history</span>}>
            <ol className="space-y-3 px-5 pb-5 pt-3">
              {j.statusHistory.map((l) => (
                <li key={l.id} className="flex gap-3 text-[0.8125rem]">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusOf(l.toStatus).color }} />
                  <span className="min-w-0 flex-1"><span className="font-medium text-slate-900">{statusOf(l.toStatus).label}</span>{(l.reason || l.notes) && <span className="text-slate-600"> — {[l.reason, l.notes].filter(Boolean).join(' · ')}</span>}</span>
                  <span className="shrink-0 text-slate-500">{dateTime(l.changedAt)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-brand-600" />Customer aur jagah</span>}>
            <dl className="space-y-2 text-[0.875rem]">
              <Fact label="Customer">
                {j.customer ? <Link to={`/customers/${j.customer.id}`} className="font-semibold text-brand-700 hover:underline">{j.customer.name}</Link> : j.customerName || '—'}
                {j.customerPhone && <span className="text-slate-600"> · {j.customerPhone}</span>}
              </Fact>
              {j.customer && j.customer.balance !== 0 && (
                <Fact label="Khata">
                  <span className={j.customer.balance > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>
                    {j.customer.balance > 0 ? `${formatPKR(j.customer.balance)} udhaar` : `${formatPKR(-j.customer.balance)} jama (advance)`}
                  </span>
                </Fact>
              )}
              <Fact label="Kahan">{locationOf(j.locationType)}{onSite && <span className="block text-slate-600">{[j.serviceAddress, j.area, j.city].filter(Boolean).join(', ')}{j.landmark ? ` (${j.landmark})` : ''}</span>}</Fact>
              {j.jobWarrantyDays > 0 && (
                <Fact label="Kaam ki warranty">
                  <span className={cn('inline-flex items-center gap-1', warrantyLeft !== null && warrantyLeft < 0 ? 'text-slate-500' : 'text-emerald-700')}><ShieldCheck className="h-3.5 w-3.5" />
                    {j.jobWarrantyExpiryDate ? (warrantyLeft! < 0 ? `Khatam ${dayOnly(j.jobWarrantyExpiryDate)}` : `${dayOnly(j.jobWarrantyExpiryDate)} tak`) : `${j.jobWarrantyDays} din (bill se)`}
                  </span>
                </Fact>
              )}
            </dl>
          </Card>

          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" />Paisa</span>}
            actions={canManage && canMoney && j.status !== 'CANCELLED' && (j.due > 0 || (open && j.totalCharge <= 0)) ? <Button size="sm" variant="secondary" onClick={() => setDialog('pay')}>{j.status === 'COMPLETED' ? 'Wusooli' : 'Advance lein'}</Button> : undefined}>
            <dl className="space-y-1 px-5 pb-4 pt-3 text-[0.875rem]">
              <Line label="Bill" value={j.totalCharge} />
              <Line label="Mila" value={j.paidAmount} />
              {j.returned > 0 && <Line label="Return hua" value={-j.returned} />}
              <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900"><dt>Baqi</dt><dd className={cn('tabular-nums', j.due > 0 && 'text-amber-700')}>{formatPKR(j.due)}</dd></div>
            </dl>
            {j.advanceOnKhata > 0 && j.status !== 'COMPLETED' && (
              <p className="mx-5 mb-4 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600"><BookOpen className="h-3.5 w-3.5" />{formatPKR(j.advanceOnKhata)} advance khata me jama — bill me katega</p>
            )}
            {edit && canMoney && (
              <div className="border-t border-slate-100 px-5 py-3"><Button className="w-full" leftIcon={<Receipt className="h-4 w-4" />} onClick={() => setDialog('bill')}>Bill banayein (B)</Button></div>
            )}
          </Card>

          {j.status === 'COMPLETED' && canManage && (
            <Card className="rounded-2xl" title="Kaam ke baad">
              <div className="space-y-2">
                <Button className="w-full" variant="secondary" leftIcon={<Star className="h-4 w-4" />} onClick={() => setDialog('rate')}>{j.customerRating ? `Rating ${j.customerRating}/5 — badlein` : 'Customer ki rating'}</Button>
                <Button className="w-full" variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => { setReason(''); setDialog('return'); }}>Wapsi visit (muft)</Button>
                {warrantyLeft !== null && warrantyLeft >= 0 && <Link to={`/services-biz/warranty?claim=${j.id}`}><Button className="mt-2 w-full" variant="secondary" leftIcon={<ShieldCheck className="h-4 w-4" />}>Warranty claim</Button></Link>}
              </div>
            </Card>
          )}
        </div>
      </div>

      {dialog === 'part' && <AddPartModal pending={addPart.isPending} onAdd={(v) => addPart.mutate(v)} onClose={() => setDialog(null)} />}
      {dialog === 'assign' && <AssignModal jobId={j.id} jobNumber={j.jobNumber} current={j.primaryTechnicianId} assistants={j.assistantTechnicianIds} pending={assign.isPending}
        onAssign={(primary, helpers) => assign.mutate({ primary, helpers })} onClose={() => setDialog(null)} />}
      {dialog === 'bill' && <BillJobModal job={j} pending={bill.isPending} onClose={() => setDialog(null)} onConfirm={(v) => { if (!bill.isPending) bill.mutate(v); }} />}
      {dialog === 'pay' && (
        <TakePaymentModal title={j.status === 'COMPLETED' ? `Wusooli — ${j.jobNumber}` : `Advance — ${j.jobNumber}`} description={[j.serviceName, j.customerName].filter(Boolean).join(' · ')}
          amount={j.due > 0 ? j.due : 0} max={j.totalCharge > 0 ? j.due : undefined} loading={pay.isPending}
          onConfirm={(amount, method) => pay.mutate({ amount, method })} onClose={() => setDialog(null)} />
      )}
      {dialog === 'cancel' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title={`Job cancel karein — ${j.jobNumber}`} description="Advance customer ke khata me jama rahega — wapas karna ho to khata se dein."
          footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button><Button variant="danger" disabled={reason.trim().length < 3} loading={cancel.isPending} onClick={() => cancel.mutate(reason.trim())}>Cancel karein</Button></>}>
          <Input label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="Customer ne mana kar diya" error={reason && reason.trim().length < 3 ? 'Thori tafseel likhein' : undefined} />
        </Modal>
      )}
      {dialog === 'return' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title="Wapsi visit" description="Kaam ke baad shikayat — muft visit ki nayi job banti hai, isi technician ke naam"
          footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button><Button disabled={reason.trim().length < 3 || !visitDate} loading={returnVisit.isPending} onClick={() => returnVisit.mutate()}>Visit banayein</Button></>}>
          <div className="space-y-3">
            <Input label="Shikayat" required value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="Phir se pani tapak raha hai" />
            <Input label="Kab" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
        </Modal>
      )}
      {dialog === 'rate' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title="Customer ki rating" description="Technician ki rating me jurti hai"
          footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button><Button loading={rate.isPending} onClick={() => rate.mutate({ rating, feedback: reason.trim() || undefined })}>Save</Button></>}>
          <div className="space-y-3">
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map((r) => <button key={r} type="button" onClick={() => setRating(r)} aria-label={`${r} star`} className={cn('h-10 w-10 rounded-lg', r <= rating ? 'text-amber-500' : 'text-slate-300')}><Star className="mx-auto h-6 w-6 fill-current" /></button>)}</div>
            <Input label="Customer ne kya kaha" value={reason} onChange={(e) => setReason(e.target.value)} hint="Marzi hai" />
          </div>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Job card — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: PlayCircle, color: '#7c3aed', title: 'Agla qadam', text: 'Upar wala button job ko aage barhata hai: Technician → Raste me → Pohanch gaya → Kaam shuru → Kaam mukammal → Bill. Parts ya customer ki haan ka intezar ho to neeche "Ya" se.' },
            { icon: Package, color: '#ea580c', title: 'Parts', text: '"Part" se dukaan ka saman (bill par stock se nikalta hai), bahar se liya ya customer ka apna jorein. Warranty me muft part ka Cost profit me dikhta hai.' },
            { icon: Receipt, color: '#16a34a', title: 'Bill', text: 'Baqi paisa lein — Cash, Card, JazzCash ya split. Advance khud katta hai, jo baqi rahe khata me. Bill ke saath warranty ke din likhein.' },
            { icon: Ban, color: '#e11d48', title: 'Ghalti', text: 'Bill ghalat ho to Sales se void karein — job dobara "Tayyar" ho jati hai. Saman wapas ho to Sales se return karein.' },
          ]}
          shortcuts={[['P', 'parchi'], ['E', 'badlein'], ['A', 'part'], ['B', 'bill'], ['Esc', 'wapas'], ['G', 'guide']]}
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
