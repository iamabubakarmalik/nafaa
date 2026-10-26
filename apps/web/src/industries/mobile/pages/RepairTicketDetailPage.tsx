/**
 * One repair job: the phone and customer, where the job stands and the next
 * step, the check, parts and labour, money taken, every status change, and
 * hand-over with the bill. Printing the job card and a WhatsApp update are
 * one tap.
 *
 * Keys: D check · P part · A advance · W hand over · E edit · Esc back.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle2, ClipboardList, Hammer, History, KeyRound, MessageCircle, Package, Pencil, Play, Plus, Printer, Receipt, ShieldCheck, Smartphone, Trash2, UserRound, Wallet, Wrench, XCircle } from 'lucide-react';
import { Button, Card, Modal, PageHero, PageShell, Skeleton, Textarea, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { REPAIR_TRANSITIONS, repairsApi, type RepairStatus, type RepairTicket } from '../api/repairs.api';
import { AddPartModal } from '../components/repairs/AddPartModal';
import { AddPaymentModal } from '../components/repairs/AddPaymentModal';
import { DeliverRepairModal } from '../components/repairs/DeliverRepairModal';
import { DiagnoseModal } from '../components/repairs/DiagnoseModal';
import { RepairPriorityBadge } from '../components/repairs/RepairPriorityBadge';
import { RepairStatusTimeline } from '../components/repairs/RepairStatusTimeline';
import { printJobCard, repairMessage } from '../components/slips';
import { MONEY_KEYS, REPAIR_CLOSED, REPAIR_FLOW, REPAIR_KEY, apiError, dateTime, dayOnly, daysTo, methodLabel, repairStatusOf, waLink } from '../components/meta';

type Pop = 'diagnose' | 'part' | 'pay' | 'deliver' | 'cancel' | 'unrepairable' | null;

export default function RepairTicketDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.MOBILE_REPAIRS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales, cost } = useMasked();
  useReceiptSetup();
  const [pop, setPop] = useState<Pop>(null);
  const [note, setNote] = useState('');

  const q = useQuery({ queryKey: [REPAIR_KEY, 'one', id], queryFn: () => repairsApi.getOne(id), enabled: !!id });
  const t = q.data;
  const refresh = () => [REPAIR_KEY, 'repair-stats', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const move = useMutation({
    mutationFn: (v: { to: RepairStatus; note?: string }) => repairsApi.updateStatus(id, { toStatus: v.to, note: v.note }),
    onSuccess: (_r, v) => { toast.success(repairStatusOf(v.to).label); setPop(null); setNote(''); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });
  const deliver = useMutation({
    mutationFn: (v: { amount: number; method: PaymentMethod }) => repairsApi.deliver(id, { amount: v.amount, paymentMethod: v.method }),
    onSuccess: (r) => { toast.success(r.sale ? `Phone wapas — bill ${r.sale.saleNumber}` : 'Phone wapas de diya'); setPop(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Wapas nahi hua')),
  });
  const dropPart = useMutation({
    mutationFn: (partId: string) => repairsApi.removePart(id, partId),
    onSuccess: () => { toast.success('Part hata — stock wala part shelf par wapas'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Part nahi hata')),
  });

  const open = !!t && !REPAIR_CLOSED.includes(t.status) && !t.saleId;
  const can = (to: RepairStatus) => !!t && REPAIR_TRANSITIONS[t.status].includes(to);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !t) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') navigate('/repair-tickets');
      if (!canManage) return;
      if (k === 'd' && open) setPop('diagnose');
      if (k === 'p' && open) setPop('part');
      if (k === 'a' && open) setPop('pay');
      if (k === 'w' && (can('DELIVERED'))) setPop('deliver');
      if (k === 'e') navigate(`/repair-tickets/${t.id}/edit`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl" /></div></PageShell>;
  if (!t) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye job nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/repair-tickets')}>Repairs par wapas</Button></div></PageShell>;

  const st = repairStatusOf(t.status);
  const bill = Number(t.totalCost) > 0 ? Number(t.totalCost) : Number(t.estimatedCost) || 0;
  const due = Math.max(bill - Number(t.paidAmount || 0), 0);
  const left = daysTo(t.estimatedReadyAt);
  const late = open && t.status !== 'READY' && left !== null && left < 0;
  const warrantyLeft = t.status === 'DELIVERED' ? daysTo(t.warrantyEnds) : null;
  const flowAt = REPAIR_FLOW.indexOf(t.status === 'AWAITING_APPROVAL' || t.status === 'AWAITING_PARTS' ? 'DIAGNOSED' : t.status);
  const wa = waLink(t.customerPhone, repairMessage(t, shopName));
  const partsTotal = (t.parts ?? []).reduce((s, p) => s + Number(p.totalPrice || 0), 0);
  const partsCost = (t.parts ?? []).reduce((s, p) => s + Number(p.unitCost || 0) * Number(p.quantity || 0), 0);

  const next: Array<{ label: string; icon: typeof Play; onClick: () => void; primary?: boolean; busy?: boolean }> = [];
  if (canManage && open) {
    if (t.status === 'RECEIVED') next.push({ label: 'Check karein (D)', icon: Wrench, onClick: () => setPop('diagnose'), primary: true });
    if (can('IN_PROGRESS')) next.push({ label: 'Kaam shuru', icon: Play, onClick: () => move.mutate({ to: 'IN_PROGRESS' }), primary: t.status !== 'RECEIVED', busy: move.isPending });
    if (can('AWAITING_APPROVAL')) next.push({ label: 'Customer ki haan baqi', icon: MessageCircle, onClick: () => move.mutate({ to: 'AWAITING_APPROVAL' }) });
    if (can('AWAITING_PARTS')) next.push({ label: 'Part ka intezar', icon: Package, onClick: () => move.mutate({ to: 'AWAITING_PARTS' }) });
    if (can('READY')) next.push({ label: 'Tayyar hai', icon: CheckCircle2, onClick: () => move.mutate({ to: 'READY' }), primary: true, busy: move.isPending });
  }
  if (canManage && can('DELIVERED')) next.push({ label: 'Wapas dein (W)', icon: Receipt, onClick: () => setPop('deliver'), primary: true });
  const claimable = t.status === 'DELIVERED' && warrantyLeft !== null && warrantyLeft >= 0;

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2">{t.deviceBrand} {t.deviceModel}<RepairPriorityBadge priority={t.priority} /></span>}
        chip={st.label}
        subtitle={<><span className="font-mono">{t.ticketNumber}</span> · {t.customerName} · {t.customerPhone}{t.imei1 ? ` · IMEI ${t.imei1}` : ''}</>}
        back="/repair-tickets"
        backLabel="Wapas (Esc)"
        actions={(
          <>
            <button type="button" onClick={() => printJobCard(t, shopName)} className={heroButton}><Printer className="h-4 w-4" />Parchi</button>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {canManage && claimable && <Link to={`/repair-tickets/new?warrantyOf=${t.id}`} className={heroPrimaryButton}><ShieldCheck className="h-4 w-4" />Warranty claim</Link>}
            {canManage && <Link to={`/repair-tickets/${t.id}/edit`} className={heroButton}><Pencil className="h-4 w-4" />Badlein</Link>}
          </>
        )}
        stats={[
          { label: Number(t.totalCost) > 0 ? 'Bill' : 'Andaza', value: sales(bill), hint: Number(t.discount) ? `discount ${formatPKR(t.discount)}` : undefined },
          { label: 'Mila', value: sales(t.paidAmount) },
          { label: 'Baqi', value: sales(due), hint: t.saleId ? 'khata me' : undefined },
          t.status === 'DELIVERED'
            ? { label: 'Repair warranty', value: warrantyLeft !== null && warrantyLeft >= 0 ? `${warrantyLeft} din` : 'Khatam', hint: t.warrantyEnds ? `${dayOnly(t.warrantyEnds)} tak` : 'Nahi thi' }
            : { label: late ? 'Late' : 'Tayyar hoga', value: t.estimatedReadyAt ? (left === 0 ? 'Aaj' : left! < 0 ? `${-left!} din late` : `${left} din`) : '—', hint: t.estimatedReadyAt ? dateTime(t.estimatedReadyAt) : undefined },
        ]}
      />

      {(t.warrantyOf || (t.warrantyRepairs ?? []).length > 0) && (
        <div className="space-y-1 rounded-2xl bg-cyan-50 px-4 py-3 text-[0.8125rem] text-cyan-900 ring-1 ring-cyan-200">
          {t.warrantyOf && (
            <p className="flex flex-wrap items-center gap-1.5"><ShieldCheck className="h-4 w-4" />Warranty claim — pehla job
              <Link to={`/repair-tickets/${t.warrantyOf.id}`} className="font-mono font-semibold hover:underline">{t.warrantyOf.ticketNumber}</Link>
              <span className="text-cyan-800/80">({t.warrantyOf.diagnosedIssue || t.warrantyOf.reportedIssue}{t.warrantyOf.deliveredAt ? ` · wapas ${dayOnly(t.warrantyOf.deliveredAt)}` : ''})</span>
            </p>
          )}
          {(t.warrantyRepairs ?? []).map((w) => (
            <p key={w.id} className="flex flex-wrap items-center gap-1.5"><ShieldCheck className="h-4 w-4" />Is job par warranty claim
              <Link to={`/repair-tickets/${w.id}`} className="font-mono font-semibold hover:underline">{w.ticketNumber}</Link>
              <span className="text-cyan-800/80">({dayOnly(w.receivedAt)} · {repairStatusOf(w.status).label})</span>
            </p>
          ))}
        </div>
      )}

      {t.status !== 'CANCELLED' && (
        <ol className="grid grid-cols-5 gap-1 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
          {REPAIR_FLOW.map((s, i) => (
            <li key={s} className={cn('rounded-xl px-2 py-1.5 text-center text-[0.75rem] font-medium', i < flowAt ? 'bg-success-50 text-success-700' : i === flowAt ? 'bg-slate-900 text-white' : 'text-slate-400')}>{repairStatusOf(s).label}</li>
          ))}
        </ol>
      )}

      {(next.length > 0 || (canManage && open)) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
          <span className="mr-auto text-[0.8125rem] text-slate-600">{late ? <b className="text-rose-700">Late hai — customer ko batayein. </b> : null}{st.next ?? ''}</span>
          {next.map((b) => <Button key={b.label} variant={b.primary ? 'primary' : 'secondary'} leftIcon={<b.icon className="h-4 w-4" />} onClick={b.onClick} loading={b.busy}>{b.label}</Button>)}
          {canManage && open && can('UNREPAIRABLE') && <Button variant="ghost" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setPop('unrepairable')}>Theek nahi hoga</Button>}
          {canManage && open && can('CANCELLED') && <Button variant="ghost" className="text-rose-700" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setPop('cancel')}>Cancel</Button>}
          {canManage && t.status === 'READY' && <Button variant="ghost" leftIcon={<Hammer className="h-4 w-4" />} onClick={() => move.mutate({ to: 'IN_PROGRESS', note: 'Dobara kaam' })}>Dobara kaam</Button>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-2xl" title={<H icon={Wrench}>Kharabi aur check</H>}
            actions={canManage && open ? <Button size="sm" variant="secondary" onClick={() => setPop('diagnose')}>{t.diagnosedIssue ? 'Check badlein' : 'Check karein'}</Button> : undefined}>
            <dl className="space-y-2 text-[0.875rem]">
              <Row label="Customer ne kaha">{t.reportedIssue}</Row>
              <Row label="Check me nikla">{t.diagnosedIssue ?? <span className="text-slate-400">Abhi check nahi hua</span>}</Row>
              {t.recommendedActions && <Row label="Kya karna hai">{t.recommendedActions}</Row>}
              {t.diagnosisNotes && <Row label="Andar ka note">{t.diagnosisNotes}</Row>}
              {t.technicianName && <Row label="Technician">{t.technicianName}</Row>}
            </dl>
          </Card>

          <Card className="rounded-2xl" flush title={<H icon={Package}>Parts aur mazdoori</H>}
            description={`Parts ${formatPKR(partsTotal)} · mazdoori ${formatPKR(t.laborCost)} · apni cost ${cost(partsCost)}`}
            actions={canManage && open ? <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setPop('part')}>Part (P)</Button> : undefined}>
            {(t.parts ?? []).length === 0 ? (
              <p className="px-5 pb-5 text-[0.8125rem] text-slate-500">Koi part nahi laga{Number(t.totalCost) <= 0 && t.estimatedCost ? ' — bill andaze par banega' : ''}.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {t.parts!.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-2.5 text-[0.8125rem]">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-slate-900">{p.partName}</span>
                      <span className="block text-[0.75rem] text-slate-500">{p.quantity} × {formatPKR(p.unitPrice)} · {p.source === 'OWN_STOCK' ? 'apne stock se' : p.source === 'CUSTOMER_PROVIDED' ? 'customer ka' : 'bazar se'} · cost {cost(Number(p.unitCost) * Number(p.quantity))}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatPKR(p.totalPrice)}</span>
                    {canManage && open && (
                      <button type="button" aria-label="Hatayein" onClick={async () => { if ((await confirmDialog({ title: `${p.partName} hatayein?${p.source === 'OWN_STOCK' ? ' Stock me wapas jayega.' : ''}`, danger: true }))) dropPart.mutate(p.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl" title={<H icon={Wallet}>Paise</H>}
            actions={canManage && open ? <Button size="sm" variant="secondary" onClick={() => setPop('pay')}>Advance (A)</Button> : undefined}>
            {(t.payments ?? []).length === 0 ? <p className="text-[0.8125rem] text-slate-500">Abhi koi paisa nahi mila</p> : (
              <ul className="space-y-1.5 text-[0.8125rem]">
                {t.payments!.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="text-slate-600">{dateTime(p.paidAt)} · {methodLabel(p.paymentMethod)}{p.notes ? ` · ${p.notes}` : ''}</span>
                    <span className="font-semibold tabular-nums">{formatPKR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {t.sale && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-[0.8125rem] text-violet-900 ring-1 ring-violet-200">
                <Receipt className="h-4 w-4" />Bill <b className="font-mono">{t.sale.saleNumber}</b> bana — Sales aur Profit me shamil{Number(t.sale.creditAmount) > 0 ? ` · ${formatPKR(Number(t.sale.creditAmount))} khata me` : ''}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<H icon={UserRound}>Customer</H>}>
            <dl className="space-y-1 text-[0.8125rem]">
              <Row label="Naam">{t.customer ? <Link to={`/customers/${t.customer.id}`} className="font-semibold text-brand-700 hover:underline">{t.customerName}</Link> : t.customerName}</Row>
              <Row label="Phone">{t.customerPhone}</Row>
              {t.customerCnic && <Row label="CNIC"><span className="font-mono">{t.customerCnic}</span></Row>}
              {t.customer && Number(t.customer.balance) !== 0 && <Row label="Khata">{Number(t.customer.balance) > 0 ? `Udhaar ${formatPKR(Number(t.customer.balance))}` : `Advance ${formatPKR(-Number(t.customer.balance))}`}</Row>}
            </dl>
          </Card>
          <Card className="rounded-2xl" title={<H icon={Smartphone}>Phone</H>}>
            <dl className="space-y-1 text-[0.8125rem]">
              <Row label="IMEI"><span className="font-mono">{[t.imei1, t.imei2].filter(Boolean).join(' / ') || '—'}</span></Row>
              {t.deviceColor && <Row label="Rang">{t.deviceColor}</Row>}
              {t.passcode && <Row label={<span className="inline-flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" />Lock</span>}><span className="font-mono">{t.passcode}</span></Row>}
              <Row label="Saath">{[t.hasSimCard && 'SIM', t.hasMemoryCard && 'Memory card'].filter(Boolean).join(', ') || 'Sirf phone'}</Row>
              <Row label="Aaya">{dateTime(t.receivedAt)}</Row>
              {t.deliveredAt && <Row label="Wapas">{dateTime(t.deliveredAt)}</Row>}
              <Row label={<span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Warranty</span>}>{t.warrantyDays ? `${t.warrantyDays} din` : 'Nahi'}</Row>
            </dl>
            {t.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">{t.notes}</p>}
          </Card>
          <Card className="rounded-2xl" title={<H icon={History}>Qadam</H>}>
            <RepairStatusTimeline logs={t.statusLog ?? []} />
          </Card>
        </div>
      </div>

      {pop === 'diagnose' && <DiagnoseModal ticket={t} onClose={() => setPop(null)} />}
      {pop === 'part' && <AddPartModal ticket={t} onClose={() => setPop(null)} />}
      {pop === 'pay' && <AddPaymentModal ticket={t} onClose={() => setPop(null)} />}
      {pop === 'deliver' && <DeliverRepairModal ticket={t} pending={deliver.isPending} onClose={() => setPop(null)} onConfirm={(amount, method) => deliver.mutate({ amount, method })} />}
      {(pop === 'cancel' || pop === 'unrepairable') && (
        <ReasonModal ticket={t} kind={pop} note={note} setNote={setNote} busy={move.isPending} onClose={() => setPop(null)}
          onConfirm={() => move.mutate({ to: pop === 'cancel' ? 'CANCELLED' : 'UNREPAIRABLE', note: note.trim() || undefined })} />
      )}
    </PageShell>
  );
}

function ReasonModal({ ticket, kind, note, setNote, busy, onClose, onConfirm }: {
  ticket: RepairTicket; kind: 'cancel' | 'unrepairable'; note: string; setNote: (v: string) => void; busy: boolean; onClose: () => void; onConfirm: () => void;
}) {
  const ownParts = (ticket.parts ?? []).filter((p) => p.source === 'OWN_STOCK').length;
  return (
    <Modal open onClose={onClose} size="sm" title={kind === 'cancel' ? 'Job cancel karein?' : 'Phone theek nahi ho sakta?'}
      description={kind === 'cancel' ? 'Phone customer ko wapas — koi bill nahi banega' : 'Wapas dete waqt sirf check ka kharcha (agar likha hai) liya jayega'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant={kind === 'cancel' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>Haan</Button></>}>
      <div className="space-y-2">
        {kind === 'cancel' && ownParts > 0 && <p className="text-[0.8125rem] text-slate-600">{ownParts} stock wale part shelf par wapas jayenge.</p>}
        {kind === 'cancel' && Number(ticket.paidAmount) > 0 && <p className="text-[0.8125rem] text-amber-800">{formatPKR(ticket.paidAmount)} advance customer ke khata me jama rahega — wapas dena ho to Khata se dein.</p>}
        <Textarea label="Wajah" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'cancel' ? 'Customer ne mana kar diya' : 'Board dead hai'} />
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0"><dt className="shrink-0 text-slate-500">{label}</dt><dd className="text-right text-slate-800">{children}</dd></div>;
}

const H = ({ icon: Icon, children }: { icon: typeof ClipboardList; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
