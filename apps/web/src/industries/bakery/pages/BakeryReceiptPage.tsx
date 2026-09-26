import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import JsBarcode from 'jsbarcode';
import {
  Printer, ArrowLeft, MessageCircle, Cake, Timer, Snowflake, User,
  CheckCircle2, Copy, Check, RefreshCw, Loader2, AlertTriangle,
  Wallet, BookOpen, Settings2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { bakeryProductsApi } from '../api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

/* ═════════════════════════════════════════════════════════════
   BAKERY BILL
   ─────────────────────────────────────────────────────────────
   Purane safhe par do cheezein toot chuki thin:

   1. Auto-print `?auto=1` par chalta tha, magar POS aur baqi sab
      jagah link `autoprint=1` bhejte hain — yani auto-print kabhi
      chala hi nahi.

   2. Jo switch localStorage me dekha jata tha (`nafaa.pos.auto-print`)
      wo kisi safhe par likha hi nahi jata. Setting hamesha band.

   Sath hi print bohat bareek thi — 400-weight ka font 203-dpi
   thermal head par mushkil se chhapta hai.
   ═════════════════════════════════════════════════════════════ */

type Paper = '58' | '80';
const PREFS_KEY = 'nafaa.bakery.print';

const num = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : Number(v) || 0);
const str = (v: any): string => (typeof v === 'string' ? v : v != null ? String(v) : '');

function loadPaper(): Paper {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw && JSON.parse(raw)?.width === '58' ? '58' : '80';
  } catch { return '80'; }
}

/** Bill par asli CODE128 — scanner isi se purana bill nikalta hai */
function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        /* 203-dpi head par patli lakeer aadhe dot par girti hai aur
           scanner chook jata hai */
        width: 1.6, height: 45, margin: 0,
        displayValue: false, lineColor: '#000000',
      });
    } catch { /* value barcode me nahi dhal sakti */ }
  }, [value]);
  return <svg ref={ref} />;
}

