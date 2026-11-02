/**
 * One purchase or order: what was ordered, received and sent back in the
 * unit it was bought in, money, and the actions that fit its state — receive
 * an order (all or part), return goods, cancel, print (A4 purchase bill or
 * order) and send the order to the supplier on WhatsApp.
 */

import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, BookOpen, GraduationCap, MessageCircle, PackageCheck, Phone, Printer, RotateCcw, Wheat } from 'lucide-react';
import { Button, Card, Modal, PageHero, controlClass, PageShell, Table, TBody, THead, Td, Th, Tr, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PurchasePrintModal } from '../components/PurchasePrintModal';
import { LandedCostPanel } from '../components/LandedCostPanel';
import { getReceiptSetup } from '@core/receipt/setup';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { purchasesApi, type Purchase, type PurchaseItem } from '../api/purchases.api';
import { STATUS } from './PurchasesListPage';
import { t } from '@core/i18n';

export interface PurchaseDetailConfig {
  /** Extra under a line, e.g. electronics serial entry. */
  itemExtra?: (args: { item: PurchaseItem; purchase: Purchase }) => ReactNode;
}

const money = (n: number) => formatPKR(n);
const q3 = (n: number) => Number((n ?? 0).toFixed(3)).toLocaleString('en-PK');
const rate = (i: PurchaseItem) => i.conversionRate || 1;
const left = (i: PurchaseItem) => Math.max((i.baseQuantity ?? i.quantity) - (i.receivedQty ?? 0), 0);
const canReturn = (i: PurchaseItem) => Math.max((i.receivedQty ?? 0) - (i.returnedQty ?? 0), 0);
const nameOf = (i: PurchaseItem) => i.itemName || i.product?.name || i.ingredient?.name || t('Cheez');
const baseUnit = (i: PurchaseItem) => i.product?.unit ?? i.ingredient?.unit ?? 'pcs';
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function PurchaseDetailPage({ config = {} }: { config?: PurchaseDetailConfig }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const [modal, setModal] = useState<'receive' | 'return' | 'cancel' | null>(null);
  const guide = usePageGuide();
  const [printing, setPrinting] = useState(false);
  const q = useQuery({ queryKey: ['purchase', id], queryFn: () => purchasesApi.getOne(id!), enabled: !!id });
  const p = q.data;

  const refresh = () => {
    ['purchase', 'purchase-list', 'purchases-summary', 'suppliers', 'product-catalog', 'products', 'purchase-sources', 'dashboard-overview']
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  if (q.isLoading) return <div className="flex justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>;
  if (!p) return <div className="py-20 text-center"><p className="font-semibold text-slate-900">{t('Purchase nahi mili')}</p><Button className="mt-4" variant="secondary" onClick={() => navigate('/purchases')}>{t('Wapas')}</Button></div>;

  const st = STATUS[p.status];
  const open = p.status === 'PENDING' || p.status === 'PARTIAL';
  const received = p.receivedValue ?? (p.status === 'RECEIVED' ? p.total : 0);
  const credit = Math.max(received - p.paidAmount, 0);
  const isOrder = p.status === 'PENDING';

  const whatsapp = () => {
    const lines = [
      `*Order — ${p.purchaseNumber}*`, `${getReceiptSetup().shop.name}`, '',
      ...p.items.map((i, n) => `${n + 1}. ${nameOf(i)} — ${q3(i.quantity)} ${i.unitName ?? baseUnit(i)}`),
      // i18n-ignore: printed/sent in the shop's language
      '', p.expectedAt ? `Maal ${day(p.expectedAt)} tak bhej dein.` : 'Maal jaldi bhej dein.', 'Shukriya!',
    ];
    const phone = (p.supplier.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  };

  return (
    <PageShell>
      <PageHero
        back={() => navigate(-1)}
        title={p.purchaseNumber}
        chip={st.label}
        subtitle={`${day(p.purchasedAt)}${p.shop?.name ? ` · ${p.shop.name}` : ''}${p.createdBy?.fullName ? ` · ${p.createdBy.fullName}` : ''}`}
        actions={<>
          <button type="button" onClick={guide.open} aria-label={t('Guide (G)')} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setPrinting(true)} className={heroButton}><Printer className="h-4 w-4" />{t('Print / invoice')}</button>
          {open && <button type="button" onClick={whatsapp} className={heroButton}><MessageCircle className="h-4 w-4" />{t('Order bhejein')}</button>}
          {canEdit && open && <button type="button" onClick={() => setModal('receive')} className={heroPrimaryButton}><PackageCheck className="h-4 w-4" />{t('Maal aaya')}</button>}
        </>}
      />

      {p.status === 'CANCELLED' && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{t('Cancel {{cancelledAt}}{{value}}', { cancelledAt: day(p.cancelledAt), value: p.cancelReason ? ` — ${p.cancelReason}` : '' })}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card flush className="min-w-0 overflow-hidden rounded-2xl">
          <Table minWidth="42rem">
            <THead>
              <Tr><Th className="px-3 py-2">{t('Cheez')}</Th><Th align="right" className="px-3 py-2">{t('Quantity')}</Th><Th align="right" className="px-3 py-2">{t('Rate')}</Th><Th align="right" className="px-3 py-2">{t('Amount')}</Th><Th align="right" className="px-3 py-2">{t('Halat')}</Th></Tr>
            </THead>
            <TBody>
              {p.items.map((i) => {
                const r = rate(i);
                const got = (i.receivedQty ?? 0) / r;
                const back = (i.returnedQty ?? 0) / r;
                return (
                  <Tr key={i.id} className="align-top">
                    <Td className="px-3 py-2.5">
                      <p className="flex items-center gap-1.5 font-medium text-slate-900">{i.ingredientId && <Wheat className="h-3.5 w-3.5 text-amber-600" />}{nameOf(i)}</p>
                      <p className="text-[0.75rem] text-slate-500">
                        {r !== 1 && `1 ${i.unitName} = ${q3(r)} ${baseUnit(i)} · `}{i.batchNo && t('Batch {{batchNo}} · ', { batchNo: i.batchNo })}{i.expiryDate && t('Expiry {{expiryDate}}', { expiryDate: day(i.expiryDate) })}
                      </p>
                      {(i.landedCost ?? 0) > 0 && (
                        <p className="text-[0.75rem] text-brand-700">{t('+ Landed cost {{value}} / {{baseUnit}}', { value: money((i.landedCost ?? 0) / (i.baseQuantity || i.quantity || 1)), baseUnit: baseUnit(i) })}</p>
                      )}
                      {config.itemExtra?.({ item: i, purchase: p })}
                    </Td>
                    <Td align="right" className="px-3 py-2.5">{q3(i.quantity)} {i.unitName}{r !== 1 && <span className="block text-[0.75rem] text-slate-500">{q3(i.baseQuantity ?? i.quantity * r)} {baseUnit(i)}</span>}</Td>
                    <Td align="right" className="px-3 py-2.5">{money(i.costPrice)}</Td>
                    <Td align="right" className="px-3 py-2.5 font-semibold">{money(i.total)}</Td>
                    <Td align="right" className="px-3 py-2.5 text-[0.75rem]">
                      {p.status !== 'RECEIVED' && p.status !== 'CANCELLED' && <span className="block text-slate-600">{t('Aaya {{got}} / {{quantity}}', { got: q3(got), quantity: q3(i.quantity) })}</span>}
                      {back > 0 && <span className="block text-amber-700">{t('Wapas {{back}}', { back: q3(back) })}</span>}
                      {p.status === 'RECEIVED' && !back && <span className="text-success-700">{t('Poora aaya')}</span>}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>

        <aside className="space-y-3">
          <Link to={`/suppliers/${p.supplier.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300">
            <p className="text-[0.75rem] text-slate-500">{t('Supplier')}</p>
            <p className="font-semibold text-slate-900">{p.supplier.name}</p>
            {p.supplier.phone && <p className="mt-0.5 flex items-center gap-1 text-[0.8125rem] text-slate-600"><Phone className="h-3.5 w-3.5" /> {p.supplier.phone}</p>}
            {p.supplierInvoiceNo && <p className="mt-1 text-[0.8125rem] text-slate-600">{t('Supplier ka bill # {{supplierInvoiceNo}}', { supplierInvoiceNo: p.supplierInvoiceNo })}</p>}
            <p className="mt-2 text-[0.8125rem] font-medium text-brand-700">{t('Khata aur payment →')}</p>
          </Link>

          <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <KV k={t('Cheezein')} v={money(p.subtotal)} />
            {p.discount > 0 && <KV k={t('Discount')} v={`−${money(p.discount)}`} />}
            {(p.otherCharges ?? 0) > 0 && <KV k={t('Kiraya / loading')} v={`+${money(p.otherCharges!)}`} />}
            {(p.taxAmount ?? 0) > 0 && <KV k={t('Tax')} v={`+${money(p.taxAmount!)}`} />}
            <div className="flex justify-between rounded-xl bg-slate-900 px-3 py-2 text-white"><span className="font-semibold">{isOrder ? t('Order') : t('Kul bill')}</span><span className="font-bold tabular-nums">{money(p.total)}</span></div>
            {p.status === 'PARTIAL' && <KV k={t('Ab tak maal aaya')} v={money(received)} />}
            {!isOrder && <KV k={t('Diye')} v={money(p.paidAmount)} />}
            {!isOrder && credit > 0 && <KV k={t('Udhaar par')} v={money(credit)} tone="text-rose-600" />}
            {(p.returnedAmount ?? 0) > 0 && <KV k={t('Maal wapas')} v={money(p.returnedAmount!)} tone="text-amber-700" />}
            {p.dueDate && credit > 0 && <KV k={t('Dena hai tak')} v={day(p.dueDate)} />}
            {p.notes && <p className="border-t border-slate-100 pt-2 text-[0.8125rem] text-slate-600">{p.notes}</p>}
          </div>

          <LandedCostPanel p={p} onChanged={refresh} />

          {canEdit && p.status !== 'CANCELLED' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-2">
              {(p.status === 'RECEIVED' || p.status === 'PARTIAL') && (
                <button type="button" onClick={() => setModal('return')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4 text-amber-600" /> {' '}{t('Maal wapas karein')}</button>
              )}
              {!(p.returnedAmount ?? 0) && (
                <button type="button" onClick={() => setModal('cancel')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"><Ban className="h-4 w-4" /> {isOrder ? t('Order cancel') : t('Bill cancel')}</button>
              )}
            </div>
          )}

          {!!p.carpetRolls?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">{t('Rolls ({{count}})', { count: p.carpetRolls.length })}</p>
              {p.carpetRolls.map((r) => (
                <div key={r.id} className="flex justify-between gap-2 border-t border-slate-100 py-1.5 text-[0.8125rem] first:border-0">
                  <span className="min-w-0 truncate text-slate-700">{t('{{rollNumber}}{{value}} · {{widthFt}}ft{{value2}} × {{originalLengthFt}}ft', { rollNumber: r.rollNumber, value: r.variant?.name ? ` · ${r.variant.name}` : '', widthFt: r.widthFt, value2: r.widthInch ? t(' {{widthInch}}in', { widthInch: r.widthInch }) : '', originalLengthFt: r.originalLengthFt })}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{t('{{value}}/{{value2}} sqft', { value: Number(r.remainingSqft.toFixed(1)), value2: Number(r.originalSqft.toFixed(1)) })}</span>
                </div>
              ))}
            </div>
          )}

          {!!p.returns?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">{t('Return')}</p>
              {p.returns.map((r) => (
                <div key={r.id} className="flex justify-between border-t border-slate-100 py-1.5 text-[0.8125rem] first:border-0">
                  <span className="text-slate-600">{r.returnNumber} · {day(r.createdAt)}{r.reason ? ` · ${r.reason}` : ''}</span>
                  <span className="font-medium tabular-nums text-amber-700">{money(r.total)}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {guide.isOpen && (
        <PageGuide title={t('Is bill par kya kar sakte hain')} onClose={guide.close}
          steps={[
            { icon: PackageCheck, color: '#16a34a', title: t('Maal aaya'), text: t('Order ka maal aaye to "Maal aaya" — har cheez ki aayi hui miqdar likhein. Aadha aaye to aadha; baqi baad me, ya "order band karein".') },
            { icon: RotateCcw, color: '#d97706', title: t('Maal wapas'), text: t('Kharab ya ghalat maal supplier ko lautaayein: stock kam hoga aur supplier ka dena utni amount se ghat jayega.') },
            { icon: Ban, color: '#dc2626', title: t('Cancel'), text: t('Ghalat bill ho to cancel karein — aaya hua maal stock se nikal jayega aur khata ulat jayega. Return ho chuki ho to cancel nahi, baqi maal wapas karein.') },
            { icon: BookOpen, color: '#2563eb', title: t('Supplier ka khata'), text: t('Supplier par click karein — wahan payment darj karein aur poora khata dekhein.') },
          ]}
          tips={[t('"Print / invoice" me chunein: bill, order ya maal wusooli; A4 ya thermal; rates chhupayein, supplier ka bank, hamare accounts, dastkhat — saath preview.'), t('Har line par likha hai kis unit me aaya aur stock me kitna gaya (misaal: 4 carton = 48 pcs).')]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
      {printing && <PurchasePrintModal p={p} onClose={() => setPrinting(false)} />}
      {modal === 'receive' && <ReceiveModal p={p} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {modal === 'return' && <ReturnModal p={p} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {modal === 'cancel' && <CancelModal p={p} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
    </PageShell>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{k}</span><span className={cn('font-medium tabular-nums', tone ?? 'text-slate-900')}>{v}</span></div>;
}

/** Quantity per line in its own unit, limited to `max`. */
function QtyLines({ p, max, qty, setQty }: { p: Purchase; max: (i: PurchaseItem) => number; qty: Record<string, number>; setQty: (v: Record<string, number>) => void }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {p.items.filter((i) => max(i) > 0).map((i) => {
        const m = max(i) / rate(i);
        return (
          <li key={i.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{nameOf(i)}</p>
              <p className="text-[0.75rem] text-slate-500">{t('Zyada se zyada {{q3}} {{unitName}}', { q3: q3(m), unitName: i.unitName })}</p>
            </div>
            <input type="number" min={0} max={m} step="any" value={qty[i.id] ?? ''} placeholder="0" aria-label={t('{{nameOf}} quantity', { nameOf: nameOf(i) })}
              onChange={(e) => setQty({ ...qty, [i.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), m) })}
              className={cn(controlClass(), 'h-9 w-24 px-2 text-end text-sm font-semibold tabular-nums')} />
            <span className="w-12 text-[0.75rem] text-slate-500">{i.unitName}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ReceiveModal({ p, onClose, onDone }: { p: Purchase; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(p.items.map((i) => [i.id, left(i) / rate(i)])));
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(p.paymentMethod ?? 'CASH');
  const [close, setClose] = useState(false);
  const factor = p.subtotal > 0 ? p.total / p.subtotal : 1;
  const value = p.items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.costPrice * factor, 0);
  const mut = useMutation({
    mutationFn: () => purchasesApi.receive(p.id, {
      items: Object.entries(qty).filter(([, v]) => v > 0).map(([itemId, quantity]) => ({ itemId, quantity })),
      paidAmount: Number(paid) || 0, paymentMethod: method, close,
    }),
    onSuccess: (r) => { toast.success(r.status === 'RECEIVED' ? t('Maal aa gaya — order mukammal') : t('Itna maal aa gaya — baqi baad me')); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={t('Maal aaya')} description={t('Jitna aaya utna likhein; baqi order khula rahega')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={mut.isPending} onClick={() => mut.mutate()} disabled={value <= 0 && !close}>{t('Stock me daalein')}</Button></>}>
      <QtyLines p={p} max={left} qty={qty} setQty={setQty} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><p className="text-slate-500">{t('Is maal ki qeemat')}</p><p className="text-xl font-bold tabular-nums">{money(value)}</p></div>
        <div>
          <label className="text-[0.75rem] text-slate-500">{t('Abhi kitne diye (is maal ke)')}
            <input type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={t('0 = sab udhaar')}
              className={cn(controlClass(), 'mt-1 h-9 px-2.5 text-end text-sm')} />
          </label>
          <div className="mt-2 flex flex-wrap gap-1">
            {POS_PAYMENT_METHODS.map((m) => (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
                className={cn('rounded-lg px-2 py-1 text-[0.75rem] ring-1', method === m.id ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'text-slate-600 ring-slate-200')}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} className="h-4 w-4 accent-brand-600" /> {' '}{t('Baqi maal nahi aayega — order band karein')}
      </label>
    </Modal>
  );
}

function ReturnModal({ p, onClose, onDone }: { p: Purchase; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const factor = p.subtotal > 0 ? p.total / p.subtotal : 1;
  const value = p.items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.costPrice * factor, 0);
  const mut = useMutation({
    mutationFn: () => purchasesApi.returnGoods(p.id, { items: Object.entries(qty).filter(([, v]) => v > 0).map(([itemId, quantity]) => ({ itemId, quantity })), reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success(t('{{value}} ka maal wapas — supplier ka khata kam ho gaya', { value: money(value) })); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={t('Supplier ko maal wapas')} description={t('Stock kam hoga aur supplier ko dena (khata) utna ghat jayega')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={mut.isPending} disabled={value <= 0} onClick={() => mut.mutate()} leftIcon={<RotateCcw className="h-4 w-4" />}>{t('Wapas karein · {{value}}', { value: money(value) })}</Button></>}>
      <QtyLines p={p} max={canReturn} qty={qty} setQty={setQty} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[t('Kharab maal'), t('Ghalat maal aaya'), t('Expiry qareeb'), t('Zyada aa gaya')].map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className={cn('rounded-full px-3 py-1 text-[0.8125rem] ring-1', reason === r ? 'bg-brand-50 font-semibold text-brand-700 ring-brand-300' : 'text-slate-600 ring-slate-200 hover:bg-slate-50')}>{r}</button>
        ))}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Wajah — misaal: 5 packet phate hue the')} aria-label={t('Wajah')} maxLength={200}
        className={cn(controlClass(), 'mt-2 h-10 px-3 text-sm')} />
    </Modal>
  );
}

function CancelModal({ p, onClose, onDone }: { p: Purchase; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const isOrder = p.status === 'PENDING';
  const mut = useMutation({
    mutationFn: () => purchasesApi.cancel(p.id, reason.trim()),
    onSuccess: () => { toast.success(isOrder ? t('Order cancel') : t('Bill cancel — stock aur khata wapas')); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={isOrder ? t('Order cancel karein?') : t('Bill cancel karein?')}
      description={isOrder ? t('Stock par koi asar nahi.') : t('Aaya hua maal stock se nikal jayega aur supplier ka khata ulat jayega.{{value}}', { value: p.paidAmount > 0 ? t(' Diye hue {{paidAmount}} supplier se wapas lene honge.', { paidAmount: money(p.paidAmount) }) : '' })}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button variant="danger" loading={mut.isPending} disabled={!reason.trim()} onClick={() => mut.mutate()}>{t('Cancel karein')}</Button></>}>
      <input data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Wajah — misaal: ghalat supplier chuna tha')} aria-label={t('Wajah')} maxLength={200}
        className={cn(controlClass(), 'h-10 px-3 text-sm')} />
    </Modal>
  );
}
