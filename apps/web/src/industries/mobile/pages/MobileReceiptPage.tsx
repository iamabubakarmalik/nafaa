// src/industries/mobile/pages/MobileReceiptPage.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, CheckCircle2, Copy, Check, RefreshCw,
  Share2, ReceiptText, Minimize2, Maximize2, MapPin, Phone, User,
  CalendarClock, Smartphone, ShieldCheck, ShieldAlert, Award, Hash, Palette,
  Tag, TrendingUp, Loader2, AlertTriangle, Wallet, X, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { saleItemName } from '@modules/sales/sales/lib/saleItemName';
import { formatPKR } from '@core/lib/format';
import { FbrReceiptBadge } from '@integrations/fbr';

/* ════════════════════════════════════════════════════════════
   📱 NAFAA MOBILE RECEIPT — FINAL v2 (Retail-grade engine)
   ────────────────────────────────────────────────────────────
   ✅ Retail v7 engine: normalizeSale, shortNo, bulletproof print
   🖨️  A4 + 80mm + 58mm • Short/Full mode • auto-print
   📱 IMEI 1/2 + PTA + warranty per device — print + WhatsApp
   🛡️  VOID support • 🔧 Repair-sale friendly
   🤝 "Powered by Nafaa POS" HAMESHA
   ════════════════════════════════════════════════════════════ */

type PaperWidth = '58' | '80';
type Format = 'a4' | PaperWidth;
type Mode = 'short' | 'full';

const PTA_LABELS: Record<string, string> = {
  APPROVED: 'PTA Approved', NON_PTA: 'Non-PTA', PATCH: 'PTA Patched',
  PENDING: 'PTA Pending', EXEMPT: 'PTA Exempt', ACTIVE: 'PTA Active',
};
const PTA_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  ACTIVE: 'bg-teal-50 border-teal-300 text-teal-800',
  NON_PTA: 'bg-rose-50 border-rose-300 text-rose-800',
  PATCH: 'bg-amber-50 border-amber-300 text-amber-800',
  PENDING: 'bg-blue-50 border-blue-300 text-blue-800',
  EXEMPT: 'bg-slate-50 border-slate-300 text-slate-800',
};

