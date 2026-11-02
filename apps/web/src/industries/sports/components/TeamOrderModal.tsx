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
import { ArrowRight, Ban, BookUser, MessageCircle, PackageCheck, Pencil, Receipt, RotateCcw, Wallet } from 'lucide-react';
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
import { t } from '@core/i18n';

const OPEN: TeamOrderStatus[] = ['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY'];

export function orderSlip(o: TeamOrderDetail): PrintDoc {
  const roster = o.playerNames ?? [];
  return {
    title: `Team order ${o.orderNumber}`, // i18n-ignore
    subtitle: `${o.teamName}${o.organization ? ` · ${o.organization}` : ''}`,
    meta: [
      ['Rabta', `${o.contactPerson} · ${o.contactPhone}`], // i18n-ignore
      ['Order ki date', dayFull(o.createdAt)], // i18n-ignore
      ['Delivery', o.expectedDeliveryDate ? dayFull(o.expectedDeliveryDate) : 'Tay nahi'], // i18n-ignore
      ['Status', TEAM_STATUS[o.status]?.label ?? o.status], // i18n-ignore
    ],
    sections: [
      {
        kind: 'table', title: 'Maal', // i18n-ignore
        columns: [{ label: 'Item' }, { label: 'Size', wideOnly: true }, { label: 'Ginti', align: 'right' }, { label: 'Rate', align: 'right' }, { label: 'Total', align: 'right' }], // i18n-ignore
        rows: o.items.map((i) => [
          `${i.productName}${i.printingPrice ? ` (+printing ${formatPKR(i.printingPrice)})` : ''}`, // i18n-ignore
          [i.size, i.color].filter(Boolean).join(' · '), String(i.quantity),
          formatPKR(r2(i.unitPrice + (i.printingPrice ?? 0))), formatPKR(i.total),
        ]),
      },
      ...(roster.length ? [{
        kind: 'table' as const, title: `Printing list (${roster.length} players)`, // i18n-ignore
        columns: [{ label: '#' }, { label: 'Naam' }, { label: 'Number', align: 'right' as const }, { label: 'Size', align: 'right' as const }], // i18n-ignore
        rows: roster.map((p, i) => [String(i + 1), p.name, p.number, p.size]),
      }] : []),
      ...(o.customizationDetails ? [{ kind: 'text' as const, title: 'Printing / design', text: o.customizationDetails }] : []), // i18n-ignore
      {
        kind: 'rows', title: 'Hisaab', // i18n-ignore
        rows: [
          { label: 'Maal', value: formatPKR(o.subtotal) }, // i18n-ignore
          ...(o.discountAmount > 0 ? [{ label: `Discount ${o.discountPct}%`, value: `- ${formatPKR(o.discountAmount)}` }] : []), // i18n-ignore
          ...(o.shippingCharge > 0 ? [{ label: 'Delivery', value: formatPKR(o.shippingCharge) }] : []), // i18n-ignore
          ...(o.taxAmount > 0 ? [{ label: 'Tax', value: formatPKR(o.taxAmount) }] : []), // i18n-ignore
          { label: 'Kul', value: formatPKR(o.totalAmount), strong: true }, // i18n-ignore
          { label: 'Advance mila', value: formatPKR(o.advancePaid) }, // i18n-ignore
          { label: 'Baqi', value: formatPKR(o.balanceAmount), strong: true }, // i18n-ignore
        ],
      },
    ],
    footer: o.notes ?? undefined,
  };
}

