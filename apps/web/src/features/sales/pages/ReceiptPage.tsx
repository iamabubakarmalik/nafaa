import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Printer, ArrowLeft, MessageCircle, X as XIcon, Package,
  User, Phone, Calendar, CreditCard, Receipt as ReceiptIcon,
  BookOpen, Tag, Copy, ShieldAlert, MapPin, Mail, Globe,
  Banknote, Smartphone, Building2, Zap, CheckCircle2, AlertTriangle,
  Layers, Scissors, FileText, Hash, Award, Building, ShieldCheck,
  Share2, Download, QrCode, Star, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@/api/sales.api';
import { formatPKR, formatPKRFull } from '@/lib/format';

type CarpetNoteInfo = {
  type: 'roll' | 'cut-piece' | null;
  reference: string;
  dimensions?: string;
  area?: string;
  customRate?: string;
};

const parseCarpetNote = (note?: string | null): CarpetNoteInfo => {
  if (!note) return { type: null, reference: '' };
  const rollMatch = note.match(
    /Cut from ([\w-]+):\s*([\d.]+\s*ft\s*[xX×]\s*[\d.]+\s*ft(?:\s+[\d.]+\s*in)?)(?:\s*=\s*([\d.]+\s*\w+))?(?:\s*@\s*(Rs\s*[\d.]+\/sqft.*))?/
  );
  if (rollMatch) {
    return {
      type: 'roll',
      reference: rollMatch[1],
      dimensions: rollMatch[2],
      area: rollMatch[3],
      customRate: rollMatch[4],
    };
  }
  const cutMatch = note.match(/Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+\s*ft\s*[xX×]\s*[\d.]+\s*ft))?/);
  if (cutMatch) {
    return { type: 'cut-piece', reference: cutMatch[1], dimensions: cutMatch[2] };
  }
  return { type: null, reference: '' };
};

const PTA_LABELS: Record<string, string> = {
  APPROVED: 'PTA Approved',
  NON_PTA: 'Non-PTA',
  PATCH: 'PTA Patched',
  PENDING: 'PTA Pending',
  EXEMPT: 'PTA Exempt',
};

const PTA_BADGE_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  NON_PTA: 'bg-rose-50 border-rose-300 text-rose-800',
  PATCH: 'bg-amber-50 border-amber-300 text-amber-800',
  PENDING: 'bg-blue-50 border-blue-300 text-blue-800',
  EXEMPT: 'bg-slate-50 border-slate-300 text-slate-800',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));

const formatQty = (qty: number) => qty.toFixed(qty % 1 === 0 ? 0 : 2);

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone, EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

const paymentLabels: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank Transfer',
};

type ReceiptFormat = 'a4' | 'thermal80' | 'thermal58';

