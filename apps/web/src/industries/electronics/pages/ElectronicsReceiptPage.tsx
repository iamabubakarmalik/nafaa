// apps/web/src/industries/electronics/pages/ElectronicsReceiptPage.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, CheckCircle2, Copy, Check, RefreshCw,
  Share2, ReceiptText, Minimize2, Maximize2, MapPin, Phone, User,
  CalendarClock, Cpu, ShieldCheck, ShieldAlert, Tag, TrendingUp,
  Loader2, AlertTriangle, Wallet, X, Barcode, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { formatPKR } from '@core/lib/format';
import { FbrReceiptBadge } from '@integrations/fbr';

/* ════════════════════════════════════════════════════════════
   🔌 NAFAA ELECTRONICS RECEIPT — FINAL v2
   ────────────────────────────────────────────────────────────
   🖨️  A4 + 80mm + 58mm • Short/Full • auto-print • offline-safe
   🔖 Har serial/IMEI/MAC receipt par — customer ka sabot
   🛡️  WARRANTY CARD — endDate ya months, dono se ban jata hai
   📋 Serial copy button (screen) • ⌨️ P = print
   📲 WhatsApp — customer phone ho ya na ho, dono chalta hai
   🎁 Bundle items pe BUNDLE badge • 🚚 Service charges lines
   🤝 "Powered by Nafaa POS" HAMESHA
   ════════════════════════════════════════════════════════════ */

type PaperWidth = '58' | '80';
type Format = 'a4' | PaperWidth;
type Mode = 'short' | 'full';

/* ── Types ───────────────────────────────────────────────── */
interface ReceiptSerial {
  serialNumber: string;
  imei?: string;
  imei2?: string;
  macAddress?: string;
  warrantyEndDate?: string;
  warrantyStartDate?: string;
  warrantyStatus?: string;
  condition?: string;
  /** kitne din baqi — minus matlab khatam */
  daysLeft: number | null;
}
interface ReceiptItem {
  name: string; qty: number; price: number; total: number;
  unit?: string; discount?: number; note?: string;
  serials: ReceiptSerial[];
  bundleName?: string;
}
interface ReceiptService {
  label: string;
  amount: number;
  note?: string;
}
interface ReceiptData {
  id: string; invoiceNo: string; shortNo: string; createdAt: string;
  customerName?: string; customerPhone?: string;
  cashierName?: string; paymentMethod?: string;
  items: ReceiptItem[];
  services: ReceiptService[];
  subtotal: number; billDiscount: number; tax: number; total: number;
  paid: number; change: number; dueAmount: number;
  isVoided: boolean; hasFbr: boolean;
}
interface ShopInfo {
  businessName: string; address: string; phone: string; ntn: string;
  receiptFooter: string; receiptLogoUrl: string;
  paperWidth?: PaperWidth; autoPrint: boolean;
}

/* ── Helpers ─────────────────────────────────────────────── */
const num = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : Number(v) || 0);
const str = (v: any): string => (typeof v === 'string' ? v : v != null ? String(v) : '');

const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
};

const dateOnly = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PK');
};