export function TeamOrderModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const canKhata = usePermission(PERMISSIONS.CUSTOMERS_VIEW);
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
  const pay = useMutation({ mutationFn: (v: { amount: number; method: string }) => teamOrdersApi.recordPayment(id, { amount: v.amount, paymentMethod: v.method }), onSuccess: () => done(t('Payment team ke khate me jama')), onError: fail });
  const deliver = useMutation({
    mutationFn: (v: { amount: number; method: string }) => teamOrdersApi.updateStatus(id, { status: 'DELIVERED', paidNow: v.amount, paymentMethod: v.method }),
    onSuccess: () => done(t('Order deliver — bill ban gaya')), onError: fail,
  });
  const cancel = useMutation({ mutationFn: () => teamOrdersApi.cancel(id), onSuccess: () => done(t('Order cancel')), onError: fail });
  const refund = useMutation({ mutationFn: () => withManagerPin(t('Advance wapsi'), (pin) => teamOrdersApi.refund(id, pin), 'refund'), onSuccess: () => done(t('Advance cash me wapas')), onError: fail });

  const open = !!o && OPEN.includes(o.status);
  const next = o ? TEAM_NEXT[o.status] : undefined;
  const held = o ? r2(o.advancePaid - o.refunded) : 0;
  const roster = o?.playerNames ?? [];
  const wa = o && `https://wa.me/${waPhone(o.contactPhone)}?text=${encodeURIComponent(
    `Assalam o alaikum ${o.contactPerson}, ${o.teamName} ka order ${o.orderNumber} ${o.status === 'READY' ? 'tayyar hai' : `ka haal: ${TEAM_STATUS[o.status].label}`}. Kul ${formatPKR(o.totalAmount)}, advance ${formatPKR(o.advancePaid)}, baqi ${formatPKR(o.balanceAmount)}.`, // i18n-ignore
  )}`;

  return (
    <>
      <Modal open onClose={onClose} size="xl" title={o ? `${o.orderNumber} · ${o.teamName}` : t('Team order')}
        description={o ? `${o.contactPerson} · ${o.contactPhone}${o.organization ? ` · ${o.organization}` : ''}` : undefined}
        footer={o && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <PrintButton doc={() => orderSlip(o)} label={t('Slip print')} size="sm" />
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />{t('WhatsApp')}</a>}
            {o.customerId && canKhata && <Link to={`/customers/${o.customerId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><BookUser className="h-4 w-4" />{t('Team ka khata')}</Link>}
            {o.sale && <Link to={receiptLink(o.sale.id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Receipt className="h-4 w-4" />{t('Bill {{saleNumber}}', { saleNumber: o.sale.saleNumber })}</Link>}
            <span className="flex-1" />
            {open && <Button variant="ghost" size="sm" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setCancelling(true)}>{t('Cancel')}</Button>}
            {open && <Link to={`/sports/team-orders/${o.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="h-4 w-4" />{t('Badlein')}</Link>}
            {o.status === 'CANCELLED' && held > 0 && canRefund && (
              <Button variant="danger" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} loading={refund.isPending} onClick={() => refund.mutate()}>{t('Advance wapas ({{held}})', { held: formatPKR(held) })}</Button>
            )}
            {open && o.balanceAmount > 0 && <Button variant="secondary" size="sm" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setTaking('pay')}>{t('Payment lein')}</Button>}
            {open && next && <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />} loading={step.isPending} onClick={() => step.mutate(next as TeamOrderStatus)}>{TEAM_STATUS[next].label}</Button>}
            {open && <Button size="sm" leftIcon={<PackageCheck className="h-4 w-4" />} onClick={() => setTaking('deliver')}>{t('Deliver + bill')}</Button>}
          </div>
        )}>
        {!o ? <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div> : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-slate-600">
                <StatusPill tone={TEAM_STATUS[o.status].tone}>{TEAM_STATUS[o.status].label}</StatusPill>
                <span>{t('Order {{createdAt}}', { createdAt: dayFull(o.createdAt) })}</span>
                <span>{t('· Delivery {{value}}', { value: o.expectedDeliveryDate ? dayFull(o.expectedDeliveryDate) : t('tay nahi') })}</span>
                {o.poNumber && <span>{t('· PO {{poNumber}}', { poNumber: o.poNumber })}</span>}
              </div>
              <Table minWidth="34rem">
                <THead><Tr><Th>{t('Item')}</Th><Th>{t('Size / rang')}</Th><Th align="right">{t('Ginti')}</Th><Th align="right">{t('Rate')}</Th><Th align="right">{t('Total')}</Th></Tr></THead>
                <TBody>
                  {o.items.map((i, n) => (
                    <Tr key={n}>
                      <Td><p className="font-medium text-slate-900">{i.productName}</p>{(i.printingPrice ?? 0) > 0 && <p className="text-[0.75rem] text-violet-700">{t('Printing {{formatPKR}} / piece', { formatPKR: formatPKR(i.printingPrice!) })}</p>}{i.customizationNotes && <p className="text-[0.75rem] text-slate-500">{i.customizationNotes}</p>}</Td>
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
                  <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">{t('Printing list · {{count}} players', { count: roster.length })}</p>
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
              {o.customizationDetails && <Alert tone="info" title={t('Printing / design')}>{o.customizationDetails}</Alert>}
              {(o.notes || o.internalNotes) && <p className="whitespace-pre-line text-[0.8125rem] text-slate-600">{[o.notes, o.internalNotes].filter(Boolean).join('\n')}</p>}
            </div>
            <aside className="h-fit rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <Line label={t('Maal ({{totalQuantity}} piece)', { totalQuantity: o.totalQuantity })} value={formatPKR(o.subtotal)} />
              {o.discountAmount > 0 && <Line label={t('Discount {{discountPct}}%', { discountPct: o.discountPct })} value={`- ${formatPKR(o.discountAmount)}`} />}
              {o.shippingCharge > 0 && <Line label={t('Delivery')} value={formatPKR(o.shippingCharge)} />}
              {o.taxAmount > 0 && <Line label={t('Tax')} value={formatPKR(o.taxAmount)} />}
              <Line strong label={t('Kul')} value={formatPKR(o.totalAmount)} />
              <Line label={t('Advance / payment')} value={formatPKR(o.advancePaid)} tone="text-emerald-700" />
              {o.refunded > 0 && <Line label={t('Advance wapas diya')} value={formatPKR(o.refunded)} tone="text-rose-700" />}
              <Line strong label={t('Baqi')} value={formatPKR(o.balanceAmount)} tone={o.balanceAmount > 0 ? 'text-amber-700' : undefined} />
              <p className="mt-3 text-[0.75rem] text-slate-500">{t('Advance team ke khate me jama rehta hai aur deliver ke bill me lag jata hai.')}</p>
            </aside>
          </div>
        )}
      </Modal>

      {o && taking === 'pay' && (
        <TakePaymentModal title={t('Advance / payment')} description={t('{{orderNumber}} · baqi {{balanceAmount}}', { orderNumber: o.orderNumber, balanceAmount: formatPKR(o.balanceAmount) })} amount={o.balanceAmount} max={o.balanceAmount}
          hint={t('Team ke khate me advance jama hoga')} loading={pay.isPending} onClose={() => setTaking(null)}
          onConfirm={(amount, method) => pay.mutate({ amount, method })} />
      )}
      {o && taking === 'deliver' && (
        <TakePaymentModal title={t('Deliver aur bill')} description={t('Kul {{totalAmount}} · advance {{advancePaid}}', { totalAmount: formatPKR(o.totalAmount), advancePaid: formatPKR(o.advancePaid) })} amount={o.balanceAmount} max={o.balanceAmount} allowZero
          hint={t('Abhi jitna mila likhein — baqi team ke khate me udhaar')} confirmLabel={t('Deliver karein')} loading={deliver.isPending}
          onClose={() => setTaking(null)} onConfirm={(amount, method) => deliver.mutate({ amount, method })} />
      )}
      {o && cancelling && (
        <Modal open onClose={() => setCancelling(false)} size="sm" title={t('{{orderNumber}} cancel karein?', { orderNumber: o.orderNumber })}
          description={o.advancePaid > 0 ? t('{{advancePaid}} advance team ke khate me rahega — chahein to baad me cash wapas karein.', { advancePaid: formatPKR(o.advancePaid) }) : t('Order band ho jayega. Kuch delete nahi hota.')}
          footer={<div className="flex w-full gap-2"><Button variant="secondary" className="flex-1" onClick={() => setCancelling(false)}>{t('Nahi')}</Button><Button variant="danger" className="flex-1" loading={cancel.isPending} onClick={() => cancel.mutate()}>{t('Haan, cancel')}</Button></div>}>
          <p className="text-[0.875rem] text-slate-600">{t('{{teamName}} · {{totalQuantity}} piece · {{totalAmount}}', { teamName: o.teamName, totalQuantity: o.totalQuantity, totalAmount: formatPKR(o.totalAmount) })}</p>
        </Modal>
      )}
    </>
  );
}
