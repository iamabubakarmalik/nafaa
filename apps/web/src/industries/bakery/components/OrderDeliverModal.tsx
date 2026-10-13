/**
 * Hand-over of a cake or bulk order as a real bill: lines linked to own
 * products take their stock out, the amount shows in Sales, and what is
 * still owed goes on the customer's account.
 *
 * Order of work, so that a failure half-way loses nothing:
 *   1. money received now is recorded on the order;
 *   2. the bill (sale) is made, its lines noted "Order <number>";
 *   3. the order is marked delivered.
 * Before starting, the server is asked whether a bill with that note already
 * exists, so the same order is never billed twice from two devices.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Banknote, Building2, CheckCircle2, CreditCard, Link2, Link2Off, Package, Printer, Search, Smartphone, User, UserPlus, Wallet, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { printReceipt } from '@core/receipt/print';
import { withManagerPin } from '@core/security/ManagerPin';
import { getReceiptSetup, printPaper } from '@core/receipt/setup';
import type { OrderBill } from '../api/cake-orders.api';
import { BULK_KEY, CAKE_KEY, apiError, fmtQty } from './meta';

interface OrderBillLine {
  productId?: string;
  name: string;
  qty: number;
  rate: number;
  unit?: string;
}

export interface OrderForBill {
  kind: 'cake' | 'bulk';
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  /** Agreed order amount; the lines may add up to more or less. */
  total: number;
  /** Received on the order so far (advance and later payments). */
  paid: number;
  lines: OrderBillLine[];
  deliveryAddress?: string;
}

/** Note on every bill line made from an order; the server finds the bill by it. */
const orderNote = (orderNumber: string) => `Order ${orderNumber}`;

