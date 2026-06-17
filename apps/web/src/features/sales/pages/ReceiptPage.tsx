import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Printer, ArrowLeft, MessageCircle, X as XIcon, Package,
  User, Phone, Calendar, CreditCard, Receipt as ReceiptIcon,
  BookOpen, Tag, Ruler, Copy, Download, ShieldAlert,
  Banknote, Smartphone, Building2, Zap, CheckCircle2, AlertTriangle,
  Layers, Scissors,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@/api/sales.api';
import { formatPKR } from '@/lib/format';


type CarpetNoteInfo = {
  type: 'roll' | 'cut-piece' | null;
  reference: string;
  dimensions?: string;
  area?: string;
};

const parseCarpetNote = (note?: string | null): CarpetNoteInfo => {
  if (!note) return { type: null, reference: '' };

  // "Cut from CR-2026-0001: 12ft x 10ft = 120 sqft"
  const rollMatch = note.match(/Cut from ([\w-]+):\s*([\d.]+\s*ft\s*[xX×]\s*[\d.]+\s*ft)(?:\s*=\s*([\d.]+\s*\w+))?/);
  if (rollMatch) {
    return {
      type: 'roll',
      reference: rollMatch[1],
      dimensions: rollMatch[2],
      area: rollMatch[3],
    };
  }

  // "Cut piece CP-2026-0001 ..."
  const cutMatch = note.match(/Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+\s*ft\s*[xX×]\s*[\d.]+\s*ft))?/);
  if (cutMatch) {
    return {
      type: 'cut-piece',
      reference: cutMatch[1],
      dimensions: cutMatch[2],
    };
  }

  return { type: null, reference: '' };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatQty = (qty: number) =>
  qty.toFixed(qty % 1 === 0 ? 0 : 2);

const paymentIcons: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  JAZZCASH: Smartphone,
  EASYPAISA: Zap,
  BANK_TRANSFER: Building2,
};

const paymentLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa',
  BANK_TRANSFER: 'Bank Transfer',
};

