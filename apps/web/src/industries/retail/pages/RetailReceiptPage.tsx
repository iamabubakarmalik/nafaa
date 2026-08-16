import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, CheckCircle2,
  Copy, Check, RefreshCw, Share2, ReceiptText, Minimize2, Maximize2,
  MapPin, Phone, User, CalendarClock, Package, Gift, Tag,
  TrendingUp, Loader2, AlertTriangle, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { formatPKR } from '@core/lib/format';
import { FbrReceiptBadge } from '@integrations/fbr';

/* ════════════════════════════════════════════════════════════
   NAFAA RECEIPT — FINAL v7
   ✅ FbrReceiptBadge REAL props: { saleId, variant, className }
   ✅ Sale # smart-short (UUID wrap bug khatam)
   ✅ Powered by Nafaa POS — HAMESHA (marketing 🤝)
   ✅ Barcode strip + cut-marks + item numbering
   ✅ Thermal 58/80mm pure B/W, half-white fix
   ════════════════════════════════════════════════════════════ */

type PaperWidth = '58' | '80';

interface ReceiptItem {
  name: string; qty: number; price: number; total: number;
  unit?: string; discount?: number;
}

interface ReceiptData {
  id: string; invoiceNo: string; shortNo: string; createdAt: string;
  customerName?: string; cashierName?: string; paymentMethod?: string;
  items: ReceiptItem[];
  subtotal: number; billDiscount: number; tax: number; total: number;
  paid: number; change: number; dueAmount: number; pointsEarned?: number;
  hasFbr: boolean;
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
  // Agar pehle se short hai (SALE-1042) to waise hi
  if (src.length <= 14) return src;
  // UUID / lamba id → last 8 chars uppercase
  const tail = src.replace(/-/g, '').slice(-8).toUpperCase();
  return `#${tail}`;
}

function normalizeSale(raw: any): ReceiptData {
  const items: ReceiptItem[] = (raw?.items ?? raw?.saleItems ?? raw?.lines ?? []).map((it: any) => {
    const qty = num(it.qty ?? it.quantity ?? 1);
    const price = num(it.price ?? it.unitPrice ?? it.rate ?? 0);
    return {
      name: str(it.name ?? it.productName ?? it.product?.name ?? 'Item'),
      qty, price,
      total: num(it.total ?? it.lineTotal ?? it.amount ?? qty * price),
      unit: str(it.unit ?? it.unitName ?? it.product?.unit ?? '') || undefined,
      discount: num(it.discount ?? it.discountAmount ?? 0) || undefined,
    };
  });

  const subtotal = num(raw?.subtotal ?? raw?.subTotal ?? items.reduce((s, i) => s + i.total, 0));
  const billDiscount = num(raw?.billDiscount ?? raw?.discount ?? raw?.discountAmount ?? 0);
  const tax = num(raw?.tax ?? raw?.taxAmount ?? 0);
  const total = num(raw?.total ?? raw?.grandTotal ?? raw?.netTotal ?? subtotal - billDiscount + tax);
  const paid = num(raw?.paid ?? raw?.paidAmount ?? raw?.amountPaid ?? total);
  const id = str(raw?.id ?? raw?._id);
  const invoiceNo = str(raw?.invoiceNo ?? raw?.saleNumber ?? raw?.invoiceNumber ?? raw?.saleNo ?? id);

  return {
    id,
    invoiceNo,
    shortNo: makeShortNo(invoiceNo, id),
    createdAt: str(raw?.createdAt ?? raw?.soldAt ?? raw?.date ?? new Date().toISOString()),
    customerName: str(raw?.customerName ?? raw?.customer?.name ?? '') || undefined,
    cashierName: str(raw?.cashierName ?? raw?.cashier?.name ?? raw?.createdBy?.name ?? '') || undefined,
    paymentMethod: str(raw?.paymentMethod ?? raw?.payment?.method ?? 'Cash') || undefined,
    items, subtotal, billDiscount, tax, total, paid,
    change: num(raw?.change ?? raw?.changeAmount ?? Math.max(0, paid - total)),
    dueAmount: num(raw?.dueAmount ?? raw?.creditAmount ?? raw?.due ?? Math.max(0, total - paid)),
    pointsEarned: num(raw?.pointsEarned ?? raw?.loyaltyPoints ?? 0) || undefined,
    hasFbr: Boolean(raw?.fbrInvoiceNo ?? raw?.fbr?.invoiceNo ?? raw?.fbrStatus === 'CONFIRMED'),
  };
}

function normalizeShop(res: any): ShopInfo {
  const s = res?.settings ?? {};
  const t = res?.tenant ?? {};
  return {
    businessName: str(t.name ?? t.businessName ?? s.businessName ?? s.shopName ?? 'Nafaa Store'),
    address:      str(t.address ?? s.address ?? s.shopAddress ?? ''),
    phone:        str(t.phone ?? s.phone ?? s.shopPhone ?? ''),
    ntn:          str(s.ntn ?? s.ntnNumber ?? t.ntn ?? ''),
    receiptFooter: str(s.receiptFooter ?? s.receipt_footer ?? 'Shukriya! Phir tashreef laiye.'),
    receiptLogoUrl: str(s.receiptLogoUrl ?? s.logoUrl ?? t.logoUrl ?? ''),
    paperWidth:   (str(s.paperWidth ?? s.receiptPaperWidth) === '58' ? '58' : '80') as PaperWidth,
    autoPrint:    Boolean(s.autoPrint ?? s.autoPrintReceipt ?? false),
  };
}

