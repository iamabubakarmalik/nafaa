import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import JsBarcode from 'jsbarcode';
import {
  Cake, Search, X, Plus, Minus, Trash2, User, UserPlus, Package,
  ScanLine, CheckCircle2, ShoppingCart, ChevronDown, Timer, Snowflake,
  Banknote, CreditCard, Smartphone, Building2, BookOpen, Zap, Check,
  GraduationCap, Printer, Settings2, Pause, Play, Percent, Receipt,
  AlertTriangle, Loader2, Grid3x3, Wallet, ChefHat, ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { bakeryProductsApi, type BakeryProduct } from '../api/products.api';
import { productUnitsApi } from '@industries/retail/api/product-units.api';
import { freshnessApi } from '../api/freshness.api';

/* ═════════════════════════════════════════════════════════════
   BAKERY POS — COUNTER KA SAFHA
   ─────────────────────────────────────────────────────────────
   Purane POS me teen bari kharabiyan thin:

   1. Sirf `bakeryProductsApi` se maal aata tha — yani SIRF wo
      cheezein jin ka bakery profile bana ho. Lays, bottle, juice
      counter par nazar hi nahi aate thay. Aadha maal bech hi nahi
      sakte thay.

   2. Barcode scan par agar cheez ka bakery profile na ho to
      "Not a bakery product" ka error aata tha — bottle scan karna
      mumkin hi nahi tha.

   3. Bill nayi tab me `?auto=1` ke sath khulta tha, jabke receipt
      page `autoprint=1` parhta hai. Yani auto-print kabhi chalta
      hi nahi tha; har bill haath se print karna parta tha.

   Ab: saara maal, har barcode, aur seedha thermal print.
   ═════════════════════════════════════════════════════════════ */

type PayMode = 'FULL' | 'PARTIAL' | 'UDHAAR';

const PAYMENTS: Array<{ id: PaymentMethod; label: string; icon: any }> = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { id: 'EASYPAISA', label: 'EasyPaisa', icon: Smartphone },
  { id: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
];

const PRINT_KEY = 'nafaa.bakery.print';

interface PrintPrefs { width: '58' | '80'; auto: boolean }
const defaultPrefs: PrintPrefs = { width: '80', auto: true };

function loadPrefs(): PrintPrefs {
  try {
    const raw = localStorage.getItem(PRINT_KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch { return defaultPrefs; }
}

/* ── Asli CODE128 barcode — naqli lakeerein scanner nahi parhta ── */
function barcodeSvg(value: string, width: '58' | '80'): string {
  if (!value) return '';
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: width === '80' ? 1.6 : 1.3,
      height: 45, margin: 0, displayValue: false,
      lineColor: '#000000', background: '#ffffff',
    });
    return new XMLSerializer().serializeToString(svg);
  } catch { return ''; }
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

interface PrintPayload {
  saleNumber: string; date: Date;
  shopName: string; shopPhone?: string; shopAddress?: string;
  customerName?: string; previousDue?: number;
  lines: Array<{ name: string; qty: number; unit: string; price: number; total: number }>;
  subtotal: number; discount: number; total: number; paid: number; payLabel: string;
}

function printBill(p: PrintPayload, mm: '58' | '80'): boolean {
  const w = window.open('', '_blank', `width=${mm === '80' ? 400 : 330},height=700`);
  if (!w) return false;

  const items = p.lines.map((l, i) => `
    <div class="item">
      <div class="iname">${i + 1}. ${esc(l.name)}</div>
      <div class="irow"><span>${l.qty} ${esc(l.unit)} × ${formatPKR(l.price)}</span><span class="iamt">${formatPKR(l.total)}</span></div>
    </div>`).join('');

  const due = Math.max(p.total - p.paid, 0);
  const prev = p.previousDue ?? 0;

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(p.saleNumber)}</title><style>
  /* Thermal head 203 dpi ka hota hai. 400-weight ke danday ek hi dot
     chaure bante hain aur kaghaz par mushkil se nazar aate hain — is
     liye har cheez kam se kam 700, aur anti-aliasing band. */
  @page { size: ${mm}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      -webkit-font-smoothing: none; text-rendering: geometricPrecision; }
  html, body { width: ${mm}mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff;
    padding: ${mm === '80' ? '4mm 3mm' : '3mm 2mm'};
    font-size: ${mm === '80' ? '13.5px' : '11.5px'}; font-weight: 700; line-height: 1.4; }
  .c { text-align: center; }
  .shop { font-size: ${mm === '80' ? '20px' : '16px'}; font-weight: 900; }
  .sub { font-size: ${mm === '80' ? '11.5px' : '10px'}; font-weight: 700; margin-top: 2px; }
  .div { border-top: 1.5px dashed #000; margin: 6px 0; }
  .dbl { border-top: 2.5px solid #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 3px 0; }
  .row .v { text-align: right; font-weight: 800; }
  .item { margin: 4px 0; }
  .iname { font-weight: 900; word-break: break-word; }
  .irow { display: flex; justify-content: space-between; font-weight: 700; font-size: ${mm === '80' ? '12.5px' : '10.5px'}; }
  .iamt { font-weight: 900; }
  .total { display: flex; justify-content: space-between; font-size: ${mm === '80' ? '20px' : '16px'}; font-weight: 900; margin: 5px 0; }
  .khata-t { font-size: ${mm === '80' ? '11px' : '9.5px'}; font-weight: 900; letter-spacing: .5px; margin-bottom: 2px; }
  .khata-x { display: flex; justify-content: space-between; font-size: ${mm === '80' ? '15px' : '12.5px'}; font-weight: 900; border-top: 2px solid #000; margin-top: 3px; padding-top: 3px; }
  .bar { text-align: center; margin: 8px 0 2px; }
  .bar svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  .barnum { font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; margin-top: 3px; }
</style></head><body>
  <div class="c shop">${esc(p.shopName)}</div>
  ${p.shopAddress ? `<div class="c sub">${esc(p.shopAddress)}</div>` : ''}
  ${p.shopPhone ? `<div class="c sub">Ph: ${esc(p.shopPhone)}</div>` : ''}
  <div class="div"></div>
  <div class="row"><span>BILL</span><span class="v">${esc(p.saleNumber)}</span></div>
  <div class="row"><span>DATE</span><span class="v">${p.date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  ${p.customerName ? `<div class="row"><span>CUSTOMER</span><span class="v">${esc(p.customerName)}</span></div>` : ''}
  <div class="div"></div>
  ${items}
  <div class="div"></div>
  <div class="row"><span>Cheezein</span><span class="v">${p.lines.length}</span></div>
  ${p.discount > 0 ? `<div class="row"><span>Subtotal</span><span class="v">${formatPKR(p.subtotal)}</span></div>
    <div class="row"><span>Discount</span><span class="v">−${formatPKR(p.discount)}</span></div>` : ''}
  <div class="dbl"></div>
  <div class="total"><span>TOTAL</span><span>${formatPKR(p.total)}</span></div>
  <div class="row"><span>${esc(p.payLabel)}</span><span class="v">${formatPKR(p.paid)}</span></div>
  ${p.paid > p.total ? `<div class="row"><span>WAPIS DEIN</span><span class="v">${formatPKR(p.paid - p.total)}</span></div>` : ''}
  ${due > 0 ? `<div class="row"><span>IS BILL KA BAQI</span><span class="v">${formatPKR(due)}</span></div>` : ''}
  ${prev > 0 ? `
    <div class="div"></div>
    <div class="khata-t">KHATA — ${esc(p.customerName || 'Customer')}</div>
    <div class="row"><span>Pichla udhaar</span><span class="v">${formatPKR(prev)}</span></div>
    ${due > 0 ? `<div class="row"><span>Is bill ka</span><span class="v">+${formatPKR(due)}</span></div>` : ''}
    <div class="khata-x"><span>KUL UDHAAR</span><span>${formatPKR(prev + due)}</span></div>` : ''}
  <div class="div"></div>
  <div class="bar">${barcodeSvg(p.saleNumber, mm)}<div class="barnum">${esc(p.saleNumber)}</div></div>
  <div class="div"></div>
  <div class="c sub">Shukriya! Phir tashreef laiye.</div>
  <div class="c sub" style="margin-top:2px;">Powered by Nafaa POS</div>
  <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close();},600);},150);};</script>
