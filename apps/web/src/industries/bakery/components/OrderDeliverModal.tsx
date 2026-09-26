import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Receipt, Package, Search, Link2, Link2Off, AlertTriangle, Wallet,
  User, UserPlus, CheckCircle2, Loader2, Banknote, CreditCard, Smartphone,
  Building2, Zap, Printer, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { printReceiptDirect, type ReceiptPayload } from '@modules/pos/lib/thermalReceipt';

/* ═════════════════════════════════════════════════════════════
   ORDER → BILL  (Cake orders aur Bulk orders dono ke liye)
   ─────────────────────────────────────────────────────────────
   "De diya" dabane par ab order ka ASLI bill banta hai:
     • jin cheezon ka apne maal se jor hai unka stock ghatta hai
     • rakam Bikri safhe me aati hai (munafa, report, sab)
     • baqi paisa customer ke khate me udhaar ban kar jata hai

   Tarteeb jaan-boojh kar aisi hai ke beech me kuch toote to
   nuqsaan na ho:
     1. Abhi jo paisa mila wo pehle ORDER par darj
     2. Phir bill (sale)
     3. Phir order "De diya"
   Bill na bane to order jaisa tha waisa rehta hai — dobara
   koshish ki ja sakti hai. Bill ban jaye magar status na badle
   to ye browser yaad rakhta hai ke is order ka bill ban chuka —
   dobara bill nahi banne deta.
   ═════════════════════════════════════════════════════════════ */

export interface OrderBillLine {
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
  /** Order ki pakki rakam — lines ka jor is se kam/zyada ho sakta hai */
  total: number;
  /** Ab tak order par jitna paisa mil chuka (advance + baad ka) */
  paid: number;
  lines: OrderBillLine[];
  deliveryAddress?: string;
}

/* ── Dobara bill na bane — orderId → saleId ── */
const BILL_KEY = 'nafaa.order-bills';
function readBills(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(BILL_KEY) || '{}') ?? {}; } catch { return {}; }
}
export function billedSaleId(orderId: string): string | undefined {
  return readBills()[orderId];
}
/** Jo bill orders se bane — Bikri safha inhein pehchanta hai */
export function billedSaleIds(): Set<string> {
  return new Set(Object.values(readBills()));
}
function markBilled(orderId: string, saleId: string) {
  try { localStorage.setItem(BILL_KEY, JSON.stringify({ ...readBills(), [orderId]: saleId })); } catch { /* ignore */ }
}

/** Bill ki note — Bikri safha isi se "Order" ka nishan lagata hai */
export const orderNote = (orderNumber: string) => `Order ${orderNumber}`;
export const isOrderNote = (note?: string) => /^Order\s/.test(String(note ?? ''));

function paperWidth(): '58' | '80' {
  try {
    const p = JSON.parse(localStorage.getItem('nafaa.receipt.prefs') || 'null');
    if (p?.paperWidth === '58') return '58';
    const legacy = JSON.parse(localStorage.getItem('nafaa.bakery.print') || 'null');
    return legacy?.width === '58' ? '58' : '80';
  } catch { return '80'; }
}

/**
 * Order ki parchi — advance ki raseed ya kitchen ke liye.
 * Wohi thermal print jo POS ka bill chhapta hai, taake printer ki
 * setting ek hi jagah rahe.
 */
export function printOrderSlip(order: OrderForBill, shop: { name?: string; phone?: string; address?: string }, extra?: { dueDate?: string; note?: string }) {
  const linesTotal = order.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const payload: ReceiptPayload = {
    saleNumber: order.orderNumber,
    date: new Date(),
    shopName: shop.name || 'Bakery',
    shopPhone: shop.phone || '',
    shopAddress: shop.address || '',
    customerName: order.customerName,
    lines: order.lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit ?? '', price: l.rate, total: l.qty * l.rate })),
    subtotal: linesTotal,
    discount: Math.max(linesTotal - order.total, 0),
    total: order.total,
    paid: order.paid,
    paymentLabel: order.paid > 0 ? 'Advance / mila' : 'Abhi kuch nahi mila',
    deliveryAddress: [extra?.dueDate ? `Dena hai: ${extra.dueDate}` : '', order.deliveryAddress ?? '', extra?.note ?? '']
      .filter(Boolean).join(' • ') || undefined,
  } as ReceiptPayload;
  if (!printReceiptDirect(payload, paperWidth())) toast.error('Popup block hai — browser me popups allow karein');
}