export default function ReceiptPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<ReceiptFormat>('a4');

  const { data, isLoading } = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: () => salesApi.getOne(id!),
    enabled: !!id,
  });

  useMemo(() => {
    const size = data?.tenant?.settings?.receiptSize;
    if (size === 'THERMAL_58MM') setFormat('thermal58');
    else if (size === 'THERMAL_80MM') setFormat('thermal80');
    else if (size?.startsWith('A4')) setFormat('a4');
  }, [data?.tenant?.settings?.receiptSize]);

  const voidMutation = useMutation({
    mutationFn: (reason: string) => salesApi.voidSale(id!, reason),
    onSuccess: () => {
      toast.success('Sale voided successfully');
      queryClient.invalidateQueries({ queryKey: ['sale-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to void sale'),
  });

  // ═══ BEAUTIFUL WHATSAPP MESSAGE ═══
  const handleWhatsAppShare = () => {
    if (!data?.customer?.phone) {
      toast.error('Customer phone not available');
      return;
    }
    const phone = data.customer.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;

    const shopName = data.tenant?.settings?.shopName || data.tenant?.name || 'Our Shop';
    const shopPhone = data.tenant?.settings?.shopPhone || data.tenant?.phone || '';
    const shopWhatsapp = data.tenant?.settings?.shopWhatsapp;
    const shopAddress = data.tenant?.settings?.shopAddress || '';
    const shopWebsite = data.tenant?.settings?.shopWebsite;
    const customerName = data.customer.name || 'Valued Customer';

    const lines: string[] = [];

    // ─── BEAUTIFUL HEADER ───
    lines.push('╔═══════════════════════╗');
    lines.push(`║   *${shopName.toUpperCase()}*   ║`);
    lines.push('╚═══════════════════════╝');
    lines.push('');
    lines.push(`Assalam-o-Alaikum, *${customerName}* 🌟`);
    lines.push('');
    lines.push('Shukriya hamare saath shopping karne ka! Aap ki kharidari ki tafseel:');
    lines.push('');

    // ─── RECEIPT DETAILS BOX ───
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`🧾 *Receipt:* ${data.saleNumber}`);
    lines.push(`📅 *Date:* ${formatDate(data.soldAt)}`);
    if (data.shop) lines.push(`🏪 *Branch:* ${data.shop.name}`);
    if (data.createdBy) lines.push(`👤 *Cashier:* ${data.createdBy.fullName}`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    // ─── ITEMS ───
    lines.push('🛍️ *Aap ki Kharidari:*');
    lines.push('');

    data.items.forEach((it, idx) => {
      const variant = it.variantLink?.variant;
      const itemName = variant ? `${it.product.name} (${variant.name})` : it.product.name;
      const carpet = parseCarpetNote(it.note);

      lines.push(`*${idx + 1}.* ${itemName}`);

      // Carpet info
      if (carpet.type === 'roll') {
        lines.push(`   🧶 Cut from Roll: \`${carpet.reference}\``);
        if (carpet.dimensions) lines.push(`   📐 Size: ${carpet.dimensions}`);
        if (carpet.customRate) lines.push(`   💰 ${carpet.customRate}`);
      } else if (carpet.type === 'cut-piece') {
        lines.push(`   ✂️ Cut Piece: \`${carpet.reference}\``);
        if (carpet.dimensions) lines.push(`   📐 Size: ${carpet.dimensions}`);
      }

      // IMEI for mobiles
      const itemImeis = (it as any).imeis || [];
      itemImeis.forEach((imei: any) => {
        lines.push(`   📱 *IMEI:* \`${imei.imei1}\``);
        if (imei.ptaStatus) {
          const ptaEmoji = imei.ptaStatus === 'APPROVED' ? '✅' : imei.ptaStatus === 'NON_PTA' ? '⚠️' : '🛡️';
          lines.push(`   ${ptaEmoji} ${PTA_LABELS[imei.ptaStatus] || imei.ptaStatus}`);
        }
        if (imei.warrantyMonths > 0) {
          lines.push(`   ⏱️ Warranty: ${imei.warrantyMonths} months`);
        }
        if (imei.color) {
          lines.push(`   🎨 Color: ${imei.color}`);
        }
      });

      lines.push(`   ${formatQty(it.quantity)} ${it.product.unit} × ${formatPKR(it.price)} = *${formatPKR(it.total)}*`);
      lines.push('');
    });

    // ─── PAYMENT SUMMARY ───
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('💵 *Payment Summary:*');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Subtotal:        ${formatPKR(data.subtotal)}`);
    if (data.discount > 0) {
      lines.push(`Discount:        -${formatPKR(data.discount)} 🎉`);
    }
    lines.push('');
    lines.push(`💰 *GRAND TOTAL:* *${formatPKR(data.total)}*`);
    lines.push('');
    lines.push(`Paid (${paymentLabels[data.paymentMethod]}): ${formatPKR(data.paidAmount)}`);
    if (data.changeAmount > 0) {
      lines.push(`✅ Change Returned: ${formatPKR(data.changeAmount)}`);
    }
    if (data.creditAmount > 0) {
      lines.push('');
      lines.push(`📒 *Udhaar (Khata):* *${formatPKR(data.creditAmount)}*`);
      lines.push('   _Please pay at your earliest convenience_');
    }
    lines.push('');

    // ─── THANK YOU MESSAGE ───
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🙏 *Shukriya for your business!*');
    lines.push('');
    lines.push('Hamain umeed hai aap hamari service se khush hain. Phir tashreef laiye ga! 😊');
    lines.push('');

    // ─── CONTACT INFO ───
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📍 *Visit Us:*');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    if (shopAddress) lines.push(`📌 ${shopAddress}`);
    if (shopPhone) lines.push(`☎️ ${shopPhone}`);
    if (shopWhatsapp && shopWhatsapp !== shopPhone) {
      lines.push(`💬 WhatsApp: ${shopWhatsapp}`);
    }
    if (shopWebsite) lines.push(`🌐 ${shopWebsite}`);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('_Powered by Nafaa POS_ ✨');

    const message = lines.join('\n');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('WhatsApp opened with receipt');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Receipt link copied to clipboard');
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
        <Link to="/sales" className="mt-4 text-sm font-bold text-emerald-600 hover:underline">
          ← Back to Sales
        </Link>
      </div>
    );
  }

  const settings = data.tenant?.settings;
  const shopName = settings?.shopName || data.tenant?.name || 'My Shop';
  const legalName = settings?.legalName;
  const shopAddress = [settings?.shopAddress, settings?.shopCity, settings?.shopProvince].filter(Boolean).join(', ');
  const shopPhone = settings?.shopPhone || data.tenant?.phone || '';
  const shopWhatsapp = settings?.shopWhatsapp;
  const shopEmail = settings?.shopEmail;
  const shopWebsite = settings?.shopWebsite;
  const logoUrl = settings?.logoUrl;
  const taxNumber = settings?.taxNumber;
  const taxLabel = settings?.taxLabel || 'GST';
  const showLogo = settings?.receiptShowLogo ?? true;
  const showCustomer = settings?.receiptShowCustomer ?? true;
  const receiptHeader = settings?.receiptHeader;
  const receiptFooter = settings?.receiptFooter;

  const PayIcon = paymentIcons[data.paymentMethod] || CreditCard;
  const totalItems = data.items.reduce((sum, it) => sum + it.quantity, 0);
  const isVoided = data.status === 'VOIDED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 px-4 print:bg-white print:py-0 print:px-0">
      <div className={`mx-auto space-y-4 ${format === 'a4' ? 'max-w-4xl' : 'max-w-md'}`}>
        {/* ═══ ACTION BAR ═══ */}
        <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setFormat('a4')}
                className={`px-3 py-2.5 text-xs font-bold transition ${
                  format === 'a4' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setFormat('thermal80')}
                className={`px-3 py-2.5 text-xs font-bold transition border-l-2 border-slate-200 ${
                  format === 'thermal80' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setFormat('thermal58')}
                className={`px-3 py-2.5 text-xs font-bold transition border-l-2 border-slate-200 ${
                  format === 'thermal58' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy Link</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              disabled={!data.customer?.phone}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-green-500/30 transition disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              Send WhatsApp
            </button>

            {!isVoided && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for voiding this sale?');
                  if (reason !== null) voidMutation.mutate(reason);
                }}
                disabled={voidMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                <XIcon className="h-4 w-4" />
                Void
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/30 transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* ═══ VOIDED BANNER ═══ */}
        {isVoided && (
          <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-rose-100 px-5 py-4 flex items-center gap-3 print:rounded-none print:border print:bg-white">
            <div className="h-10 w-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-rose-900">SALE VOIDED</div>
              <div className="text-xs text-rose-700 mt-0.5">Stock aur customer credit wapis reverse ho gaye hain</div>
            </div>
          </div>
        )}

        {/* ═══ THERMAL RECEIPT ═══ */}
        {(format === 'thermal58' || format === 'thermal80') && (
          <div
            className={`receipt-thermal bg-white shadow-2xl print:shadow-none mx-auto ${
              format === 'thermal58' ? 'w-[58mm]' : 'w-[80mm]'
            }`}
            style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
          >
            <div className={`${format === 'thermal58' ? 'p-2 text-[10px]' : 'p-3 text-[11px]'} leading-tight`}>
              <div className="text-center mb-2">
                {showLogo && logoUrl && (
                  <img
                    src={logoUrl}
                    alt={shopName}
                    className={`mx-auto mb-2 object-contain ${format === 'thermal58' ? 'h-12 w-12' : 'h-14 w-14'}`}
                  />
                )}
                <div className={`font-extrabold ${format === 'thermal58' ? 'text-sm' : 'text-base'}`}>
                  {shopName.toUpperCase()}
                </div>
                {legalName && <div className="text-[9px] text-slate-600">{legalName}</div>}
                {shopAddress && <div className="text-[9px] mt-0.5">{shopAddress}</div>}
                {(shopPhone || shopWhatsapp) && (
                  <div className="text-[9px] mt-0.5">
                    {shopPhone && `📞 ${shopPhone}`}
                    {shopWhatsapp && shopWhatsapp !== shopPhone && ` | 📱 ${shopWhatsapp}`}
                  </div>
                )}
                {taxNumber && (
                  <div className="text-[9px] mt-0.5 font-bold">{taxLabel} #: {taxNumber}</div>
                )}
              </div>

              {receiptHeader && (
                <div className="text-center text-[9px] italic border-y border-dashed border-slate-400 py-1 mb-2">
                  {receiptHeader}
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between">
                  <span className="font-bold">Receipt #</span>
                  <span className="font-bold">{data.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDateShort(data.soldAt)}</span>
                </div>
                {data.createdBy && (
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{data.createdBy.fullName}</span>
                  </div>
                )}
                {data.shop && (
                  <div className="flex justify-between">
                    <span>Branch:</span>
                    <span>{data.shop.name}</span>
                  </div>
                )}
              </div>

              {showCustomer && data.customer && (
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between">
                    <span className="font-bold">Customer:</span>
                    <span className="font-bold">{data.customer.name}</span>
                  </div>
                  {data.customer.phone && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{data.customer.phone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="font-bold text-center mb-1">ITEMS</div>
                {data.items.map((item, idx) => {
                  const variant = item.variantLink?.variant;
                  const itemName = variant ? `${item.product.name} (${variant.name})` : item.product.name;
                  const carpet = parseCarpetNote(item.note);

                  return (
                    <div key={item.id} className="mb-1.5">
                      <div className="font-bold">{idx + 1}. {itemName}</div>

                      {carpet.type === 'roll' && (
                        <div className="text-[9px] pl-2">
                          Cut from {carpet.reference}
                          {carpet.dimensions && ` ${carpet.dimensions}`}
                        </div>
                      )}
                      {carpet.type === 'cut-piece' && (
                        <div className="text-[9px] pl-2">
                          Piece {carpet.reference}
                          {carpet.dimensions && ` ${carpet.dimensions}`}
                        </div>
                      )}

                      {(item as any).imeis && (item as any).imeis.length > 0 && (
                        <div className="pl-2 space-y-0.5">
                          {(item as any).imeis.map((imei: any) => (
                            <div key={imei.id} className="text-[9px] border-l-2 border-slate-400 pl-1">
                              <div className="font-bold">IMEI: {imei.imei1}</div>
                              {imei.imei2 && <div>IMEI 2: {imei.imei2}</div>}
                              {imei.ptaStatus && (
                                <div className="font-bold">{PTA_LABELS[imei.ptaStatus] || imei.ptaStatus}</div>
                              )}
                              {imei.warrantyMonths > 0 && <div>Warranty: {imei.warrantyMonths} months</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between pl-2">
                        <span>{formatQty(item.quantity)} {item.product.unit} × {formatPKR(item.price)}</span>
                        <span className="font-bold">{formatPKR(item.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPKR(data.subtotal)}</span>
                </div>
                {data.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatPKR(data.discount)}</span>
                  </div>
                )}
                <div className={`flex justify-between border-t border-double border-slate-700 mt-1 pt-1 font-extrabold ${format === 'thermal58' ? 'text-xs' : 'text-sm'}`}>
                  <span>TOTAL:</span>
                  <span>{formatPKR(data.total)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between">
                  <span>Payment ({paymentLabels[data.paymentMethod]}):</span>
                  <span className="font-bold">{formatPKR(data.paidAmount)}</span>
                </div>
                {data.changeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className="font-bold">{formatPKR(data.changeAmount)}</span>
                  </div>
                )}
                {data.creditAmount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>UDHAAR:</span>
                    <span>{formatPKR(data.creditAmount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-2 text-center text-[9px]">
                {data.items.length} item{data.items.length !== 1 ? 's' : ''} • {formatQty(totalItems)} total qty
              </div>

              {receiptFooter && (
                <div className="text-center text-[9px] italic border-t border-dashed border-slate-400 pt-1 mb-1">
                  {receiptFooter}
                </div>
              )}

              <div className="text-center font-bold mt-2">Shukriya! 🙏</div>
              <div className="text-center text-[8px] mt-1 text-slate-600">Powered by Nafaa POS</div>

              {isVoided && (
                <div className="mt-2 border-2 border-rose-600 text-rose-600 font-extrabold text-center py-1">
                  *** VOIDED ***
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ A4 BEAUTIFUL RECEIPT ═══ */}
        {format === 'a4' && (
          <div className="receipt-a4 bg-white shadow-2xl rounded-3xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
            {/* HEADER */}
            <div className="relative bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 px-8 py-7 text-white print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl print:hidden" />
              <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl print:hidden" />

              <div className="relative flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {showLogo && logoUrl && (
                    <img
                      src={logoUrl}
                      alt={shopName}
                      className="h-20 w-20 rounded-2xl object-cover bg-white p-1.5 shrink-0 shadow-lg print:rounded-lg"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold print:hidden">
                      <ReceiptIcon className="h-3 w-3" />
                      Sales Receipt
                    </div>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">{shopName}</h1>
                    {legalName && <p className="text-sm text-white/70 print:text-slate-600 italic mt-0.5">{legalName}</p>}
                    <div className="mt-3 space-y-1 text-xs text-white/85 print:text-slate-600">
                      {shopAddress && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{shopAddress}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        {shopPhone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {shopPhone}
                          </span>
                        )}
                        {shopWhatsapp && shopWhatsapp !== shopPhone && (
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {shopWhatsapp}
                          </span>
                        )}
                        {shopEmail && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {shopEmail}
                          </span>
                        )}
                        {shopWebsite && (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {shopWebsite}
                          </span>
                        )}
                      </div>
                      {taxNumber && (
                        <div className="flex items-center gap-1.5 font-bold">
                          <FileText className="h-3 w-3" />
                          {taxLabel} #: {taxNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 print:text-slate-500">Receipt #</div>
                  <div className="text-3xl font-extrabold mt-1 font-mono">{data.saleNumber}</div>
                  <div className="text-xs text-white/85 mt-1 print:text-slate-500 flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(data.soldAt)}
                  </div>
                  {data.shop && (
                    <div className="text-[10px] text-white/70 mt-0.5 print:text-slate-500 flex items-center justify-end gap-1">
                      <Building className="h-2.5 w-2.5" />
                      {data.shop.name}
                    </div>
                  )}
                </div>
              </div>

              {receiptHeader && (
                <div className="mt-4 pt-3 border-t border-white/20 print:border-slate-300 text-center text-sm italic text-white/85 print:text-slate-700">
                  {receiptHeader}
                </div>
              )}
            </div>

            {/* INFO ROW */}
            <div className="px-8 py-5 grid sm:grid-cols-3 gap-4 border-b-2 border-slate-100 bg-slate-50/50 print:bg-white">
              {showCustomer && (
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md print:bg-slate-100 print:text-slate-700 print:shadow-none">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">Bill To</div>
                    <div className="font-extrabold text-slate-900 truncate">{data.customer?.name || 'Walk-in Customer'}</div>
                    {data.customer?.phone && (
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />
                        {data.customer.phone}
                      </div>
                    )}
                    {data.customer?.address && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{data.customer.address}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-md print:bg-slate-100 print:text-slate-700 print:shadow-none">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">Sale Details</div>
                  <div className="font-extrabold text-slate-900 truncate">
                    {data.items.length} item{data.items.length !== 1 ? 's' : ''} • {formatQty(totalItems)} qty
                  </div>
                  {data.createdBy && (
                    <div className="text-xs text-slate-500 mt-0.5">Cashier: {data.createdBy.fullName}</div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md print:bg-slate-100 print:text-slate-700 print:shadow-none">
                  <PayIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">Payment</div>
                  <div className="font-extrabold text-slate-900 truncate">{paymentLabels[data.paymentMethod] || data.paymentMethod}</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-bold">Paid: {formatPKR(data.paidAmount)}</div>
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="px-8 py-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-700 border-b-2 border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50 print:bg-white">
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase tracking-wider w-8">#</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase tracking-wider">Description</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase tracking-wider text-center w-24">Qty</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase tracking-wider text-right w-28">Rate</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase tracking-wider text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => {
                      const variant = item.variantLink?.variant;
                      const carpet = parseCarpetNote(item.note);

                      return (
                        <tr key={item.id} className="border-b border-slate-100 align-top hover:bg-slate-50/50 transition">
                          <td className="py-4 px-2 text-slate-500 font-mono text-xs">{idx + 1}</td>
                          <td className="py-4 px-2">
                            <div className="font-extrabold text-slate-900 text-base">{item.product.name}</div>
                            {variant && (
                              <div className="text-xs font-semibold text-violet-700 mt-0.5 inline-flex items-center gap-1.5">
                                {variant.colorHex && (
                                  <span
                                    className="h-2.5 w-2.5 rounded-full border border-slate-300 print:hidden"
                                    style={{ backgroundColor: variant.colorHex }}
                                  />
                                )}
                                Variant: {variant.name}
                              </div>
                            )}
                            {(item.product.sku || item.product.barcode) && (
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                {item.product.sku || item.product.barcode}
                              </div>
                            )}

                            {carpet.type === 'roll' && (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800 print:bg-white print:border-slate-400">
                                <Layers className="h-2.5 w-2.5" />
                                Cut from <span className="font-mono">{carpet.reference}</span>
                                {carpet.dimensions && <span>• {carpet.dimensions}</span>}
                                {carpet.customRate && <span className="text-blue-700">• {carpet.customRate}</span>}
                              </div>
                            )}
                            {carpet.type === 'cut-piece' && (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-800 print:bg-white print:border-slate-400">
                                <Scissors className="h-2.5 w-2.5" />
                                Piece <span className="font-mono">{carpet.reference}</span>
                                {carpet.dimensions && <span>• {carpet.dimensions}</span>}
                              </div>
                            )}
                            {item.note && !carpet.type && !((item as any).imeis?.length) && (
                              <div className="text-[10px] text-slate-500 mt-0.5 italic">{item.note}</div>
                            )}

                            {(item as any).imeis && (item as any).imeis.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {(item as any).imeis.map((imei: any) => (
                                  <div
                                    key={imei.id}
                                    className="rounded-lg border-2 border-blue-200 bg-blue-50 p-2 print:bg-white print:border-slate-400"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                        <Smartphone className="h-3 w-3 text-blue-700" />
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700">IMEI</span>
                                        <span className="font-mono font-extrabold text-slate-900 text-sm">{imei.imei1}</span>
                                      </div>
                                      {imei.ptaStatus && (
                                        <span
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase ${
                                            PTA_BADGE_COLORS[imei.ptaStatus] || PTA_BADGE_COLORS.PENDING
                                          }`}
                                        >
                                          <ShieldCheck className="h-2.5 w-2.5" />
                                          {PTA_LABELS[imei.ptaStatus] || imei.ptaStatus}
                                        </span>
                                      )}
                                    </div>
                                    {imei.imei2 && (
                                      <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                                        IMEI 2: <span className="font-bold">{imei.imei2}</span>
                                      </div>
                                    )}
                                    {imei.serialNumber && (
                                      <div className="text-[10px] font-mono text-slate-600">
                                        S/N: <span className="font-bold">{imei.serialNumber}</span>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-1 text-[10px]">
                                      {imei.color && <span className="font-bold text-violet-700">🎨 {imei.color}</span>}
                                      {imei.warrantyMonths > 0 && (
                                        <span className="font-bold text-teal-700">🛡️ {imei.warrantyMonths}m warranty</span>
                                      )}
                                      {imei.warrantyExpiry && (
                                        <span className="font-bold text-slate-700">
                                          Expires: {new Date(imei.warrantyExpiry).toLocaleDateString('en-PK')}
                                        </span>
                                      )}
                                      {imei.ptaTaxPaid > 0 && (
                                        <span className="font-bold text-emerald-700">💰 Tax: {formatPKR(imei.ptaTaxPaid)}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 print:bg-white">
                              <span className="font-bold text-slate-900">{formatQty(item.quantity)}</span>
                              <span className="text-slate-500">{item.product.unit}</span>
                              <span className="text-slate-400 mx-1">×</span>
                              <span className="font-bold text-slate-900">{formatPKR(item.price)}</span>
                              <span className="text-slate-400 mx-1">=</span>
                              <span className="font-extrabold text-emerald-700">{formatPKR(item.total)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="inline-flex items-baseline gap-0.5">
                              <span className="text-xl font-extrabold text-slate-900 tabular-nums">{formatQty(item.quantity)}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.product.unit}</div>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="inline-flex items-center gap-1 text-slate-700 font-bold tabular-nums">
                              <span className="text-slate-400 text-xs">×</span>
                              <span>{formatPKR(item.price)}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 font-semibold">per {item.product.unit}</div>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="inline-flex items-center gap-1 font-extrabold text-emerald-700 tabular-nums text-base">
                              <span className="text-slate-400 text-xs font-normal">=</span>
                              <span>{formatPKR(item.total)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOTALS */}
            <div className="px-8 py-6 border-t-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white print:bg-white">
              <div className="ml-auto max-w-md space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatPKR(data.subtotal)}</span>
                </div>

                {data.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Discount
                    </span>
                    <span className="font-bold text-amber-700 tabular-nums">-{formatPKR(data.discount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-lg pt-3 border-t-2 border-slate-300">
                  <span className="font-extrabold text-slate-900">GRAND TOTAL</span>
                  <span className="font-extrabold text-emerald-700 text-3xl tabular-nums">{formatPKR(data.total)}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 inline-flex items-center gap-1">
                      <Banknote className="h-3 w-3" /> Paid ({paymentLabels[data.paymentMethod]})
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatPKR(data.paidAmount)}</span>
                  </div>

                  {data.changeAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-700 font-semibold">Change Returned</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatPKR(data.changeAmount)}</span>
                    </div>
                  )}

                  {data.creditAmount > 0 && (
                    <div className="flex items-center justify-between text-sm rounded-lg bg-amber-50 border-2 border-amber-300 px-3 py-2 mt-2 print:bg-white">
                      <span className="text-amber-800 font-bold inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> Udhaar (Khata)
                      </span>
                      <span className="font-extrabold text-amber-700 text-base tabular-nums">{formatPKR(data.creditAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-dashed border-slate-300 text-xs italic text-slate-600">
                  <strong>In Words:</strong> Rupees {numberToWords(data.total)} Only
                </div>
              </div>
            </div>

            {data.customer && data.creditAmount > 0 && (
              <div className="px-8 py-4 bg-amber-50 border-t-2 border-amber-300 flex items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  <div className="text-sm">
                    <span className="font-bold text-amber-900">{data.customer.name}</span>
                    <span className="text-amber-700"> ka udhaar update ho gaya</span>
                  </div>
                </div>
                <Link
                  to={`/customers/${data.customer.id}`}
                  className="text-xs font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
                >
                  View Khata →
                </Link>
              </div>
            )}

            {/* FOOTER */}
            <div className="px-8 py-6 text-center border-t-2 border-double border-slate-300 bg-gradient-to-br from-emerald-50 to-green-50 print:bg-white">
              {receiptFooter && <div className="text-sm italic text-slate-700 mb-3">{receiptFooter}</div>}
              <div className="text-lg font-extrabold text-slate-900 inline-flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Shukriya! Visit Again 🙏
                <Award className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-xs text-slate-600 mt-2 font-bold">Hamain umeed hai aap hamari service se khush hain</div>
              <div className="text-[10px] text-slate-400 mt-3 inline-flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                Powered by Nafaa POS • Generated {formatDate(new Date().toISOString())}
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-500 print:hidden">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Format auto-detected. Switch above to override.
          </span>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: ${format === 'thermal58' ? '58mm auto' : format === 'thermal80' ? '80mm auto' : 'A4'};
            margin: ${format === 'a4' ? '8mm' : '0mm'};
          }
          body {
            background: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .receipt-thermal {
            width: ${format === 'thermal58' ? '58mm' : '80mm'} !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .receipt-a4 {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
    if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lac' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
    return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const paisa = Math.round((num - rupees) * 100);
  let result = toWords(rupees);
  if (paisa > 0) result += ' and ' + toWords(paisa) + ' Paisa';
  return result.trim();
}