export default function BakeryReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [paper, setPaper] = useState<Paper>(loadPaper);
  const [copied, setCopied] = useState(false);
  const [showPaper, setShowPaper] = useState(false);

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

  const settingsQ = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
  });

  const profilesQ = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}).catch(() => []),
  });

  const raw = saleQ.data;

  const sale = useMemo(() => {
    if (!raw) return null;
    const items = (raw.items ?? raw.saleItems ?? []).map((it: any) => {
      const qty = num(it.qty ?? it.quantity ?? 1);
      const price = num(it.price ?? it.unitPrice ?? 0);
      return {
        productId: str(it.productId ?? it.product?.id ?? ''),
        name: str(it.name ?? it.productName ?? it.product?.name ?? 'Item'),
        qty, price,
        total: num(it.total ?? it.lineTotal ?? qty * price),
        unit: str(it.unit ?? it.product?.unit ?? '') || undefined,
      };
    });
    const subtotal = num(raw.subtotal ?? items.reduce((s: number, i: any) => s + i.total, 0));
    const discount = num(raw.discount ?? raw.discountAmount ?? 0);
    const total = num(raw.total ?? subtotal - discount);
    const paid = num(raw.paidAmount ?? raw.paid ?? total);
    return {
      id: str(raw.id),
      invoiceNo: str(raw.saleNumber ?? raw.invoiceNo ?? raw.id),
      createdAt: str(raw.soldAt ?? raw.createdAt ?? new Date().toISOString()),
      customerName: str(raw.customer?.name ?? raw.customerName ?? '') || undefined,
      /* Server udhaar wali bikri par balance khud barha deta hai,
         aur offline snapshot bhi ab bill ke BAAD ka rakhta hai —
         yani ye "ab kul kitna baqi hai" hai. */
      customerDue: num(raw.customer?.balance ?? 0),
      cashierName: str(raw.createdBy?.fullName ?? '') || undefined,
      paymentMethod: str(raw.paymentMethod ?? 'CASH'),
      items, subtotal, discount, total, paid,
      change: num(raw.changeAmount ?? Math.max(paid - total, 0)),
      due: num(raw.creditAmount ?? Math.max(total - paid, 0)),
    };
  }, [raw]);

  const shop = useMemo(() => {
    const s = (settingsQ.data as any)?.settings ?? {};
    const t = (settingsQ.data as any)?.tenant ?? {};
    return {
      name: str(t.name ?? s.shopName ?? 'Bakery'),
      address: str(t.address ?? s.shopAddress ?? ''),
      phone: str(t.phone ?? s.shopPhone ?? ''),
      footer: str(s.receiptFooter ?? 'Shukriya! Phir tashreef laiye.'),
    };
  }, [settingsQ.data]);

  /** Kaun si cheez fridge maangti hai ya jald kharab hoti hai */
  const careBy = useMemo(() => {
    const m = new Map<string, { fridge: boolean; days?: number }>();
    (profilesQ.data ?? []).forEach((p: any) => {
      if (!p.productId) return;
      m.set(p.productId, { fridge: !!p.requiresRefrigeration, days: p.shelfLifeDays ?? undefined });
    });
    return m;
  }, [profilesQ.data]);

  const careLines = useMemo(() => {
    if (!sale) return [] as string[];
    const out: string[] = [];
    const fridge = sale.items.filter((i: any) => careBy.get(i.productId)?.fridge);
    if (fridge.length > 0) out.push('❄️ Fridge me rakhein');
    const quick = sale.items
      .map((i: any) => careBy.get(i.productId)?.days)
      .filter((d: any): d is number => typeof d === 'number');
    if (quick.length > 0) {
      const min = Math.min(...quick);
      out.push(min <= 1 ? '⏱️ Aaj hi kha lein' : `⏱️ ${min} din ke andar kha lein`);
    }
    return out;
  }, [sale, careBy]);

  const doPrint = useCallback(() => {
    document.body.dataset.paper = paper;
    window.print();
  }, [paper]);

  useEffect(() => {
    document.body.dataset.paper = paper;
    return () => { delete document.body.dataset.paper; };
  }, [paper]);

  /* Auto-print — ab dono naam qubool hain. Pehle sirf `auto` dekha
     jata tha jabke har jagah se `autoprint` bheja jata hai. */
  useEffect(() => {
    const want = params.get('autoprint') === '1' || params.get('auto') === '1';
    if (want && sale && !saleQ.isLoading) {
      const t = setTimeout(doPrint, 500);
      return () => clearTimeout(t);
    }
  }, [params, sale, saleQ.isLoading, doPrint]);

  const waText = useMemo(() => {
    if (!sale) return '';
    return [
      `🧾 *${shop.name}*`,
      `Bill: ${sale.invoiceNo}`,
      `Tareekh: ${new Date(sale.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`,
      '',
      ...sale.items.map((i: any, n: number) => `${n + 1}. ${i.name} — ${i.qty} × ${formatPKR(i.price)} = ${formatPKR(i.total)}`),
      '',
      `Total: ${formatPKR(sale.total)}`,
      `Mila: ${formatPKR(sale.paid)}`,
      sale.due > 0 ? `⚠ Is bill ka baqi: ${formatPKR(sale.due)}` : '',
      sale.customerDue > 0 ? `📒 Kul udhaar: ${formatPKR(sale.customerDue)}` : '',
      ...careLines,
      '',
      shop.footer,
    ].filter(Boolean).join('\n');
  }, [sale, shop, careLines]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(waText);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      toast.success('Copy ho gaya');
    } catch { toast.error('Copy nahi hua'); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPaper) return setShowPaper(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); doPrint(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doPrint, showPaper]);

  if (saleQ.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Cake className="h-14 w-14 text-slate-300" />
        <p className="font-black text-slate-700 dark:text-slate-200 text-lg">Bill nahi mila</p>
        <Button variant="secondary" onClick={() => navigate('/sales')}>Bikri ki list</Button>
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-10">
      <PrintStyles />

      {/* ═══ TOP BAR ═══ */}
      <div className="print:hidden flex items-center justify-between gap-2 flex-wrap mb-4">
        <Link to="/sales" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-pink-600 transition">
          <ArrowLeft className="h-4 w-4" /> Bikri ki list
        </Link>
        <div className="flex gap-1.5">
          <button onClick={() => setShowPaper(true)}
            className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:border-pink-400 transition">
            <Settings2 className="h-4 w-4" /> {paper}mm
          </button>
          <button onClick={copyText}
            className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:border-pink-400 transition">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? 'Copy hua' : 'Copy'}</span>
          </button>
          <button onClick={() => saleQ.refetch()} disabled={saleQ.isRefetching}
            className="h-10 w-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:border-pink-400 disabled:opacity-50 transition">
            <RefreshCw className={`h-4 w-4 text-slate-500 ${saleQ.isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"
            className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <button onClick={doPrint}
            className="h-10 px-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            <Printer className="h-4 w-4" /> Print <kbd className="hidden sm:inline text-[9px] opacity-70">P</kbd>
          </button>
        </div>
      </div>

      {params.get('fresh') === '1' && (
        <div className="print:hidden mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-black text-emerald-900 dark:text-emerald-200">Bill ban gaya!</span>
        </div>
      )}

      {/* ═══ KAGHAZ ═══ */}
      <div className="flex justify-center">
        <div id="receipt-paper" className="receipt-paper bg-[#ffffff] text-black w-full max-w-[420px] rounded-2xl shadow-xl print:shadow-none print:rounded-none">
          <div className="rc-center rc-shop">{shop.name}</div>
          {shop.address && <div className="rc-center rc-sub">{shop.address}</div>}
          {shop.phone && <div className="rc-center rc-sub">Ph: {shop.phone}</div>}

          <div className="rc-div" />

          <div className="rc-row"><span>BILL</span><b>{sale.invoiceNo}</b></div>
          <div className="rc-row"><span>DATE</span>
            <b>{new Date(sale.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</b>
          </div>
          {sale.customerName && <div className="rc-row"><span>CUSTOMER</span><b>{sale.customerName}</b></div>}
          {sale.cashierName && <div className="rc-row"><span>COUNTER</span><b>{sale.cashierName}</b></div>}

          <div className="rc-div" />

          {sale.items.map((i: any, n: number) => {
            const care = careBy.get(i.productId);
            return (
              <div key={n} className="rc-item">
                <div className="rc-iname">{n + 1}. {i.name}{care?.fridge ? ' ❄️' : ''}</div>
                <div className="rc-irow">
                  <span>{i.qty} {i.unit ?? ''} × {formatPKR(i.price)}</span>
                  <b>{formatPKR(i.total)}</b>
                </div>
              </div>
            );
          })}

          <div className="rc-div" />
          <div className="rc-row"><span>Cheezein</span><b>{sale.items.length}</b></div>
          {sale.discount > 0 && (
            <>
              <div className="rc-row"><span>Subtotal</span><b>{formatPKR(sale.subtotal)}</b></div>
              <div className="rc-row"><span>Discount</span><b>−{formatPKR(sale.discount)}</b></div>
            </>
          )}

          <div className="rc-dbl" />
          <div className="rc-total"><span>TOTAL</span><span>{formatPKR(sale.total)}</span></div>
          <div className="rc-row"><span>Paid ({sale.paymentMethod})</span><b>{formatPKR(sale.paid)}</b></div>
          {sale.change > 0 && <div className="rc-row"><span>WAPIS DIYA</span><b>{formatPKR(sale.change)}</b></div>}
          {sale.due > 0 && (
            <div className="rc-credit"><span>⚠ IS BILL KA BAQI</span><b>{formatPKR(sale.due)}</b></div>
          )}

          {/* Purana khata — bill poora ada ho tab bhi saamne rehna chahiye */}
          {sale.customerName && sale.customerDue > 0 && (
            <div className="rc-khata">
              <div className="rc-khata-title">KHATA — {sale.customerName}</div>
              {sale.customerDue > sale.due && (
                <div className="rc-row"><span>Pichla udhaar</span><b>{formatPKR(sale.customerDue - sale.due)}</b></div>
              )}
              {sale.due > 0 && <div className="rc-row"><span>Is bill ka</span><b>+{formatPKR(sale.due)}</b></div>}
              <div className="rc-khata-total"><span>KUL UDHAAR</span><b>{formatPKR(sale.customerDue)}</b></div>
            </div>
          )}

          {/* Bakery ki khaas baat — maal kaise rakhna hai */}
          {careLines.length > 0 && (
            <div className="rc-care">
              {careLines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <div className="rc-div" />
          <div className="rc-barcode"><Barcode value={sale.invoiceNo} /></div>
          <div className="rc-center rc-sub" style={{ letterSpacing: 2 }}>{sale.invoiceNo}</div>

          <div className="rc-div" />
          <div className="rc-center rc-sub">{shop.footer}</div>
          <div className="rc-powered">✦ Powered by <b>Nafaa POS</b> ✦</div>
          <div className="rc-cut">— — — — — — — — — — — — ✂</div>
        </div>
      </div>

      {/* Mobile bar */}
      <div className="print:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t-2 border-slate-200 dark:border-slate-800 p-3 sm:hidden">
        <div className="flex gap-2">
          <button onClick={doPrint} className="flex-1 h-12 rounded-xl bg-pink-600 text-white font-black inline-flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" /> Print
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"
            className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-black inline-flex items-center justify-center gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </div>

      {showPaper && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 print:hidden" onClick={() => setShowPaper(false)}>
          <div className="w-full max-w-xs rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white">Kaghaz ka naap</h3>
              <button onClick={() => setShowPaper(false)} className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['58', '80'] as const).map((w) => (
                <button key={w} onClick={() => {
                  setPaper(w);
                  try {
                    const cur = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
                    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...cur, width: w }));
                  } catch { /* ignore */ }
                  setShowPaper(false);
                }}
                  className={`h-12 rounded-xl text-sm font-black transition ${
                    paper === w ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>{w}mm</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PRINT CSS — thermal par har harf saaf
   ═════════════════════════════════════════════════════════════ */
function PrintStyles() {
  return (
    <style>{`
      .receipt-paper {
        padding: 16px 12px;
        font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
        font-size: 13px; line-height: 1.4; color: #000; font-weight: 600;
      }
      .rc-center { text-align: center; }
      .rc-shop { font-size: 19px; font-weight: 900; letter-spacing: .3px; text-transform: uppercase; }
      .rc-sub { font-size: 12px; font-weight: 600; }
      .rc-div { border-top: 1.5px dashed #000; margin: 8px 0; }
      .rc-dbl { border-top: 2.5px solid #000; margin: 8px 0; }
      .rc-row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
      .rc-item { margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid; }
      .rc-iname { font-weight: 800; }
      .rc-irow { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; }
      .rc-total { display: flex; justify-content: space-between; font-size: 19px; font-weight: 900; border-top: 2.5px solid #000; border-bottom: 2.5px solid #000; padding: 5px 0; margin: 7px 0; }
      .rc-credit { display: flex; justify-content: space-between; font-weight: 900; border: 2px solid #000; padding: 5px 6px; border-radius: 4px; margin-top: 4px; }
      .rc-khata { margin-top: 6px; border: 2px solid #000; border-radius: 4px; padding: 5px 6px; }
      .rc-khata-title { font-size: 11px; font-weight: 900; letter-spacing: .4px; margin-bottom: 2px; }
      .rc-khata-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 2px solid #000; margin-top: 3px; padding-top: 3px; }
      .rc-care { margin-top: 6px; border: 1.5px dashed #000; border-radius: 6px; padding: 5px; text-align: center; font-size: 12px; font-weight: 800; }
      .rc-barcode { display: flex; align-items: center; justify-content: center; margin-top: 10px; }
      .rc-barcode svg { max-width: 100%; height: auto; }
      .rc-powered { text-align: center; font-size: 11px; font-weight: 700; margin-top: 8px; }
      .rc-powered b { font-weight: 900; }
      .rc-cut { text-align: center; font-size: 11px; font-weight: 700; margin-top: 10px; letter-spacing: 2px; white-space: nowrap; overflow: hidden; }

      @media print {
        body * { visibility: hidden; }
        #receipt-paper, #receipt-paper * { visibility: visible; }
        #receipt-paper {
          position: absolute; left: 0; top: 0;
          box-shadow: none !important; margin: 0 !important;
          width: 100% !important; max-width: 100% !important;
          padding: 4mm 2mm !important;
        }

        /* Har harf thos kaala aur mota. Anti-aliasing band — warna
           browser kinaron par halke grey pixel banata hai jo thermal
           head chhaap hi nahi pata aur harf khokhla nazar aata hai. */
        #receipt-paper, #receipt-paper * {
          color: #000 !important; background: #fff !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
          text-shadow: none !important; box-shadow: none !important;
          -webkit-font-smoothing: none !important;
          text-rendering: geometricPrecision !important;
          opacity: 1 !important; filter: none !important;
        }
        #receipt-paper * { font-weight: 600; }
        #receipt-paper .rc-shop,
        #receipt-paper .rc-total,
        #receipt-paper .rc-credit,
        #receipt-paper .rc-khata-total,
        #receipt-paper .rc-iname { font-weight: 900 !important; }

        /* Lucide ke icon kaghaz par sirf dhabba bante hain — magar
           barcode ZAROOR chhape, purana bill usi se nikalta hai. */
        #receipt-paper svg { display: none; }
        #receipt-paper .rc-barcode svg { display: block !important; max-width: 100% !important; height: auto !important; }

        @page { margin: 0; size: auto; }
        body[data-paper="58"] #receipt-paper { width: 58mm !important; font-size: 11.5px; }
        body[data-paper="58"] #receipt-paper .rc-shop { font-size: 15px; }
        body[data-paper="58"] #receipt-paper .rc-total { font-size: 15px; }
        body[data-paper="58"] #receipt-paper .rc-barcode svg { height: 34px !important; }
        body[data-paper="80"] #receipt-paper { width: 80mm !important; font-size: 13.5px; }
        body[data-paper="80"] #receipt-paper .rc-shop { font-size: 20px; }
        body[data-paper="80"] #receipt-paper .rc-total { font-size: 20px; }

        .rc-item, .rc-total, .rc-row { page-break-inside: avoid; break-inside: avoid; }
      }
    `}</style>
  );
}
