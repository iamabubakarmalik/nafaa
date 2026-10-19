/**
 * One quotation: lines and totals, print and WhatsApp, the customer's
 * answer, a revision, and the bill. Billing makes a normal sale at the
 * quoted rates (cash, card, split or udhaar) with delivery and labour as
 * bill charges, so stock, khata, day book and reports all see it; the
 * quotation then points at that bill. A challan for site delivery follows
 * from the bill.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Edit3, FileText, GraduationCap, MessageCircle, Receipt, Send, Truck } from 'lucide-react';
import { Card, Modal, Button, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { withManagerPin } from '@core/security/ManagerPin';
import { PosCheckoutModal, type PosCheckoutResult } from '@modules/pos/components';
import { keepAdvance, salePayment } from '@modules/pos/lib/posCheckout';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { quotationsApi, type Quotation, type QuotationStatus } from '../api/quotations.api';
import { QUOTE_STATUS, UNIT_LABEL, errorText, qty, shortDate } from '../lib/meta';
import type { Unit } from '../api/products.api';

const OPEN: QuotationStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'REVISED'];

function quoteDoc(q: Quotation): PrintDoc {
  const charges = q.deliveryCharges + q.laborCharges + q.otherCharges;
  return {
    title: `Quotation ${q.quotationNumber}${q.revisionNumber ? ` (R${q.revisionNumber})` : ''}`,
    subtitle: q.customerName,
    meta: [['Tareekh', shortDate(q.quotationDate ?? q.createdAt)], ['Chalegi', shortDate(q.validUntil)], ...(q.customerPhone ? [['Phone', q.customerPhone] as [string, string]] : []), ...(q.project ? [['Site', q.project.name] as [string, string]] : [])],
    sections: [
      {
        kind: 'table', title: 'Items',
        columns: [{ label: '#', wideOnly: true }, { label: 'Item' }, { label: 'Qty', align: 'right' }, { label: 'Rate', align: 'right', wideOnly: true }, { label: 'Amount', align: 'right' }],
        rows: q.items.map((i, n) => [String(n + 1), [i.itemName, i.specifications].filter(Boolean).join(' — '), `${qty(i.quantity)} ${UNIT_LABEL[i.unit as Unit] ?? ''}`, formatPKR(i.unitPrice), formatPKR(i.total)]),
      },
      {
        kind: 'rows', rows: [
          { label: 'Items', value: formatPKR(q.subtotal) },
          ...(q.discount > 0 ? [{ label: 'Discount', value: `−${formatPKR(q.discount)}` }] : []),
          ...(q.taxAmount > 0 ? [{ label: `Tax ${q.taxPct ? `${q.taxPct}%` : ''}`, value: formatPKR(q.taxAmount) }] : []),
          ...(charges > 0 ? [{ label: 'Kiraya / mazdoori', value: formatPKR(charges) }] : []),
          { label: 'Kul', value: formatPKR(q.total), strong: true },
        ],
      },
      ...(q.paymentTerms || q.deliveryTerms ? [{ kind: 'text' as const, title: 'Shartein', text: [q.paymentTerms && `Payment: ${q.paymentTerms}`, q.deliveryTerms && `Delivery: ${q.deliveryTerms}`].filter(Boolean).join('\n') }] : []),
      ...(q.customerNotes ? [{ kind: 'text' as const, title: 'Note', text: q.customerNotes }] : []),
    ],
    footer: `Ye quotation ${shortDate(q.validUntil)} tak hai. Rate us ke baad badal sakte hain.`,
  };
}

function whatsappText(q: Quotation) {
  const lines = q.items.map((i) => `• ${i.itemName}${i.specifications ? ` (${i.specifications})` : ''} — ${qty(i.quantity)} x ${formatPKR(i.unitPrice)} = ${formatPKR(i.total)}`);
  return [`*Quotation ${q.quotationNumber}*`, q.customerName, '', ...lines, '', `*Kul: ${formatPKR(q.total)}*`, `${shortDate(q.validUntil)} tak`, q.paymentTerms ? `Payment: ${q.paymentTerms}` : ''].filter((x) => x !== '').join('\n');
}

export default function QuotationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const shopId = useShopParam();
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const [billing, setBilling] = useState(false);
  const [closing, setClosing] = useState(false);

  const { data: q, isLoading } = useQuery({ queryKey: ['hardware-quotation', id], queryFn: () => quotationsApi.getOne(id), enabled: !!id });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['hardware-quotation', id] });
    qc.invalidateQueries({ queryKey: ['hardware-quotations'] });
    qc.invalidateQueries({ queryKey: ['hardware-quotations-summary'] });
  };
  const status = useMutation({
    mutationFn: (s: QuotationStatus) => quotationsApi.updateStatus(id, s),
    onSuccess: (r) => { refresh(); toast.success(QUOTE_STATUS[r.status].label); },
    onError: (e) => toast.error(errorText(e, 'Status nahi badla')),
  });
  const close = useMutation({
    mutationFn: () => quotationsApi.close(id),
    onSuccess: () => { refresh(); setClosing(false); toast.success('Quotation band ho gayi — record mehfooz hai'); },
    onError: (e) => toast.error(errorText(e, 'Band nahi hui')),
  });

  // The bill: quoted lines at their net rate; delivery, labour and other charges ride as bill charges.
  const billTotal = q ? q.subtotal - q.discount + q.deliveryCharges + q.laborCharges + q.otherCharges : 0;
  const bill = useMutation({
    mutationFn: async (d: PosCheckoutResult) => {
      if (!q) throw new Error('Quotation nahi mili');
      if (!shopId) throw new Error('Pehle upar se shop chunein');
      const serviceCharges = [
        q.deliveryCharges > 0 && { type: 'DELIVERY', label: 'Delivery', amount: q.deliveryCharges },
        q.laborCharges > 0 && { type: 'INSTALLATION', label: 'Mazdoori', amount: q.laborCharges },
        q.otherCharges > 0 && { type: 'OTHER', label: 'Aur kharcha', amount: q.otherCharges },
      ].filter(Boolean) as Array<{ type: string; label: string; amount: number }>;
      const sale = await withManagerPin('Quotation ka bill', (managerPin) => salesApi.create({
        ...(managerPin && { managerPin }),
        shopId,
        customerId: q.customerId || undefined,
        ...salePayment(d, billTotal),
        discount: q.discount || undefined,
        serviceCharges: serviceCharges.length ? serviceCharges : undefined,
        note: `Quotation ${q.quotationNumber}`,
        items: q.items.map((i) => ({ productId: i.productId!, quantity: i.quantity, priceOverride: Math.round((i.total / i.quantity) * 10000) / 10000 })),
      }));
      await keepAdvance(d, billTotal, q.customerId || undefined, sale.saleNumber);
      await quotationsApi.updateStatus(q.id, 'CONVERTED', `Bill ${sale.saleNumber}`, sale.id).catch(() => toast.error('Bill ban gaya, magar quotation par nishan nahi laga — dobara khol kar dekhein'));
      return sale;
    },
    onSuccess: (sale) => {
      setBilling(false);
      refresh();
      ['products-for-pos', 'sales-history', 'customers', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Bill ${sale.saleNumber} ban gaya`, { action: { label: 'Challan banayein', onClick: () => navigate(`/hardware/deliveries/new?sale=${sale.id}`) }, duration: 8000 });
    },
    onError: (e) => { if ((e as Error)?.message !== 'Cancelled') toast.error(errorText(e, (e as Error)?.message || 'Bill nahi bana')); },
  });

  if (isLoading || !q) {
    return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></PageShell>;
  }

  const st = QUOTE_STATUS[q.status];
  const open = canSell && (OPEN.includes(q.status) || q.status === 'EXPIRED');
  const missing = q.items.filter((i) => !i.productId);
  const canBill = canSell && q.status !== 'CONVERTED' && q.status !== 'REJECTED' && missing.length === 0;
  const charges = q.deliveryCharges + q.laborCharges + q.otherCharges;
  const wa = `https://wa.me/${(q.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(whatsappText(q))}`;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Quotation — aage kya karein" onClose={guide.close}
          steps={[
            { icon: Send, color: '#0891b2', title: 'Bhejein', text: 'Print ya WhatsApp se customer ko bhejein, phir "Bhej di" dabayein.' },
            { icon: Edit3, color: '#7c3aed', title: 'Revision', text: 'Customer rate ya quantity badalwaye to "Revision" — purana number hi rehta hai, R1, R2 lagta hai.' },
            { icon: Receipt, color: '#16a34a', title: 'Bill', text: '"Bill banayein" se isi rate par sale banti hai — cash, card, split ya udhaar (customer ka khata).' },
            { icon: Truck, color: '#a16207', title: 'Challan', text: 'Bill ke baad site par maal bhejne ke liye challan banayein; maal kai challan me bhi ja sakta hai.' },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}

      <PageHero
        title={<HeroBack to="/hardware/quotations" label="Quotations">{q.quotationNumber}{q.revisionNumber ? ` · R${q.revisionNumber}` : ''}</HeroBack>}
        chip={st.label}
        meta={`${q.customerName}${q.project ? ` · ${q.project.name}` : ''} · ${shortDate(q.createdAt)}`}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => quoteDoc(q)} label="Print" /></span>
          {q.customerPhone && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
          {canSell && q.status !== 'CONVERTED' && <Link to={`/hardware/quotations/${q.id}/edit`} className={heroButton}><Edit3 className="h-4 w-4" />Revision</Link>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canBill && <button type="button" onClick={() => setBilling(true)} className={heroPrimaryButton}><Receipt className="h-4 w-4" />Bill banayein</button>}
        </>}
        stats={[
          { label: 'Kul amount', value: formatPKR(q.total) },
          { label: 'Items', value: String(q.items.length) },
          { label: 'Chalegi', value: shortDate(q.validUntil) },
        ]} />

      {q.sale && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-4 w-4" /><span className="text-[0.875rem] font-medium">Bill {q.sale.saleNumber} ban chuka hai{q.sale.status === 'VOIDED' ? ' (void ho gaya)' : ''}</span>
          <Link to={`/sales?q=${encodeURIComponent(q.sale.saleNumber)}`} className="ml-auto text-[0.8125rem] font-semibold hover:underline">Bill dekhein →</Link>
          {q.sale.status !== 'VOIDED' && <Link to={`/hardware/deliveries/new?sale=${q.sale.id}`} className="text-[0.8125rem] font-semibold hover:underline">Challan banayein →</Link>}
        </div>
      )}
      {missing.length > 0 && q.status !== 'CONVERTED' && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">
          {missing.map((i) => i.itemName).join(', ')} catalog me nahi — bill ke liye pehle product banayein, phir revision me catalog wala item chunein.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card flush title="Items" description={`${q.items.length} line`}>
          <Table minWidth="36rem">
            <THead><Tr><Th>#</Th><Th>Item</Th><Th align="right">Quantity</Th><Th align="right">Rate</Th><Th align="right">Amount</Th></Tr></THead>
            <TBody>
              {q.items.map((i, n) => (
                <Tr key={i.id ?? n}>
                  <Td className="text-slate-400">{n + 1}</Td>
                  <Td><p className="font-medium text-slate-900">{i.itemName}</p>{i.specifications && <p className="text-[0.75rem] text-slate-500">{i.specifications}</p>}</Td>
                  <Td align="right" className="tabular-nums">{qty(i.quantity)} {UNIT_LABEL[i.unit as Unit] ?? ''}</Td>
                  <Td align="right" className="tabular-nums">{formatPKR(i.unitPrice)}</Td>
                  <Td align="right" className="font-semibold tabular-nums">{formatPKR(i.total)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>

        <aside className="space-y-4">
          <Card title="Hisaab">
            <dl className="space-y-1.5 text-[0.875rem]">
              <div className="flex justify-between"><dt className="text-slate-500">Items</dt><dd className="tabular-nums">{formatPKR(q.subtotal)}</dd></div>
              {q.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="tabular-nums">−{formatPKR(q.discount)}</dd></div>}
              {q.taxAmount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="tabular-nums">{formatPKR(q.taxAmount)}</dd></div>}
              {charges > 0 && <div className="flex justify-between"><dt className="text-slate-500">Kiraya / mazdoori</dt><dd className="tabular-nums">{formatPKR(charges)}</dd></div>}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-[1.0625rem] font-bold"><dt>Kul</dt><dd className="tabular-nums">{formatPKR(q.total)}</dd></div>
            </dl>
          </Card>
          {open && (
            <Card title="Customer ka jawab">
              <div className="grid gap-2">
                {q.status !== 'SENT' && q.status !== 'VIEWED' && <Button variant="secondary" leftIcon={<Send className="h-4 w-4" />} loading={status.isPending && status.variables === 'SENT'} onClick={() => status.mutate('SENT')}>Bhej di</Button>}
                <Button variant="success" leftIcon={<CheckCircle2 className="h-4 w-4" />} loading={status.isPending && status.variables === 'ACCEPTED'} onClick={() => status.mutate('ACCEPTED')}>Customer ne maan li</Button>
                <Button variant="ghost" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setClosing(true)}>Na mani / band karein</Button>
              </div>
            </Card>
          )}
          {canSell && q.status === 'ACCEPTED' && (
            <Card><Button variant="ghost" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setClosing(true)}>Band karein</Button></Card>
          )}
          {(q.paymentTerms || q.deliveryTerms || q.customerNotes || q.internalNotes) && (
            <Card title="Shartein aur note">
              <dl className="space-y-2 text-[0.875rem]">
                {q.paymentTerms && <div><dt className="text-slate-500">Payment</dt><dd>{q.paymentTerms}</dd></div>}
                {q.deliveryTerms && <div><dt className="text-slate-500">Delivery</dt><dd>{q.deliveryTerms}</dd></div>}
                {q.customerNotes && <div><dt className="text-slate-500">Customer note</dt><dd>{q.customerNotes}</dd></div>}
                {q.internalNotes && <div><dt className="text-slate-500">Andar ka note</dt><dd className="whitespace-pre-line">{q.internalNotes}</dd></div>}
              </dl>
            </Card>
          )}
        </aside>
      </div>

      {billing && (
        <PosCheckoutModal total={billTotal} itemCount={q.items.length} loading={bill.isPending} initMode="full"
          customerName={q.customerId ? q.customerName : undefined} hasCustomer={!!q.customerId} customerId={q.customerId}
          allowSplit onConfirm={(d) => bill.mutate(d)} onClose={() => setBilling(false)} />
      )}
      {billing && q.taxAmount > 0 && (
        <p className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 shadow ring-1 ring-amber-200">
          Quotation ka tax ({formatPKR(q.taxAmount)}) bill me nahi jata — bill {formatPKR(billTotal)} ka banega.
        </p>
      )}

      <Modal open={closing} onClose={() => setClosing(false)} size="sm" title="Quotation band karein?"
        description="Customer ne nahi mani ya ab zaroorat nahi. Record mehfooz rehta hai, dobara bheji ja sakti hai."
        footer={<><Button variant="secondary" onClick={() => setClosing(false)}>Wapas</Button><Button variant="danger" loading={close.isPending} onClick={() => close.mutate()}>Band karein</Button></>}>
        <p className={cn('flex items-center gap-2 text-[0.875rem] text-slate-600')}><FileText className="h-4 w-4" />{q.quotationNumber} · {formatPKR(q.total)}</p>
      </Modal>
    </PageShell>
  );
}