export default function ReceiptPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: () => salesApi.getOne(id!),
    enabled: !!id,
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => salesApi.voidSale(id!, reason),
    onSuccess: () => {
      toast.success('Sale voided successfully');
      queryClient.invalidateQueries({ queryKey: ['sale-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to void sale');
    },
  });

  const handleWhatsAppShare = () => {
    if (!data?.customer?.phone) {
      toast.error('Customer phone not available');
      return;
    }
    const phone = data.customer.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;

    const lines = data.items.map((it) => {
      const variant = it.variantLink?.variant;
      const itemName = variant ? `${it.product.name} (${variant.name})` : it.product.name;
      const carpet = parseCarpetNote(it.note);
      const carpetLine = carpet.type === 'roll'
        ? `\n   📏 Cut from ${carpet.reference}${carpet.dimensions ? ` • ${carpet.dimensions}` : ''}`
        : carpet.type === 'cut-piece'
          ? `\n   ✂️ Piece ${carpet.reference}${carpet.dimensions ? ` • ${carpet.dimensions}` : ''}`
          : '';
      return `• ${itemName}${carpetLine}\n   ${formatQty(it.quantity)} ${it.product.unit} × ${formatPKR(it.price)} = ${formatPKR(it.total)}`;
    }).join('\n');

    const lines2 = [];
    lines2.push(`*${data.tenant?.name || 'Receipt'}*`);
    lines2.push('');
    lines2.push(`📋 Receipt: *${data.saleNumber}*`);
    lines2.push(`📅 ${formatDate(data.soldAt)}`);
    lines2.push('');
    lines2.push('━━━━━━━━━━━━━━━━━━━');
    lines2.push(lines);
    lines2.push('━━━━━━━━━━━━━━━━━━━');
    lines2.push('');
    lines2.push(`Subtotal: ${formatPKR(data.subtotal)}`);
    if (data.discount > 0) {
      lines2.push(`Discount: -${formatPKR(data.discount)}`);
    }
    lines2.push(`*Total: ${formatPKR(data.total)}*`);
    lines2.push(`Paid: ${formatPKR(data.paidAmount)}`);
    if (data.changeAmount > 0) {
      lines2.push(`Change: ${formatPKR(data.changeAmount)}`);
    }
    if (data.creditAmount > 0) {
      lines2.push(`💼 Udhaar: *${formatPKR(data.creditAmount)}*`);
    }
    lines2.push('');
    lines2.push('Shukriya! 🙏');

    const message = lines2.join('\n');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Receipt link copied');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex flex-col items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="font-bold text-slate-900">Receipt not found</p>
        <Link to="/sales" className="mt-4 text-sm font-bold text-brand-600 hover:underline">
          ← Back to Sales
        </Link>
      </div>
    );
  }

  const PayIcon = paymentIcons[data.paymentMethod] || CreditCard;
  const totalItems = data.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* ───── ACTION BAR ───── */}
        <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy Link</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              disabled={!data.customer?.phone}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 shadow-sm transition"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>

            {data.status !== 'VOIDED' && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for voiding this sale?');
                  if (reason !== null) voidMutation.mutate(reason);
                }}
                disabled={voidMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 shadow-sm transition"
              >
                <XIcon className="h-4 w-4" />
                Void
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 shadow-sm transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* ───── VOIDED BANNER ───── */}
        {data.status === 'VOIDED' && (
          <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-rose-100 px-5 py-4 flex items-center gap-3 print:rounded-none print:border print:bg-white">
            <div className="h-10 w-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-rose-900">SALE VOIDED</div>
              <div className="text-xs text-rose-700 mt-0.5">
                Stock aur customer credit wapis reverse ho gaye hain
              </div>
            </div>
          </div>
        )}

        {/* ───── MAIN RECEIPT CARD ───── */}
        <div className="bg-white shadow-2xl rounded-3xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          {/* Top gradient header */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-brand-800 px-8 py-6 text-white print:bg-white print:text-slate-900 print:border-b print:border-slate-200">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur print:hidden">
                  <ReceiptIcon className="h-3 w-3" />
                  Sale Receipt
                </div>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
                  {data.tenant?.name || 'Nafaa Shop'}
                </h1>
                <p className="text-sm text-white/75 mt-1 print:text-slate-600">
                  {data.tenant?.country || 'Pakistan'}
                  {data.tenant?.phone && ` • ${data.tenant.phone}`}
                </p>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 print:text-slate-500">
                  Receipt #
                </div>
                <div className="text-2xl font-extrabold mt-1 font-mono">
                  {data.saleNumber}
                </div>
                <div className="text-xs text-white/75 mt-1 print:text-slate-500">
                  {formatDate(data.soldAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Info row */}
          <div className="px-8 py-5 grid sm:grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/50">
            {/* Customer */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Customer
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {data.customer?.name || 'Walk-in Customer'}
                </div>
                {data.customer?.phone && (
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" />
                    {data.customer.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Date & Time
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {formatDate(data.soldAt)}
                </div>
                {data.createdBy && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Cashier: {data.createdBy.fullName}
                  </div>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <PayIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Payment
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {paymentLabels[data.paymentMethod] || data.paymentMethod}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {data.items.length} item{data.items.length !== 1 ? 's' : ''} • {formatQty(totalItems)} qty
                </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="px-8 py-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b-2 border-slate-200">
                    <th className="py-3 font-bold text-xs uppercase tracking-wider">Item</th>
                    <th className="py-3 font-bold text-xs uppercase tracking-wider text-center">Qty</th>
                    <th className="py-3 font-bold text-xs uppercase tracking-wider text-right">Price</th>
                    <th className="py-3 font-bold text-xs uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => {
                    const variant = item.variantLink?.variant;
                    return (
                      <tr key={item.id} className="border-b border-slate-100 align-top">
                        <td className="py-4 pr-3">
                          <div className="flex items-start gap-3">
                            {/* Variant image / icon */}
                            <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 print:hidden">
                              {variant?.imageUrl ? (
                                <img
                                  src={variant.imageUrl}
                                  alt={variant.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : variant?.colorHex ? (
                                <div
                                  className="h-full w-full"
                                  style={{ backgroundColor: variant.colorHex }}
                                />
                              ) : (
                                <Package className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900">
                                {item.product.name}
                              </div>
                              {variant && (
                                <div className="text-xs font-semibold text-violet-700 mt-0.5 inline-flex items-center gap-1.5">
                                  {variant.colorHex && (
                                    <span
                                      className="h-2.5 w-2.5 rounded-full border border-slate-300"
                                      style={{ backgroundColor: variant.colorHex }}
                                    />
                                  )}
                                  {variant.name}
                                </div>
                              )}
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.product.sku || item.product.barcode || item.product.unit}
                                {variant?.sku && ` • ${variant.sku}`}
                              </div>
                              {(() => {
                                const carpet = parseCarpetNote(item.note);
                                if (carpet.type === 'roll') {
                                  return (
                                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                                      <Layers className="h-2.5 w-2.5" />
                                      Cut from <span className="font-mono">{carpet.reference}</span>
                                      {carpet.dimensions && <span className="text-emerald-700">• {carpet.dimensions}</span>}
                                    </div>
                                  );
                                }
                                if (carpet.type === 'cut-piece') {
                                  return (
                                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-800">
                                      <Scissors className="h-2.5 w-2.5" />
                                      Piece <span className="font-mono">{carpet.reference}</span>
                                      {carpet.dimensions && <span className="text-violet-700">• {carpet.dimensions}</span>}
                                    </div>
                                  );
                                }
                                if (item.note && !carpet.type) {
                                  return (
                                    <div className="text-[10px] text-slate-500 mt-0.5 italic">
                                      {item.note}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <div className="font-bold text-slate-900">
                            {formatQty(item.quantity)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.product.unit}
                          </div>
                        </td>
                        <td className="py-4 text-right text-slate-700 font-semibold">
                          {formatPKR(item.price)}
                        </td>
                        <td className="py-4 text-right font-bold text-slate-900">
                          {formatPKR(item.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="px-8 py-6 border-t-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <div className="ml-auto max-w-md space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">{formatPKR(data.subtotal)}</span>
              </div>

              {data.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Discount
                  </span>
                  <span className="font-bold text-amber-700">-{formatPKR(data.discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-lg pt-3 border-t-2 border-slate-200">
                <span className="font-extrabold text-slate-900">TOTAL</span>
                <span className="font-extrabold text-emerald-700 text-2xl">
                  {formatPKR(data.total)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 inline-flex items-center gap-1">
                    <Banknote className="h-3 w-3" /> Paid
                  </span>
                  <span className="font-bold text-slate-900">{formatPKR(data.paidAmount)}</span>
                </div>

                {data.changeAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-700 font-semibold">Change Returned</span>
                    <span className="font-bold text-emerald-700">{formatPKR(data.changeAmount)}</span>
                  </div>
                )}

                {data.creditAmount > 0 && (
                  <div className="flex items-center justify-between text-sm rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mt-2">
                    <span className="text-amber-800 font-bold inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> Udhaar (Khata)
                    </span>
                    <span className="font-extrabold text-amber-700 text-base">
                      {formatPKR(data.creditAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer balance footer */}
          {data.customer && data.creditAmount > 0 && (
            <div className="px-8 py-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
                <div className="text-sm">
                  <span className="font-bold text-amber-900">{data.customer.name}</span>
                  <span className="text-amber-700"> ka total udhaar update ho gaya</span>
                </div>
              </div>
              <Link
                to={`/customers/${data.customer.id}`}
                className="text-xs font-bold text-amber-700 hover:underline"
              >
                View Khata →
              </Link>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-5 text-center border-t border-slate-100 bg-white">
            <div className="text-sm font-bold text-slate-900">Shukriya! 🙏</div>
            <div className="text-xs text-slate-500 mt-1">
              Powered by Nafaa POS • {data.tenant?.name}
            </div>
          </div>
        </div>

        {/* Action hint for print mode */}
        <div className="text-center text-xs text-slate-500 print:hidden">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Receipt ready • Print thermal printer ya A4 dono pe chalega
          </span>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0.5cm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