/* Sale date + months → warranty end (jab backend endDate na bheje) */
const addMonths = (isoDate: string, months: number): string | undefined => {
  const d = new Date(isoDate);
  if (isNaN(d.getTime()) || months <= 0) return undefined;
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

function makeShortNo(invoiceNo: string, id: string): string {
  const src = invoiceNo || id;
  if (!src) return '—';
  if (src.length <= 14) return src;
  const tail = src.replace(/-/g, '').slice(-8).toUpperCase();
  return `#${tail}`;
}

const BUNDLE_NOTE_RE = /^part of bundle:\s*(.+)$/i;

function normalizeSerial(raw: any, soldAt: string): ReceiptSerial {
  let end = str(raw?.warrantyEndDate ?? '') || undefined;
  /* Fallback: sirf months mile to sale date se end nikaalo */
  if (!end) {
    const months = num(raw?.warrantyMonths ?? 0);
    if (months > 0) end = addMonths(soldAt, months);
  }
  return {
    serialNumber: str(raw?.serialNumber ?? raw?.serial ?? ''),
    imei: str(raw?.imei ?? raw?.imei1 ?? '') || undefined,
    imei2: str(raw?.imei2 ?? '') || undefined,
    macAddress: str(raw?.macAddress ?? '') || undefined,
    warrantyEndDate: end,
    warrantyStartDate: str(raw?.warrantyStartDate ?? '') || undefined,
    warrantyStatus: str(raw?.warrantyStatus ?? '') || undefined,
    condition: str(raw?.physicalCondition ?? raw?.condition ?? '') || undefined,
    daysLeft: daysUntil(end),
  };
}

function normalizeSale(raw: any): ReceiptData {
  const soldAt = str(raw?.createdAt ?? raw?.soldAt ?? raw?.date ?? new Date().toISOString());

  const items: ReceiptItem[] = (raw?.items ?? raw?.saleItems ?? raw?.lines ?? []).map((it: any) => {
    const qty = num(it.qty ?? it.quantity ?? 1);
    const price = num(it.price ?? it.unitPrice ?? it.rate ?? it.priceOverride ?? 0);
    const serials: ReceiptSerial[] = Array.isArray(it.serials) ? it.serials.map((s: any) => normalizeSerial(s, soldAt)) : [];
    const rawNote = str(it.note ?? '') || undefined;
    const bundleMatch = rawNote?.match(BUNDLE_NOTE_RE);
    return {
      name: str(it.name ?? it.productName ?? it.product?.name ?? '') || 'Item',
      qty, price,
      total: num(it.total ?? it.lineTotal ?? it.amount ?? qty * price),
      unit: str(it.unit ?? it.unitName ?? it.product?.unit ?? '') || undefined,
      discount: num(it.discount ?? it.discountAmount ?? 0) || undefined,
      note: bundleMatch ? undefined : rawNote,
      serials,
      bundleName: bundleMatch ? bundleMatch[1] : undefined,
    };
  });

  /* Delivery / installation waghera — sale par lagti hain, item par nahi */
  const services: ReceiptService[] = (Array.isArray(raw?.serviceChargesBreakdown)
    ? raw.serviceChargesBreakdown
    : []
  ).map((sc: any) => ({
    label: str(sc?.label ?? sc?.type ?? 'Service'),
    amount: num(sc?.amount),
    note: str(sc?.note ?? '') || undefined,
  })).filter((sc: ReceiptService) => sc.amount > 0);

  const subtotal = num(raw?.subtotal ?? raw?.subTotal ?? items.reduce((s, i) => s + i.total, 0));
  const billDiscount = num(raw?.billDiscount ?? raw?.discount ?? raw?.discountAmount ?? 0);
  const tax = num(raw?.tax ?? raw?.taxAmount ?? 0);
  const total = num(raw?.total ?? raw?.grandTotal ?? raw?.netTotal ?? subtotal - billDiscount + tax);
  const paid = num(raw?.paid ?? raw?.paidAmount ?? raw?.amountPaid ?? total);
  const id = str(raw?.id ?? raw?._id);
  const invoiceNo = str(raw?.invoiceNo ?? raw?.saleNumber ?? raw?.invoiceNumber ?? raw?.saleNo ?? id);
  const status = str(raw?.status ?? '').toUpperCase();

  return {
    id,
    invoiceNo,
    shortNo: makeShortNo(invoiceNo, id),
    createdAt: soldAt,
    customerName: str(raw?.customerName ?? raw?.customer?.name ?? '') || undefined,
    customerPhone: str(raw?.customerPhone ?? raw?.customer?.phone ?? '') || undefined,
    cashierName: str(raw?.cashierName ?? raw?.createdBy?.fullName ?? raw?.createdBy?.name ?? '') || undefined,
    paymentMethod: str(raw?.paymentMethod ?? raw?.payment?.method ?? 'Cash') || undefined,
    items, services, subtotal, billDiscount, tax, total, paid,
    change: num(raw?.change ?? raw?.changeAmount ?? Math.max(0, paid - total)),
    dueAmount: num(raw?.dueAmount ?? raw?.creditAmount ?? raw?.due ?? Math.max(0, total - paid)),
    isVoided: status === 'VOIDED',
    hasFbr: Boolean(raw?.fbrInvoiceNo ?? raw?.fbr?.invoiceNo ?? raw?.fbrStatus === 'CONFIRMED'),
  };
}

function normalizeShop(res: any, saleRaw: any): ShopInfo {
  const s = res?.settings ?? saleRaw?.tenant?.settings ?? {};
  const t = res?.tenant ?? saleRaw?.tenant ?? {};
  const rawWidth = str(s.paperWidth ?? s.receiptPaperWidth ?? s.receiptSize ?? '');
  const pw: PaperWidth | undefined =
    rawWidth === '58' || rawWidth === 'THERMAL_58MM' ? '58'
    : rawWidth === '80' || rawWidth === 'THERMAL_80MM' ? '80'
    : undefined;
  return {
    businessName: str(t.name ?? t.businessName ?? s.businessName ?? s.shopName ?? 'Electronics Shop'),
    address:      [str(s.shopAddress ?? t.address ?? s.address ?? ''), str(s.shopCity ?? '')].filter(Boolean).join(', '),
    phone:        str(s.shopPhone ?? t.phone ?? s.phone ?? ''),
    ntn:          str(s.ntn ?? s.ntnNumber ?? t.ntn ?? ''),
    receiptFooter: str(s.receiptFooter ?? s.receipt_footer ?? 'Shukriya! Phir tashreef laiye.'),
    receiptLogoUrl: str(s.receiptLogoUrl ?? s.logoUrl ?? t.logoUrl ?? ''),
    paperWidth:   pw,
    autoPrint:    Boolean(s.autoPrint ?? s.autoPrintReceipt ?? false),
  };
}

const formatDate = (v: string) => {
  const d = new Date(v);
  return `${d.toLocaleDateString('en-PK')} ${d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`;
};

/* ══════════════════════════════════════════════════════════ */
export default function ElectronicsReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'full' ? 'full' : 'short');
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<Format>(() => {
    const p = searchParams.get('paper');
    return p === '58' ? '58' : p === '80' ? '80' : p === 'a4' ? 'a4' : '80';
  });
  const isAutoOpened = searchParams.get('auto') === '1';

  const { data: rawSale, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: async () => {
      const s = await offlineSalesApi.getOne(id!);
      if (!s) throw new Error('Sale nahi mili');
      return s as any;
    },
    enabled: !!id,
    retry: 1,
  });

  const { data: rawSettingsRes } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
    retry: 1,
  });

  const sale = useMemo(() => (rawSale ? normalizeSale(rawSale) : null), [rawSale]);
  const shop = useMemo(() => normalizeShop(rawSettingsRes, rawSale), [rawSettingsRes, rawSale]);

  useEffect(() => {
    if (shop.paperWidth && !searchParams.get('paper')) setFormat(shop.paperWidth);
  }, [shop.paperWidth, searchParams]);

  /* ── Print ── */
  const doPrint = useCallback(() => {
    document.body.dataset.paper = format === 'a4' ? 'a4' : format;
    window.print();
  }, [format]);

  useEffect(() => {
    document.body.dataset.paper = format === 'a4' ? 'a4' : format;
    return () => { delete document.body.dataset.paper; };
  }, [format]);

  useEffect(() => {
    const want =
      searchParams.get('autoprint') === '1' ||
      (isAutoOpened && localStorage.getItem('nafaa.electronics-pos.auto-print') !== 'false') ||
      shop.autoPrint;
    if (want && sale && !isLoading) {
      const t = setTimeout(doPrint, 600);
      return () => clearTimeout(t);
    }
  }, [sale, isLoading, searchParams, shop.autoPrint, doPrint, isAutoOpened]);

  /* ⌨️ P = print shortcut */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); doPrint(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doPrint]);

  /* ── Void ── */
  const voidMutation = useMutation({
    mutationFn: (reason: string) => salesApi.voidSale(id!, reason),
    onSuccess: () => {
      toast.success('Sale void ho gayi');
      queryClient.invalidateQueries({ queryKey: ['sale-receipt', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Void fail hua'),
  });

  /* ── Share ── */
  const receiptUrl = `${window.location.origin}/sales/${id}/receipt`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(receiptUrl);
      setCopied(true);
      toast.success('Receipt link copy ho gaya');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Copy nahi hua'); }
  };

  const copySerial = async (sn: string) => {
    try {
      await navigator.clipboard.writeText(sn);
      toast.success(`Serial copy: ${sn}`, { duration: 1200 });
    } catch { toast.error('Copy nahi hua'); }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Receipt', url: receiptUrl }); } catch { /* cancelled */ }
    } else copyLink();
  };

  /* WhatsApp — phone ho to direct, na ho to contact picker */
  const shareWhatsApp = () => {
    if (!sale) return;

    const lines: string[] = [
      `🔌 *${shop.businessName}*`, '',
      `Assalam-o-Alaikum ${sale.customerName ?? ''}!`.trim(),
      'Aap ki kharidari ka shukriya 🙏', '',
      `*Invoice:* ${sale.shortNo}`,
      `*Date:* ${formatDate(sale.createdAt)}`, '',
      '*Items:*',
    ];
    sale.items.forEach((it, i) => {
      lines.push(`${i + 1}. ${it.name} × ${it.qty} = ${formatPKR(it.total)}`);
      if (it.bundleName) lines.push(`   🎁 Bundle: ${it.bundleName}`);
      it.serials.forEach((sn) => {
        if (sn.serialNumber) lines.push(`   🔖 Serial: \`${sn.serialNumber}\``);
        if (sn.imei) lines.push(`   📱 IMEI: \`${sn.imei}\``);
        if (sn.macAddress) lines.push(`   🌐 MAC: \`${sn.macAddress}\``);
        if (sn.warrantyEndDate) {
          lines.push(sn.daysLeft != null && sn.daysLeft < 0
            ? '   ⚠️ Warranty khatam ho chuki'
            : `   🛡️ Warranty: *${dateOnly(sn.warrantyEndDate)} tak*`);
        }
      });
    });
    lines.push('', `Subtotal: ${formatPKR(sale.subtotal)}`);
    if (sale.billDiscount > 0) lines.push(`Discount: -${formatPKR(sale.billDiscount)}`);
    sale.services.forEach((sc) => lines.push(`${sc.label}: ${formatPKR(sc.amount)}`));
    lines.push(`*TOTAL: ${formatPKR(sale.total)}*`, `Paid: ${formatPKR(sale.paid)}`);
    if (sale.change > 0) lines.push(`Change: ${formatPKR(sale.change)}`);
    if (sale.dueAmount > 0) lines.push(`⚠️ Baqi: ${formatPKR(sale.dueAmount)}`);
    lines.push('', '_Warranty claim ke liye ye invoice aur serial number zaroori hai._', '_Powered by Nafaa POS_');

    const text = encodeURIComponent(lines.join('\n'));
    if (sale.customerPhone) {
      const phone = sale.customerPhone.replace(/[^0-9]/g, '');
      const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
      window.open(`https://wa.me/${clean}?text=${text}`, '_blank');
    } else {
      /* Phone nahi — user khud contact chune */
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const savings = useMemo(
    () => (sale ? sale.items.reduce((s, it) => s + (it.discount ?? 0), 0) + sale.billDiscount : 0),
    [sale],
  );
  const allSerials = useMemo(() => sale?.items.flatMap((it) => it.serials) ?? [], [sale]);
  const hasSerials = allSerials.length > 0;
  const hasWarranty = allSerials.some((s) => !!s.warrantyEndDate);

  /* ── States ── */
  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-100 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Receipt load ho rahi hai…</p>
        </div>
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-100 dark:bg-neutral-950 p-6">
        <div className="max-w-sm w-full rounded-2xl bg-white dark:bg-neutral-900 p-8 text-center shadow-lg">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
          <h2 className="mt-4 text-lg font-extrabold dark:text-neutral-100">Receipt nahi mili</h2>
          <p className="mt-1 text-sm text-neutral-500">Sale ID ghalat hai ya record delete ho chuka hai.</p>
          <div className="mt-6 flex gap-2 justify-center">
            <button onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white px-4 py-2 text-sm font-extrabold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Retry
            </button>
            <button onClick={() => navigate(-1)} className="rounded-xl border px-4 py-2 text-sm font-extrabold dark:text-neutral-200">Wapas</button>
          </div>
        </div>
      </div>
    );
  }

  const full = mode === 'full';

  /* ── UI ── */
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 pb-28 print:bg-white">
      <ReceiptPrintStyles />

      {/* ══ Auto-opened success banner ══ */}
      {isAutoOpened && (
        <div className="print:hidden max-w-2xl mx-auto px-3 pt-3">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-5 py-3 flex items-center gap-3 shadow-lg flex-wrap">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">Sale Complete! 🔌</div>
              <div className="text-xs text-white/90">
                {hasSerials
                  ? `${allSerials.length} serial${allSerials.length > 1 ? 's' : ''} wali invoice — print karein ya WhatsApp bhejein`
                  : 'Receipt print karein ya WhatsApp bhejein'}
              </div>
            </div>
            <Link to="/pos" className="text-xs font-extrabold underline shrink-0">→ Nayi Sale</Link>
            <FbrReceiptBadge saleId={sale.id} variant="thermal" />
          </div>
        </div>
      )}

      {/* ══ Toolbar ══ */}
      <div className="print:hidden sticky top-0 z-20 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b dark:border-neutral-800">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-3 py-2.5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Back">
            <ArrowLeft className="h-5 w-5 dark:text-neutral-200" />
          </button>
          <h1 className="font-extrabold text-sm flex items-center gap-2 dark:text-neutral-100">
            <ReceiptText className="h-4 w-4" /> Receipt
          </h1>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex rounded-xl border dark:border-neutral-700 overflow-hidden">
              <button onClick={() => setMode('short')}
                className={`px-2.5 py-1.5 text-xs font-extrabold flex items-center gap-1 ${!full ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'dark:text-neutral-300'}`}>
                <Minimize2 className="h-3.5 w-3.5" /> Short
              </button>
              <button onClick={() => setMode('full')}
                className={`px-2.5 py-1.5 text-xs font-extrabold flex items-center gap-1 ${full ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'dark:text-neutral-300'}`}>
                <Maximize2 className="h-3.5 w-3.5" /> Full
              </button>
            </div>

            <div className="hidden sm:flex rounded-xl border dark:border-neutral-700 overflow-hidden">
              {(['a4', '80', '58'] as Format[]).map((f) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-2.5 py-1.5 text-xs font-extrabold tabular-nums ${format === f ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'dark:text-neutral-300'}`}>
                  {f === 'a4' ? 'A4' : `${f}mm`}
                </button>
              ))}
            </div>

            <button onClick={shareWhatsApp}
              className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              aria-label="WhatsApp" title={sale.customerPhone ? 'Customer ko WhatsApp' : 'WhatsApp pe share'}>
              <MessageCircle className="h-4 w-4" />
            </button>
            <button onClick={shareNative} className="p-2 rounded-xl border dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Share">
              <Share2 className="h-4 w-4 dark:text-neutral-300" />
            </button>
            <button onClick={copyLink} className="p-2 rounded-xl border dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Copy link">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 dark:text-neutral-300" />}
            </button>
            {!sale.isVoided && (
              <button onClick={() => { const r = prompt('Void reason?'); if (r !== null) voidMutation.mutate(r); }}
                className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700" aria-label="Void">
                <X className="h-4 w-4" />
              </button>
            )}
            <button onClick={doPrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-3.5 py-2 text-sm font-extrabold hover:bg-indigo-700">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* ══ Voided banner ══ */}
      {sale.isVoided && (
        <div className="print:hidden max-w-2xl mx-auto px-3 pt-3">
          <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-5 py-4 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            <div className="font-extrabold text-rose-900 dark:text-rose-200">SALE VOIDED</div>
          </div>
        </div>
      )}

      {/* ══ Warranty summary (screen only — dukandar ko foran nazar aaye) ══ */}
      {hasWarranty && !sale.isVoided && (
        <div className="print:hidden max-w-2xl mx-auto px-3 pt-3">
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 dark:border-emerald-500/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Warranty Ka Khulasa
              </span>
            </div>
            <div className="space-y-1.5">
              {allSerials.filter((s) => s.warrantyEndDate).map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-neutral-100">{s.serialNumber}</span>
                  <button onClick={() => copySerial(s.serialNumber)}
                    className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Serial copy">
                    <Copy className="h-3 w-3 text-neutral-400" />
                  </button>
                  <span className={`px-2 py-0.5 rounded-lg font-extrabold ${
                    s.daysLeft != null && s.daysLeft < 0
                      ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      : s.daysLeft != null && s.daysLeft <= 30
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  }`}>
                    {s.daysLeft != null && s.daysLeft < 0
                      ? 'Khatam'
                      : `${dateOnly(s.warrantyEndDate)} tak${s.daysLeft != null ? ` (${s.daysLeft} din)` : ''}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ Receipt Paper ══ */}
      <div className="flex justify-center px-3 py-6 print:p-0">
        <div
          id="receipt-paper"
          className={`receipt-paper bg-white text-black shadow-xl print:shadow-none ${format === 'a4' ? 'receipt-a4' : ''}`}
          style={{ width: format === 'a4' ? '100%' : format === '58' ? 220 : 300, maxWidth: format === 'a4' ? 820 : undefined }}
        >
          {/* ── Header ── */}
          <div className="rc-center">
            {shop.receiptLogoUrl && (
              <img src={shop.receiptLogoUrl} alt="" className="rc-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div className="rc-shop">{shop.businessName}</div>
            {shop.address && <div className="rc-sub"><MapPin className="h-3 w-3 inline" /> {shop.address}</div>}
            {shop.phone && <div className="rc-sub"><Phone className="h-3 w-3 inline" /> {shop.phone}</div>}
            {full && shop.ntn && <div className="rc-sub">NTN: {shop.ntn}</div>}
          </div>

          <div className="rc-div-dash" />

          {/* ── Meta ── */}
          <div className="rc-meta-grid">
            <div className="rc-meta-cell">
              <span className="rc-meta-label">Invoice</span>
              <b className="rc-meta-value">{sale.shortNo}</b>
            </div>
            <div className="rc-meta-cell rc-right">
              <span className="rc-meta-label"><CalendarClock className="h-3 w-3 inline" /> Date</span>
              <span className="rc-meta-value tabular-nums">{formatDate(sale.createdAt)}</span>
            </div>
          </div>
          {sale.customerName && (
            <div className="rc-row"><span><User className="h-3 w-3 inline" /> Customer</span><b>{sale.customerName}</b></div>
          )}
          {sale.customerPhone && (
            <div className="rc-row"><span>Phone</span><span className="tabular-nums">{sale.customerPhone}</span></div>
          )}
          {full && sale.cashierName && (
            <div className="rc-row"><span>Cashier</span><span>{sale.cashierName}</span></div>
          )}

          <div className="rc-div-dash" />

          {/* ── Items + serial blocks ── */}
          <div className="rc-row rc-head">
            <span><Cpu className="h-3 w-3 inline" /> Item</span>
            <span>Amount</span>
          </div>
          {sale.items.map((it, i) => (
            <div key={i} className="rc-item">
              <div className="rc-iname">
                <span className="rc-inum">{i + 1}.</span> {it.name}
                {it.serials.length > 0 && <span className="rc-badge">SERIAL</span>}
                {it.bundleName && <span className="rc-badge rc-badge-bundle">BUNDLE</span>}
              </div>

              {/* 🔖 Serial / identifiers — screen pe copy button, print me nahi */}
              {it.serials.map((sn, j) => (
                <div key={j} className="rc-serial">
                  {sn.serialNumber && (
                    <div className="rc-serial-row">
                      <span className="rc-serial-label">S/N</span>
                      <b className="rc-mono">{sn.serialNumber}</b>
                      <button onClick={() => copySerial(sn.serialNumber)}
                        className="print:hidden p-0.5 rounded hover:bg-neutral-100 -mt-0.5" title="Copy serial">
                        <Copy className="h-3 w-3 text-neutral-400" />
                      </button>
                    </div>
                  )}
                  {sn.imei && (
                    <div className="rc-serial-row">
                      <span className="rc-serial-label">IMEI</span>
                      <span className="rc-mono">{sn.imei}</span>
                      <button onClick={() => copySerial(sn.imei!)}
                        className="print:hidden p-0.5 rounded hover:bg-neutral-100 -mt-0.5" title="Copy IMEI">
                        <Copy className="h-3 w-3 text-neutral-400" />
                      </button>
                    </div>
                  )}
                  {full && sn.imei2 && (
                    <div className="rc-serial-row">
                      <span className="rc-serial-label">IMEI 2</span>
                      <span className="rc-mono">{sn.imei2}</span>
                    </div>
                  )}
                  {full && sn.macAddress && (
                    <div className="rc-serial-row">
                      <span className="rc-serial-label">MAC</span>
                      <span className="rc-mono">{sn.macAddress}</span>
                    </div>
                  )}
                  <div className="rc-serial-tags">
                    {sn.warrantyEndDate ? (
                      <b>
                        {sn.daysLeft != null && sn.daysLeft < 0
                          ? 'Warranty khatam'
                          : `Warranty till ${dateOnly(sn.warrantyEndDate)}`}
                      </b>
                    ) : (
                      <span>No warranty</span>
                    )}
                    {full && sn.condition && <span>Halat: {sn.condition}</span>}
                  </div>
                </div>
              ))}

              {it.bundleName && (
                <div className="rc-idetail rc-dim" style={{ paddingLeft: 12 }}>🎁 {it.bundleName} ka hissa</div>
              )}
              {full && it.note && it.serials.length === 0 && (
                <div className="rc-idetail rc-dim" style={{ paddingLeft: 12 }}>{it.note}</div>
              )}

              <div className="rc-row rc-idetail">
                <span className="tabular-nums">
                  {it.qty} × {formatPKR(it.price)}{full && it.unit ? ` ${it.unit}` : ''}
                </span>
                <b className="tabular-nums">{formatPKR(it.total)}</b>
              </div>
              {full && (it.discount ?? 0) > 0 && (
                <div className="rc-row rc-idetail rc-dim">
                  <span><Tag className="h-3 w-3 inline" /> Discount</span>
                  <span className="tabular-nums">−{formatPKR(it.discount!)}</span>
                </div>
              )}
            </div>
          ))}

          <div className="rc-div-dash" />

          {/* ── Totals ── */}
          <div className="rc-row"><span>Subtotal</span><span className="tabular-nums">{formatPKR(sale.subtotal)}</span></div>
          {sale.billDiscount > 0 && (
            <div className="rc-row rc-dim">
              <span><Tag className="h-3 w-3 inline" /> Discount</span>
              <span className="tabular-nums">−{formatPKR(sale.billDiscount)}</span>
            </div>
          )}
          {sale.services.map((sc, i) => (
            <div key={i} className="rc-row">
              <span>🚚 {sc.label}{full && sc.note ? ` (${sc.note})` : ''}</span>
              <span className="tabular-nums">{formatPKR(sc.amount)}</span>
            </div>
          ))}
          {full && sale.tax > 0 && (
            <div className="rc-row"><span>Tax</span><span className="tabular-nums">{formatPKR(sale.tax)}</span></div>
          )}
          <div className="rc-row">
            <span>Items</span>
            <span className="tabular-nums">{sale.items.length} ({sale.items.reduce((a, i) => a + i.qty, 0)} qty)</span>
          </div>

          <div className="rc-total">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatPKR(sale.total)}</span>
          </div>

          <div className="rc-row">
            <span><Wallet className="h-3 w-3 inline" /> Paid{sale.paymentMethod ? ` (${sale.paymentMethod})` : ''}</span>
            <span className="tabular-nums">{formatPKR(sale.paid)}</span>
          </div>
          {sale.change > 0 && (
            <div className="rc-row"><span>Change</span><span className="tabular-nums">{formatPKR(sale.change)}</span></div>
          )}
          {sale.dueAmount > 0 && (
            <div className="rc-credit">
              <span>⚠ BAQI</span>
              <b className="tabular-nums">{formatPKR(sale.dueAmount)}</b>
            </div>
          )}
          {savings > 0 && (
            <div className="rc-saving">
              <TrendingUp className="h-3 w-3 inline" /> Aap ki bachat: {formatPKR(savings)}
            </div>
          )}

          {/* ── 🛡️ WARRANTY CARD ── */}
          {hasWarranty && (
            <>
              <div className="rc-div-dash" />
              <div className="rc-wcard">
                <div className="rc-wcard-title">🛡️ WARRANTY CARD</div>
                {allSerials.filter((s) => s.warrantyEndDate).map((s, i) => (
                  <div key={i} className="rc-wcard-row">
                    <span className="rc-mono">{s.serialNumber || s.imei || '—'}</span>
                    <b>{s.daysLeft != null && s.daysLeft < 0 ? 'KHATAM' : dateOnly(s.warrantyEndDate)}</b>
                  </div>
                ))}
                <div className="rc-wcard-note">
                  Claim ke liye ye invoice + serial number lazmi hai
                </div>
              </div>
            </>
          )}

          {/* ── Terms ── */}
          {hasSerials && (
            <>
              <div className="rc-div-dash" />
              <div className="rc-terms">
                <b>Warranty Terms:</b>
                {full ? (
                  <>
                    <div>• Warranty sirf asal invoice aur serial number ke saath</div>
                    <div>• Physical/pani ka nuqsan aur bahar se repair — warranty khatam</div>
                    <div>• Software ke masail hardware warranty me shamil nahi</div>
                    <div>• Wapsi/tabdeeli 3 din ke andar, asal dabbe ke saath</div>
                    <div>• Consumable parts (battery, cable, ear tips) warranty me nahi</div>
                  </>
                ) : (
                  <>
                    <div>• Physical/pani ka nuqsan — warranty khatam</div>
                    <div>• Claim ke liye ye invoice sambhal kar rakhein</div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── FBR ── */}
          {sale.hasFbr && (
            <>
              <div className="rc-div-dash" />
              <div className="rc-center">
                <FbrReceiptBadge saleId={sale.id} variant="thermal" className="rc-fbr" />
              </div>
            </>
          )}

          {/* ── Barcode strip ── */}
          <div className="rc-barcode" aria-hidden>
            {sale.shortNo.replace(/[^A-Z0-9]/gi, '').split('').map((ch, i) => (
              <span key={i} className="rc-bar" style={{ width: (ch.charCodeAt(0) % 3) + 1.5 }} />
            ))}
          </div>
          <div className="rc-center rc-sub" style={{ letterSpacing: 2 }}>{sale.shortNo}</div>

          <div className="rc-div-dash" />

          {/* ── Footer ── */}
          <div className="rc-center rc-sub">{shop.receiptFooter}</div>
          <div className="rc-center" style={{ fontWeight: 800, marginTop: 4 }}>🔌 Shukriya! 🙏</div>
          {full && hasSerials && (
            <div className="rc-center rc-sub" style={{ marginTop: 2 }}>
              Warranty check ke liye shop pe serial scan karwayein
            </div>
          )}

          <div className="rc-powered">
            <span className="rc-powered-star">✦</span> Powered by <b>Nafaa POS</b> <span className="rc-powered-star">✦</span>
          </div>

          {sale.isVoided && <div className="rc-void">*** VOIDED ***</div>}

          <div className="rc-cut">— — — — — — — — — — — — — — ✂</div>
        </div>
      </div>

      {/* ══ Mobile bottom bar ══ */}
      <div className="print:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t dark:border-neutral-800 p-3 sm:hidden">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <button onClick={doPrint}
            className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-indigo-600 text-white py-3 text-sm font-extrabold">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={shareWhatsApp}
            className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 text-white py-3 text-sm font-extrabold">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
        </div>
      </div>

      {searchParams.get('fresh') === '1' && (
        <div className="print:hidden fixed top-16 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-2.5 shadow-lg text-sm font-extrabold">
            <CheckCircle2 className="h-4 w-4" /> Sale mukammal!
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRINT CSS — thermal bulletproof + serial/warranty blocks
   ════════════════════════════════════════════════════════════ */
function ReceiptPrintStyles() {
  return (
    <style>{`
      .receipt-paper { padding: 16px 12px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.35; color: #000; }
      .rc-center { text-align: center; }
      .rc-shop { font-size: 17px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
      .rc-sub { font-size: 10.5px; color: #444; }
      .rc-logo { max-height: 48px; max-width: 70%; margin: 0 auto 6px; object-fit: contain; filter: grayscale(1) contrast(1.4); }
      .rc-div-dash { border-top: 1px dashed #999; margin: 8px 0; }
      .rc-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
      .rc-head { font-weight: 800; border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-bottom: 4px; }
      .rc-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 2px 0; }
      .rc-meta-cell { display: flex; flex-direction: column; }
      .rc-meta-cell.rc-right { text-align: right; align-items: flex-end; }
      .rc-meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #666; font-weight: 700; }
      .rc-meta-value { font-size: 12px; font-weight: 800; word-break: break-all; }
      .rc-item { margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid; }
      .rc-iname { font-weight: 700; }
      .rc-inum { color: #888; font-weight: 400; font-size: 10px; }
      .rc-badge { display: inline-block; margin-left: 4px; padding: 0 4px; font-size: 8px; font-weight: 800; border: 1px solid #000; border-radius: 3px; vertical-align: middle; }
      .rc-badge-bundle { border-style: dashed; }
      .rc-idetail { font-size: 11px; }
      .rc-dim { color: #555; }
      .rc-mono { font-family: Consolas, 'Courier New', monospace; }

      /* 🔖 Serial block */
      .rc-serial { margin: 3px 0 2px 8px; padding: 2px 0 2px 6px; border-left: 2px solid #000; font-size: 10px; }
      .rc-serial-row { display: flex; gap: 6px; align-items: baseline; }
      .rc-serial-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #555; min-width: 34px; }
      .rc-serial-tags { display: flex; flex-wrap: wrap; gap: 2px 8px; font-size: 9px; margin-top: 1px; }

      /* 🛡️ Warranty card */
      .rc-wcard { border: 1.5px solid #000; border-radius: 4px; padding: 5px 6px; }
      .rc-wcard-title { font-weight: 800; font-size: 11px; text-align: center; letter-spacing: 1px; border-bottom: 1px dashed #999; padding-bottom: 3px; margin-bottom: 3px; }
      .rc-wcard-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; margin: 1px 0; }
      .rc-wcard-note { font-size: 8.5px; font-style: italic; color: #444; text-align: center; margin-top: 3px; border-top: 1px dashed #ccc; padding-top: 3px; }

      .rc-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 6px 0; }
      .rc-credit { display: flex; justify-content: space-between; font-weight: 800; background: #f3f4f6; border: 1.5px solid #000; padding: 4px 6px; border-radius: 4px; margin-top: 4px; }
      .rc-saving { text-align: center; font-size: 11px; font-weight: 700; margin-top: 6px; border: 1px dashed #999; border-radius: 6px; padding: 4px; }
      .rc-terms { font-size: 9.5px; font-style: italic; color: #333; }
      .rc-terms b { font-style: normal; }
      .rc-barcode { display: flex; align-items: flex-end; justify-content: center; gap: 1.5px; height: 28px; margin-top: 10px; }
      .rc-bar { display: inline-block; height: 100%; background: #000; }
      .rc-powered { text-align: center; font-size: 10px; color: #555; margin-top: 8px; font-weight: 600; }
      .rc-powered b { font-weight: 800; color: #000; }
      .rc-powered-star { color: #999; }
      .rc-void { margin-top: 8px; border: 2px solid #000; font-weight: 800; text-align: center; padding: 4px; letter-spacing: 2px; }
      .rc-cut { text-align: center; color: #bbb; font-size: 10px; margin-top: 10px; letter-spacing: 2px; white-space: nowrap; overflow: hidden; }
      .rc-fbr { margin: 4px auto; }

      /* ── A4 mode ── */
      .receipt-a4 { padding: 32px 36px !important; font-size: 13px; }
      .receipt-a4 .rc-shop { font-size: 26px; }
      .receipt-a4 .rc-sub { font-size: 12px; }
      .receipt-a4 .rc-logo { max-height: 72px; }
      .receipt-a4 .rc-serial { font-size: 12px; padding: 4px 0 4px 10px; }
      .receipt-a4 .rc-serial-tags { font-size: 11px; }
      .receipt-a4 .rc-total { font-size: 22px; }
      .receipt-a4 .rc-terms { font-size: 11px; }
      .receipt-a4 .rc-wcard-title { font-size: 14px; }
      .receipt-a4 .rc-wcard-row { font-size: 12px; }
      .receipt-a4 .rc-barcode { height: 40px; }

      @media print {
        body * { visibility: hidden; }
        #receipt-paper, #receipt-paper * { visibility: visible; }
        #receipt-paper {
          position: absolute; left: 0; top: 0;
          box-shadow: none !important; margin: 0 !important;
          width: 100% !important; max-width: 100% !important;
          padding: 4mm 2mm !important;
        }
        #receipt-paper, #receipt-paper * {
          color: #000 !important; background: #fff !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
          text-shadow: none !important; box-shadow: none !important;
        }
        #receipt-paper .rc-credit { background: #fff !important; border: 1.5px solid #000 !important; }
        #receipt-paper .rc-div-dash { border-top-color: #000 !important; }
        #receipt-paper .rc-logo { filter: grayscale(1) contrast(2) !important; }
        #receipt-paper .rc-bar { background: #000 !important; }
        #receipt-paper svg { display: none; }
        #receipt-paper button { display: none !important; }

        @page { margin: 0; size: auto; }
        body[data-paper="58"] #receipt-paper { width: 58mm !important; font-size: 10px; }
        body[data-paper="58"] #receipt-paper .rc-shop { font-size: 13px; }
        body[data-paper="58"] #receipt-paper .rc-total { font-size: 13px; }
        body[data-paper="58"] #receipt-paper .rc-barcode { height: 20px; }
        body[data-paper="58"] #receipt-paper .rc-serial { font-size: 9px; }
        body[data-paper="80"] #receipt-paper { width: 80mm !important; }
        body[data-paper="a4"] #receipt-paper { width: 100% !important; padding: 10mm !important; }

        .rc-item, .rc-total, .rc-row, .rc-serial, .rc-wcard { page-break-inside: avoid; break-inside: avoid; }
      }
    `}</style>
  );
}
