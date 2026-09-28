import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import JsBarcode from 'jsbarcode';
import {
  Printer, ArrowLeft, MessageCircle, CheckCircle2, Copy, Check,
  RefreshCw, Loader2, AlertTriangle, Share2, Minimize2, Maximize2,
  MapPin, Phone, User, UserCheck, CalendarClock, Package, Tag, Gift,
  TrendingUp, Wallet, Truck, Sprout, ShieldAlert, Scale, Wheat,
} from 'lucide-react';
import { toast } from 'sonner';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { FbrReceiptBadge } from '@integrations/fbr';
import { formatPKR } from '@core/lib/format';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { isMeasured, agriUnitLabel } from '../lib/agriUnits';
import { deriveAgriKind, isSprayKind, type AgriKind } from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI BILL — RECEIPT BHI, HIDAYAT KI PARCHI BHI
   ─────────────────────────────────────────────────────────────
   Retail/Bakery se:
     • Short / Full bill        • 58 / 80mm toolbar se
     • Logo, NTN, FBR badge     • "Le gaya" (receiver) ki line
     • Share, link copy, WhatsApp • Khata — purana udhaar bhi
     • Barcode — scan kar ke bill dobara nikalta hai

   Agri ki apni — aur yehi is bill ka asal kaam hai:

   Farmer dukaan par sab kuch sunta hai: "do kilo per acre daalna,
   teen din khet me mat jana, chaudah din baad fasal kaatna." Ghar
   pahunchte pahunchte aadha bhool jata hai. Achha agri dealer ye
   baatein haath se parchi par likh kar deta hai.

   Ab bill khud ye parchi hai:
     🌱 Kitni miqdar — "2 kg per acre"
     ☠️ Chhirakne ke baad kitne din khet me na jaye
     🌾 Fasal kab kaat sakta hai
     ⚖️ Bori ka hisab — "5 kg (0.1 bori)" dono taraf saaf

   Kaghaz ka naap: URL (?paper=) → Bikri safhe ki receipt settings →
   dukaan ki settings. Auto-print: ?autoprint=1 (ya purana ?auto=1).
   ═════════════════════════════════════════════════════════════ */

type Paper = '58' | '80';
type Mode = 'short' | 'full';

/** Wohi chaabi jo Bikri safhe ki "Receipt" settings likhti hai */
const RECEIPT_PREFS_KEY = 'nafaa.receipt.prefs';

const num = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : Number(v) || 0);
const str = (v: any): string => (typeof v === 'string' ? v : v != null ? String(v) : '');

function readPrefs(): { paperWidth?: Paper; mode?: Mode; showLogo?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(RECEIPT_PREFS_KEY) || 'null') || {};
  } catch { return {}; }
}

function savePaper(w: Paper) {
  try {
    const cur = JSON.parse(localStorage.getItem(RECEIPT_PREFS_KEY) || '{}');
    localStorage.setItem(RECEIPT_PREFS_KEY, JSON.stringify({ ...cur, paperWidth: w }));
  } catch { /* ignore */ }
}

