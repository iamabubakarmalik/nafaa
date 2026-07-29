import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, X, ShoppingCart, MapPin, Phone,
  Calendar, User, CheckCircle2, ShieldAlert, Tag, Barcode,
  Share2, Copy, RefreshCw, Sparkles, Package, Gift,
  Receipt as ReceiptIcon, CreditCard, Banknote, Building2,
  Zap, Smartphone, Award, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { combosApi } from '../api/combos.api';
import { formatPKR } from '@core/lib/format';
import { FbrReceiptBadge } from '@integrations/fbr';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatDateShort = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));

type Format = 'a4' | 'thermal80' | 'thermal58';

const PAYMENT_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CASH:          { label: 'Cash',      icon: Banknote,   color: '#059669', bg: 'bg-emerald-100' },
  CARD:          { label: 'Card',      icon: CreditCard, color: '#2563eb', bg: 'bg-blue-100' },
  JAZZCASH:      { label: 'JazzCash',  icon: Smartphone, color: '#f97316', bg: 'bg-orange-100' },
  EASYPAISA:     { label: 'EasyPaisa', icon: Zap,        color: '#22c55e', bg: 'bg-green-100' },
  BANK_TRANSFER: { label: 'Bank',      icon: Building2,  color: '#7c3aed', bg: 'bg-violet-100' },
};

/**
 * ITEM GROUPER
 * Sale items backend pe combo ke andar ke individual products ke roop mein aate hain
 * (kyunki backend inventory deduct karta hai). Har item ke `note` field mein
 * "Part of combo: {combo name}" hota hai (POS ne aisa likha tha).
 *
 * Yahan hum unhein wapas group karte hain taaki receipt pe combo ka naam
 * dikhe, uske andar ke items nested rahen, aur pricing combo-level pe dikhe.
 */
type GroupedLine =
  | {
      kind: 'combo';
      id: string;
      comboName: string;
      quantity: number;
      total: number;
      originalTotal: number;
      savings: number;
      children: any[];
    }
  | {
      kind: 'item';
      id: string;
      item: any;
    };

function groupSaleItems(items: any[]): GroupedLine[] {
  const groups: Map<string, any[]> = new Map();
  const standalone: any[] = [];

  for (const it of items) {
    const note = (it.note || '').trim();
    const m = note.match(/^Part of combo:\s*(.+)$/i);
    if (m) {
      const comboName = m[1].trim();
      if (!groups.has(comboName)) groups.set(comboName, []);
      groups.get(comboName)!.push(it);
    } else {
      standalone.push(it);
    }
  }

  const grouped: GroupedLine[] = [];

  // Combo groups first
  for (const [comboName, children] of groups) {
    // Ek combo ki quantity = child items ka quantity divided by unit qty in combo.
    // Simple approach: quantity = min(child.quantity) / normalize (assume 1 per combo).
    // Better: total = sum of children totals; combo qty = 1 (or derived).
    const total = children.reduce((s, c) => s + Number(c.total || 0), 0);
    const originalTotal = children.reduce((s, c) => {
      // If child has originalPrice hidden, fall back to (product.price * quantity)
      const origPrice = Number(c.product?.price || c.price || 0);
      return s + origPrice * Number(c.quantity || 0);
    }, 0);
    const savings = Math.max(originalTotal - total, 0);

    // Derive combo qty: assume first child's quantity per single combo is 1
    // Actually simpler: display "1x Combo" if unknown, else count distinct sets
    // For now: show total items count and let children show individual qty
    grouped.push({
      kind: 'combo',
      id: `combo-${comboName}`,
      comboName,
      quantity: 1,
      total,
      originalTotal,
      savings,
      children,
    });
  }

  // Then standalone items
  for (const it of standalone) {
    grouped.push({ kind: 'item', id: it.id, item: it });
  }

  return grouped;
}

