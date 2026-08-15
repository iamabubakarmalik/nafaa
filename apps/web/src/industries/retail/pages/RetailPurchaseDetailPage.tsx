// apps/web/src/industries/retail/pages/RetailPurchaseDetailPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Truck, Building2, Calendar, Package, Printer,
  Receipt, Wallet, CheckCircle2, AlertTriangle,
  ExternalLink, FileText, User, CreditCard, Banknote, Smartphone,
  Zap, Building, ShoppingCart, Phone, Mail, MapPin,
  Award, Sparkles, GraduationCap, X, ArrowRight, Hash, Clock,
} from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { purchasesApi } from '@modules/purchasing/purchases/api/purchases.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL PURCHASE DETAIL — FULL BEST
   ─────────────────────────────────────────────────────────────
   🛒 Grocery-focused clean invoice style
   🚫 No carpet rolls clutter (global page handles that)
   💰 Payment summary card (total / paid / udhaar)
   🏪 Supplier card with udhaar warning
   🎓 Teacher modal • Esc band • 🖨️ Print-ready A4
   🌙 Dark mode complete
   ═════════════════════════════════════════════════════════════ */

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const paymentLabels: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank Transfer',
};

const paymentEmoji: Record<string, string> = {
  CASH: '💵', CARD: '💳', JAZZCASH: '📱',
  EASYPAISA: '⚡', BANK_TRANSFER: '🏦',
};

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building,
};