/** Lamba UUID bill number kaghaz par toot jata tha — chhota kar do */
function makeShortNo(invoiceNo: string, id: string): string {
  const src = invoiceNo || id;
  if (!src) return '—';
  if (src.length <= 14) return src;
  return `#${src.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

/** Bill par asli CODE128 — scanner isi se purana bill nikalta hai */
function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, { format: 'CODE128', width: 1.6, height: 44, margin: 0, displayValue: false, lineColor: '#000000' });
    } catch { /* value barcode me nahi dhal sakti */ }
  }, [value]);
  return <svg ref={ref} />;
}

export default function AgriReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const urlPaper = params.get('paper');
  const [paper, setPaperState] = useState<Paper>(() => {
    if (urlPaper === '58' || urlPaper === '80') return urlPaper;
    return readPrefs().paperWidth ?? '80';
  });
  /** URL ya apni pasand ho to dukaan ki settings usay na badlein */
  const paperLocked = useRef(urlPaper === '58' || urlPaper === '80' || !!readPrefs().paperWidth);
  const [mode, setMode] = useState<Mode>(() =>
    params.get('mode') === 'full' ? 'full' : params.get('mode') === 'short' ? 'short' : (readPrefs().mode ?? 'short'));
  const [copied, setCopied] = useState(false);
  const printedOnce = useRef(false);

  const setPaper = (w: Paper) => { setPaperState(w); savePaper(w); paperLocked.current = true; };

  const saleQ = useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const s = await offlineSalesApi.getOne(id!);
      if (!s) throw new Error('Bill nahi mila');
      return s as any;
    },
    enabled: !!id,
    retry: 1,
  });
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 60_000, retry: 1 });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
    staleTime: 5 * 60_000,
  });

  /* ── Bill ── */
  const sale = useMemo(() => {
    const raw = saleQ.data;
    if (!raw) return null;
    const items = (raw.items ?? raw.saleItems ?? raw.lines ?? []).map((it: any) => {
      const qty = num(it.qty ?? it.quantity ?? 1);
      const price = num(it.price ?? it.unitPrice ?? it.rate ?? 0);
      return {
        productId: str(it.productId ?? it.product?.id ?? ''),
        name: str(it.name ?? it.productName ?? it.product?.name ?? 'Item'),
        categoryName: str(it.product?.category?.name ?? ''),
        qty, price,
        total: num(it.total ?? it.lineTotal ?? it.amount ?? qty * price),
        unit: str(it.unit ?? it.unitName ?? it.product?.unit ?? '') || undefined,
        discount: num(it.discount ?? it.lineDiscount ?? it.discountAmount ?? 0) || undefined,
        /* POS ne jo naap bola tha wo note me aata hai — "5 kg = 0.1 bag" */
        note: str(it.note ?? '') || undefined,
      };
    });
    const subtotal = num(raw.subtotal ?? raw.subTotal ?? items.reduce((s: number, i: any) => s + i.total, 0));
    const discount = num(raw.billDiscount ?? raw.discount ?? raw.discountAmount ?? 0);
    const tax = num(raw.tax ?? raw.taxAmount ?? 0);
    const delivery = num(raw.serviceCharges ?? raw.deliveryCharge ?? 0);
    const total = num(raw.total ?? raw.grandTotal ?? subtotal - discount + tax + delivery);
    const paid = num(raw.paidAmount ?? raw.paid ?? total);
    const sid = str(raw.id ?? raw._id);
    const invoiceNo = str(raw.saleNumber ?? raw.invoiceNo ?? raw.invoiceNumber ?? sid);
    return {
      id: sid, invoiceNo, shortNo: makeShortNo(invoiceNo, sid),
      createdAt: str(raw.soldAt ?? raw.createdAt ?? new Date().toISOString()),
      customerId: str(raw.customer?.id ?? raw.customerId ?? '') || undefined,
      customerName: str(raw.customer?.name ?? raw.customerName ?? '') || undefined,
      customerPhone: str(raw.customer?.phone ?? '') || undefined,
      /* Server udhaar wali bikri par balance khud barha deta hai — ye
         "ab kul kitna baqi hai" hai, sirf is bill ka nahi. */
      customerDue: num(raw.customer?.balance ?? raw.customerBalance ?? 0),
      cashierName: str(raw.createdBy?.fullName ?? raw.cashierName ?? raw.createdBy?.name ?? '') || undefined,
      receivedByName: str(raw.receivedByName ?? '') || undefined,
      receivedByPhone: str(raw.receivedByPhone ?? '') || undefined,
      deliveryAddress: str(raw.deliveryAddress ?? raw.delivery?.address ?? '') || undefined,
      paymentMethod: str(raw.paymentMethod ?? 'CASH'),
      /* POS fasal aur raqba bill ki note me likhta hai */
      note: str(raw.note ?? '') || undefined,
      items, subtotal, discount, tax, delivery, total, paid,
      change: num(raw.changeAmount ?? raw.change ?? Math.max(paid - total, 0)),
      due: num(raw.creditAmount ?? raw.dueAmount ?? Math.max(total - paid, 0)),
      points: num(raw.pointsEarned ?? raw.loyaltyPoints ?? 0) || undefined,
      hasFbr: Boolean(raw.fbrInvoiceNo ?? raw.fbr?.invoiceNo ?? raw.fbrStatus === 'CONFIRMED'),
    };
  }, [saleQ.data]);

  /* Farmer ki tafseel — gaon aur zameen. Customer aur AgriFarmer ab
     ek hi shakhs hain, is liye customerId se mil jati hai. */
  const farmerQ = useQuery({
    queryKey: ['agri-farmer-by-customer', sale?.customerId],
    queryFn: () => farmersApi.byCustomer(sale!.customerId!).catch(() => null),
    enabled: !!sale?.customerId,
    staleTime: 5 * 60_000,
  });
  const farmer = farmerQ.data;

  const shop = useMemo(() => {
    const res: any = settingsQ.data ?? {};
    const s = res.settings ?? {};
    const t = res.tenant ?? {};
    return {
      name: str(t.name ?? t.businessName ?? s.shopName ?? 'Agri Store'),
      address: str(t.address ?? s.shopAddress ?? s.address ?? ''),
      phone: str(t.phone ?? s.shopPhone ?? s.phone ?? ''),
      ntn: str(s.ntn ?? s.ntnNumber ?? t.ntn ?? ''),
      logo: str(s.receiptLogoUrl ?? s.logoUrl ?? t.logoUrl ?? ''),
      footer: str(s.receiptFooter ?? 'Shukriya! Fasal achhi ho.'),
      paperWidth: (str(s.paperWidth ?? s.receiptPaperWidth) === '58' ? '58' : '80') as Paper,
    };
  }, [settingsQ.data]);

  /* Dukaan ki settings sirf tab jab dukaan-daar ne khud kuch na chuna ho */
  useEffect(() => {
    if (settingsQ.data && !paperLocked.current) setPaperState(shop.paperWidth);
  }, [settingsQ.data, shop.paperWidth]);

  const showLogo = readPrefs().showLogo !== false && !!shop.logo;

  /** Har cheez ki agri tafseel — miqdar, safety, bori ka hisab */
  const careBy = useMemo(() => {
    const m = new Map<string, {
      kind: AgriKind; rate?: string; method?: string; interval?: string;
      reEntry?: number; preHarvest?: number; toxicity?: string;
      packSize: number; packUnit: string; restricted: boolean;
      crops: string[]; storage?: string;
    }>();
    (profilesQ.data ?? []).forEach((p: any) => {
      if (!p.productId) return;
      m.set(p.productId, {
        kind: (p.category as AgriKind) ?? 'OTHER',
        rate: p.applicationRate || undefined,
        method: p.applicationMethod || undefined,
        interval: p.applicationInterval || undefined,
        reEntry: p.reEntryPeriod ?? undefined,
        preHarvest: p.ppePeriod ?? undefined,
        toxicity: p.toxicityLevel || undefined,
        packSize: Number(p.packSize || 0),
        packUnit: String(p.packUnit || 'kg'),
        restricted: !!p.isRestricted,
        crops: p.targetCrops ?? [],
        storage: p.storageInstructions || undefined,
      });
    });
    return m;
  }, [profilesQ.data]);

  /**
   * Hidayat — bill ka wo hissa jo farmer ghar le jata hai.
   *
   * Sirf wohi cheezein jin par kuch likha hua ho. Khali khana chhapna
   * kaghaz zaya karna hai, aur asli hidayat us me gum ho jati hai.
   */
  const careLines = useMemo(() => {
    if (!sale) return [] as Array<{ name: string; lines: string[] }>;
    const out: Array<{ name: string; lines: string[] }> = [];
    let maxReEntry = 0;
    let maxPreHarvest = 0;

    sale.items.forEach((i: any) => {
      const c = careBy.get(i.productId);
      if (!c) return;
      const lines: string[] = [];
      if (c.rate) lines.push(`🌱 Miqdar: ${c.rate}`);
      if (c.method) lines.push(`💧 Tareeqa: ${c.method}`);
      if (c.interval) lines.push(`🔁 Dobara: ${c.interval}`);
      if (c.reEntry) { maxReEntry = Math.max(maxReEntry, c.reEntry); }
      if (c.preHarvest) { maxPreHarvest = Math.max(maxPreHarvest, c.preHarvest); }
      if (lines.length > 0) out.push({ name: i.name, lines });
    });

    /* Safety ki do baatein har cheez par alag likhne ka faida nahi —
       farmer ke liye sab se sakht muddat hi maani rakhti hai. */
    const safety: string[] = [];
    if (maxReEntry > 0) safety.push(`⛔ Chhirakne ke baad ${maxReEntry} din khet me na jayein`);
    if (maxPreHarvest > 0) safety.push(`✂️ Fasal ${maxPreHarvest} din baad kaatein`);
    if (safety.length > 0) out.push({ name: '__safety__', lines: safety });

    return out;
  }, [sale, careBy]);

  const hasSpray = useMemo(
    () => !!sale?.items.some((i: any) => {
      const c = careBy.get(i.productId);
      const k = c?.kind ?? deriveAgriKind(i.categoryName, i.name);
      return isSprayKind(k);
    }),
    [sale, careBy],
  );

  const savings = useMemo(
    () => (sale ? sale.items.reduce((s: number, i: any) => s + (i.discount ?? 0), 0) + sale.discount : 0),
    [sale],
  );

  /** Ek line ka bori/kilo hisab — "5 kg (0.1 bori)" */
  const packLine = (i: any): string | null => {
    const c = careBy.get(i.productId);
    if (!c || !(c.packSize > 0) || !i.unit || isMeasured(i.unit)) return null;
    return `1 ${agriUnitLabel(i.unit)} = ${c.packSize} ${c.packUnit} · kul ${fmtQty(i.qty * c.packSize)} ${c.packUnit}`;
  };

  /* ── Print ── */
  const doPrint = useCallback(() => {
    document.body.dataset.paper = paper;
    window.print();
  }, [paper]);

  useEffect(() => {
    document.body.dataset.paper = paper;
    return () => { delete document.body.dataset.paper; };
  }, [paper]);

  /* Sirf ek dafa — pehle refetch hote hi dobara print dialog khul jata */
  useEffect(() => {
    const want = params.get('autoprint') === '1' || params.get('auto') === '1';
    if (!want || !sale || saleQ.isLoading || printedOnce.current) return;
    printedOnce.current = true;
    const t = setTimeout(doPrint, 600);
    return () => clearTimeout(t);
  }, [params, sale, saleQ.isLoading, doPrint]);

  /* ── Share ── */
  const receiptUrl = `${window.location.origin}/sales/${id}/receipt`;
  const waText = useMemo(() => {
    if (!sale) return '';
    const care = careLines.flatMap((c) =>
      c.name === '__safety__' ? c.lines : [`${c.name}:`, ...c.lines.map((l) => `  ${l}`)]);
    return [
      `🌾 *${shop.name}*`,
      `Bill: ${sale.shortNo}`,
      `Tareekh: ${new Date(sale.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`,
      farmer ? `Farmer: ${farmer.fullName}${farmer.village ? ` (${farmer.village})` : ''}` : '',
      '─────────────────',
      ...sale.items.map((i: any, n: number) => {
        const pl = packLine(i);
        return `${n + 1}. ${i.name} — ${fmtQty(i.qty)}${i.unit ? ' ' + agriUnitLabel(i.unit) : ''} × ${formatPKR(i.price)} = ${formatPKR(i.total)}`
          + (pl ? `\n    ${pl}` : '');
      }),
      '─────────────────',
      sale.delivery > 0 ? `Delivery: ${formatPKR(sale.delivery)}` : '',
      `*Total: ${formatPKR(sale.total)}*`,
      `Mila: ${formatPKR(sale.paid)}`,
      sale.change > 0 ? `Wapis: ${formatPKR(sale.change)}` : '',
      sale.due > 0 ? `⚠ Is bill ka baqi: ${formatPKR(sale.due)}` : '',
      sale.customerDue > 0 ? `📒 Kul udhaar: ${formatPKR(sale.customerDue)}` : '',
      care.length > 0 ? '\n📋 *Hidayat*' : '',
      ...care,
      '',
      shop.footer,
      '_Powered by Nafaa POS_',
    ].filter(Boolean).join('\n');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale, shop, careLines, farmer, careBy]);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      toast.success(msg);
    } catch { toast.error('Copy nahi hua'); }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${shop.name} — Bill`, text: waText, url: receiptUrl }); } catch { /* band kiya */ }
    } else copy(receiptUrl, 'Bill ka link copy ho gaya');
  };

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/sales'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); doPrint(); }
      if (k === 'f') setMode((m) => (m === 'full' ? 'short' : 'full'));
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doPrint]);

  /* ── Halatein ── */
  if (saleQ.isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-bold">Bill khul raha hai…</p>
      </div>
    );
  }

  if (saleQ.isError || !sale) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-8 text-center shadow-lg">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
          <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">Bill nahi mila</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">Bill ka number ghalat hai ya record hat chuka hai.</p>
          <div className="mt-6 flex gap-2 justify-center">
            <button onClick={() => saleQ.refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-black transition">
              <RefreshCw className={`h-4 w-4 ${saleQ.isRefetching ? 'animate-spin' : ''}`} /> Dobara
            </button>
            <button onClick={() => navigate('/sales')}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-black text-slate-700 dark:text-slate-200">
              Bikri ki list
            </button>
          </div>
        </div>
      </div>
    );
  }

  const full = mode === 'full';
  const date = new Date(sale.createdAt);
  const tb = 'h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 hover:border-emerald-400 transition';
  const safetyBlock = careLines.find((c) => c.name === '__safety__');
  const itemCare = careLines.filter((c) => c.name !== '__safety__');

  return (
    <div className="pb-24 sm:pb-10">
      <PrintStyles />

      {/* ═══ TOOLBAR ═══ */}
      <div className="print:hidden sticky top-0 z-20 -mx-1 px-1 py-2 mb-4 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button onClick={goBack} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition">
            <ArrowLeft className="h-4 w-4" /> Wapas
          </button>

          <div className="flex gap-1.5 flex-wrap items-center">
            <div className="inline-flex rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
              {([['short', 'Chhota', Minimize2], ['full', 'Poora', Maximize2]] as const).map(([m, l, I]) => (
                <button key={m} onClick={() => setMode(m)} title="F"
                  className={`h-9 px-2.5 text-[11px] font-black inline-flex items-center gap-1 transition ${
                    mode === m ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}><I className="h-3.5 w-3.5" /> {l}</button>
              ))}
            </div>
            <div className="inline-flex rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
              {(['58', '80'] as const).map((w) => (
                <button key={w} onClick={() => setPaper(w)}
                  className={`h-9 px-2.5 text-[11px] font-black tabular-nums transition ${
                    paper === w ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                  }`}>{w}mm</button>
              ))}
            </div>
            <button onClick={() => copy(waText, 'Bill ka text copy ho gaya')} className={`${tb} px-3`}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? 'Copy hua' : 'Copy'}</span>
            </button>
            <button onClick={shareNative} className={`${tb} w-10`} title="Share"><Share2 className="h-4 w-4" /></button>
            <button onClick={() => saleQ.refetch()} disabled={saleQ.isRefetching} className={`${tb} w-10 disabled:opacity-50`} title="Taaza">
              <RefreshCw className={`h-4 w-4 ${saleQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <a href={`https://wa.me/${sale.customerPhone ? sale.customerPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(waText)}`}
              target="_blank" rel="noreferrer"
              className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button onClick={doPrint}
              className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <Printer className="h-4 w-4" /> Print <kbd className="hidden sm:inline text-[9px] opacity-70">P</kbd>
            </button>
          </div>
        </div>
      </div>

      {params.get('fresh') === '1' && (
        <div className="print:hidden mb-4 mx-auto max-w-[420px] rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-black text-emerald-900 dark:text-emerald-200">Bill ban gaya!</span>
          {sale.change > 0 && <span className="ml-auto text-sm font-black text-emerald-700">Wapis dein {formatPKR(sale.change)}</span>}
        </div>
      )}

      {/* ═══ KAGHAZ ═══ */}
      <div className="flex justify-center">
        <div id="receipt-paper"
          className="receipt-paper bg-[#ffffff] text-black shadow-xl rounded-2xl print:shadow-none print:rounded-none"
          style={{ width: paper === '58' ? 240 : 320, maxWidth: '100%' }}>
          <div className="rc-center">
            {showLogo && (
              <img src={shop.logo} alt="" className="rc-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div className="rc-shop">{shop.name}</div>
            {shop.address && <div className="rc-sub"><MapPin className="h-3 w-3 inline" /> {shop.address}</div>}
            {shop.phone && <div className="rc-sub"><Phone className="h-3 w-3 inline" /> {shop.phone}</div>}
            {full && shop.ntn && <div className="rc-sub">NTN: {shop.ntn}</div>}
          </div>

          <div className="rc-div" />

          <div className="rc-meta">
            <div className="rc-meta-cell">
              <span className="rc-meta-label">Bill</span>
              <b className="rc-meta-value">{sale.shortNo}</b>
            </div>
            <div className="rc-meta-cell rc-right">
              <span className="rc-meta-label"><CalendarClock className="h-3 w-3 inline" /> Tareekh</span>
              <span className="rc-meta-value tabular-nums">
                {date.toLocaleDateString('en-PK')} {date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {sale.customerName && <div className="rc-row"><span><User className="h-3 w-3 inline" /> Farmer</span><b>{sale.customerName}</b></div>}
          {/* Gaon aur zameen — agli dafa pehchanne me aasani */}
          {farmer && (farmer.village || farmer.landAreaAcres) && (
            <div className="rc-row">
              <span><Sprout className="h-3 w-3 inline" /> Gaon</span>
              <b className="rc-wrap">
                {[farmer.village, farmer.district].filter(Boolean).join(', ')}
                {farmer.landAreaAcres ? ` · ${farmer.landAreaAcres} acre` : ''}
              </b>
            </div>
          )}
          {full && farmer?.farmerNumber && <div className="rc-row"><span>Farmer #</span><b>{farmer.farmerNumber}</b></div>}
          {sale.note && <div className="rc-row"><span><Wheat className="h-3 w-3 inline" /> Tafseel</span><b className="rc-wrap">{sale.note}</b></div>}
          {full && sale.cashierName && <div className="rc-row"><span>Counter</span><b>{sale.cashierName}</b></div>}
          {sale.receivedByName && (
            <div className="rc-row">
              <span><UserCheck className="h-3 w-3 inline" /> Le gaya</span>
              <b>{sale.receivedByName}{sale.receivedByPhone ? ` (${sale.receivedByPhone})` : ''}</b>
            </div>
          )}
          {sale.deliveryAddress && (
            <div className="rc-row"><span><Truck className="h-3 w-3 inline" /> Pata</span><b className="rc-wrap">{sale.deliveryAddress}</b></div>
          )}

          <div className="rc-div" />

          <div className="rc-row rc-head"><span><Package className="h-3 w-3 inline" /> Cheez</span><span>Raqam</span></div>
          {sale.items.map((i: any, n: number) => {
            const pl = packLine(i);
            const c = careBy.get(i.productId);
            return (
              <div key={n} className="rc-item">
                <div className="rc-iname">
                  {n + 1}. {i.name}{c?.restricted ? ' ⚠' : ''}
                </div>
                <div className="rc-row rc-irow">
                  <span className="tabular-nums">
                    {fmtQty(i.qty)}{i.unit ? ` ${agriUnitLabel(i.unit)}` : ''} × {formatPKR(i.price)}
                  </span>
                  <b className="tabular-nums">{formatPKR(i.total)}</b>
                </div>
                {/* Bori ka hisab — dukaan-daar bori ginta hai, farmer kilo */}
                {pl && <div className="rc-pack"><Scale className="h-3 w-3 inline" /> {pl}</div>}
                {full && (i.discount ?? 0) > 0 && (
                  <div className="rc-row rc-irow"><span><Tag className="h-3 w-3 inline" /> Chhoot</span><span>−{formatPKR(i.discount)}</span></div>
                )}
              </div>
            );
          })}

          <div className="rc-div" />
          <div className="rc-row">
            <span>Cheezein</span>
            <span className="tabular-nums">{sale.items.length} ({fmtQty(sale.items.reduce((a: number, i: any) => a + i.qty, 0))} qty)</span>
          </div>
          {(sale.discount > 0 || sale.delivery > 0 || (full && sale.tax > 0)) && (
            <div className="rc-row"><span>Subtotal</span><span className="tabular-nums">{formatPKR(sale.subtotal)}</span></div>
          )}
          {sale.discount > 0 && <div className="rc-row"><span><Tag className="h-3 w-3 inline" /> Discount</span><span className="tabular-nums">−{formatPKR(sale.discount)}</span></div>}
          {full && sale.tax > 0 && <div className="rc-row"><span>Tax</span><span className="tabular-nums">{formatPKR(sale.tax)}</span></div>}
          {sale.delivery > 0 && <div className="rc-row"><span><Truck className="h-3 w-3 inline" /> Delivery</span><span className="tabular-nums">+{formatPKR(sale.delivery)}</span></div>}

          <div className="rc-total"><span>TOTAL</span><span className="tabular-nums">{formatPKR(sale.total)}</span></div>
          <div className="rc-row"><span><Wallet className="h-3 w-3 inline" /> Mila ({sale.paymentMethod})</span><b className="tabular-nums">{formatPKR(sale.paid)}</b></div>
          {sale.change > 0 && <div className="rc-row"><span>WAPIS DIYA</span><b className="tabular-nums">{formatPKR(sale.change)}</b></div>}
          {sale.due > 0 && <div className="rc-credit"><span>⚠ IS BILL KA BAQI</span><b className="tabular-nums">{formatPKR(sale.due)}</b></div>}

          {/* Purana khata — bill poora ada ho tab bhi saamne */}
          {sale.customerName && sale.customerDue > 0 && (
            <div className="rc-khata">
              <div className="rc-khata-title">KHATA — {sale.customerName}</div>
              {sale.customerDue > sale.due && (
                <div className="rc-row"><span>Pichla udhaar</span><span className="tabular-nums">{formatPKR(sale.customerDue - sale.due)}</span></div>
              )}
              {sale.due > 0 && <div className="rc-row"><span>Is bill ka</span><span className="tabular-nums">+{formatPKR(sale.due)}</span></div>}
              <div className="rc-khata-total"><span>KUL UDHAAR</span><b className="tabular-nums">{formatPKR(sale.customerDue)}</b></div>
              {farmer && Number(farmer.creditLimit) > 0 && (
                <div className="rc-row rc-irow">
                  <span>Udhaar ki hadd</span>
                  <span className="tabular-nums">{formatPKR(farmer.creditLimit)}</span>
                </div>
              )}
            </div>
          )}

          {savings > 0 && <div className="rc-box"><TrendingUp className="h-3 w-3 inline" /> Aap ki bachat: {formatPKR(savings)}</div>}
          {full && (sale.points ?? 0) > 0 && <div className="rc-row"><span><Gift className="h-3 w-3 inline" /> Points</span><span>+{sale.points}</span></div>}

          {/* ═══ HIDAYAT — bill ka asal agri hissa ═══ */}
          {itemCare.length > 0 && (
            <div className="rc-care">
              <div className="rc-care-title">📋 KAISE ISTEMAL KAREIN</div>
              {itemCare.map((c, n) => (
                <div key={n} className="rc-care-item">
                  <div className="rc-care-name">{c.name}</div>
                  {c.lines.map((l, j) => <div key={j} className="rc-care-line">{l}</div>)}
                </div>
              ))}
            </div>
          )}

          {safetyBlock && (
            <div className="rc-safety">
              <div className="rc-care-title">⚠️ EHTIYAT — ZAROOR PARHEIN</div>
              {safetyBlock.lines.map((l, j) => <div key={j} className="rc-care-line">{l}</div>)}
              {hasSpray && <div className="rc-care-line">🧤 Dastane aur mask pehan kar chhirkein</div>}
              <div className="rc-care-line">👶 Bachon aur jaanwaron se door rakhein</div>
            </div>
          )}

          {sale.hasFbr && (
            <>
              <div className="rc-div" />
              <div className="rc-center"><FbrReceiptBadge saleId={sale.id} variant="thermal" className="rc-fbr" /></div>
            </>
          )}

          <div className="rc-div" />
          <div className="rc-barcode"><Barcode value={sale.invoiceNo} /></div>
          <div className="rc-center rc-sub" style={{ letterSpacing: 2 }}>{sale.shortNo}</div>

          <div className="rc-div" />
          <div className="rc-center rc-sub">{shop.footer}</div>
          <div className="rc-powered">✦ Powered by <b>Nafaa POS</b> ✦</div>
          <div className="rc-cut">— — — — — — — — — — — — ✂</div>
        </div>
      </div>

      {/* Mobile */}
      <div className="print:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t-2 border-slate-200 dark:border-slate-800 p-3 sm:hidden">
        <div className="flex gap-2">
          <button onClick={doPrint} className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-black inline-flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" /> Print
          </button>
          <a href={`https://wa.me/${sale.customerPhone ? sale.customerPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(waText)}`}
            target="_blank" rel="noreferrer"
            className="flex-1 h-12 rounded-xl bg-green-600 text-white font-black inline-flex items-center justify-center gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <button onClick={shareNative} className="h-12 w-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Share2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PRINT CSS — thermal par har harf thos kaala
   ═════════════════════════════════════════════════════════════ */
function PrintStyles() {
  return (
    <style>{`
      .receipt-paper { padding: 16px 12px; font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
        font-size: 13px; line-height: 1.4; color: #000; font-weight: 600; }
      .rc-center { text-align: center; }
      .rc-shop { font-size: 19px; font-weight: 900; letter-spacing: .3px; text-transform: uppercase; }
      .rc-sub { font-size: 12px; font-weight: 600; }
      .rc-logo { max-height: 48px; max-width: 70%; margin: 0 auto 6px; object-fit: contain; filter: grayscale(1) contrast(2); }
      .rc-div { border-top: 1.5px dashed #000; margin: 8px 0; }
      .rc-row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
      .rc-wrap { text-align: right; word-break: break-word; }
      .rc-head { font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 5px; }
      .rc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 2px 0; }
      .rc-meta-cell { display: flex; flex-direction: column; }
      .rc-meta-cell.rc-right { text-align: right; align-items: flex-end; }
      .rc-meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: .4px; font-weight: 800; }
      .rc-meta-value { font-size: 13px; font-weight: 800; word-break: break-all; }
      .rc-item { margin-bottom: 6px; break-inside: avoid; page-break-inside: avoid; }
      .rc-iname { font-weight: 800; }
      .rc-irow { font-size: 12.5px; font-weight: 700; }
      /* Bori ka hisab — halka sa andar, taake line se juda lage */
      .rc-pack { font-size: 11.5px; font-weight: 700; padding-left: 10px; }
      .rc-total { display: flex; justify-content: space-between; font-size: 19px; font-weight: 900;
        border-top: 2.5px solid #000; border-bottom: 2.5px solid #000; padding: 5px 0; margin: 7px 0; }
      .rc-credit { display: flex; justify-content: space-between; font-weight: 900; border: 2px solid #000; padding: 5px 6px; border-radius: 4px; margin-top: 4px; }
      .rc-khata { margin-top: 6px; border: 2px solid #000; border-radius: 4px; padding: 5px 6px; }
      .rc-khata-title { font-size: 11px; font-weight: 900; letter-spacing: .4px; margin-bottom: 2px; }
      .rc-khata-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 2px solid #000; margin-top: 3px; padding-top: 3px; }
      .rc-box { margin-top: 6px; border: 1.5px dashed #000; border-radius: 6px; padding: 5px; text-align: center; font-size: 12px; font-weight: 800; }
      /* Hidayat — farmer ye hissa ghar le jata hai, is liye khula aur mota */
      .rc-care { margin-top: 8px; border: 1.5px dashed #000; border-radius: 6px; padding: 6px; }
      .rc-care-title { font-size: 11.5px; font-weight: 900; letter-spacing: .4px; text-align: center; margin-bottom: 4px; }
      .rc-care-item { margin-bottom: 5px; break-inside: avoid; page-break-inside: avoid; }
      .rc-care-name { font-size: 12px; font-weight: 900; }
      .rc-care-line { font-size: 12px; font-weight: 800; padding-left: 6px; }
      /* Ehtiyat — sab se mota khana, ye farmer ki jaan ka masla hai */
      .rc-safety { margin-top: 6px; border: 2.5px solid #000; border-radius: 6px; padding: 6px; }
      .rc-barcode { display: flex; justify-content: center; margin-top: 10px; }
      .rc-barcode svg { max-width: 100%; height: auto; }
      .rc-powered { text-align: center; font-size: 11px; font-weight: 700; margin-top: 8px; }
      .rc-powered b { font-weight: 900; }
      .rc-cut { text-align: center; font-size: 11px; font-weight: 700; margin-top: 10px; letter-spacing: 2px; white-space: nowrap; overflow: hidden; }
      .rc-fbr { margin: 4px auto; }

      @media print {
        body * { visibility: hidden; }
        #receipt-paper, #receipt-paper * { visibility: visible; }
        #receipt-paper { position: absolute; left: 0; top: 0; box-shadow: none !important; margin: 0 !important;
          width: 100% !important; max-width: 100% !important; padding: 4mm 2mm !important; border-radius: 0 !important; }
        /* Anti-aliasing band — warna kinaron ke grey pixel thermal head chhaap nahi pata */
        #receipt-paper, #receipt-paper * { color: #000 !important; background: #fff !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact; text-shadow: none !important;
          box-shadow: none !important; -webkit-font-smoothing: none !important;
          text-rendering: geometricPrecision !important; opacity: 1 !important; filter: none !important; }
        #receipt-paper * { font-weight: 600; }
        #receipt-paper .rc-shop, #receipt-paper .rc-total, #receipt-paper .rc-head, #receipt-paper .rc-credit,
        #receipt-paper .rc-khata-title, #receipt-paper .rc-khata-total, #receipt-paper .rc-iname,
        #receipt-paper .rc-meta-value, #receipt-paper .rc-care-title, #receipt-paper .rc-care-name,
        #receipt-paper .rc-care-line { font-weight: 900 !important; }
        #receipt-paper .rc-logo { filter: grayscale(1) contrast(3) !important; }
        /* Icon kaghaz par dhabba — magar barcode zaroor chhape */
        #receipt-paper svg { display: none; }
        #receipt-paper .rc-barcode svg { display: block !important; max-width: 100% !important; height: auto !important; }
        @page { margin: 0; size: auto; }
        body[data-paper="58"] #receipt-paper { width: 58mm !important; font-size: 11.5px; }
        body[data-paper="58"] #receipt-paper .rc-shop, body[data-paper="58"] #receipt-paper .rc-total { font-size: 15px; }
        body[data-paper="58"] #receipt-paper .rc-irow { font-size: 11px; }
        body[data-paper="58"] #receipt-paper .rc-pack { font-size: 10.5px; }
        body[data-paper="58"] #receipt-paper .rc-care-line { font-size: 11px; }
        body[data-paper="58"] #receipt-paper .rc-meta-value { font-size: 11.5px; }
        body[data-paper="58"] #receipt-paper .rc-barcode svg { height: 34px !important; }
        body[data-paper="80"] #receipt-paper { width: 80mm !important; font-size: 13.5px; }
        body[data-paper="80"] #receipt-paper .rc-shop, body[data-paper="80"] #receipt-paper .rc-total { font-size: 20px; }
        .rc-item, .rc-total, .rc-row, .rc-care, .rc-safety { page-break-inside: avoid; break-inside: avoid; }
      }
    `}</style>
  );
}