/* ── Types ───────────────────────────────────────────────── */
interface ReceiptImei {
  imei1: string; imei2?: string; serialNumber?: string;
  ptaStatus?: string; warrantyMonths?: number; warrantyExpiry?: string;
  color?: string;
}
interface ReceiptItem {
  name: string; qty: number; price: number; total: number;
  unit?: string; discount?: number; note?: string;
  imeis: ReceiptImei[];
  isUsedPhone?: boolean; usedPhoneCode?: string;
  isRepair?: boolean;
}
interface ReceiptData {
  id: string; invoiceNo: string; shortNo: string; createdAt: string;
  customerName?: string; customerPhone?: string;
  cashierName?: string; paymentMethod?: string;
  items: ReceiptItem[];
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

/* Sale # — lamba UUID ho to short readable banao */
function makeShortNo(invoiceNo: string, id: string): string {
  const src = invoiceNo || id;
  if (!src) return '—';
  if (src.length <= 14) return src;
  const tail = src.replace(/-/g, '').slice(-8).toUpperCase();
  return `#${tail}`;
}

function normalizeImei(raw: any): ReceiptImei {
  return {
    imei1: str(raw?.imei1 ?? raw?.imei ?? raw?.imeiNumber ?? ''),
    imei2: str(raw?.imei2 ?? '') || undefined,
    serialNumber: str(raw?.serialNumber ?? raw?.serial ?? '') || undefined,
    ptaStatus: str(raw?.ptaStatus ?? '') || undefined,
    warrantyMonths: num(raw?.warrantyMonths ?? 0) || undefined,
    warrantyExpiry: str(raw?.warrantyExpiry ?? '') || undefined,
    color: str(raw?.color ?? '') || undefined,
  };
}

function normalizeSale(raw: any): ReceiptData {
  const items: ReceiptItem[] = (raw?.items ?? raw?.saleItems ?? raw?.lines ?? []).map((it: any) => {
    const qty = num(it.qty ?? it.quantity ?? 1);
    const price = num(it.price ?? it.unitPrice ?? it.rate ?? it.priceOverride ?? 0);
    const noteText = str(it.note ?? '') || undefined;
    /* IMEIs: direct array ya single imei object */
    let imeis: ReceiptImei[] = [];
    if (Array.isArray(it.imeis) && it.imeis.length) imeis = it.imeis.map(normalizeImei);
    else if (it.imei) imeis = [normalizeImei(it.imei)];
    /* Used phone — note ya nested object se */
    const usedPhoneCode = str(it.usedPhone?.usedPhoneCode ?? it.usedPhoneCode ?? '') || undefined;
    const isRepair = Boolean(it.repairTicketId) || /repair|ticket/i.test(noteText ?? '');
    return {
      name: str(it.name ?? it.productName ?? it.product?.name ?? '') || (it.productId ? 'Item' : 'Item'),
      qty, price,
      total: num(it.total ?? it.lineTotal ?? it.amount ?? qty * price),
      unit: str(it.unit ?? it.unitName ?? it.product?.unit ?? '') || undefined,
      discount: num(it.discount ?? it.discountAmount ?? 0) || undefined,
      note: noteText,
      imeis,
      isUsedPhone: Boolean(it.usedPhoneId ?? usedPhoneCode),
      usedPhoneCode,
      isRepair,
    };
  });

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
    createdAt: str(raw?.createdAt ?? raw?.soldAt ?? raw?.date ?? new Date().toISOString()),
    customerName: str(raw?.customerName ?? raw?.customer?.name ?? '') || undefined,
    customerPhone: str(raw?.customerPhone ?? raw?.customer?.phone ?? '') || undefined,
    cashierName: str(raw?.cashierName ?? raw?.cashier?.name ?? raw?.createdBy?.name ?? '') || undefined,
    paymentMethod: str(raw?.paymentMethod ?? raw?.payment?.method ?? 'Cash') || undefined,
    items, subtotal, billDiscount, tax, total, paid,
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
    businessName: str(t.name ?? t.businessName ?? s.businessName ?? s.shopName ?? 'Mobile Shop'),
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
export default function MobileReceiptPage() {
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
      /* Offline-safe fetch — queue wali sale bhi mil jaye */
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

  /* Tenant settings se default paper width */
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
      (isAutoOpened && localStorage.getItem('nafaa.mobile-pos.auto-print') !== 'false') ||
      shop.autoPrint;
    if (want && sale && !isLoading) {
      const t = setTimeout(doPrint, 600);
      return () => clearTimeout(t);
    }
  }, [sale, isLoading, searchParams, shop.autoPrint, doPrint, isAutoOpened]);

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

  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Receipt', url: receiptUrl }); } catch { /* cancelled */ }
    } else copyLink();
  };

  const shareWhatsApp = () => {
    if (!sale) return;
    if (!sale.customerPhone) return toast.error('Customer phone available nahi');
    const phone = sale.customerPhone.replace(/[^0-9]/g, '');
    const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;

    const lines: string[] = [
      `📱 *${shop.businessName}*`, '',
      `Assalam-o-Alaikum ${sale.customerName ?? ''}!`,
      'Thanks for your purchase 🙏', '',
      `*Invoice:* ${sale.shortNo}`,
      `*Date:* ${formatDate(sale.createdAt)}`, '',
      '*Items:*',
    ];
    sale.items.forEach((it, i) => {
      lines.push(`${i + 1}. ${it.name} × ${it.qty} = ${formatPKR(it.total)}`);
      it.imeis.forEach((imei) => {
        if (imei.imei1) lines.push(`   📱 IMEI: \`${imei.imei1}\``);
        if (imei.imei2) lines.push(`   📱 IMEI 2: \`${imei.imei2}\``);
        if (imei.ptaStatus) lines.push(`   🛡️ ${PTA_LABELS[imei.ptaStatus] || imei.ptaStatus}`);
        if ((imei.warrantyMonths ?? 0) > 0) lines.push(`   ⏱️ Warranty: *${imei.warrantyMonths} months*`);
      });
      if (it.usedPhoneCode) lines.push(`   🔄 Used: ${it.usedPhoneCode}`);
    });
    lines.push('', `Subtotal: ${formatPKR(sale.subtotal)}`);
    if (sale.billDiscount > 0) lines.push(`Discount: -${formatPKR(sale.billDiscount)}`);
    lines.push(`*TOTAL: ${formatPKR(sale.total)}*`, `Paid: ${formatPKR(sale.paid)}`);
    if (sale.change > 0) lines.push(`Change: ${formatPKR(sale.change)}`);
    if (sale.dueAmount > 0) lines.push(`⚠️ Balance/EMI: ${formatPKR(sale.dueAmount)}`);
    lines.push('', '_Warranty terms apply. Keep this invoice._', '_Powered by Nafaa POS_');

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const savings = useMemo(
    () => (sale ? sale.items.reduce((s, it) => s + (it.discount ?? 0), 0) + sale.billDiscount : 0),
    [sale],
  );
  const hasDevices = useMemo(() => sale?.items.some((it) => it.imeis.length > 0 || it.isUsedPhone) ?? false, [sale]);

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
          <h2 className="mt-4 text-lg font-extrabold">Receipt nahi mili</h2>
          <p className="mt-1 text-sm text-neutral-500">Sale ID ghalat hai ya record delete ho chuka hai.</p>
          <div className="mt-6 flex gap-2 justify-center">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white px-4 py-2 text-sm font-extrabold"
            >
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
      <PrintStyles />

      {/* ══ Auto-opened success banner ══ */}
      {isAutoOpened && (
        <div className="print:hidden max-w-2xl mx-auto px-3 pt-3">
          <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 flex items-center gap-3 shadow-lg flex-wrap">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">Sale Complete! 📱</div>
              <div className="text-xs text-white/90">Print warranty invoice ya WhatsApp bhejo</div>
            </div>
            <Link to="/pos" className="text-xs font-extrabold underline shrink-0">→ New Sale</Link>
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
              <button
                onClick={() => setMode('short')}
                className={`px-2.5 py-1.5 text-xs font-extrabold flex items-center gap-1 ${!full ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'dark:text-neutral-300'}`}
              >
                <Minimize2 className="h-3.5 w-3.5" /> Short
              </button>
              <button
                onClick={() => setMode('full')}
                className={`px-2.5 py-1.5 text-xs font-extrabold flex items-center gap-1 ${full ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'dark:text-neutral-300'}`}
              >
                <Maximize2 className="h-3.5 w-3.5" /> Full
              </button>
            </div>

            <div className="hidden sm:flex rounded-xl border dark:border-neutral-700 overflow-hidden">
              {(['a4', '80', '58'] as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-2.5 py-1.5 text-xs font-extrabold tabular-nums ${format === f ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'dark:text-neutral-300'}`}
                >
                  {f === 'a4' ? 'A4' : `${f}mm`}
                </button>
              ))}
            </div>

            <button onClick={shareWhatsApp} disabled={!sale.customerPhone}
              className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40" aria-label="WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </button>
            <button onClick={shareNative} className="p-2 rounded-xl border dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Share">
              <Share2 className="h-4 w-4 dark:text-neutral-300" />
            </button>
            <button onClick={copyLink} className="p-2 rounded-xl border dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Copy link">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 dark:text-neutral-300" />}
            </button>
            {!sale.isVoided && (
              <button
                onClick={() => { const r = prompt('Void reason?'); if (r !== null) voidMutation.mutate(r); }}
                className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700" aria-label="Void">
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={doPrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3.5 py-2 text-sm font-extrabold hover:bg-blue-700"
            >
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
              <img
                src={shop.receiptLogoUrl}
                alt=""
                className="rc-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
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
            <div className="rc-row">
              <span><User className="h-3 w-3 inline" /> Customer</span>
              <b>{sale.customerName}</b>
            </div>
          )}
          {sale.customerPhone && (
            <div className="rc-row"><span>Phone</span><span className="tabular-nums">{sale.customerPhone}</span></div>
          )}
          {full && sale.cashierName && (
            <div className="rc-row"><span>Cashier</span><span>{sale.cashierName}</span></div>
          )}

          <div className="rc-div-dash" />

          {/* ── Items (numbered, IMEI blocks) ── */}
          <div className="rc-row rc-head">
            <span><Smartphone className="h-3 w-3 inline" /> Item</span>
            <span>Amount</span>
          </div>
          {sale.items.map((it, i) => (
            <div key={i} className="rc-item">
              <div className="rc-iname">
                <span className="rc-inum">{i + 1}.</span> {it.name}
                {it.isUsedPhone && <span className="rc-badge">USED</span>}
                {it.isRepair && <span className="rc-badge rc-badge-repair">REPAIR</span>}
              </div>

              {/* 📱 IMEI / device identifiers */}
              {it.imeis.map((imei, j) => (
                <div key={j} className="rc-imei">
                  {imei.imei1 && (
                    <div className="rc-imei-row">
                      <span className="rc-imei-label">IMEI</span>
                      <b className="rc-mono">{imei.imei1}</b>
                    </div>
                  )}
                  {full && imei.imei2 && (
                    <div className="rc-imei-row">
                      <span className="rc-imei-label">IMEI 2</span>
                      <span className="rc-mono">{imei.imei2}</span>
                    </div>
                  )}
                  {full && imei.serialNumber && (
                    <div className="rc-imei-row">
                      <span className="rc-imei-label">S/N</span>
                      <span className="rc-mono">{imei.serialNumber}</span>
                    </div>
                  )}
                  <div className="rc-imei-tags">
                    {imei.ptaStatus && (
                      <b>{PTA_LABELS[imei.ptaStatus] || imei.ptaStatus}</b>
                    )}
                    {(imei.warrantyMonths ?? 0) > 0 && (
                      <span>Warranty: <b>{imei.warrantyMonths}m</b>
                        {full && imei.warrantyExpiry ? ` (till ${new Date(imei.warrantyExpiry).toLocaleDateString('en-PK')})` : ''}
                      </span>
                    )}
                    {full && imei.color && <span>Color: {imei.color}</span>}
                  </div>
                </div>
              ))}
              {it.usedPhoneCode && (
                <div className="rc-imei">
                  <div className="rc-imei-row">
                    <span className="rc-imei-label">Code</span>
                    <b className="rc-mono">{it.usedPhoneCode}</b>
                  </div>
                </div>
              )}
              {full && it.note && !it.imeis.length && !it.usedPhoneCode && (
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
              <span>⚠ BAQI / EMI</span>
              <b className="tabular-nums">{formatPKR(sale.dueAmount)}</b>
            </div>
          )}
          {savings > 0 && (
            <div className="rc-saving">
              <TrendingUp className="h-3 w-3 inline" /> Aap ki bachat: {formatPKR(savings)}
            </div>
          )}

          {/* ── Warranty terms (device sales — full mode ya hamesha thermal pe short) ── */}
          {hasDevices && (
            <>
              <div className="rc-div-dash" />
              <div className="rc-terms">
                <b>Warranty Terms:</b>
                {full ? (
                  <>
                    <div>• Warranty valid only with original invoice &amp; box</div>
                    <div>• Physical/water damage &amp; unauthorized repair voids warranty</div>
                    <div>• Software issues not covered under hardware warranty</div>
                    <div>• Return/exchange within 3 days (original packaging)</div>
                  </>
                ) : (
                  <>
                    <div>• Physical/water damage voids warranty</div>
                    <div>• Keep original invoice for claims</div>
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
          <div className="rc-center" style={{ fontWeight: 800, marginTop: 4 }}>📱 Shukriya! 🙏</div>

          {/* 🤝 Powered by Nafaa — HAMESHA */}
          <div className="rc-powered">
            <span className="rc-powered-star">✦</span> Powered by <b>Nafaa POS</b> <span className="rc-powered-star">✦</span>
          </div>

          {sale.isVoided && (
            <div className="rc-void">*** VOIDED ***</div>
          )}

          {/* Cut marks */}
          <div className="rc-cut">— — — — — — — — — — — — — — ✂</div>
        </div>
      </div>

      {/* ══ Mobile bottom bar ══ */}
      <div className="print:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t dark:border-neutral-800 p-3 sm:hidden">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <button
            onClick={doPrint}
            className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-blue-600 text-white py-3 text-sm font-extrabold"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={shareWhatsApp}
            disabled={!sale.customerPhone}
            className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 text-white py-3 text-sm font-extrabold disabled:opacity-40"
          >
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
   PRINT CSS — thermal bulletproof (retail v7 engine + IMEI blocks)
   ════════════════════════════════════════════════════════════ */
function PrintStyles() {
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
      .rc-badge-repair { border-style: dashed; }
      .rc-idetail { font-size: 11px; }
      .rc-dim { color: #555; }
      .rc-mono { font-family: Consolas, 'Courier New', monospace; }

      /* 📱 IMEI block — left border, mono, thermal-safe */
      .rc-imei { margin: 3px 0 2px 8px; padding: 2px 0 2px 6px; border-left: 2px solid #000; font-size: 10px; }
      .rc-imei-row { display: flex; gap: 6px; align-items: baseline; }
      .rc-imei-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #555; min-width: 34px; }
      .rc-imei-tags { display: flex; flex-wrap: wrap; gap: 2px 8px; font-size: 9px; margin-top: 1px; }

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
      .receipt-a4 .rc-imei { font-size: 12px; padding: 4px 0 4px 10px; }
      .receipt-a4 .rc-imei-tags { font-size: 11px; }
      .receipt-a4 .rc-total { font-size: 22px; }
      .receipt-a4 .rc-terms { font-size: 11px; }
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

        @page { margin: 0; size: auto; }
        body[data-paper="58"] #receipt-paper { width: 58mm !important; font-size: 10px; }
        body[data-paper="58"] #receipt-paper .rc-shop { font-size: 13px; }
        body[data-paper="58"] #receipt-paper .rc-total { font-size: 13px; }
        body[data-paper="58"] #receipt-paper .rc-barcode { height: 20px; }
        body[data-paper="58"] #receipt-paper .rc-imei { font-size: 9px; }
        body[data-paper="80"] #receipt-paper { width: 80mm !important; }
        body[data-paper="a4"] #receipt-paper { width: 100% !important; padding: 10mm !important; }

        .rc-item, .rc-total, .rc-row, .rc-imei { page-break-inside: avoid; break-inside: avoid; }
      }
    `}</style>
  );
}