export default function RetailReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<Format>('thermal80');
  const [copied, setCopied] = useState(false);
  const isAutoOpened = searchParams.get('auto') === '1';

  const { data: sale, isLoading, refetch } = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: () => salesApi.getOne(id!),
    enabled: !!id,
  });

  useEffect(() => {
    const size = sale?.tenant?.settings?.receiptSize;
    if (size === 'THERMAL_58MM') setFormat('thermal58');
    else if (size === 'THERMAL_80MM') setFormat('thermal80');
    else if (size?.startsWith('A4')) setFormat('a4');
  }, [sale?.tenant?.settings?.receiptSize]);

  useEffect(() => {
    const autoPrint = localStorage.getItem('nafaa.pos.auto-print') === 'true';
    if (isAutoOpened && autoPrint && sale && !isLoading) {
      setTimeout(() => window.print(), 500);
    }
  }, [isAutoOpened, sale, isLoading]);

  const voidMutation = useMutation({
    mutationFn: (reason: string) => salesApi.voidSale(id!, reason),
    onSuccess: () => {
      toast.success('Sale voided');
      queryClient.invalidateQueries({ queryKey: ['sale-receipt', id] });
    },
  });

  // ═══ GROUP ITEMS: combos + standalone ═══
  const groupedLines = useMemo(() => {
    if (!sale?.items) return [];
    return groupSaleItems(sale.items);
  }, [sale]);

  const totalQty = useMemo(() => {
    if (!sale) return 0;
    return sale.items.reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);
  }, [sale]);

  const totalSavings = useMemo(() => {
    return groupedLines
      .filter((g): g is Extract<GroupedLine, { kind: 'combo' }> => g.kind === 'combo')
      .reduce((s, g) => s + g.savings, 0);
  }, [groupedLines]);

  const comboCount = groupedLines.filter((g) => g.kind === 'combo').length;
  const itemLineCount = groupedLines.length;

  // ═══ WHATSAPP MESSAGE ═══
  const handleWhatsApp = () => {
    if (!sale?.customer?.phone) return toast.error('Customer phone not available');
    const phone = sale.customer.phone.replace(/[^0-9]/g, '');
    const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const shopName = sale.tenant?.settings?.shopName || sale.tenant?.name || 'Our Store';

    const lines: string[] = [];
    lines.push(`🛒 *${shopName}*`);
    lines.push('');
    lines.push(`Assalam-o-Alaikum ${sale.customer.name}!`);
    lines.push('Thanks for shopping with us 🙏');
    lines.push('');
    lines.push(`*Receipt:* ${sale.saleNumber}`);
    lines.push(`*Date:* ${formatDate(sale.soldAt)}`);
    lines.push('');
    lines.push('*Items:*');

    let idx = 1;
    for (const g of groupedLines) {
      if (g.kind === 'combo') {
        lines.push(`${idx}. 🎁 *${g.comboName}* — ${formatPKR(g.total)}`);
        for (const child of g.children) {
          lines.push(`   • ${child.product.name} × ${child.quantity}`);
        }
        if (g.savings > 0) lines.push(`   💰 _Saved ${formatPKR(g.savings)}_`);
        idx++;
      } else {
        const it = g.item;
        lines.push(`${idx}. ${it.product.name} × ${it.quantity} ${it.product.unit} = ${formatPKR(it.total)}`);
        idx++;
      }
    }

    lines.push('');
    lines.push(`Subtotal: ${formatPKR(sale.subtotal)}`);
    if (sale.discount > 0) lines.push(`Discount: -${formatPKR(sale.discount)}`);
    if (totalSavings > 0) lines.push(`Combo Savings: -${formatPKR(totalSavings)}`);
    lines.push(`*TOTAL: ${formatPKR(sale.total)}*`);
    if (sale.creditAmount > 0) lines.push(`Udhaar Baqi: ${formatPKR(sale.creditAmount)}`);
    lines.push('');
    lines.push('_Visit again!_ ❤️');

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const copyReceiptNumber = () => {
    if (!sale) return;
    navigator.clipboard.writeText(sale.saleNumber);
    setCopied(true);
    toast.success('Receipt # copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = async () => {
    if (!sale || !navigator.share) return toast.error('Sharing not supported');
    try {
      await navigator.share({
        title: `Receipt ${sale.saleNumber}`,
        text: `${sale.tenant?.name || 'Shop'} — ${formatPKR(sale.total)} • ${itemLineCount} items`,
        url: window.location.href,
      });
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-14 w-14 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm font-bold text-slate-500">Receipt loading...</p>
        </div>

        <FbrReceiptBadge saleId={(sale as any)?.id} variant="thermal" />

      
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-slate-400" />
        </div>
        <p className="mt-4 font-extrabold text-slate-700 text-lg">Receipt not found</p>
        <Link to="/sales" className="mt-3 inline-flex items-center gap-1 text-sky-600 hover:underline font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Sales
        </Link>
      </div>
    );
  }

  const settings = sale.tenant?.settings;
  const shopName = settings?.shopName || sale.tenant?.name || 'Our Store';
  const shopAddress = [settings?.shopAddress, settings?.shopCity].filter(Boolean).join(', ');
  const shopPhone = settings?.shopPhone || sale.tenant?.phone || '';
  const logoUrl = settings?.logoUrl;
  const receiptFooter = settings?.receiptFooter;
  const isVoided = sale.status === 'VOIDED';
  const payMeta = PAYMENT_META[sale.paymentMethod] || PAYMENT_META.CASH;
  const PayIcon = payMeta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-cyan-50/30 py-4 sm:py-6 px-3 sm:px-4 print:bg-white print:py-0 print:px-0">
      <div className={`mx-auto space-y-3 sm:space-y-4 ${format === 'a4' ? 'max-w-4xl' : 'max-w-md'}`}>

        {/* ═══ Success banner (only if auto-opened from POS) ═══ */}
        {isAutoOpened && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 sm:px-5 py-3 flex items-center gap-3 shadow-xl print:hidden animate-in slide-in-from-top duration-300">
            <div className="h-11 w-11 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm sm:text-base">Sale Complete! 🎉</div>
              <div className="text-[11px] sm:text-xs text-white/90">
                {comboCount > 0 && <span className="font-extrabold">{comboCount} combo{comboCount > 1 ? 's' : ''} • </span>}
                Print, WhatsApp, ya share karo
              </div>
            </div>
            <Link to="/pos" className="shrink-0 h-10 px-3 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-xs font-extrabold inline-flex items-center gap-1 transition">
              <Sparkles className="h-3 w-3" /> Nayi Sale
            </Link>
          </div>
        )}

        {/* ═══ Toolbar ═══ */}
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 sm:p-3 print:hidden">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => navigate('/sales')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-2 text-xs sm:text-sm font-extrabold text-slate-700 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Format switcher */}
              <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm">
                {(['a4', 'thermal80', 'thermal58'] as Format[]).map((f, i) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-2.5 sm:px-3 py-2 text-[10px] sm:text-xs font-extrabold transition ${
                      format === f ? 'bg-sky-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                    } ${i > 0 ? 'border-l-2 border-slate-200' : ''}`}
                  >
                    {f === 'a4' ? 'A4' : f === 'thermal80' ? '80mm' : '58mm'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => refetch()}
                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              {typeof navigator !== 'undefined' && (navigator as any).share && (
                <button
                  onClick={shareNative}
                  className="h-9 w-9 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white flex items-center justify-center transition"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={handleWhatsApp}
                disabled={!sale.customer?.phone}
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 px-3 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm disabled:opacity-50 transition"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {!isVoided && (
                <button
                  onClick={() => { const r = prompt('Void reason?'); if (r !== null) voidMutation.mutate(r); }}
                  className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 flex items-center justify-center transition"
                  title="Void"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 active:scale-95 px-3 sm:px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-md transition"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Voided banner */}
        {isVoided && (
          <div className="rounded-2xl border-4 border-rose-400 bg-rose-50 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 print:hidden">
            <div className="h-11 w-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="font-extrabold text-rose-900 text-lg">SALE VOIDED</div>
              <div className="text-xs text-rose-700 font-bold">Ye receipt cancel ho gayi hai</div>
            </div>
          </div>
        )}

        {/* ═══ A4 RECEIPT ═══ */}
        {format === 'a4' && (
          <div className="receipt-a4 bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-2 border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white px-4 sm:px-8 py-5 sm:py-7 print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 overflow-hidden">
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl print:hidden" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl print:hidden" />

              <div className="relative flex items-start justify-between gap-4 sm:gap-6 flex-wrap">
                <div className="flex items-start gap-3 sm:gap-4">
                  {logoUrl && (
                    <img src={logoUrl} alt="" className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover bg-white p-1.5 shadow-lg shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 print:hidden">
                      <ReceiptIcon className="h-3 w-3" /> Sales Receipt
                    </div>
                    <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight break-words">{shopName}</h1>
                    <div className="mt-3 space-y-1 text-xs text-white/85 print:text-slate-600">
                      {shopAddress && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{shopAddress}</span>
                        </div>
                      )}
                      {shopPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          {shopPhone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right w-full sm:w-auto">
                  <div className="text-[10px] uppercase tracking-widest text-white/60 print:text-slate-500">Receipt #</div>
                  <button
                    onClick={copyReceiptNumber}
                    className="mt-1 inline-flex items-center gap-1.5 group print:pointer-events-none"
                  >
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono">{sale.saleNumber}</span>
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300 print:hidden" />
                    ) : (
                      <Copy className="h-4 w-4 opacity-60 group-hover:opacity-100 print:hidden" />
                    )}
                  </button>
                  <div className="text-xs text-white/85 mt-1 print:text-slate-500 flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />{formatDate(sale.soldAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer + Summary strip */}
            <div className="px-4 sm:px-8 py-3 sm:py-4 border-b-2 border-slate-100 bg-slate-50/50 grid sm:grid-cols-3 gap-3 print:bg-white">
              {sale.customer && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Customer</div>
                    <div className="font-extrabold text-base sm:text-lg truncate">{sale.customer.name}</div>
                    {sale.customer.phone && <div className="text-xs sm:text-sm text-slate-600 font-bold">{sale.customer.phone}</div>}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Items</div>
                  <div className="font-extrabold text-base sm:text-lg">
                    {itemLineCount} <span className="text-slate-400 font-normal">•</span> {totalQty.toFixed(totalQty % 1 === 0 ? 0 : 1)} qty
                    {comboCount > 0 && (
                      <span className="ml-2 text-sm text-violet-700 inline-flex items-center gap-1">
                        <Gift className="h-3.5 w-3.5" /> {comboCount} combo
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-xl ${payMeta.bg} flex items-center justify-center shrink-0 print:bg-slate-100`}>
                  <PayIcon className="h-4 w-4" style={{ color: payMeta.color }} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Payment</div>
                  <div className="font-extrabold text-base sm:text-lg" style={{ color: payMeta.color }}>{payMeta.label}</div>
                </div>
              </div>
            </div>

            {/* Items — grouped by combo */}
            <div className="px-4 sm:px-8 py-4 sm:py-6">
              {/* Mobile card view */}
              <div className="sm:hidden space-y-2">
                {groupedLines.map((g, idx) => (
                  <GroupedLineCardMobile key={g.id} line={g} idx={idx + 1} />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b-2 border-slate-200 bg-gradient-to-r from-sky-50 to-cyan-50 print:bg-slate-100">
                        <th className="py-3 px-3 font-extrabold text-[10px] uppercase text-slate-700 w-12">#</th>
                        <th className="py-3 px-3 font-extrabold text-[10px] uppercase text-slate-700">Item</th>
                        <th className="py-3 px-3 font-extrabold text-[10px] uppercase text-slate-700 text-center w-24">Qty</th>
                        <th className="py-3 px-3 font-extrabold text-[10px] uppercase text-slate-700 text-right w-28">Rate</th>
                        <th className="py-3 px-3 font-extrabold text-[10px] uppercase text-slate-700 text-right w-32">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedLines.map((g, idx) => (
                        <GroupedLineRow key={g.id} line={g} idx={idx + 1} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-t-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white print:bg-white">
              <div className="sm:ml-auto sm:max-w-md space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-bold">Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatPKR(sale.subtotal)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-violet-700 inline-flex items-center gap-1 font-bold">
                      <Gift className="h-3 w-3" /> Combo Bachat
                    </span>
                    <span className="font-bold text-violet-700 tabular-nums">-{formatPKR(totalSavings)}</span>
                  </div>
                )}
                {sale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 inline-flex items-center gap-1 font-bold">
                      <Tag className="h-3 w-3" /> Discount
                    </span>
                    <span className="font-bold text-amber-700 tabular-nums">-{formatPKR(sale.discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base sm:text-lg pt-3 border-t-2 border-slate-300">
                  <span className="font-extrabold text-slate-900">GRAND TOTAL</span>
                  <span className="font-extrabold text-sky-700 text-2xl sm:text-3xl tabular-nums">{formatPKR(sale.total)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-bold">Paid ({payMeta.label})</span>
                    <span className="font-bold tabular-nums">{formatPKR(sale.paidAmount)}</span>
                  </div>
                  {sale.changeAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700 font-bold">Change</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatPKR(sale.changeAmount)}</span>
                    </div>
                  )}
                  {sale.creditAmount > 0 && (
                    <div className="flex justify-between rounded-xl bg-amber-50 border-2 border-amber-300 px-3 py-2 mt-2 print:bg-white">
                      <span className="text-amber-800 font-extrabold text-sm inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Udhaar Baqi
                      </span>
                      <span className="font-extrabold text-amber-700 text-base sm:text-lg tabular-nums">{formatPKR(sale.creditAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-8 py-4 sm:py-5 text-center border-t-2 border-double border-slate-300 bg-gradient-to-br from-sky-50 to-cyan-50 print:bg-white">
              {totalSavings > 0 && (
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-violet-100 border-2 border-violet-300 px-3 py-1.5 print:hidden">
                  <Award className="h-4 w-4 text-violet-700" />
                  <span className="text-sm font-extrabold text-violet-900">
                    Aap ne aaj {formatPKR(totalSavings)} bachaye! 🎉
                  </span>
                </div>
              )}
              {receiptFooter && <div className="text-sm italic text-slate-700 mb-2">{receiptFooter}</div>}
              <div className="text-base sm:text-lg font-extrabold text-slate-900">🛒 Shukriya! Visit Again 🙏</div>
              <div className="text-[10px] text-slate-400 mt-2">Powered by Nafaa POS</div>
            </div>
          </div>
        )}

        {/* ═══ THERMAL RECEIPT ═══ */}
        {(format === 'thermal58' || format === 'thermal80') && (
          <div className="flex justify-center">
            <div
              className={`receipt-thermal bg-white shadow-2xl print:shadow-none ${format === 'thermal58' ? 'w-[58mm]' : 'w-[80mm]'}`}
              style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
            >
              <div className={`${format === 'thermal58' ? 'p-2 text-[10px]' : 'p-3 text-[11px]'} leading-tight`}>
                {/* Header */}
                <div className="text-center mb-2">
                  {logoUrl && (
                    <img src={logoUrl} alt="" className={`mx-auto mb-2 object-contain ${format === 'thermal58' ? 'h-12 w-12' : 'h-14 w-14'}`} />
                  )}
                  <div className={`font-extrabold ${format === 'thermal58' ? 'text-sm' : 'text-base'}`}>{shopName.toUpperCase()}</div>
                  {shopAddress && <div className="text-[9px] mt-0.5">{shopAddress}</div>}
                  {shopPhone && <div className="text-[9px]">📞 {shopPhone}</div>}
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between"><span className="font-bold">Receipt #</span><span className="font-bold">{sale.saleNumber}</span></div>
                  <div className="flex justify-between"><span>Date:</span><span>{formatDateShort(sale.soldAt)}</span></div>
                </div>

                {sale.customer && (
                  <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                    <div className="flex justify-between"><span className="font-bold">Customer:</span><span className="font-bold">{sale.customer.name}</span></div>
                    {sale.customer.phone && <div className="flex justify-between"><span>Phone:</span><span>{sale.customer.phone}</span></div>}
                  </div>
                )}

                {/* Items — grouped by combo */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  {groupedLines.map((g, idx) => (
                    <ThermalLine key={g.id} line={g} idx={idx + 1} compact={format === 'thermal58'} />
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{formatPKR(sale.subtotal)}</span></div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between">
                      <span>Combo Save:</span>
                      <span>-{formatPKR(totalSavings)}</span>
                    </div>
                  )}
                  {sale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatPKR(sale.discount)}</span></div>}
                  <div className={`flex justify-between border-t border-double border-slate-700 mt-1 pt-1 font-extrabold ${format === 'thermal58' ? 'text-xs' : 'text-sm'}`}>
                    <span>TOTAL:</span><span>{formatPKR(sale.total)}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between"><span>Paid ({payMeta.label}):</span><span className="font-bold">{formatPKR(sale.paidAmount)}</span></div>
                  {sale.changeAmount > 0 && <div className="flex justify-between"><span>Change:</span><span className="font-bold">{formatPKR(sale.changeAmount)}</span></div>}
                  {sale.creditAmount > 0 && <div className="flex justify-between font-bold"><span>UDHAAR:</span><span>{formatPKR(sale.creditAmount)}</span></div>}
                </div>

                {/* Summary */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-2 text-center text-[9px]">
                  {itemLineCount} lines • {totalQty.toFixed(totalQty % 1 === 0 ? 0 : 1)} qty
                  {comboCount > 0 && <> • {comboCount} combo</>}
                </div>

                {totalSavings > 0 && (
                  <div className="text-center text-[9px] font-bold border border-slate-400 border-dashed rounded p-1 mb-2">
                    🎁 Aap ne {formatPKR(totalSavings)} bachaye!
                  </div>
                )}

                {receiptFooter && <div className="text-center text-[9px] italic border-t border-dashed border-slate-400 pt-1">{receiptFooter}</div>}
                <div className="text-center font-bold mt-2">🛒 Shukriya! 🙏</div>
                <div className="text-center text-[8px] mt-1 text-slate-600">Powered by Nafaa POS</div>

                {isVoided && <div className="mt-2 border-2 border-rose-600 text-rose-600 font-extrabold text-center py-1">*** VOIDED ***</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: ${format === 'thermal58' ? '58mm auto' : format === 'thermal80' ? '80mm auto' : 'A4'}; margin: ${format === 'a4' ? '8mm' : '0mm'}; }
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .receipt-thermal { width: ${format === 'thermal58' ? '58mm' : '80mm'} !important; box-shadow: none !important; margin: 0 !important; }
          .receipt-a4 { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/* ══════════ COMPONENTS ══════════ */

// Desktop table row (a combo or a standalone item)
function GroupedLineRow({ line, idx }: { line: GroupedLine; idx: number }) {
  if (line.kind === 'combo') {
    return (
      <>
        <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50 print:bg-slate-50">
          <td className="py-3 px-3 align-top">
            <div className="h-7 w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center font-extrabold text-xs">
              {idx}
            </div>
          </td>
          <td className="py-3 px-3" colSpan={3}>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 print:bg-slate-200">
                <Gift className="h-4 w-4" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  {line.comboName}
                  <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider">
                    Combo
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-bold">
                  {line.children.length} items inside
                </div>
              </div>
            </div>
            <div className="ml-10 mt-2 space-y-0.5">
              {line.children.map((child) => (
                <div key={child.id} className="text-xs text-slate-600 font-semibold flex items-baseline gap-2">
                  <span className="text-slate-400">•</span>
                  <span className="flex-1">{child.product.name}</span>
                  <span className="tabular-nums font-bold text-slate-700">× {child.quantity} {child.product.unit}</span>
                </div>
              ))}
            </div>
          </td>
          <td className="py-3 px-3 text-right align-top">
            <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(line.total)}</div>
            {line.savings > 0 && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-violet-700 bg-violet-100 rounded-md px-1.5 py-0.5 print:bg-slate-100">
                <Sparkles className="h-2.5 w-2.5" />
                Saved {formatPKR(line.savings)}
              </div>
            )}
          </td>
        </tr>
      </>
    );
  }

  const it = line.item;
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="py-3 px-3">
        <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-extrabold text-xs">
          {idx}
        </div>
      </td>
      <td className="py-3 px-3">
        <div className="font-extrabold text-slate-900">{it.product.name}</div>
        {(it.product.sku || it.product.barcode) && (
          <div className="text-[10px] text-slate-500 font-mono inline-flex items-center gap-1 mt-0.5">
            <Barcode className="h-2.5 w-2.5" />
            {it.product.sku || it.product.barcode}
          </div>
        )}
      </td>
      <td className="py-3 px-3 text-center">
        <div className="font-extrabold tabular-nums">{it.quantity}</div>
        <div className="text-[9px] text-slate-500 uppercase">{it.product.unit}</div>
      </td>
      <td className="py-3 px-3 text-right font-bold tabular-nums">{formatPKR(it.price)}</td>
      <td className="py-3 px-3 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(it.total)}</td>
    </tr>
  );
}

// Mobile card (combo or single item)
function GroupedLineCardMobile({ line, idx }: { line: GroupedLine; idx: number }) {
  if (line.kind === 'combo') {
    return (
      <div className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-3">
        <div className="flex items-start gap-2">
          <div className="h-6 w-6 rounded-lg bg-violet-600 text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
            {idx}
          </div>
          <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-slate-900 text-sm">{line.comboName}</span>
              <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[8px] font-extrabold uppercase tracking-wider">
                Combo
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold">
              {line.children.length} items inside
            </div>
          </div>
        </div>
        <div className="mt-2 pl-10 space-y-0.5">
          {line.children.map((child) => (
            <div key={child.id} className="text-[11px] text-slate-600 font-semibold flex items-baseline gap-1.5">
              <span className="text-slate-400">•</span>
              <span className="flex-1 truncate">{child.product.name}</span>
              <span className="tabular-nums font-bold text-slate-700 shrink-0">× {child.quantity}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-violet-200 flex items-center justify-between">
          {line.savings > 0 ? (
            <span className="text-[10px] font-extrabold text-violet-700 inline-flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              Saved {formatPKR(line.savings)}
            </span>
          ) : (
            <span />
          )}
          <span className="font-extrabold text-emerald-700 text-base tabular-nums">{formatPKR(line.total)}</span>
        </div>
      </div>
    );
  }

  const it = line.item;
  return (
    <div className="rounded-2xl border-2 border-slate-200 p-3">
      <div className="flex items-start gap-2">
        <div className="h-6 w-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-extrabold shrink-0">
          {idx}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-slate-900 text-sm">{it.product.name}</div>
          {(it.product.sku || it.product.barcode) && (
            <div className="text-[10px] text-slate-500 font-mono inline-flex items-center gap-1 mt-0.5">
              <Barcode className="h-2.5 w-2.5" />
              {it.product.sku || it.product.barcode}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-600">
          {it.quantity} {it.product.unit} × {formatPKR(it.price)}
        </span>
        <span className="font-extrabold text-emerald-700 text-base tabular-nums">{formatPKR(it.total)}</span>
      </div>
    </div>
  );
}

// Thermal receipt line (combo or item)
function ThermalLine({ line, idx, compact }: { line: GroupedLine; idx: number; compact: boolean }) {
  if (line.kind === 'combo') {
    return (
      <div className="mb-1.5">
        <div className={`font-bold ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {idx}. 🎁 {line.comboName}
        </div>
        {line.children.map((child) => (
          <div key={child.id} className={`pl-3 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            • {child.product.name} × {child.quantity} {child.product.unit}
          </div>
        ))}
        <div className="flex justify-between pl-3 font-bold mt-0.5">
          <span>{line.savings > 0 ? `Saved ${formatPKR(line.savings)}` : ''}</span>
          <span>{formatPKR(line.total)}</span>
        </div>
      </div>
    );
  }

  const it = line.item;
  return (
    <div className="mb-0.5">
      <div className={`font-bold ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {idx}. {it.product.name}
      </div>
      <div className="flex justify-between pl-2">
        <span>{it.quantity} {it.product.unit} × {formatPKR(it.price)}</span>
        <span className="font-bold">{formatPKR(it.total)}</span>
      </div>
    </div>
  );
}
