/**
 * One installment plan: the customer and the bill it splits (with the phone
 * and IMEI), every installment with its due date and what was paid, the
 * khata entries made against it, and the actions — take money, forgive one
 * installment, mark default or close the plan.
 *
 * Keys: Q take installment · Esc back.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CreditCard, HandCoins, History, MessageCircle, Receipt, UserRound, XCircle } from 'lucide-react';
import { Button, Card, Modal, PageHero, PageShell, Skeleton, Textarea, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { emiApi, type EmiInstallment } from '../api/emi.api';
import { RecordEmiPaymentModal } from '../components/emi/RecordEmiPaymentModal';
import { emiMessage } from '../components/slips';
import { EMI_KEY, MONEY_KEYS, apiError, dateTime, dayOnly, installmentOf, methodLabel, planStatusOf, waLink } from '../components/meta';

type Pop = { kind: 'waive'; i: EmiInstallment } | { kind: 'default' } | { kind: 'cancel' } | null;

export default function EmiPlanDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.KHATA_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const [collect, setCollect] = useState(false);
  const [pop, setPop] = useState<Pop>(null);
  const [reason, setReason] = useState('');

  const q = useQuery({ queryKey: [EMI_KEY, 'one', id], queryFn: () => emiApi.getOne(id), enabled: !!id });
  const p = q.data;
  const refresh = () => [EMI_KEY, 'emi-stats', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const act = useMutation({
    mutationFn: () => {
      if (!pop) throw new Error('');
      if (pop.kind === 'waive') return emiApi.waive(id, pop.i.id, reason.trim());
      if (pop.kind === 'default') return emiApi.markDefaulted(id, reason.trim() || undefined);
      return emiApi.cancel(id, reason.trim() || undefined);
    },
    onSuccess: () => { toast.success(pop?.kind === 'waive' ? 'Qist maaf — khata se bhi kam' : 'Plan band ho gaya'); setPop(null); setReason(''); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  const active = p?.status === 'ACTIVE';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'Escape') navigate('/emi-plans');
      if ((e.key === 'q' || e.key === 'Q') && canManage && active) setCollect(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, active, navigate]);

  if (q.isLoading) return <PageShell><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-80 rounded-2xl" /></PageShell>;
  if (!p) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye plan nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/emi-plans')}>Plans par wapas</Button></div></PageShell>;

  const st = planStatusOf(p.status);
  const collected = Number(p.paidAmount) - Number(p.downPayment);
  const wa = waLink(p.customerPhone ?? p.customer?.phone, emiMessage(p, shopName));
  const printDoc = (): PrintDoc => ({
    title: `Qist plan ${p.planNumber}`,
    subtitle: `${p.customerName}${p.customerPhone ? ` · ${p.customerPhone}` : ''}`,
    meta: [['Bill', p.sale?.saleNumber ?? '—'], ['Kul', formatPKR(p.totalAmount)], ['Down payment', formatPKR(p.downPayment)], ['Baqi', formatPKR(p.remainingAmount)]],
    sections: [{
      kind: 'table',
      columns: [{ label: '#' }, { label: 'Tareekh' }, { label: 'Qist', align: 'right' }, { label: 'Mili', align: 'right' }, { label: 'Halat' }],
      rows: p.installments.map((i) => [String(i.installmentNumber), dayOnly(i.dueDate), formatPKR(i.amount), formatPKR(i.paidAmount), installmentOf(i.status).label]),
    }],
    footer: 'Har qist waqt par jama karwayein. Shukriya!',
  });

  return (
    <PageShell>
      <PageHero
        title={p.customerName}
        chip={st.label}
        subtitle={<><span className="font-mono">{p.planNumber}</span>{p.customerPhone ? ` · ${p.customerPhone}` : ''} · {p.installmentCount} qist × {formatPKR(p.installmentAmount)}</>}
        back="/emi-plans"
        backLabel="Wapas (Esc)"
        actions={(
          <>
            <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Schedule" /></span>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />Yaad dilayein</a>}
            {canManage && active && <button type="button" onClick={() => setCollect(true)} className={heroPrimaryButton}><HandCoins className="h-4 w-4" />Qist lein (Q)</button>}
          </>
        )}
        stats={[
          { label: 'Qiston me', value: sales(p.financedAmount), hint: `down ${formatPKR(p.downPayment)}` },
          { label: 'Mila', value: sales(collected), hint: `${p.paidInstallmentCount}/${p.installmentCount} qist` },
          { label: 'Baqi', value: sales(p.remainingAmount) },
          { label: p.overdueAmount > 0 ? 'Late' : 'Agli qist', value: p.overdueAmount > 0 ? sales(p.overdueAmount) : p.nextDueDate ? dayOnly(p.nextDueDate) : '—', hint: p.overdueAmount > 0 ? `${p.overdueCount} qist` : p.nextDueDate ? formatPKR(p.nextDueAmount) : undefined },
        ]}
      />

      {p.customer && Math.abs(Number(p.customer.balance) - Number(p.remainingAmount)) > 1 && active && (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
          Customer ka poora khata {formatPKR(Number(p.customer.balance))} hai — is plan ke baqi {formatPKR(p.remainingAmount)} ke ilawa aur udhaar ya advance bhi ho sakta hai. Qist yahan se lein taake plan aur khata dono theek rahein.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-2xl" flush title={<H icon={CreditCard}>Qistein</H>}>
            <ul className="divide-y divide-slate-100">
              {p.installments.map((i) => {
                const m = installmentOf(i.status);
                const due = Number(i.amount) - Number(i.paidAmount);
                return (
                  <li key={i.id} className="flex items-center gap-3 px-5 py-2.5 text-[0.8125rem]">
                    <span className="w-6 text-right font-semibold text-slate-400">{i.installmentNumber}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-slate-900">{dayOnly(i.dueDate)}</span>
                      {i.paidDate && <span className="ml-2 text-[0.75rem] text-slate-500">mili {dayOnly(i.paidDate)}</span>}
                      {i.notes && i.status === 'WAIVED' && <span className="block text-[0.75rem] text-slate-500">{i.notes}</span>}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', m.tone)}>{m.label}</span>
                    <span className="w-28 text-right tabular-nums">
                      <b>{formatPKR(i.amount)}</b>
                      {Number(i.paidAmount) > 0 && i.status !== 'PAID' && <span className="block text-[0.6875rem] text-amber-700">mila {formatPKR(i.paidAmount)}</span>}
                    </span>
                    {canManage && active && (i.status === 'PENDING' || i.status === 'OVERDUE') && due > 0 && (
                      <button type="button" onClick={() => setPop({ kind: 'waive', i })} className="text-[0.75rem] font-semibold text-slate-500 hover:text-rose-700">Maaf</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="rounded-2xl" title={<H icon={History}>Khata me jama</H>} description="Is plan ke naam se aaye paise">
            {p.payments.length === 0 ? <p className="text-[0.8125rem] text-slate-500">Abhi koi qist nahi mili</p> : (
              <ul className="space-y-1.5 text-[0.8125rem]">
                {p.payments.map((x) => (
                  <li key={x.id} className="flex justify-between gap-3">
                    <span className="text-slate-600">{dateTime(x.createdAt)} · {x.type === 'ADJUSTMENT' ? 'Maaf' : methodLabel(x.paymentMethod ?? 'CASH')}{x.note ? ` · ${x.note}` : ''}</span>
                    <span className={cn('font-semibold tabular-nums', x.type === 'ADJUSTMENT' ? 'text-slate-500' : 'text-success-700')}>{formatPKR(Math.abs(Number(x.amount)))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<H icon={UserRound}>Customer</H>}>
            <dl className="space-y-1 text-[0.8125rem]">
              <Row label="Naam">{p.customer ? <Link to={`/customers/${p.customer.id}`} className="font-semibold text-brand-700 hover:underline">{p.customerName}</Link> : p.customerName}</Row>
              <Row label="Phone">{p.customerPhone ?? p.customer?.phone ?? '—'}</Row>
              {p.customer?.cnic && <Row label="CNIC"><span className="font-mono">{p.customer.cnic}</span></Row>}
              {p.customer && <Row label="Khata">{formatPKR(Number(p.customer.balance))}</Row>}
            </dl>
          </Card>
          {p.sale && (
            <Card className="rounded-2xl" title={<H icon={Receipt}>Bill</H>} description={`${p.sale.saleNumber} · ${dayOnly(p.sale.soldAt)}`}>
              <ul className="space-y-1 text-[0.8125rem]">
                {p.sale.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="text-slate-700">{it.product?.name ?? 'Phone'}{it.note ? <span className="block text-[0.6875rem] text-slate-500">{it.note}</span> : null}</span>
                    <span className="tabular-nums">{formatPKR(it.total)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[0.8125rem]">
                <Row label="Kul">{formatPKR(p.sale.total)}</Row>
                <Row label="Bill par mila">{formatPKR(p.sale.paidAmount)}</Row>
                <Row label="Udhaar">{formatPKR(p.sale.creditAmount)}</Row>
              </dl>
            </Card>
          )}
          {p.notes && <Card className="rounded-2xl" title="Note"><p className="whitespace-pre-line text-[0.8125rem] text-slate-700">{p.notes}</p></Card>}
          {canManage && active && (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setPop({ kind: 'default' })}>Default</Button>
              <Button variant="ghost" className="text-rose-700" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setPop({ kind: 'cancel' })}>Plan band karein</Button>
            </div>
          )}
        </div>
      </div>

      {collect && <RecordEmiPaymentModal plan={p} onClose={() => setCollect(false)} />}
      {pop && (
        <Modal open onClose={() => setPop(null)} size="sm"
          title={pop.kind === 'waive' ? `Qist ${pop.i.installmentNumber} maaf karein?` : pop.kind === 'default' ? 'Plan default karein?' : 'Plan band karein?'}
          description={pop.kind === 'waive' ? `${formatPKR(Number(pop.i.amount) - Number(pop.i.paidAmount))} khata se bhi kam ho jayega` : 'Qistein ruk jayengi — baqi udhaar khata me rahega'}
          footer={<><Button variant="secondary" onClick={() => setPop(null)}>Rehne dein</Button><Button variant="danger" loading={act.isPending} disabled={pop.kind === 'waive' && !reason.trim()} onClick={() => act.mutate()}>Haan</Button></>}>
          <Textarea label="Wajah" required={pop.kind === 'waive'} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={pop.kind === 'waive' ? 'Purana customer, rishta…' : 'Customer gayab, phone wapas liya…'} />
        </Modal>
      )}
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex justify-between gap-3 py-0.5"><dt className="text-slate-500">{label}</dt><dd className="text-right text-slate-800">{children}</dd></div>;
}

const H = ({ icon: Icon, children }: { icon: typeof CreditCard; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