</body></html>`;

  w.document.open(); w.document.write(html); w.document.close();
  return true;
}


/* ═════════════════════════════════════════════════════════════
   UNIT KA CONVERSION — stock sahi ghatne ke liye
   ─────────────────────────────────────────────────────────────
   Stock hamesha product ke APNE unit me gina jata hai. Agar cake
   "piece" me gina jata hai aur aap ek SLICE bechte hain, to stock
   se poora cake nahi, us ka ek hissa nikalna chahiye.

   Pehle bakery POS ye hisab lagata hi nahi tha: ek dozen cookies
   bechne par stock se sirf 1 ghatta tha (12 ki jagah), aur ek
   slice bechne par poora cake. Report, munafa aur "kya banana
   hai" — sab isi se ghalat hote thay.

   Sab se pehle dukaan-daar ka apna banaya hua unit dekha jata hai
   (Multi-Unit safhe se). Wo na ho to neeche wale aam hisab.
   ═════════════════════════════════════════════════════════════ */
function deriveRate(unitKey: string, baseUnit: string, profile?: BakeryProduct): number {
  const base = (baseUnit || 'pcs').toLowerCase();
  const grams = Number(profile?.weightGrams) || 0;
  const slices = Number(profile?.numberOfSlices) || 0;

  /** Ek piece me kitne base unit */
  const pieceRate = ['pcs', 'piece', 'pieces', 'loaf', 'plate'].includes(base)
    ? 1
    : base === 'kg' && grams > 0 ? grams / 1000
    : base === 'gram' && grams > 0 ? grams
    : 1;

  switch (unitKey) {
    case 'piece': return pieceRate;
    case 'dozen': return pieceRate * 12;
    case 'slice': return slices > 0 ? pieceRate / slices : pieceRate / 8;
    case 'kg':    return base === 'kg' ? 1 : base === 'gram' ? 1000 : grams > 0 ? 1000 / grams : 1;
    case 'pound': return (base === 'kg' ? 1 : base === 'gram' ? 1000 : grams > 0 ? 1000 / grams : 1) * 0.4536;
    /* Box aur tray me kitne aate hain — ye sirf dukaan-daar jaanta
       hai. Multi-Unit safhe se banaya hua unit yahan sab se pehle
       chalta hai; warna ek maan liya jata hai. */
    default: return 1;
  }
}

export default function BakeryPosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [unitPicker, setUnitPicker] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<PrintPrefs>(loadPrefs);
  const [payMode, setPayMode] = useState<PayMode>('FULL');
  const [held, setHeld] = useState<Array<{ id: string; cart: any[]; customerId: string; total: number; at: number }>>([]);
  const [lastSale, setLastSale] = useState<any>(null);

  const cartApi = useSharedPosCart();
  const {
    cart, setCart, customerId, setCustomerId, paymentMethod, setPaymentMethod,
    paidAmount, setPaidAmount, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, clearCart, setLineQuantity, removeLine,
  } = cartApi;

  /* ── Data — SAARE products, sirf bakery profile wale nahi ── */
  const productsQ = useQuery({
    queryKey: ['bakery-pos-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
  });

  const profilesQ = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}),
  });

  const freshQ = useQuery({
    queryKey: ['bakery-freshness-pos'],
    queryFn: () => freshnessApi.list({}).catch(() => []),
    refetchInterval: 120_000,
  });

  const customersQ = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 1000 }),
  });
  const customers = (customersQ.data as any)?.items ?? [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  const profileBy = useMemo(() => {
    const m = new Map<string, BakeryProduct>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  /** Kis cheez ka maal jald kharab hone wala hai */
  const urgentBy = useMemo(() => {
    const m = new Map<string, number>();
    (freshQ.data ?? []).forEach((f: any) => {
      if (f.status === 'DISCARDED' || Number(f.currentQty) <= 0) return;
      const left = (new Date(f.expiryDate || f.bestBefore).getTime() - Date.now()) / 3_600_000;
      if (left < 12) m.set(f.productId, Math.min(m.get(f.productId) ?? 999, left));
    });
    return m;
  }, [freshQ.data]);

  const items = useMemo(() => {
    const list = productsQ.data?.items ?? [];
    return list.map((p) => ({
      product: p,
      profile: profileBy.get(p.id),
      urgentHours: urgentBy.get(p.id),
      stock: Number(p.shopStock ?? p.stock ?? 0),
    }));
  }, [productsQ.data, profileBy, urgentBy]);

  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    items.forEach((i) => {
      const c = i.product.category;
      if (!c) return;
      const e = m.get(c.id);
      if (e) e.count += 1; else m.set(c.id, { id: c.id, name: c.name, count: 1 });
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [items]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = items;
    if (categoryId !== 'all') out = out.filter((i) => i.product.categoryId === categoryId);
    if (q) out = out.filter((i) =>
      i.product.name.toLowerCase().includes(q) ||
      (i.product.sku ?? '').toLowerCase().includes(q) ||
      (i.product.barcode ?? '').toLowerCase().includes(q));
    /* Jo jald kharab ho raha hai wo sab se pehle — counter par
       wahi nikalna chahiye. */
    return [...out].sort((a, b) => {
      const ua = a.urgentHours ?? 999, ub = b.urgentHours ?? 999;
      if (ua !== ub) return ua - ub;
      return a.product.name.localeCompare(b.product.name);
    });
  }, [items, categoryId, q]);

  /* ── Cart ── */
  const addLine = useCallback((p: Product, price: number, unitLabel: string, rate = 1) => {
    const stock = Number(p.shopStock ?? p.stock ?? 0);
    const key = `${p.id}::${unitLabel}`;
    setCart((prev) => {
      const ex = prev.find((c) => c.cartLineId === key);
      if (ex) return prev.map((c) => (c.cartLineId === key ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, {
        cartLineId: key,
        productId: p.id,
        name: unitLabel === (p.unit || 'pcs') ? p.name : `${p.name} (${unitLabel})`,
        variantImage: p.images?.[0]?.url,
        basePrice: price,
        priceOverride: price,
        wholesalePrice: p.wholesalePrice,
        stock: stock > 0 ? stock : 9999,
        quantity: 1,
        unit: unitLabel,
        category: p.category,
        useWholesale: false,
        lineDiscount: 0,
        /* Stock ka hisab isi se lagta hai — checkout par
           quantity × rate bheja jata hai. */
        note: rate !== 1 ? `1 ${unitLabel} = ${rate.toFixed(3)} ${p.unit}` : undefined,
        conversionRate: rate,
      } as any];
    });
    setUnitPicker(null);
  }, [setCart]);

  const onPick = useCallback(async (row: any) => {
    const p: Product = row.product;
    const pr = row.profile as BakeryProduct | undefined;
    const base = p.unit || 'pcs';

    /* Dukaan-daar ke apne banaye hue unit sab se pehle — un me
       asli conversion rate mojood hota hai. */
    let own: any[] = [];
    try {
      const res: any = await productUnitsApi.byProduct(p.id);
      own = Array.isArray(res) ? res : (res?.items ?? []);
    } catch { /* unit na hon to koi baat nahi */ }

    const opts: Array<{ key: string; price: number; label: string; emoji: string; rate: number }> = [];

    own.forEach((u: any) => {
      if (!u?.unitName || String(u.unitName).toLowerCase() === base.toLowerCase()) return;
      opts.push({
        key: `own-${u.id}`,
        price: Number(u.price) || Number(p.price),
        label: String(u.unitName),
        emoji: '📦',
        rate: Number(u.conversionRate) || 1,
      });
    });

    const ownNames = new Set(own.map((u: any) => String(u.unitName || '').toLowerCase()));
    ([
      { key: 'piece', price: pr?.pricePerPiece, label: 'Piece', emoji: '🎂' },
      { key: 'pound', price: pr?.pricePerPound, label: 'Pound', emoji: '⚖️' },
      { key: 'kg', price: pr?.pricePerKg, label: 'Kg', emoji: '⚖️' },
      { key: 'slice', price: pr?.pricePerSlice, label: 'Slice', emoji: '🍰' },
      { key: 'dozen', price: pr?.pricePerDozen, label: 'Dozen', emoji: '📦' },
      { key: 'box', price: pr?.pricePerBox, label: 'Box', emoji: '📦' },
      { key: 'tray', price: pr?.pricePerTray, label: 'Tray', emoji: '🍱' },
    ] as const).forEach((o) => {
      if (!o.price || Number(o.price) <= 0) return;
      if (ownNames.has(o.label.toLowerCase())) return;
      opts.push({
        key: o.key, price: Number(o.price), label: o.label, emoji: o.emoji,
        rate: deriveRate(o.key, base, pr),
      });
    });

    if (opts.length === 0) return addLine(p, Number(p.price), base, 1);
    if (opts.length === 1) return addLine(p, opts[0].price, opts[0].label, opts[0].rate);
    setUnitPicker({ row, opts });
  }, [addLine]);

  const onScan = async (code: string) => {
    setScannerOpen(false);
    const c = code.trim();
    if (!c) return;
    /* Pehle apni hi list me dekho — offline bhi chal jata hai */
    const local = items.find((i) => (i.product.barcode ?? '') === c);
    if (local) return onPick(local);
    try {
      const p = await productsApi.byBarcode(c);
      const row = items.find((i) => i.product.id === p.id);
      if (row) return onPick(row);
      /* List me na mile to bhi bech sakte hain — pehle yahan
         "Not a bakery product" ka error aata tha. */
      addLine(p, Number(p.price), p.unit || 'pcs');
    } catch {
      toast.error(`Barcode "${c}" nahi mila`);
    }
  };

  /* ── Checkout ── */
  const paid = payMode === 'FULL' ? total : payMode === 'UDHAAR' ? 0 : Number(paidAmount || 0);
  const change = Math.max(paid - total, 0);
  const due = Math.max(total - paid, 0);

  const checkout = useMutation({
    mutationFn: () => {
      if (!shopId) throw new Error('Shop chunna zaroori hai');
      if (due > 0 && !customerId) throw new Error('Udhaar ke liye customer chunein');
      return offlineSalesApi.create({
        shopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: paid,
        discount: Number(globalDiscount) || 0,
        /* Stock product ke apne unit me ghatta hai, is liye base
           quantity bhejte hain — aur rate bhi usi hisaab se, taake
           bill ka total wahi rahe. */
        items: cart.map((c) => {
          const rate = Number((c as any).conversionRate) || 1;
          const unitPrice = c.priceOverride ?? c.basePrice;
          return {
            productId: c.productId,
            quantity: c.quantity * rate,
            priceOverride: unitPrice / rate,
            lineDiscount: c.lineDiscount,
            useWholesale: c.useWholesale,
          };
        }),
      });
    },
    onSuccess: (sale: any) => {
      const payLabel = PAYMENTS.find((m) => m.id === paymentMethod)?.label ?? paymentMethod;
      const payload: PrintPayload = {
        saleNumber: sale.saleNumber || 'N/A',
        date: new Date(),
        shopName: tenant?.name || 'Bakery',
        shopPhone, shopAddress,
        customerName: selectedCustomer?.name,
        /* Cache me jo balance hai wo abhi tak IS bill se pehle ka hai */
        previousDue: Number(selectedCustomer?.balance) || 0,
        lines: cart.map((c) => ({
          name: c.name, qty: c.quantity, unit: c.unit,
          price: c.priceOverride ?? c.basePrice,
          total: (c.priceOverride ?? c.basePrice) * c.quantity - (c.lineDiscount || 0),
        })),
        subtotal, discount: Number(globalDiscount) || 0, total, paid,
        payLabel: `Paid (${payLabel})`,
      };

      setLastSale({ id: sale.id, number: sale.saleNumber, change, total, payload });
      setShowCheckout(false);
      clearCart();
      setPayMode('FULL');
      qc.invalidateQueries({ queryKey: ['bakery-pos-products'] });
      qc.invalidateQueries({ queryKey: ['customers-for-pos'] });
      qc.invalidateQueries({ queryKey: ['bakery-freshness-pos'] });

      if (prefs.auto && !printBill(payload, prefs.width)) {
        toast.error('Popup block hai — browser me popups allow karein');
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Bill nahi bana'),
  });

  /* ── Hold ── */
  const holdCart = () => {
    if (cart.length === 0) return;
    setHeld((h) => [...h, { id: cartLineId(), cart, customerId, total, at: Date.now() }]);
    clearCart();
    toast.success('Bill rok diya');
  };

  const resumeCart = (h: any) => {
    setCart(h.cart); setCustomerId(h.customerId);
    setHeld((xs) => xs.filter((x) => x.id !== h.id));
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (unitPicker) return setUnitPicker(null);
        if (showCheckout) return setShowCheckout(false);
        if (showTeacher) return setShowTeacher(false);
        if (showPrefs) return setShowPrefs(false);
        return;
      }
      if (e.key === 'F12') { e.preventDefault(); if (cart.length) { setPayMode('FULL'); setPaymentMethod('CASH'); checkout.mutate(); } return; }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length) setShowCheckout(true); return; }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); setScannerOpen(true); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'h') holdCart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitPicker, showCheckout, showTeacher, showPrefs, cart, total]);

  const savePrefs = (p: Partial<PrintPrefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    try { localStorage.setItem(PRINT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const loading = productsQ.isLoading;

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4 pb-6">
      {/* ═══════════ LEFT — MAAL ═══════════ */}
      <div className="min-w-0 space-y-3">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-4 sm:p-5 shadow-2xl">
          <div className="absolute -top-20 -right-16 h-60 w-60 rounded-full bg-pink-400/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black leading-tight">🍰 Bakery Counter</h1>
              <p className="text-[11px] font-bold text-white/80 mt-0.5">
                {items.length} cheezein · {urgentBy.size > 0 && <span className="text-amber-200">{urgentBy.size} jald kharab hone wali</span>}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setScannerOpen(true)} title="Scan (B)"
                className="h-11 px-3 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow transition">
                <ScanLine className="h-4 w-4" /> Scan
              </button>
              <button onClick={() => setShowPrefs(true)} title="Printer"
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
                <Settings2 className="h-4 w-4" />
              </button>
              <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
                className="h-11 w-11 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 flex items-center justify-center shadow transition">
                <GraduationCap className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam ya barcode… (/ dabao)"
              className="h-12 w-full rounded-2xl bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </section>

        {/* Category */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryId('all')}
            className={`h-10 px-3.5 rounded-xl border-2 text-xs font-black shrink-0 transition ${
              categoryId === 'all'
                ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>Sab ({items.length})</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)}
              className={`h-10 px-3.5 rounded-xl border-2 text-xs font-black shrink-0 transition ${
                categoryId === c.id
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>{c.name} ({c.count})</button>
          ))}
        </div>

        {held.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {held.map((h) => (
              <button key={h.id} onClick={() => resumeCart(h)}
                className="h-10 px-3 rounded-xl bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-300 dark:border-amber-500/40 text-xs font-black text-amber-800 dark:text-amber-200 inline-flex items-center gap-1.5 transition">
                <Play className="h-3.5 w-3.5" /> {formatPKR(h.total)} · {h.cart.length} cheez
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
            <Package className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="mt-3 font-black text-slate-800 dark:text-slate-100">
              {search ? `"${search}" se kuch nahi mila` : 'Is category me kuch nahi'}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {shown.map((row) => {
              const p = row.product;
              const img = p.images?.[0]?.url;
              const out = row.stock <= 0;
              const inCart = cart.filter((c) => c.productId === p.id).reduce((s, c) => s + c.quantity, 0);
              const urgent = row.urgentHours;
              return (
                <button key={p.id} onClick={() => onPick(row)}
                  className={`group text-left rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden relative ${
                    inCart > 0 ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/25' : 'border-slate-200 dark:border-slate-800 hover:border-pink-400'
                  }`}>
                  {inCart > 0 && (
                    <span className="absolute top-2 right-2 z-10 h-7 min-w-7 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow">
                      {inCart}
                    </span>
                  )}
                  <div className="aspect-[4/3] bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10 flex items-center justify-center overflow-hidden">
                    {img ? <img src={img} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      : <span className="text-4xl">{row.profile ? '🧁' : '📦'}</span>}
                  </div>
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {urgent !== undefined && (
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shadow inline-flex items-center gap-1 ${
                        urgent <= 0 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        <Timer className="h-2.5 w-2.5" /> {urgent <= 0 ? 'Waqt guzra' : `${Math.round(urgent)}h`}
                      </span>
                    )}
                    {out && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-700 text-white shadow">Khatam</span>}
                    {row.profile?.requiresRefrigeration && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-sky-600 text-white shadow inline-flex items-center gap-1">
                        <Snowflake className="h-2.5 w-2.5" /> Fridge
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="font-extrabold text-[13px] text-slate-900 dark:text-white truncate leading-tight">{p.name}</div>
                    <div className="mt-1 flex items-end justify-between gap-1">
                      <span className="text-base font-black text-pink-600 dark:text-pink-400 tabular-nums">{formatPKR(p.price)}</span>
                      <span className={`text-[11px] font-black tabular-nums ${out ? 'text-rose-500' : 'text-slate-400'}`}>
                        {row.stock} {p.unit}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </div>

      {/* ═══════════ RIGHT — CART ═══════════ */}
      <aside className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Cart · {cart.length} line · {totalItems} cheez
            </span>
            <div className="flex gap-1.5">
              {cart.length > 0 && (
                <>
                  <button onClick={holdCart} title="Rok dein (H)"
                    className="h-8 px-2 rounded-lg bg-white/15 hover:bg-amber-500/50 text-[11px] font-black inline-flex items-center gap-1 transition">
                    <Pause className="h-3 w-3" /> Rok
                  </button>
                  <button onClick={clearCart}
                    className="h-8 px-2 rounded-lg bg-white/15 hover:bg-rose-500/50 text-[11px] font-black transition">
                    Khaali
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums">{formatPKR(total)}</div>
        </div>

        <CustomerPicker customers={customers} customerId={customerId} setCustomerId={setCustomerId}
          selected={selectedCustomer} onAdd={() => navigate('/customers/new')} />

        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="max-h-[46vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {cart.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="mt-2 font-extrabold text-slate-600 dark:text-slate-300">Cart khaali hai</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Cheez par click karein ya barcode scan karein</p>
              </div>
            ) : cart.map((c) => {
              const price = c.priceOverride ?? c.basePrice;
              return (
                <div key={c.cartLineId} className="p-2.5 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-[13px] text-slate-900 dark:text-white truncate">{c.name}</div>
                    <div className="text-[11px] font-bold text-slate-400 tabular-nums">{formatPKR(price)} / {c.unit}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setLineQuantity(c.cartLineId, c.quantity - 1)}
                      className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition">
                      <Minus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="w-9 text-center text-sm font-black tabular-nums text-slate-900 dark:text-white">{c.quantity}</span>
                    <button onClick={() => setLineQuantity(c.cartLineId, c.quantity + 1)}
                      className="h-8 w-8 rounded-lg bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center transition">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">
                    {formatPKR(price * c.quantity)}
                  </span>
                  <button onClick={() => removeLine(c.cartLineId)}
                    className="h-8 w-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center shrink-0 transition">
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </button>
                </div>
              );
            })}
          </div>

          {cart.length > 0 && (
            <div className="p-3 border-t-2 border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-slate-400 shrink-0" />
                <input type="number" min={0} value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)} placeholder="Discount"
                  className="h-10 flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-pink-500" />
              </div>

              <button onClick={() => { setPayMode('FULL'); setPaymentMethod('CASH'); checkout.mutate(); }}
                disabled={checkout.isPending}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 text-white font-black inline-flex items-center justify-center gap-2 disabled:opacity-60 transition">
                {checkout.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                CASH — {formatPKR(total)} <kbd className="text-[10px] opacity-70">F12</kbd>
              </button>

              <button onClick={() => setShowCheckout(true)}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 text-white font-black inline-flex items-center justify-center gap-2 transition">
                <Wallet className="h-5 w-5" /> Paisay lein <kbd className="text-[10px] opacity-70">F9</kbd>
              </button>
            </div>
          )}
        </div>

        {lastSale && (
          <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-black text-emerald-900 dark:text-emerald-200">Bill ban gaya</span>
            </div>
            <div className="mt-1 text-[12px] font-bold text-emerald-800 dark:text-emerald-300">
              {lastSale.number} · {formatPKR(lastSale.total)}
              {lastSale.change > 0 && <> · <strong>Wapis dein {formatPKR(lastSale.change)}</strong></>}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => printBill(lastSale.payload, prefs.width)}
                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                <Printer className="h-3.5 w-3.5" /> Dobara print
              </button>
              <button onClick={() => navigate(`/sales/${lastSale.id}/receipt`)}
                className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-300 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                <Receipt className="h-3.5 w-3.5" /> Bill dekhein
              </button>
              <button onClick={() => setLastSale(null)}
                className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-300 flex items-center justify-center ml-auto">
                <X className="h-3.5 w-3.5 text-emerald-700" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ MODALS ═══ */}
      {scannerOpen && <BarcodeScanner onDetected={onScan} onClose={() => setScannerOpen(false)} title="Bakery scanner" hint="Bill ya cheez ka barcode camera ke samne rakhein" />}

      {unitPicker && (
        <Modal title={unitPicker.row.product.name} sub="Kis hisaab se bech rahe hain?" icon={Cake} onClose={() => setUnitPicker(null)}>
          <div className="grid grid-cols-2 gap-2">
            {unitPicker.opts.map((o: any) => (
              <button key={o.key} onClick={() => addLine(unitPicker.row.product, Number(o.price), o.label, o.rate)}
                className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-500 p-3 text-left transition">
                <div className="text-2xl">{o.emoji}</div>
                <div className="mt-1 font-black text-sm text-slate-900 dark:text-white">Per {o.label}</div>
                <div className="text-lg font-black text-pink-600 dark:text-pink-400 tabular-nums">{formatPKR(Number(o.price))}</div>
                {o.rate !== 1 && (
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                    Stock se {o.rate.toFixed(3)} {unitPicker.row.product.unit} nikle ga
                  </div>
                )}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {showCheckout && (
        <Modal title="Paisay lein" sub={formatPKR(total)} icon={Wallet} onClose={() => setShowCheckout(false)}>
          <div className="grid grid-cols-3 gap-1.5">
            {([['FULL', 'Poora'], ['PARTIAL', 'Kuch abhi'], ['UDHAAR', 'Poora udhaar']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setPayMode(v as PayMode)}
                className={`h-11 rounded-xl text-xs font-black transition ${
                  payMode === v ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>{l}</button>
            ))}
          </div>

          {payMode !== 'UDHAAR' && (
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENTS.map((m) => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`h-11 rounded-xl text-[11px] font-black inline-flex items-center justify-center gap-1 transition ${
                    paymentMethod === m.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                  <m.icon className="h-3.5 w-3.5" /> {m.label}
                </button>
              ))}
            </div>
          )}

          {payMode === 'PARTIAL' && (
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Abhi kitne mil rahe hain</label>
              <input type="number" min={0} autoFocus value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1">
            <Line label="Total" value={formatPKR(total)} />
            <Line label="Mil rahe hain" value={formatPKR(paid)} />
            {change > 0 && <Line label="Wapis dena hai" value={formatPKR(change)} tone="emerald" />}
            {due > 0 && <Line label="Udhaar jayega" value={formatPKR(due)} tone="amber" />}
            {due > 0 && selectedCustomer?.balance > 0 && (
              <Line label="Kul udhaar ho jayega" value={formatPKR(Number(selectedCustomer.balance) + due)} tone="amber" />
            )}
          </div>

          {due > 0 && !customerId && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[12px] font-bold text-rose-900 dark:text-rose-200">
                Udhaar ke liye customer chunna zaroori hai — warna baad me pata nahi chalega
                kis se lena hai.
              </p>
            </div>
          )}

          <Button className="w-full h-14 text-base bg-gradient-to-r from-emerald-600 to-green-700"
            disabled={checkout.isPending || (due > 0 && !customerId)}
            loading={checkout.isPending} onClick={() => checkout.mutate()}>
            <CheckCircle2 className="h-5 w-5" /> Bill banayein
          </Button>
        </Modal>
      )}

      {showPrefs && (
        <Modal title="Printer ki settings" icon={Printer} onClose={() => setShowPrefs(false)}>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Kaghaz</label>
            <div className="grid grid-cols-2 gap-2">
              {(['58', '80'] as const).map((w) => (
                <button key={w} onClick={() => savePrefs({ width: w })}
                  className={`h-12 rounded-xl text-sm font-black transition ${
                    prefs.width === w ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>{w}mm</button>
              ))}
            </div>
          </div>
          <button onClick={() => savePrefs({ auto: !prefs.auto })}
            className={`w-full text-left rounded-2xl border-2 p-3 flex items-start gap-2.5 transition ${
              prefs.auto ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
            <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
              prefs.auto ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
            }`}><Printer className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white">Bill bante hi print</span>
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                Band karein to sirf "Dobara print" se nikle ga
              </span>
            </span>
          </button>
          <Button className="w-full" onClick={() => setShowPrefs(false)}>Theek hai</Button>
        </Modal>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ CUSTOMER PICKER ═══ */
function CustomerPicker({ customers, customerId, setCustomerId, selected, onAdd }: any) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) { setQ(''); return; }
    const place = () => {
      const el = btnRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, 280);
      setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - width - 8), width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  const needle = q.trim().toLowerCase();
  const list = useMemo(() => (needle
    ? customers.filter((c: any) => (c.name || '').toLowerCase().includes(needle) || (c.phone || '').toLowerCase().includes(needle))
    : customers), [customers, needle]);

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((v) => !v)}
        className={`h-14 w-full rounded-2xl border-2 bg-white dark:bg-slate-900 px-3 flex items-center gap-2.5 text-left transition ${
          open ? 'border-pink-500 ring-4 ring-pink-200 dark:ring-pink-500/25' : 'border-slate-200 dark:border-slate-800 hover:border-pink-400'
        }`}>
        <span className="h-9 w-9 rounded-xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-pink-600 dark:text-pink-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
            {selected ? selected.name : 'Walk-in Customer'}
          </span>
          {selected?.balance > 0 && (
            <span className="block text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
              Purana udhaar {formatPKR(selected.balance)}
            </span>
          )}
        </span>
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[81] rounded-2xl bg-white dark:bg-slate-900 border-4 border-pink-300 dark:border-pink-500/40 shadow-2xl overflow-hidden">
            <div className="p-2.5 border-b-2 border-slate-100 dark:border-slate-800 bg-pink-50 dark:bg-pink-500/10">
              <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Naam ya phone…"
                className="h-11 w-full rounded-xl border-2 border-pink-200 dark:border-pink-500/30 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div className="max-h-[44vh] overflow-y-auto">
              <button onClick={() => { setCustomerId(''); setOpen(false); }}
                className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <User className="h-4 w-4 text-slate-500" />
                <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200">Walk-in Customer</span>
                {!customerId && <Check className="h-4 w-4 text-pink-600 ml-auto" />}
              </button>
              {list.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300">Koi customer nahi mila</p>
                  <button onClick={() => { setOpen(false); onAdd(); }}
                    className="mt-2 h-10 px-4 rounded-xl bg-pink-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" /> Naya customer
                  </button>
                </div>
              ) : list.map((c: any) => (
                <button key={c.id} onClick={() => { setCustomerId(c.id); setOpen(false); }}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <span className="h-8 w-8 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0 text-xs font-black text-pink-700 dark:text-pink-300">
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-900 dark:text-white">{c.name}</span>
                    {c.phone && <span className="block text-[11px] font-bold text-slate-400 tabular-nums">{c.phone}</span>}
                  </span>
                  {Number(c.balance) > 0 && (
                    <span className="text-[11px] font-black text-amber-600 tabular-nums shrink-0">{formatPKR(c.balance)}</span>
                  )}
                  {customerId === c.id && <Check className="h-4 w-4 text-pink-600 shrink-0" />}
                </button>
              ))}
            </div>
            <button onClick={() => { setOpen(false); onAdd(); }}
              className="w-full h-12 bg-pink-600 hover:bg-pink-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
              <UserPlus className="h-4 w-4" /> Naya customer
            </button>
          </div>
        </>, document.body)}
    </>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Modal({ title, sub, icon: Icon, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <div className="min-w-0">
            <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2 truncate">
              <Icon className="h-5 w-5 shrink-0" /> {title}
            </h3>
            {sub && <p className="text-[11px] font-bold text-pink-700 dark:text-pink-300">{sub}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center shrink-0">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Line({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-black tabular-nums ${tone ? tones[tone] : 'text-slate-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Counter kaise chalayein
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={Zap} title="Sab se tez tareeqa">
            Cheez par click karein, phir <strong>F12</strong>. Cash ka bill ban kar seedha
            print ho jata hai — koi aur qadam nahi.
          </Tip>
          <Tip icon={ScanLine} title="Barcode">
            <strong>B</strong> dabayein ya Scan par click karein. Ab <strong>har</strong> cheez
            ka barcode chalta hai — Lays aur bottle bhi. Pehle bakery wali cheez ke ilawa kuch
            scan hota hi nahi tha.
          </Tip>
          <Tip icon={Cake} title="Ek cheez, kai rate">
            Cake pound se bhi bikta hai, slice se bhi, poora bhi. Click par rate chunne ka
            option aa jata hai — jo jo rate bhare hain sirf wohi dikhte hain.
          </Tip>
          <Tip icon={Timer} title="Jald kharab hone wala maal">
            Jis ka waqt khatam ho raha hai us par <strong>ghante</strong> ka nishan aata hai,
            aur wo list me sab se upar aa jata hai. Yehi maal pehle bechna chahiye.
          </Tip>
          <Tip icon={BookOpen} title="Udhaar">
            <strong>F9</strong> se "Paisay lein" khulta hai — poora, kuch abhi, ya poora udhaar.
            Udhaar ke liye customer chunna zaroori hai, aur bill par uska <strong>purana
            udhaar</strong> bhi chhap jata hai.
          </Tip>
          <Tip icon={Pause} title="Bill rok dein">
            Customer kuch aur lene chala gaya? <strong>H</strong> daba kar bill rok dein, aur
            agla customer nipta lein. Upar se wapas khol sakte hain.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">F12</kbd> cash bill</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">F9</kbd> paisay lein</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">B</kbd> barcode</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">H</kbd> bill rok</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> ye madad</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