const METHODS: Array<{ id: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { id: 'EASYPAISA', label: 'EasyPaisa', icon: Zap },
  { id: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
];

const digits = (s?: string) => String(s ?? '').replace(/\D/g, '').slice(-10);
const stockOf = (p: { shopStock?: number; stock?: number }) => Number(p.shopStock ?? p.stock ?? 0);

interface ProductLite { id: string; name: string; unit?: string; isActive?: boolean; shopStock?: number; stock?: number }
interface CustomerLite { id: string; name: string; phone?: string | null; balance?: number | string | null }

export function OrderDeliverModal({ order, shopName, onClose, onDone, recordPayment, markDelivered, findBill }: {
  order: OrderForBill;
  shopName: string;
  onClose: () => void;
  onDone: () => void;
  /** Records money on the order (cake or bulk payment endpoint). */
  recordPayment: (amount: number) => Promise<unknown>;
  /** Marks the order delivered. */
  markDelivered: () => Promise<unknown>;
  /** Bill already made for this order, if any. */
  findBill: () => Promise<OrderBill | null>;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const due0 = Math.max(Math.round((order.total - order.paid) * 100) / 100, 0);

  const [lines, setLines] = useState<OrderBillLine[]>(() => order.lines.map((l) => ({ ...l })));
  const [linking, setLinking] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [collect, setCollect] = useState(String(due0));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [customerId, setCustomerId] = useState('');
  const [custQ, setCustQ] = useState('');
  const [printBill, setPrintBill] = useState(true);
  const [step, setStep] = useState('');

  const billQ = useQuery({ queryKey: [order.kind === 'cake' ? CAKE_KEY : BULK_KEY, 'bill', order.id], queryFn: findBill, staleTime: 0 });
  const productsQ = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({ isActive: undefined }), staleTime: 60_000 });
  const customersQ = useQuery({ queryKey: ['customers-for-pos'], queryFn: () => customersApi.list({ page: 1, limit: 500 }), staleTime: 60_000 });
  const products = (productsQ.data?.items ?? []) as ProductLite[];
  const customers = ((customersQ.data as { items?: CustomerLite[] } | undefined)?.items ?? []);
  const productBy = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const already = billQ.data;

  const autoCustomer = useMemo(() => {
    const d = digits(order.customerPhone);
    return d.length >= 7 ? customers.find((c) => digits(c.phone ?? '') === d) : undefined;
  }, [customers, order.customerPhone]);
  const chosen = customerId === '__none__' ? undefined : customers.find((c) => c.id === (customerId || autoCustomer?.id));

  const linked = lines.filter((l) => l.productId);
  const linesTotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const linkedTotal = linked.reduce((s, l) => s + l.qty * l.rate, 0);
  const unlinkedTotal = lines.filter((l) => !l.productId).reduce((s, l) => s + l.qty * l.rate, 0);
  /* The bill total must equal the order total: lines above it become a discount, below it an extra. */
  const discount = Math.max(linesTotal - order.total, 0);
  const extra = unlinkedTotal + Math.max(order.total - linesTotal, 0);
  const now = Math.min(Math.max(Number(collect) || 0, 0), due0);
  const paidTotal = order.paid + now;
  const dueAfter = Math.max(order.total - paidTotal, 0);
  const short = linked.filter((l) => { const p = productBy.get(l.productId!); return p && stockOf(p) < l.qty; });

  const errors: string[] = [];
  if (billQ.isLoading) errors.push('Pehle ka bill dekh rahe hain…');
  if (already) errors.push('Is order ka bill pehle hi ban chuka hai');
  if (!shopId) errors.push('Upar se branch chunein');
  if (!linked.length) errors.push('Kam se kam ek cheez apne maal se jorein — warna bill me koi cheez nahi hogi');
  if (dueAfter > 0.5 && !chosen) errors.push(`${formatPKR(dueAfter)} baqi rahega — udhaar ke liye customer chunein`);
  if ((Number(collect) || 0) > due0 + 0.005) errors.push(`Baqi sirf ${formatPKR(due0)} hai`);

  const addCustomer = useMutation({
    mutationFn: () => customersApi.create({ name: order.customerName || 'Order customer', phone: order.customerPhone || undefined }),
    onSuccess: (c: { id: string; name: string }) => { setCustomerId(c.id); qc.invalidateQueries({ queryKey: ['customers-for-pos'] }); toast.success(`${c.name} customer ban gaya`); },
    onError: (e) => toast.error(apiError(e, 'Customer nahi bana')),
  });

  const bill = useMutation({
    mutationFn: async () => {
      setStep('Pehle ka bill dekh rahe hain…');
      if (await findBill()) throw new Error('Is order ka bill pehle hi ban chuka hai');
      if (now > 0) { setStep('Paisa order par darj ho raha hai…'); await recordPayment(now); }
      setStep('Bill ban raha hai…');
      // A khata above the customer's limit needs the owner's PIN; the dialog asks once and retries.
      const sale = await withManagerPin('Udhaar ke liye malik ka PIN', (managerPin) => offlineSalesApi.create({
        ...(managerPin && { managerPin }),
        shopId: shopId!,
        customerId: chosen?.id || undefined,
        paymentMethod: method,
        paidAmount: paidTotal,
        discount,
        // The sale takes charges as a list; a bare number crashed the bill (400 / "reduce is not a function").
        serviceCharges: extra > 0 ? [{ type: 'OTHER', label: 'Order ke izafi charges', amount: Math.round(extra * 100) / 100 }] : undefined,
        items: linked.map((l) => ({ productId: l.productId!, quantity: l.qty, priceOverride: l.rate, note: orderNote(order.orderNumber) })),
      } as Parameters<typeof offlineSalesApi.create>[0]), 'credit') as { id?: string; saleNumber?: string };
      setStep('Order "De diya" ho raha hai…');
      try { await markDelivered(); } catch { toast.warning('Bill ban gaya magar order ki halat nahi badli — order khol kar "De diya" dobara dabayein'); }
      return sale;
    },
    onSuccess: (sale) => {
      setStep('');
      ['sales-list', 'sales-summary', 'products', 'bakery-all-products', 'products-for-pos', 'customers', 'customers-for-pos', CAKE_KEY, BULK_KEY, 'cake-order']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      forceRefreshProducts().catch(() => undefined);
      if (printBill) {
        const setup = getReceiptSetup(shopName);
        printReceipt({
          saleNumber: sale?.saleNumber || order.orderNumber,
          date: new Date(),
          customerName: chosen?.name ?? order.customerName,
          customerPhone: chosen?.phone ?? order.customerPhone,
          previousDue: Number(chosen?.balance) || 0,
          infoRows: [{ label: 'Order', value: order.orderNumber }],
          lines: lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit ?? '', price: l.rate, total: l.qty * l.rate })),
          subtotal: linesTotal,
          discount,
          deliveryCharge: Math.max(order.total - linesTotal, 0) || undefined,
          deliveryAddress: order.deliveryAddress,
          total: order.total,
          paid: paidTotal,
          paymentLabel: `Mila (advance samet)`,
        }, { paper: printPaper(setup), setup });
      }
      toast.success(`Bill ban gaya — ${order.orderNumber} de diya`, {
        description: dueAfter > 0.5 ? `${formatPKR(dueAfter)} ${chosen?.name ?? ''} ke khate me` : 'Poora paisa mil gaya',
        action: sale?.id ? { label: 'Bill dekhein', onClick: () => navigate(`/sales/${sale.id}/receipt?fresh=1`) } : undefined,
        duration: 8000,
      });
      onDone();
    },
    onError: (e) => { setStep(''); toast.error(apiError(e, 'Bill nahi bana — order jaisa tha waisa hai')); },
  });

  const needle = q.trim().toLowerCase();
  const options = useMemo(() => {
    const target = linking !== null ? lines[linking]?.name.toLowerCase() ?? '' : '';
    const words = target.split(/\s+/).filter((w) => w.length > 2 && !['cake', 'order'].includes(w));
    return products
      .filter((p) => p.isActive !== false)
      .map((p) => {
        const n = p.name.toLowerCase();
        const score = needle ? (n.includes(needle) ? 10 : 0) : words.reduce((s, w) => s + (n.includes(w) ? 3 : 0), 0) + (n.includes('cake') && target.includes('cake') ? 2 : 0);
        return { p, score };
      })
      .filter((x) => (needle ? x.score > 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.p);
  }, [products, needle, linking, lines]);

  const custOptions = useMemo(() => {
    const n = custQ.trim().toLowerCase();
    if (!n) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(n) || (digits(n) && digits(c.phone ?? '').includes(digits(n)))).slice(0, 6);
  }, [customers, custQ]);

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={!bill.isPending}
      title={`De diya — bill banayein · ${order.orderNumber}`}
      description={`${order.customerName || 'Customer'} · kul ${formatPKR(order.total)} · mila ${formatPKR(order.paid)} · baqi ${formatPKR(due0)}`}
      footer={<>
        {errors[0] && <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{errors[0]}</p>}
        <Button variant="secondary" onClick={onClose} disabled={bill.isPending}>Rehne dein</Button>
        <Button variant="success" onClick={() => bill.mutate()} disabled={errors.length > 0} loading={bill.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
          {bill.isPending ? step || 'Ho raha hai…' : 'Bill banao — de diya'}
        </Button>
      </>}>
      <div className="space-y-5">
        {already && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-success-50 px-3 py-2.5 text-[0.8125rem] text-success-800 ring-1 ring-success-200">
            <CheckCircle2 className="h-4 w-4" /> Is order ka bill {already.saleNumber} pehle hi ban chuka hai.
            <Button size="xs" variant="secondary" className="ml-auto" onClick={() => navigate(`/sales/${already.id}/receipt`)}>Bill dekhein</Button>
          </div>
        )}

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><Package className="h-4 w-4 text-brand-600" /> Cheezein <span className="ml-auto text-[0.75rem] font-normal text-slate-500">Jori hui cheez ka stock ghatega</span></h3>
          <ul className="space-y-2">
            {lines.map((l, i) => {
              const p = l.productId ? productBy.get(l.productId) : undefined;
              const lack = p && stockOf(p) < l.qty;
              return (
                <li key={i} className={cn('rounded-xl p-3 ring-1', l.productId ? 'bg-success-50/50 ring-success-200' : 'bg-amber-50/60 ring-amber-200')}>
                  <div className="flex items-center gap-2">
                    {l.productId ? <Link2 className="h-4 w-4 shrink-0 text-success-700" /> : <Link2Off className="h-4 w-4 shrink-0 text-amber-700" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.875rem] font-medium text-slate-900">{l.name}</p>
                      <p className="text-[0.75rem] tabular-nums text-slate-500">{fmtQty(l.qty)}{l.unit ? ` ${l.unit}` : ''} × {formatPKR(l.rate)} = {formatPKR(l.qty * l.rate)}</p>
                      {p
                        ? <p className={cn('text-[0.75rem] font-medium', lack ? 'text-rose-700' : 'text-success-700')}>↳ {p.name} · stock {fmtQty(stockOf(p))} {p.unit}{lack ? ' — kam hai' : ''}</p>
                        : <p className="text-[0.75rem] font-medium text-amber-800">Maal se nahi juri — rakam bill me "extra" ban kar jayegi</p>}
                    </div>
                    <Button size="xs" variant="secondary" onClick={() => { setLinking(linking === i ? null : i); setQ(''); }}>{l.productId ? 'Badlein' : 'Jorein'}</Button>
                    {l.productId && (
                      <button type="button" aria-label="Jor hatayein" onClick={() => setLines((xs) => xs.map((x, k) => (k === i ? { ...x, productId: undefined } : x)))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                  {linking === i && (
                    <div className="mt-2 space-y-2">
                      <Input size="sm" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Apna maal dhoondein…" leftIcon={<Search className="h-4 w-4" />} />
                      <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                        {options.map((p) => (
                          <button key={p.id} type="button" onClick={() => { setLines((xs) => xs.map((x, k) => (k === i ? { ...x, productId: p.id, unit: x.unit ?? p.unit } : x))); setLinking(null); }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400">
                            {p.name} <span className="text-slate-400">{fmtQty(stockOf(p))} {p.unit}</span>
                          </button>
                        ))}
                        {!options.length && <span className="text-[0.75rem] text-slate-500">Kuch nahi mila</span>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {short.length > 0 && (
            <p className="mt-2 flex gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800 ring-1 ring-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{short.map((l) => l.name).join(', ')} — stock kam hai. Banaya hua maal pehle stock me daalein (Production me "Stock me daalein"), warna stock minus ho jayega.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Wallet className="h-4 w-4 text-brand-600" /> Abhi kitna mil raha hai</h3>
          <Input inputMode="decimal" value={collect} onChange={(e) => setCollect(e.target.value.replace(/[^\d.]/g, ''))} size="lg" className="text-center text-xl font-bold tabular-nums" />
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => setCollect(String(due0))}>Poora {formatPKR(due0)}</Button>
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => setCollect('0')}>Kuch nahi — udhaar</Button>
          </div>
          {now > 0 && (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {METHODS.map((m) => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                  className={cn('inline-flex h-9 items-center justify-center gap-1 rounded-lg text-[0.75rem] font-semibold ring-1', method === m.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                  <m.icon className="h-3.5 w-3.5" />{m.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><User className="h-4 w-4 text-brand-600" /> Customer {dueAfter > 0.5 ? <span className="text-rose-600">*</span> : <span className="text-[0.75rem] font-normal text-slate-500">— marzi</span>}</h3>
          {chosen ? (
            <div className="flex items-center gap-2 rounded-xl bg-success-50 px-3 py-2.5 ring-1 ring-success-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-medium text-slate-900">{chosen.name}</p>
                <p className="text-[0.75rem] text-slate-500">{chosen.phone ?? ''}{Number(chosen.balance) > 0 ? ` · pehle se ${formatPKR(Number(chosen.balance))} udhaar` : ''}{!customerId && autoCustomer ? ' · phone se khud mila' : ''}</p>
              </div>
              <button type="button" aria-label="Customer hatayein" onClick={() => { setCustomerId('__none__'); setCustQ(''); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <>
              <Input size="sm" value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Naam ya phone se dhoondein…" leftIcon={<Search className="h-4 w-4" />} />
              {custOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {custOptions.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCustomerId(c.id)} className="inline-flex h-8 items-center rounded-lg bg-white px-2.5 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400">
                      {c.name}{c.phone ? ` · ${c.phone}` : ''}
                    </button>
                  ))}
                </div>
              )}
              {(order.customerName || order.customerPhone) && (
                <Button size="sm" variant="secondary" fullWidth onClick={() => addCustomer.mutate()} loading={addCustomer.isPending} leftIcon={<UserPlus className="h-4 w-4" />}>
                  "{order.customerName}" ko naya customer banayein
                </Button>
              )}
            </>
          )}
        </section>

        <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.8125rem] ring-1 ring-slate-200">
          <Line k="Maal wali cheezein" v={formatPKR(linkedTotal)} />
          {extra > 0 && <Line k="Extra (juri nahi / farq)" v={`+${formatPKR(extra)}`} />}
          {discount > 0 && <Line k="Discount (order ka rate kam)" v={`−${formatPKR(discount)}`} />}
          <Line k="Bill ka total" v={formatPKR(order.total)} strong />
          <Line k="Pehle mila" v={formatPKR(order.paid)} />
          {now > 0 && <Line k="Abhi mila" v={formatPKR(now)} />}
          <Line k={dueAfter > 0.5 ? 'Khate me jayega' : 'Baqi'} v={formatPKR(dueAfter)} strong />
        </dl>

        <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-slate-700">
          <input type="checkbox" checked={printBill} onChange={(e) => setPrintBill(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
          <Printer className="h-4 w-4 text-slate-500" /> Bill bante hi print karein
        </label>
        <p className="text-[0.75rem] text-slate-500">Pehle ka advance bhi is bill me "mila" gina jata hai, taake bikri ka poora hisaab ek jagah rahe.</p>
      </div>
    </Modal>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className={cn('tabular-nums', strong ? 'font-bold text-slate-900' : 'font-medium text-slate-800')}>{v}</dd></div>;
}