const statusConfig: Record<string, { label: string; emoji: string; cls: string }> = {
  RECEIVED: { label: 'Mil Gaya', emoji: '✅',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40' },
  PENDING: { label: 'Pending', emoji: '⏳',
    cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40' },
  CANCELLED: { label: 'Cancelled', emoji: '❌',
    cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40' },
};

export default function RetailPurchaseDetailPage() {
  const { id } = useParams();
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase-detail', id],
    queryFn: () => purchasesApi.getOne(id!),
    enabled: !!id,
  });

  /* ─── Esc = teacher band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) setShowTeacher(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-sky-200 dark:border-sky-500/30 border-t-sky-600 dark:border-t-sky-400 animate-spin" />
        <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Purchase load ho rahi hai...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-16 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center mb-3">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Purchase nahi mili</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
          Shayad delete ho gayi ho ya link galat hai
        </p>
        <Link to="/purchases" className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-sky-600 dark:text-sky-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Purchases par wapas
        </Link>
      </div>
    );
  }

  const balance = Math.max(purchase.total - purchase.paidAmount, 0);
  const PayIcon = paymentIcons[purchase.paymentMethod] || CreditCard;
  const totalItems = purchase.items.reduce((sum: number, it: any) => sum + it.quantity, 0);
  const status = statusConfig[purchase.status] || statusConfig.PENDING;
  const paidPercent = purchase.total > 0 ? Math.min((purchase.paidAmount / purchase.total) * 100, 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <PurchaseDetailTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ ACTION BAR ═══ */}
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <Link
          to="/purchases"
          className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
        >
          <ArrowLeft className="h-4 w-4" /> Wapas Purchases
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTeacher(true)}
            className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
          >
            <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
          </button>
          <Button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-sky-600 to-cyan-700 font-extrabold shadow-lg shadow-sky-500/30"
          >
            <Printer className="h-4 w-4" /> Print Invoice
          </Button>
        </div>
      </div>

      {/* ═══ HEADER ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-sky-950 dark:to-cyan-900 text-white p-4 sm:p-6 print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/25 blur-3xl pointer-events-none print:hidden" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none print:hidden" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg print:hidden">
              <Truck className="h-3.5 w-3.5 text-amber-300" /> Purchase Invoice
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono break-all">{purchase.purchaseNumber}</h1>
            <div className="mt-2.5 flex items-center gap-2.5 text-xs sm:text-sm text-white/90 print:text-slate-600 flex-wrap font-semibold">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(purchase.purchasedAt)}
              </span>
              <span className="opacity-40">•</span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {purchase.supplier?.name}
              </span>
              {purchase.createdBy && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {purchase.createdBy.fullName}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-extrabold ${status.cls}`}>
              {status.emoji} {status.label}
            </span>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-white/60 print:text-slate-500 font-extrabold">Payment</div>
            <div className="text-sm font-extrabold mt-0.5 inline-flex items-center gap-1.5">
              {paymentEmoji[purchase.paymentMethod]} {paymentLabels[purchase.paymentMethod] || purchase.paymentMethod}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatBox label="Subtotal" value={formatPKRFull(purchase.subtotal)} icon={Receipt} tone="slate" />
        <StatBox
          label="Discount"
          value={purchase.discount > 0 ? `−${formatPKRFull(purchase.discount)}` : '—'}
          icon={Wallet} tone="amber"
        />
        <StatBox label="Total Bill" value={formatPKRFull(purchase.total)} icon={ShoppingCart} tone="sky" highlight />
        <StatBox
          label={balance > 0 ? 'Udhaar Baqi' : 'Paid ✓'}
          value={balance > 0 ? formatPKRFull(balance) : formatPKRFull(purchase.paidAmount)}
          icon={balance > 0 ? AlertTriangle : CheckCircle2}
          tone={balance > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* ═══ PAYMENT PROGRESS ═══ */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <PayIcon className="h-3.5 w-3.5" /> Payment Ka Hisaab
          </div>
          <div className="text-xs font-extrabold tabular-nums">
            <span className="text-emerald-700 dark:text-emerald-400">{formatPKR(purchase.paidAmount)} diya</span>
            <span className="text-slate-400 dark:text-slate-500"> / </span>
            <span className="text-slate-900 dark:text-white">{formatPKR(purchase.total)}</span>
          </div>
        </div>
        <div className="h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
          <div
            className={`h-full rounded-full transition-all ${
              balance > 0
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
            style={{ width: `${paidPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-extrabold">
          <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">{paidPercent.toFixed(0)}% paid</span>
          {balance > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 tabular-nums">
              <AlertTriangle className="h-3 w-3" /> {formatPKR(balance)} udhaar baqi
            </span>
          ) : (
            <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Poora clear — koi udhaar nahi 🎉
            </span>
          )}
        </div>
      </div>

      {/* ═══ SUPPLIER CARD ═══ */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-violet-200 dark:border-violet-500/30 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">Supplier</div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{purchase.supplier?.name}</h3>
            <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
              {purchase.supplier?.phone && (
                <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="font-bold">{purchase.supplier.phone}</span>
                </div>
              )}
              {purchase.supplier?.email && (
                <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="font-bold truncate">{purchase.supplier.email}</span>
                </div>
              )}
              {purchase.supplier?.address && (
                <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="font-semibold">{purchase.supplier.address}</span>
                </div>
              )}
              {purchase.supplier?.contactPerson && (
                <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="font-semibold">Contact: <span className="font-bold">{purchase.supplier.contactPerson}</span></span>
                </div>
              )}
            </div>
          </div>
          <Link
            to={`/suppliers/${purchase.supplier?.id}`}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 dark:hover:bg-violet-500/25 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-extrabold transition print:hidden shrink-0"
          >
            Profile Dekho <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ═══ ITEMS TABLE ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
          <Package className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          <h3 className="font-extrabold text-slate-900 dark:text-white">
            Items <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({purchase.items.length} items • {formatQty(totalItems)} total qty)</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 w-12">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Product</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Cost</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchase.items.map((item: any, idx: number) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        {item.product.images?.[0]?.url ? (
                          <img src={item.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">{item.product.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">{item.product.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatQty(item.quantity)}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{item.product.unit}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatPKR(item.costPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-sky-700 dark:text-sky-300 text-base tabular-nums">
                    {formatPKRFull(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 dark:border-slate-700">
              <tr className="bg-slate-50 dark:bg-slate-800/40">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-200">Subtotal</td>
                <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKRFull(purchase.subtotal)}</td>
              </tr>
              {purchase.discount > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold text-amber-700 dark:text-amber-400">Discount</td>
                  <td className="px-4 py-2 text-right font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">−{formatPKRFull(purchase.discount)}</td>
                </tr>
              )}
              <tr className="bg-sky-50 dark:bg-sky-500/10 border-t-2 border-sky-300 dark:border-sky-500/40">
                <td colSpan={4} className="px-4 py-3 text-right text-base font-extrabold text-slate-900 dark:text-white">GRAND TOTAL</td>
                <td className="px-4 py-3 text-right text-2xl font-extrabold text-sky-700 dark:text-sky-300 tabular-nums">{formatPKRFull(purchase.total)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Paid ({paymentEmoji[purchase.paymentMethod]} {paymentLabels[purchase.paymentMethod]})
                </td>
                <td className="px-4 py-2 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKRFull(purchase.paidAmount)}</td>
              </tr>
              {balance > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-rose-700 dark:text-rose-400">Udhaar Baqi</td>
                  <td className="px-4 py-2 text-right font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{formatPKRFull(balance)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* ═══ NOTES ═══ */}
      {purchase.notes && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900 dark:text-amber-300">Note</div>
            <div className="text-sm text-amber-900 dark:text-amber-200 mt-0.5 font-semibold leading-relaxed">{purchase.notes}</div>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 text-center print:bg-white">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2 flex-wrap justify-center">
          <Award className="h-4 w-4 text-amber-500" />
          Stock Receive Ho Kar Update Ho Gaya
          <Award className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 inline-flex items-center gap-1 font-semibold">
          <Sparkles className="h-2.5 w-2.5" />
          Powered by Nafaa POS • Generated {formatDate(new Date().toISOString())}
        </div>
      </div>

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          tr, .rounded-2xl, .rounded-3xl { page-break-inside: avoid !important; }
          table { font-size: 11px !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER — "Ye page kya batata hai"
   ═════════════════════════════════════════════════════════════ */
function PurchaseDetailTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye Page Kya Batata Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye ek purchase ka <strong>poora invoice</strong> hai — kya aaya, kitne ka aaya,
            kitna diya, kitna <strong>udhaar baqi</strong> hai. Sab kuch ek nazar me.
          </p>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>💰 Payment bar</strong> — green hissa jitna diya, baqi udhaar red me dikhta hai</TipRow>
            <TipRow><strong>🏪 Supplier card</strong> — phone/address ek jagah, profile par jump bhi</TipRow>
            <TipRow><strong>🖨️ Print</strong> — A4 invoice ban jata hai, supplier ko dene ya file me rakhne ke liye</TipRow>
            <TipRow><strong>Esc</strong> — is guide ko band kar deta hai</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300">Golden Rule</h4>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                  Udhaar baqi ho to supplier profile se payment record karo —
                  hisaab hamesha clear rahega, koi "yaad nahi" wali baat nahi hogi.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 text-white font-extrabold shadow-lg shadow-sky-500/30 hover:shadow-xl transition"
          >
            Samajh Gaya 👍
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function TipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function StatBox({
  label, value, icon: Icon, tone, highlight,
}: {
  label: string; value: string; icon: any;
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose';
  highlight?: boolean;
}) {
  const toneMap = {
    slate: 'from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white',
    sky: 'from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-sky-300 dark:border-sky-500/40 text-sky-900 dark:text-sky-200',
    emerald: 'from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
    amber: 'from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    rose: 'from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200',
  } as const;

  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-3.5 sm:p-4 ${toneMap[tone]} ${highlight ? 'shadow-lg' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[10px] uppercase tracking-wider font-extrabold">{label}</div>
      </div>
      <div className={`font-extrabold tabular-nums break-all ${highlight ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>{value}</div>
    </div>
  );
}