const METHODS: Array<{ id: PaymentMethod; label: string; icon: any }> = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { id: 'EASYPAISA', label: 'EasyPaisa', icon: Zap },
  { id: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
];

const digits = (s?: string) => String(s ?? '').replace(/\D/g, '').slice(-10);

export function OrderDeliverModal({ order, onClose, onDone, recordPayment, markDelivered, accent = 'pink' }: {
  order: OrderForBill;
  onClose: () => void;
  onDone: () => void;
  /** Order par paisa darj — cakeOrdersApi.addPayment / bulkOrdersApi.payment */
  recordPayment: (amount: number) => Promise<any>;
  /** Order ki halat "De diya" */
  markDelivered: () => Promise<any>;
  accent?: 'pink' | 'amber';
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  const already = billedSaleId(order.id);
  const due0 = Math.max(order.total - order.paid, 0);

  const [lines, setLines] = useState<OrderBillLine[]>(() => order.lines.map((l) => ({ ...l })));
  const [linkingIdx, setLinkingIdx] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [collect, setCollect] = useState<number | ''>(due0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [customerId, setCustomerId] = useState<string>('');
  const [custQ, setCustQ] = useState('');
  const [printBill, setPrintBill] = useState(true);
  const [step, setStep] = useState('');

  const productsQ = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: undefined }),
    staleTime: 60_000,
  });
  const customersQ = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const products: any[] = productsQ.data?.items ?? [];
  const customers: any[] = (customersQ.data as any)?.items ?? [];
  const productBy = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  /* Phone se customer khud pehchan lo */
  const autoCustomer = useMemo(() => {
    const d = digits(order.customerPhone);
    return d.length >= 7 ? customers.find((c) => digits(c.phone) === d) : undefined;
  }, [customers, order.customerPhone]);
  const chosenCustomer = customers.find((c) => c.id === (customerId || autoCustomer?.id));

  /* ── Hisab ── */
  const linked = lines.filter((l) => l.productId);
  const unlinked = lines.filter((l) => !l.productId);
  const linesTotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const linkedTotal = linked.reduce((s, l) => s + l.qty * l.rate, 0);
  const unlinkedTotal = unlinked.reduce((s, l) => s + l.qty * l.rate, 0);
  /* Bill ka total order ke total ke barabar rehna chahiye:
     line zyada ho to farq discount, kam ho to baqi rakam extra. */
  const discount = Math.max(linesTotal - order.total, 0);
  const extra = unlinkedTotal + Math.max(order.total - linesTotal, 0);
  const now = Math.min(Math.max(Number(collect || 0), 0), due0);
  const paidTotal = order.paid + now;
  const dueAfter = Math.max(order.total - paidTotal, 0);

  const stockShort = linked.filter((l) => {
    const p = productBy.get(l.productId!);
    return p && Number(p.shopStock ?? p.stock ?? 0) < l.qty;
  });

  const errors: string[] = [];
  if (already) errors.push('Is order ka bill pehle hi ban chuka hai');
  if (!shopId) errors.push('Pehle shop chunein');
  if (linked.length === 0) errors.push('Kam se kam ek cheez apne maal se jorein — warna bill me koi cheez nahi hogi');
  if (dueAfter > 0 && !chosenCustomer) errors.push(`${formatPKR(dueAfter)} baqi rahega — udhaar ke liye customer chunein`);
  if (Number(collect || 0) > due0) errors.push(`Baqi sirf ${formatPKR(due0)} hai`);

  /* Naya customer order ke naam/phone se */
  const addCustomer = useMutation({
    mutationFn: () => customersApi.create({ name: order.customerName || 'Order customer', phone: order.customerPhone || undefined }),
    onSuccess: (c: any) => {
      setCustomerId(c.id);
      qc.invalidateQueries({ queryKey: ['customers-for-pos'] });
      toast.success(`${c.name} customer ban gaya`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Customer nahi bana'),
  });

  const bill = useMutation({
    mutationFn: async () => {
      if (billedSaleId(order.id)) throw new Error('Is order ka bill pehle hi ban chuka hai');
      if (now > 0) { setStep('Paisa order par darj ho raha hai…'); await recordPayment(now); }

      setStep('Bill ban raha hai…');
      const sale: any = await offlineSalesApi.create({
        shopId: shopId!,
        customerId: chosenCustomer?.id || undefined,
        paymentMethod: method,
        paidAmount: paidTotal,
        discount,
        serviceCharges: extra > 0 ? extra : undefined,
        items: linked.map((l) => ({
          productId: l.productId!,
          quantity: l.qty,
          priceOverride: l.rate,
          note: orderNote(order.orderNumber),
        })),
      } as any);
      if (sale?.id) markBilled(order.id, sale.id);

      setStep('Order "De diya" ho raha hai…');
      try { await markDelivered(); }
      catch { toast.warning('Bill ban gaya, magar order ki halat nahi badli — list me "De diya" dobara dabayein'); }
      return sale;
    },
    onSuccess: (sale: any) => {
      setStep('');
      ['sales-list', 'sales-summary', 'products', 'bakery-all-products', 'products-for-bakery-pos',
        'customers', 'customers-for-pos', 'cake-orders', 'bulk-orders'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      forceRefreshProducts().catch(() => {});

      if (printBill) {
        const payload: ReceiptPayload = {
          saleNumber: sale?.saleNumber || order.orderNumber,
          date: new Date(),
          shopName: tenant?.name || 'Bakery', shopPhone, shopAddress,
          customerName: chosenCustomer?.name ?? order.customerName,
          previousDue: Number(chosenCustomer?.balance) || 0,
          lines: lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit ?? '', price: l.rate, total: l.qty * l.rate })),
          subtotal: linesTotal, discount, total: order.total,
          deliveryCharge: Math.max(order.total - linesTotal, 0) || undefined,
          deliveryAddress: order.deliveryAddress,
          paid: paidTotal,
          paymentLabel: `Paid (order ${order.orderNumber})`,
        } as ReceiptPayload;
        if (!printReceiptDirect(payload, paperWidth())) toast.error('Popup block hai — browser me popups allow karein');
      }

      toast.success(`Bill ban gaya — ${order.orderNumber} de diya`, {
        description: dueAfter > 0 ? `${formatPKR(dueAfter)} ${chosenCustomer?.name ?? ''} ke khate me` : 'Poora paisa mil gaya',
        action: sale?.id ? { label: 'Bill dekhein', onClick: () => navigate(`/sales/${sale.id}/receipt?fresh=1`) } : undefined,
        duration: 8000,
      });
      onDone();
    },
    onError: (e: any) => {
      setStep('');
      toast.error(e?.response?.data?.message || e?.message || 'Bill nahi bana — order jaisa tha waisa hai');
    },
  });

  const needle = q.trim().toLowerCase();
  const productOptions = useMemo(() => {
    const target = linkingIdx !== null ? lines[linkingIdx]?.name.toLowerCase() : '';
    const words = (needle || target).split(/\s+/).filter((w) => w.length > 2 && !['cake', 'order'].includes(w) || needle);
    return products
      .filter((p) => p.isActive !== false)
      .map((p) => {
        const n = String(p.name).toLowerCase();
        let score = needle ? (n.includes(needle) ? 10 : 0) : 0;
        if (!needle) { words.forEach((w) => { if (n.includes(w)) score += 3; }); if (n.includes('cake') && target.includes('cake')) score += 2; }
        return { p, score };
      })
      .filter((x) => (needle ? x.score > 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.p);
  }, [products, needle, linkingIdx, lines]);

  const custOptions = useMemo(() => {
    const n = custQ.trim().toLowerCase();
    if (!n) return [];
    return customers.filter((c) => (c.name ?? '').toLowerCase().includes(n) || digits(c.phone).includes(digits(n) || '###')).slice(0, 6);
  }, [customers, custQ]);

  const ring = accent === 'amber' ? 'border-amber-300 dark:border-amber-500/40' : 'border-pink-300 dark:border-pink-500/40';
  const head = accent === 'amber' ? 'from-amber-600 to-yellow-700' : 'from-pink-600 to-fuchsia-700';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className={`w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border-2 ${ring} shadow-2xl overflow-hidden max-h-[94vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`shrink-0 px-5 py-4 bg-gradient-to-br ${head} text-white flex items-start justify-between gap-3`}>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Receipt className="h-3 w-3" /> De diya — bill banayein
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{order.customerName || 'Order'} · {order.orderNumber}</h3>
            <div className="text-xs text-white/85 font-bold tabular-nums">
              Kul {formatPKR(order.total)} · mila {formatPKR(order.paid)} · baqi {formatPKR(due0)}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {already && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 flex-1">Is order ka bill pehle hi ban chuka hai.</p>
              <button onClick={() => navigate(`/sales/${already}/receipt`)} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-black">Bill dekhein</button>
            </div>
          )}

          {/* ── Cheezein — apne maal se jor ── */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-slate-500" />
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Cheezein</h4>
              <span className="text-[11px] font-bold text-slate-400 ml-auto">Jori hui cheez ka stock ghatega</span>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const p = l.productId ? productBy.get(l.productId) : undefined;
                const stock = p ? Number(p.shopStock ?? p.stock ?? 0) : null;
                const short = stock !== null && stock < l.qty;
                return (
                  <div key={i} className={`rounded-2xl border-2 p-3 ${l.productId ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'}`}>
                    <div className="flex items-center gap-2">
                      {l.productId ? <Link2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <Link2Off className="h-4 w-4 text-amber-600 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{l.name}</div>
                        <div className="text-[11px] font-bold text-slate-500 tabular-nums">
                          {l.qty}{l.unit ? ` ${l.unit}` : ''} × {formatPKR(l.rate)} = {formatPKR(l.qty * l.rate)}
                        </div>
                        {p ? (
                          <div className={`text-[10px] font-black ${short ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            ↳ {p.name} · stock {Number(stock!.toFixed(2))} {p.unit}{short ? ' — kam hai' : ''}
                          </div>
                        ) : (
                          <div className="text-[10px] font-black text-amber-700 dark:text-amber-400">Maal se nahi juri — rakam bill me "extra" ban kar jayegi</div>
                        )}
                      </div>
                      <button onClick={() => { setLinkingIdx(linkingIdx === i ? null : i); setQ(''); }}
                        className="h-9 px-2.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-700 dark:text-slate-200 shrink-0">
                        {l.productId ? 'Badlein' : 'Jorein'}
                      </button>
                      {l.productId && (
                        <button onClick={() => setLines((xs) => xs.map((x, k) => (k === i ? { ...x, productId: undefined } : x)))}
                          title="Jor hatao" className="h-9 w-9 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          <X className="h-3.5 w-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>

                    {linkingIdx === i && (
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Apna maal dhoondein…"
                            className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                          {productOptions.map((p) => (
                            <button key={p.id}
                              onClick={() => { setLines((xs) => xs.map((x, k) => (k === i ? { ...x, productId: p.id, unit: x.unit ?? p.unit } : x))); setLinkingIdx(null); }}
                              className="h-9 px-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                              {p.name} <span className="text-[10px] text-slate-400">{Number(Number(p.shopStock ?? p.stock ?? 0).toFixed(2))} {p.unit}</span>
                            </button>
                          ))}
                          {productOptions.length === 0 && <span className="text-[11px] font-bold text-slate-400">Kuch nahi mila</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {stockShort.length > 0 && (
              <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
                  {stockShort.map((l) => l.name).join(', ')} — stock kam hai. Order ke liye banaya maal stock me chadha dein,
                  warna system bill rok sakta hai ya stock minus ho jayega.
                </p>
              </div>
            )}
          </section>

          {/* ── Paisa ── */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-500" />
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Abhi kitna mil raha hai</h4>
            </div>
            <input type="number" min={0} max={due0} step="any" value={collect}
              onChange={(e) => setCollect(e.target.value === '' ? '' : Number(e.target.value))}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
            <div className="flex gap-1.5">
              <button onClick={() => setCollect(due0)} className="h-9 flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-200">Poora {formatPKR(due0)}</button>
              <button onClick={() => setCollect(0)} className="h-9 flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-200">Kuch nahi — udhaar</button>
            </div>
            {now > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {METHODS.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`h-10 rounded-xl text-[11px] font-black inline-flex items-center justify-center gap-1 transition ${
                      method === m.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}><m.icon className="h-3.5 w-3.5" /> {m.label}</button>
                ))}
              </div>
            )}
          </section>

          {/* ── Customer ── */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Customer {dueAfter > 0 ? <span className="text-rose-500">*</span> : <span className="text-[11px] font-bold text-slate-400">— marzi</span>}</h4>
            </div>
            {chosenCustomer ? (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{chosenCustomer.name}</div>
                  <div className="text-[11px] font-bold text-slate-500">
                    {chosenCustomer.phone ?? ''}{Number(chosenCustomer.balance) > 0 ? ` · pehle se ${formatPKR(chosenCustomer.balance)} udhaar` : ''}
                    {!customerId && autoCustomer ? ' · phone se khud mila' : ''}
                  </div>
                </div>
                <button onClick={() => { setCustomerId('__none__'); setCustQ(''); }} className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <>
                <input value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Naam ya phone se dhoondein…"
                  className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500" />
                {custOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {custOptions.map((c) => (
                      <button key={c.id} onClick={() => setCustomerId(c.id)}
                        className="h-9 px-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                        {c.name}{c.phone ? ` · ${c.phone}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                {(order.customerName || order.customerPhone) && (
                  <button onClick={() => addCustomer.mutate()} disabled={addCustomer.isPending}
                    className="w-full h-10 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-black text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {addCustomer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    "{order.customerName}" ko naya customer banayein
                  </button>
                )}
              </>
            )}
          </section>

          {/* ── Khulasa ── */}
          <section className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 space-y-1">
            <Row label="Maal wali cheezein" value={formatPKR(linkedTotal)} />
            {extra > 0 && <Row label="Extra (juri nahi / farq)" value={`+${formatPKR(extra)}`} />}
            {discount > 0 && <Row label="Discount (order ka rate kam)" value={`−${formatPKR(discount)}`} />}
            <Row label="Bill ka total" value={formatPKR(order.total)} bold />
            <Row label="Pehle mila" value={formatPKR(order.paid)} />
            {now > 0 && <Row label="Abhi mila" value={formatPKR(now)} tone="emerald" />}
            <Row label={dueAfter > 0 ? 'Khate me jayega' : 'Baqi'} value={formatPKR(dueAfter)} tone={dueAfter > 0 ? 'amber' : 'emerald'} bold />
          </section>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={printBill} onChange={(e) => setPrintBill(e.target.checked)} className="h-4 w-4 rounded accent-pink-600" />
            <Printer className="h-4 w-4 text-slate-500" />
            <span className="text-[12px] font-black text-slate-700 dark:text-slate-200">Bill bante hi print karein</span>
          </label>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 flex gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Pehle ka advance bhi is bill me "mila" gina jata hai — taake bikri ka poora hisab ek jagah rahe.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3">
              {errors.map((e, i) => <div key={i} className="text-[12px] font-bold text-amber-900 dark:text-amber-200">• {e}</div>)}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Rehne dein</Button>
          <Button onClick={() => bill.mutate()} disabled={errors.length > 0 || bill.isPending} loading={bill.isPending}
            className="flex-[2] bg-gradient-to-r from-emerald-600 to-green-700 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" /> {bill.isPending ? step || 'Ho raha hai…' : 'Bill banao — de diya'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: 'emerald' | 'amber'; bold?: boolean }) {
  const c = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white';
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-black' : 'font-extrabold'} ${c}`}>{value}</span>
    </div>
  );
}