/**
 * One team order: kit lines, the printing list, money, and the next step.
 * Payments go to the team's khata as advance; "Deliver" makes the bill
 * (stock leaves then) and anything not paid stays on the team's khata.
 * A cancelled order's advance can be given back in cash.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Ban, MessageCircle, PackageCheck, Pencil, Receipt, RotateCcw, Wallet } from 'lucide-react';
import { Alert, Button, Modal, Skeleton, Table, TBody, THead, Td, Th, Tr } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { withManagerPin } from '@core/security/ManagerPin';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { TakePaymentModal } from '@modules/pos/components';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import { teamOrdersApi, type TeamOrderDetail, type TeamOrderStatus } from '../api/team-orders.api';
import { MONEY_KEYS, TEAM_KEY, TEAM_NEXT, TEAM_STATUS, apiError, dayFull, r2, waPhone } from './meta';
import { Line, StatusPill } from './ui';

const OPEN: TeamOrderStatus[] = ['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY'];

export function orderSlip(o: TeamOrderDetail): PrintDoc {
  const roster = o.playerNames ?? [];
  return {
    title: `Team order ${o.orderNumber}`,
    subtitle: `${o.teamName}${o.organization ? ` · ${o.organization}` : ''}`,
    meta: [
      ['Rabta', `${o.contactPerson} · ${o.contactPhone}`],
      ['Order ki date', dayFull(o.createdAt)],
      ['Delivery', o.expectedDeliveryDate ? dayFull(o.expectedDeliveryDate) : 'Tay nahi'],
      ['Status', TEAM_STATUS[o.status]?.label ?? o.status],
    ],
    sections: [
      {
        kind: 'table', title: 'Maal',
        columns: [{ label: 'Item' }, { label: 'Size', wideOnly: true }, { label: 'Ginti', align: 'right' }, { label: 'Rate', align: 'right' }, { label: 'Total', align: 'right' }],
        rows: o.items.map((i) => [
          `${i.productName}${i.printingPrice ? ` (+printing ${formatPKR(i.printingPrice)})` : ''}`,
          [i.size, i.color].filter(Boolean).join(' · '), String(i.quantity),
          formatPKR(r2(i.unitPrice + (i.printingPrice ?? 0))), formatPKR(i.total),
        ]),
      },
      ...(roster.length ? [{
        kind: 'table' as const, title: `Printing list (${roster.length} players)`,
        columns: [{ label: '#' }, { label: 'Naam' }, { label: 'Number', align: 'right' as const }, { label: 'Size', align: 'right' as const }],
        rows: roster.map((p, i) => [String(i + 1), p.name, p.number, p.size]),
      }] : []),
      ...(o.customizationDetails ? [{ kind: 'text' as const, title: 'Printing / design', text: o.customizationDetails }] : []),
      {
        kind: 'rows', title: 'Hisaab',
        rows: [
          { label: 'Maal', value: formatPKR(o.subtotal) },
          ...(o.discountAmount > 0 ? [{ label: `Discount ${o.discountPct}%`, value: `- ${formatPKR(o.discountAmount)}` }] : []),
          ...(o.shippingCharge > 0 ? [{ label: 'Delivery', value: formatPKR(o.shippingCharge) }] : []),
          ...(o.taxAmount > 0 ? [{ label: 'Tax', value: formatPKR(o.taxAmount) }] : []),
          { label: 'Kul', value: formatPKR(o.totalAmount), strong: true },
          { label: 'Advance mila', value: formatPKR(o.advancePaid) },
          { label: 'Baqi', value: formatPKR(o.balanceAmount), strong: true },
        ],
      },
    ],
    footer: o.notes ?? undefined,
  };
}

export function TeamOrderModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const [taking, setTaking] = useState<'pay' | 'deliver' | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const q = useQuery({ queryKey: [TEAM_KEY, 'one', id], queryFn: () => teamOrdersApi.getOne(id) });
  const o = q.data;

  const done = (msg: string) => {
    toast.success(msg);
    setTaking(null); setCancelling(false);
    [TEAM_KEY, 'sports-team-orders-summary', 'sports-dashboard-overview', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const fail = (e: unknown) => toast.error(apiError(e));
  const step = useMutation({ mutationFn: (s: TeamOrderStatus) => teamOrdersApi.updateStatus(id, { status: s }), onSuccess: (r) => done(`${r.orderNumber}: ${TEAM_STATUS[r.status].label}`), onError: fail });
  const pay = useMutation({ mutationFn: (v: { amount: number; method: string }) => teamOrdersApi.recordPayment(id, { amount: v.amount, paymentMethod: v.method }), onSuccess: () => done('Payment team ke khate me jama'), onError: fail });
  const deliver = useMutation({
    mutationFn: (v: { amount: number; method: string }) => teamOrdersApi.updateStatus(id, { status: 'DELIVERED', paidNow: v.amount, paymentMethod: v.method }),
    onSuccess: () => done('Order deliver — bill ban gaya'), onError: fail,
  });
  const cancel = useMutation({ mutationFn: () => teamOrdersApi.cancel(id), onSuccess: () => done('Order cancel'), onError: fail });
  const refund = useMutation({ mutationFn: () => withManagerPin('Advance wapsi', (pin) => teamOrdersApi.refund(id, pin), 'refund'), onSuccess: () => done('Advance cash me wapas'), onError: fail });

  const open = !!o && OPEN.includes(o.status);
  const next = o ? TEAM_NEXT[o.status] : undefined;
  const held = o ? r2(o.advancePaid - o.refunded) : 0;
  const roster = o?.playerNames ?? [];
  const wa = o && `https://wa.me/${waPhone(o.contactPhone)}?text=${encodeURIComponent(
    `Assalam o alaikum ${o.contactPerson}, ${o.teamName} ka order ${o.orderNumber} ${o.status === 'READY' ? 'tayyar hai' : `ka haal: ${TEAM_STATUS[o.status].label}`}. Kul ${formatPKR(o.totalAmount)}, advance ${formatPKR(o.advancePaid)}, baqi ${formatPKR(o.balanceAmount)}.`,
  )}`;

  return (
    <>
      <Modal open onClose={onClose} size="xl" title={o ? `${o.orderNumber} · ${o.teamName}` : 'Team order'}
        description={o ? `${o.contactPerson} · ${o.contactPhone}${o.organization ? ` · ${o.organization}` : ''}` : undefined}
        footer={o && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <PrintButton doc={() => orderSlip(o)} label="Slip print" size="sm" />
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {o.sale && <Link to={receiptLink(o.sale.id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Receipt className="h-4 w-4" />Bill {o.sale.saleNumber}</Link>}
            <span className="flex-1" />
            {open && <Button variant="ghost" size="sm" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setCancelling(true)}>Cancel</Button>}
            {open && <Link to={`/sports/team-orders/${o.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="h-4 w-4" />Badlein</Link>}
            {o.status === 'CANCELLED' && held > 0 && canRefund && (
              <Button variant="danger" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} loading={refund.isPending} onClick={() => refund.mutate()}>Advance wapas ({formatPKR(held)})</Button>
            )}
            {open && o.balanceAmount > 0 && <Button variant="secondary" size="sm" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setTaking('pay')}>Payment lein</Button>}
            {open && next && <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />} loading={step.isPending} onClick={() => step.mutate(next as TeamOrderStatus)}>{TEAM_STATUS[next].label}</Button>}
            {open && <Button size="sm" leftIcon={<PackageCheck className="h-4 w-4" />} onClick={() => setTaking('deliver')}>Deliver + bill</Button>}
          </div>
        )}>
        {!o ? <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div> : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-slate-600">
                <StatusPill tone={TEAM_STATUS[o.status].tone}>{TEAM_STATUS[o.status].label}</StatusPill>
                <span>Order {dayFull(o.createdAt)}</span>
                <span>· Delivery {o.expectedDeliveryDate ? dayFull(o.expectedDeliveryDate) : 'tay nahi'}</span>
                {o.poNumber && <span>· PO {o.poNumber}</span>}
              </div>
              <Table minWidth="34rem">
                <THead><Tr><Th>Item</Th><Th>Size / rang</Th><Th align="right">Ginti</Th><Th align="right">Rate</Th><Th align="right">Total</Th></Tr></THead>
                <TBody>
                  {o.items.map((i, n) => (
                    <Tr key={n}>
                      <Td><p className="font-medium text-slate-900">{i.productName}</p>{(i.printingPrice ?? 0) > 0 && <p className="text-[0.75rem] text-violet-700">Printing {formatPKR(i.printingPrice!)} / piece</p>}{i.customizationNotes && <p className="text-[0.75rem] text-slate-500">{i.customizationNotes}</p>}</Td>
                      <Td>{[i.size, i.color].filter(Boolean).join(' · ') || '—'}</Td>
                      <Td align="right">{i.quantity}</Td>
                      <Td align="right">{formatPKR(r2(i.unitPrice + (i.printingPrice ?? 0)))}</Td>
                      <Td align="right" className="font-semibold">{formatPKR(i.total)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
              {roster.length > 0 && (
                <div>
                  <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">Printing list · {roster.length} players</p>
                  <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                    {roster.map((p, n) => (
                      <div key={n} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-[0.8125rem] ring-1 ring-slate-200">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white font-bold tabular-nums text-slate-800 ring-1 ring-slate-200">{p.number || '–'}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{p.name || '—'}</span>
                        {p.size && <span className="text-slate-500">{p.size}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {o.customizationDetails && <Alert tone="info" title="Printing / design">{o.customizationDetails}</Alert>}
              {(o.notes || o.internalNotes) && <p className="whitespace-pre-line text-[0.8125rem] text-slate-600">{[o.notes, o.internalNotes].filter(Boolean).join('\n')}</p>}
            </div>
            <aside className="h-fit rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <Line label={`Maal (${o.totalQuantity} piece)`} value={formatPKR(o.subtotal)} />
              {o.discountAmount > 0 && <Line label={`Discount ${o.discountPct}%`} value={`- ${formatPKR(o.discountAmount)}`} />}
              {o.shippingCharge > 0 && <Line label="Delivery" value={formatPKR(o.shippingCharge)} />}
              {o.taxAmount > 0 && <Line label="Tax" value={formatPKR(o.taxAmount)} />}
              <Line strong label="Kul" value={formatPKR(o.totalAmount)} />
              <Line label="Advance / payment" value={formatPKR(o.advancePaid)} tone="text-emerald-700" />
              {o.refunded > 0 && <Line label="Advance wapas diya" value={formatPKR(o.refunded)} tone="text-rose-700" />}
              <Line strong label="Baqi" value={formatPKR(o.balanceAmount)} tone={o.balanceAmount > 0 ? 'text-amber-700' : undefined} />
              <p className="mt-3 text-[0.75rem] text-slate-500">Advance team ke khate me jama rehta hai aur deliver ke bill me lag jata hai.</p>
            </aside>
          </div>
        )}
      </Modal>

      {o && taking === 'pay' && (
        <TakePaymentModal title="Advance / payment" description={`${o.orderNumber} · baqi ${formatPKR(o.balanceAmount)}`} amount={o.balanceAmount} max={o.balanceAmount}
          hint="Team ke khate me advance jama hoga" loading={pay.isPending} onClose={() => setTaking(null)}
          onConfirm={(amount, method) => pay.mutate({ amount, method })} />
      )}
      {o && taking === 'deliver' && (
        <TakePaymentModal title="Deliver aur bill" description={`Kul ${formatPKR(o.totalAmount)} · advance ${formatPKR(o.advancePaid)}`} amount={o.balanceAmount} max={o.balanceAmount} allowZero
          hint="Abhi jitna mila likhein — baqi team ke khate me udhaar" confirmLabel="Deliver karein" loading={deliver.isPending}
          onClose={() => setTaking(null)} onConfirm={(amount, method) => deliver.mutate({ amount, method })} />
      )}
      {o && cancelling && (
        <Modal open onClose={() => setCancelling(false)} size="sm" title={`${o.orderNumber} cancel karein?`}
          description={o.advancePaid > 0 ? `${formatPKR(o.advancePaid)} advance team ke khate me rahega — chahein to baad me cash wapas karein.` : 'Order band ho jayega. Kuch delete nahi hota.'}
          footer={<div className="flex w-full gap-2"><Button variant="secondary" className="flex-1" onClick={() => setCancelling(false)}>Nahi</Button><Button variant="danger" className="flex-1" loading={cancel.isPending} onClick={() => cancel.mutate()}>Haan, cancel</Button></div>}>
          <p className="text-[0.875rem] text-slate-600">{o.teamName} · {o.totalQuantity} piece · {formatPKR(o.totalAmount)}</p>
        </Modal>
      )}
    </>
  );
}