/* ══════════════════════════════════════════════════════════ */
export default function RetailReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'short' | 'full'>(
    searchParams.get('mode') === 'full' ? 'full' : 'short'
  );
  const [copied, setCopied] = useState(false);
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(
    searchParams.get('paper') === '58' ? '58' : '80'
  );

  const { data: rawSale, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['sale', id],
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
  const shop = useMemo(() => normalizeShop(rawSettingsRes), [rawSettingsRes]);

  useEffect(() => {
    if (rawSettingsRes) {
      const pw = normalizeShop(rawSettingsRes).paperWidth;
      if (pw) setPaperWidth(pw);
    }
  }, [rawSettingsRes]);

  /* ── Print ── */
  const doPrint = useCallback(() => {
    document.body.dataset.paper = paperWidth;
    window.print();
  }, [paperWidth]);

  useEffect(() => {
    document.body.dataset.paper = paperWidth;
    return () => { delete document.body.dataset.paper; };
  }, [paperWidth]);

  useEffect(() => {
    const want = searchParams.get('autoprint') === '1' || shop.autoPrint;
    if (want && sale && !isLoading) {
      const t = setTimeout(doPrint, 600);
      return () => clearTimeout(t);
    }
  }, [sale, isLoading, searchParams, shop.autoPrint, doPrint]);

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

  const shareWhatsApp = () => {
    if (!sale) return;
    const lines = [
      `*${shop.businessName}*`,
      `Receipt ${sale.shortNo}`,
      `Date: ${new Date(sale.createdAt).toLocaleString('en-PK')}`,
      '─────────────────',
      ...sale.items.map((it) => `${it.name} ×${it.qty} — ${formatPKR(it.total)}`),
      '─────────────────',
      `*Total: ${formatPKR(sale.total)}*`,
      `Paid: ${formatPKR(sale.paid)}`,
      sale.change > 0 ? `Change: ${formatPKR(sale.change)}` : '',
      sale.dueAmount > 0 ? `⚠ Baqi: ${formatPKR(sale.dueAmount)}` : '',
      '',
      shop.receiptFooter,
      '_Powered by Nafaa POS_',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Receipt', url: receiptUrl }); } catch { /* cancelled */ }
    } else copyLink();
  };

  const savings = useMemo(
    () => (sale ? sale.items.reduce((s, it) => s + (it.discount ?? 0), 0) + sale.billDiscount : 0),
    [sale]
  );

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
            <button onClick={() => navigate(-1)} className="rounded-xl border px-4 py-2 text-sm font-extrabold">Wapas</button>
          </div>
        </div>
      </div>
    );
  }

  const full = mode === 'full';
  const dateObj = new Date(sale.createdAt);

  /* ── UI ── */
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 pb-28 print:bg-white">
      <PrintStyles />

      {/* ══ Toolbar ══ */}
      <div className="print:hidden sticky top-0 z-20 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-3 py-2.5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-extrabold text-sm flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> Receipt
          </h1>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex rounded-xl border overflow-hidden">
              <button
                onClick={() => setMode('short')}
                className={`px-2.5 py-1.5 text-xs font-extrabold flex items-center gap-1 ${!full ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
              >
                <Minimize2 className="h-3.5 w-3.5" /> Short
              </button>
              <button
                onClick={() => setMode('full')}
                className={`px-2.5 py-1.5 text-xs font-extrabold flex items-center gap-1 ${full ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
              >
                <Maximize2 className="h-3.5 w-3.5" /> Full
              </button>
            </div>

            <div className="hidden sm:flex rounded-xl border overflow-hidden">
              {(['58', '80'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setPaperWidth(w)}
                  className={`px-2.5 py-1.5 text-xs font-extrabold tabular-nums ${paperWidth === w ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
                >
                  {w}mm
                </button>
              ))}
            </div>

            <button onClick={shareWhatsApp} className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" aria-label="WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </button>
            <button onClick={shareNative} className="p-2 rounded-xl border hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Share">
              <Share2 className="h-4 w-4" />
            </button>
            <button onClick={copyLink} className="p-2 rounded-xl border hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Copy link">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              onClick={doPrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3.5 py-2 text-sm font-extrabold hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* ══ Receipt Paper ══ */}
      <div className="flex justify-center px-3 py-6 print:p-0">
        <div
          id="receipt-paper"
          className="receipt-paper bg-white text-black shadow-xl print:shadow-none"
          style={{ width: paperWidth === '58' ? 220 : 300 }}
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

          {/* ── Meta — shortNo wrap nahi hoga ── */}
          <div className="rc-meta-grid">
            <div className="rc-meta-cell">
              <span className="rc-meta-label">Receipt</span>
              <b className="rc-meta-value">{sale.shortNo}</b>
            </div>
            <div className="rc-meta-cell rc-right">
              <span className="rc-meta-label"><CalendarClock className="h-3 w-3 inline" /> Date</span>
              <span className="rc-meta-value tabular-nums">
                {dateObj.toLocaleDateString('en-PK')} {dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          {sale.customerName && (
            <div className="rc-row">
              <span><User className="h-3 w-3 inline" /> Customer</span>
              <b>{sale.customerName}</b>
            </div>
          )}
          {full && sale.cashierName && (
            <div className="rc-row"><span>Cashier</span><span>{sale.cashierName}</span></div>
          )}

          <div className="rc-div-dash" />

          {/* ── Items (numbered) ── */}
          <div className="rc-row rc-head">
            <span><Package className="h-3 w-3 inline" /> Item</span>
            <span>Amount</span>
          </div>
          {sale.items.map((it, i) => (
            <div key={i} className="rc-item">
              <div className="rc-iname">
                <span className="rc-inum">{i + 1}.</span> {it.name}
              </div>
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
              <span><Tag className="h-3 w-3 inline" /> Bill Discount</span>
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
              <span>⚠ BAQI (KHATA)</span>
              <b className="tabular-nums">{formatPKR(sale.dueAmount)}</b>
            </div>
          )}
          {savings > 0 && (
            <div className="rc-saving">
              <TrendingUp className="h-3 w-3 inline" /> Aap ki bachat: {formatPKR(savings)}
            </div>
          )}
          {full && (sale.pointsEarned ?? 0) > 0 && (
            <div className="rc-row rc-dim">
              <span><Gift className="h-3 w-3 inline" /> Points</span>
              <span>+{sale.pointsEarned}</span>
            </div>
          )}

          {/* ── FBR — REAL props { saleId, variant, className } ── */}
          {sale.hasFbr && (
            <>
              <div className="rc-div-dash" />
              <div className="rc-center">
                <FbrReceiptBadge saleId={sale.id} variant="thermal" className="rc-fbr" />
              </div>
            </>
          )}

          {/* ── Barcode strip (shortNo visual) ── */}
          <div className="rc-barcode" aria-hidden>
            {sale.shortNo.replace(/[^A-Z0-9]/gi, '').split('').map((ch, i) => (
              <span key={i} className="rc-bar" style={{ width: (ch.charCodeAt(0) % 3) + 1.5 }} />
            ))}
          </div>
          <div className="rc-center rc-sub" style={{ letterSpacing: 2 }}>{sale.shortNo}</div>

          <div className="rc-div-dash" />

          {/* ── Footer ── */}
          <div className="rc-center rc-sub">{shop.receiptFooter}</div>

          {/* 🤝 Powered by Nafaa — HAMESHA (short + full dono) */}
          <div className="rc-powered">
            <span className="rc-powered-star">✦</span> Powered by <b>Nafaa POS</b> <span className="rc-powered-star">✦</span>
          </div>

          {/* Cut marks (thermal cutter guide) */}
          <div className="rc-cut">— — — — — — — — — — — — — — ✂</div>
        </div>
      </div>

      {/* ══ Mobile bottom bar ══ */}
      <div className="print:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t p-3 sm:hidden">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <button
            onClick={doPrint}
            className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-blue-600 text-white py-3 text-sm font-extrabold"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 text-white py-3 text-sm font-extrabold"
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
   PRINT CSS — thermal bulletproof
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
      .rc-item { margin-bottom: 5px; page-break-inside: avoid; break-inside: avoid; }
      .rc-iname { font-weight: 700; }
      .rc-inum { color: #888; font-weight: 400; font-size: 10px; }
      .rc-idetail { font-size: 11px; }
      .rc-dim { color: #555; }
      .rc-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 6px 0; }
      .rc-credit { display: flex; justify-content: space-between; font-weight: 800; background: #f3f4f6; border: 1.5px solid #000; padding: 4px 6px; border-radius: 4px; margin-top: 4px; }
      .rc-saving { text-align: center; font-size: 11px; font-weight: 700; margin-top: 6px; border: 1px dashed #999; border-radius: 6px; padding: 4px; }
      .rc-barcode { display: flex; align-items: flex-end; justify-content: center; gap: 1.5px; height: 28px; margin-top: 10px; }
      .rc-bar { display: inline-block; height: 100%; background: #000; }
      .rc-powered { text-align: center; font-size: 10px; color: #555; margin-top: 8px; font-weight: 600; }
      .rc-powered b { font-weight: 800; color: #000; }
      .rc-powered-star { color: #999; }
      .rc-cut { text-align: center; color: #bbb; font-size: 10px; margin-top: 10px; letter-spacing: 2px; white-space: nowrap; overflow: hidden; }
      .rc-fbr { margin: 4px auto; }

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
        body[data-paper="80"] #receipt-paper { width: 80mm !important; }

        .rc-item, .rc-total, .rc-row { page-break-inside: avoid; break-inside: avoid; }
      }
    `}</style>
  );
}
