/**
 * One link's account as either side sees it: the statement both sides agree
 * on, payments waiting for confirmation, and recording a new payment.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BadgeCheck, CheckCircle2, CircleDashed, HandCoins, Plus, Truck, Undo2, XCircle } from 'lucide-react';
import { Alert, Button, Input, Modal, Select, Skeleton, Textarea, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { Empty, Panel, Pill } from '@modules/distribution/components/parts';
import { useMoney } from '@modules/distribution/hooks/useDistribution';
import { dayLabel, dayTime } from '@modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type MoneyMethod, type Payment, type Side, type Statement } from '../api/trade.api';
import { METHODS, METHOD_LABEL, PAYMENT_STATUS } from '../lib/meta';
import { Tile } from './shared';

const ENTRY_STATE: Record<string, { label: string; tone: 'slate' | 'green' | 'amber' | 'orange' | 'rose' | 'blue' }> = {
  ON_THE_WAY: { label: 'Raste me', tone: 'orange' },
  BOTH: { label: 'Dono khaton me', tone: 'green' },
  BUYER_TO_RECEIVE: { label: 'Receive baqi', tone: 'amber' },
  PENDING: { label: 'Confirm baqi', tone: 'amber' },
  CONFIRMED: { label: 'Dono khaton me', tone: 'green' },
  DISPUTED: { label: 'Ikhtilaf', tone: 'rose' },
};

export function StatementPanel({ linkId }: { linkId: string }) {
  const money = useMoney();
  const q = useQuery({ queryKey: [TRADE_KEY, 'statement', linkId], queryFn: () => tradeApi.statement(linkId) });
  if (q.isLoading) return <Skeleton className="h-72 rounded-3xl" />;
  if (!q.data) return <Alert tone="danger">{tradeError(q.error, 'Hisaab nahi khula')}</Alert>;
  const s: Statement = q.data;
  const t = s.totals;
  const seller = s.link.side === 'SELLER';
  const gap = s.ownBalance != null ? Math.round((s.ownBalance - t.agreedBalance) * 100) / 100 : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={seller ? 'Lena hai (dono ka manna)' : 'Dena hai (dono ka manna)'} value={money(t.agreedBalance)} tone="brand" hint="Delivered maal − wapsi − confirm payments" />
        <Tile label="Raste me" value={money(t.onTheWay)} hint="Invoice bani, deliver nahi hua" tone={t.onTheWay > 0 ? 'amber' : undefined} />
        <Tile label="Confirm baqi" value={money(t.pendingFromSeller + t.pendingFromBuyer)}
          hint={seller ? `Dukaan ki ${money(t.pendingFromBuyer)} · aap ki ${money(t.pendingFromSeller)}` : `Supplier ki ${money(t.pendingFromSeller)} · aap ki ${money(t.pendingFromBuyer)}`}
          tone={t.pendingFromSeller + t.pendingFromBuyer > 0 ? 'amber' : undefined} />
        <Tile label="Paid (confirm)" value={money(t.paid)} hint={`Kul delivered ${money(t.delivered - t.returns)}`} tone="green" />
      </div>
      {t.disputed > 0 && <Alert tone="danger" icon={<AlertTriangle className="h-4 w-4" />}>{money(t.disputed)} ki payment par ikhtilaf hai — neeche dekhein aur doosri party se baat karein.</Alert>}
      {gap != null && Math.abs(gap) >= 1 && (
        <Alert tone="info">
          Aap ke {seller ? 'customer khate' : 'supplier khate'} me balance {money(s.ownBalance)} hai. Network ka hisaab {money(t.agreedBalance)} hai —
          farq {money(Math.abs(gap))} {t.toReceive > 0 && !seller ? '(receive baqi maal ki wajah se) ' : ''}link se pehle ke purane hisaab ya baqi kaam ka hai.
        </Alert>
      )}
      <Panel title="Statement" sub="Yehi hisaab dono taraf dikhta hai" flush>
        {!s.entries.length ? <Empty icon={<HandCoins className="h-5 w-5" />} text="Abhi koi Invoice ya payment nahi." /> : (
          <ul className="divide-y divide-slate-100">
            {s.entries.map((e, i) => {
              const st = ENTRY_STATE[e.state] ?? { label: e.state, tone: 'slate' as const };
              return (
                <li key={i} className={cn('grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 sm:grid-cols-[7rem_1fr_7rem_7rem_7rem] sm:px-5', !e.counts && 'opacity-70')}>
                  <span className="hidden text-[0.75rem] text-slate-500 sm:block">{dayLabel(e.at)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.875rem] font-medium text-slate-900">{e.text}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
                      <span className="sm:hidden">{dayLabel(e.at)}</span>{e.ref && <span>{e.ref}</span>}<Pill tone={st.tone}>{st.label}</Pill>
                    </span>
                  </span>
                  <span className={cn('text-right text-[0.875rem] font-semibold tabular-nums', e.debit ? 'text-slate-900' : 'text-success-700')}>
                    {e.debit ? money(e.debit) : `− ${money(e.credit)}`}
                  </span>
                  <span className="hidden text-right text-[0.75rem] text-slate-500 sm:block">{e.debit ? 'Invoice' : e.kind === 'RETURN' ? 'Wapsi' : 'Payment'}</span>
                  <span className="hidden text-right text-[0.875rem] tabular-nums text-slate-700 sm:block">{e.balance != null ? money(e.balance) : '—'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function PaymentsPanel({ linkId, side, canManage }: { linkId: string; side: Side; canManage: boolean }) {
  const money = useMoney();
  const qc = useQueryClient();
  const [record, setRecord] = useState(false);
  const [dispute, setDispute] = useState<Payment | null>(null);
  const q = useQuery({ queryKey: [TRADE_KEY, 'payments', linkId], queryFn: () => tradeApi.payments({ linkId }) });
  const refresh = () => qc.invalidateQueries({ queryKey: [TRADE_KEY] });
  const act = useMutation({
    mutationFn: ({ kind, id }: { kind: 'confirm' | 'cancel'; id: string }) => (kind === 'confirm' ? tradeApi.confirmPayment(id) : tradeApi.cancelPayment(id)),
    onSuccess: (_r, v) => { toast.success(v.kind === 'confirm' ? 'Payment confirm — aap ke khate me bhi likh di' : 'Payment wapas li'); refresh(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const rows = q.data ?? [];
  const other = side === 'SELLER' ? 'Dukaan' : 'Supplier';

  return (
    <Panel title="Payments" sub={`Ek taraf likhi payment doosri taraf confirm hone par hi us ke khate me jati hai`} flush
      right={canManage && <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setRecord(true)}>Add payment</Button>}>
      {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        : !rows.length ? <Empty icon={<HandCoins className="h-5 w-5" />} text="Abhi koi payment nahi." />
          : (
            <ul className="divide-y divide-slate-100">
              {rows.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', p.status === 'CONFIRMED' ? 'bg-success-50 text-success-700' : p.status === 'DISPUTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>
                    {p.status === 'CONFIRMED' ? <CheckCircle2 className="h-4 w-4" /> : p.status === 'DISPUTED' ? <XCircle className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(p.amount)} <span className="font-normal text-slate-500">· {METHOD_LABEL[p.method] ?? p.method}</span></span>
                    <span className="block truncate text-[0.75rem] text-slate-500">
                      {dayTime(p.paidAt)} · {p.mine ? 'Aap ne likhi' : `${other} ne likhi`}{p.reference ? ` · ${p.reference}` : ''}{p.disputeReason ? ` · ${p.disputeReason}` : ''}
                    </span>
                  </span>
                  <Pill tone={PAYMENT_STATUS[p.status].tone}>{p.status === 'PENDING' && p.mine ? `${other} confirm karega` : PAYMENT_STATUS[p.status].label}</Pill>
                  {canManage && (p.canConfirm || p.canDispute || p.canCancel) && (
                    <span className="flex w-full justify-end gap-2 sm:w-auto">
                      {p.canDispute && <Button size="sm" variant="ghost" onClick={() => setDispute(p)}>Dispute</Button>}
                      {p.canCancel && <Button size="sm" variant="ghost" leftIcon={<Undo2 className="h-4 w-4" />} onClick={async () => {
                        if (await confirmDialog({ title: 'Payment wapas lein?', text: 'Aap ke khate me ulti entry lag jayegi.', yes: 'Undo', danger: true })) act.mutate({ kind: 'cancel', id: p.id });
                      }}>Withdraw</Button>}
                      {p.canConfirm && <Button size="sm" variant="success" loading={act.isPending} leftIcon={<BadgeCheck className="h-4 w-4" />} onClick={() => act.mutate({ kind: 'confirm', id: p.id })}>Confirm</Button>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
      {record && <RecordPaymentModal linkId={linkId} side={side} onClose={() => setRecord(false)} />}
      {dispute && <DisputeModal payment={dispute} onClose={() => setDispute(null)} />}
    </Panel>
  );
}

function RecordPaymentModal({ linkId, side, onClose }: { linkId: string; side: Side; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<MoneyMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const save = useMutation({
    mutationFn: () => tradeApi.recordPayment(linkId, { amount: Number(amount), method, reference: reference.trim() || undefined, note: note.trim() || undefined }),
    onSuccess: () => { toast.success('Payment likh di — doosri party confirm karegi'); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); onClose(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  return (
    <Modal open onClose={onClose} title={side === 'SELLER' ? 'Payment received' : 'Payment to supplier'}
      description={side === 'SELLER' ? 'Aap ke customer khate me abhi lagegi; dukaan confirm karegi to us ke khate me bhi.' : 'Aap ke supplier khate me abhi lagegi; supplier confirm karega to us ke khate me bhi.'}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button loading={save.isPending} disabled={!(Number(amount) > 0)} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Raqam (Rs)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} autoFocus />
        <Select label="Kaise" value={method} onChange={(e) => setMethod(e.target.value as MoneyMethod)} options={METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))} />
        <Input label="Reference (marzi)" placeholder="TRX no., cheque no." value={reference} onChange={(e) => setReference(e.target.value)} wrapperClassName="sm:col-span-2" />
        <Textarea label="Note (marzi)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} wrapperClassName="sm:col-span-2" />
      </div>
    </Modal>
  );
}

function DisputeModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const qc = useQueryClient();
  const money = useMoney();
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => tradeApi.disputePayment(payment.id, reason.trim()),
    onSuccess: () => { toast.success('Ikhtilaf bhej diya'); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); onClose(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  return (
    <Modal open onClose={onClose} title={`${money(payment.amount)} par ikhtilaf`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button variant="danger" loading={save.isPending} disabled={reason.trim().length < 3} onClick={() => save.mutate()}>Send</Button></>}>
      <Textarea label="Wajah" rows={3} placeholder="Misal: yeh payment hamein nahi mili" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}

export const OnTheWayIcon = Truck;
