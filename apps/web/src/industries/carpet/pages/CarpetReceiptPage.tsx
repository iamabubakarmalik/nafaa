import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, X, Layers, Scissors, Ruler,
  MapPin, Phone, Calendar, User, CheckCircle2, ShieldAlert, Wrench, Hash,
  Copy, Share2, RefreshCw, Sparkles, Package, Palette, Award,
  Download, Eye, FileText, ChevronRight, Info, Zap, TrendingUp,
  Ban, AlertTriangle, Camera, ImageIcon, ZoomIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { FbrReceiptBadge } from '@integrations/fbr';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatDateOnly = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'long' }).format(new Date(v));

type Format = 'a4' | 'thermal80' | 'thermal58';

/**
 * Detect the type of item from note + product unit.
 * Returns rich metadata for beautiful display.
 */
type CarpetItemType = 'roll' | 'cut-piece' | 'ready-piece' | 'ft' | 'accessory' | 'service' | 'other';

interface ParsedItem {
  type: CarpetItemType;
  reference?: string;
  dimensions?: string;
  area?: string;
  customRate?: string;
  note?: string;
  quality?: string;
  pile?: string;
}

function parseItem(item: any): ParsedItem {
  const note = item.note || '';
  const unit = (item.product?.unit || '').toLowerCase();

  // Roll cut pattern: "Cut from R-001: 12ft × 15ft = 180 sqft @ Rs 250/sqft"
  const rollMatch = note.match(/Cut from ([\w-]+):\s*([\d.]+\s*ft(?:\s+\d+in)?\s*[xX×]\s*[\d.]+\s*ft(?:\s+\d+in)?)(?:\s*=\s*([\d.]+\s*\w+))?(?:\s*@\s*(Rs\s*[\d.]+\/sqft.*))?/);
  if (rollMatch) {
    return {
      type: 'roll',
      reference: rollMatch[1],
      dimensions: rollMatch[2],
      area: rollMatch[3] || '',
      customRate: rollMatch[4] || '',
      note,
    };
  }

  // Cut piece pattern: "Cut piece P-001 • 3ft × 5ft"
  const cutMatch = note.match(/Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+\s*ft\s*[xX×]\s*[\d.]+\s*ft))?/);
  if (cutMatch) {
    return {
      type: 'cut-piece',
      reference: cutMatch[1],
      dimensions: cutMatch[2] || '',
      note,
    };
  }

  // Ready piece (PIECES stock type): unit is pcs/piece/mat
  if (['pcs', 'piece', 'pieces', 'mat', 'rug', 'centre-piece'].includes(unit)) {
    return { type: 'ready-piece', note };
  }

  // FT-based (running feet)
  if (['ft', 'feet', 'foot', 'runner-ft'].includes(unit)) {
    return { type: 'ft', note };
  }

  // Service (usually has "installation", "underlay", "delivery" in name)
  const name = (item.product?.name || '').toLowerCase();
  if (/(installation|underlay|delivery|service|labour|stitching|binding)/.test(name)) {
    return { type: 'service', note };
  }

  // Accessory (adhesive, tape, edging, etc.)
  if (/(adhesive|tape|edging|padding|glue|nail|strip)/.test(name)) {
    return { type: 'accessory', note };
  }

  // Sqft-based but no note = probably legacy roll or generic carpet
  if (['sqft', 'sqm', 'sqyd'].includes(unit)) {
    return { type: 'roll', note };
  }

  return { type: 'other', note };
}

const TYPE_META: Record<CarpetItemType, { label: string; icon: any; color: string; bgClass: string; textClass: string; borderClass: string; emoji: string }> = {
  roll:         { label: 'Roll Cut',    icon: Layers,   color: 'emerald', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-300', emoji: '🧶' },
  'cut-piece':  { label: 'Cut Piece',   icon: Scissors, color: 'violet',  bgClass: 'bg-violet-50',  textClass: 'text-violet-700',  borderClass: 'border-violet-300',  emoji: '✂️' },
  'ready-piece':{ label: 'Ready Piece', icon: Package,  color: 'blue',    bgClass: 'bg-blue-50',    textClass: 'text-blue-700',    borderClass: 'border-blue-300',    emoji: '🎁' },
  ft:           { label: 'Running Ft',  icon: Ruler,    color: 'cyan',    bgClass: 'bg-cyan-50',    textClass: 'text-cyan-700',    borderClass: 'border-cyan-300',    emoji: '📏' },
  accessory:    { label: 'Accessory',   icon: Palette,  color: 'amber',   bgClass: 'bg-amber-50',   textClass: 'text-amber-700',   borderClass: 'border-amber-300',   emoji: '🎨' },
  service:      { label: 'Service',     icon: Wrench,   color: 'orange',  bgClass: 'bg-orange-50',  textClass: 'text-orange-700',  borderClass: 'border-orange-300',  emoji: '🔧' },
  other:        { label: 'Item',        icon: Hash,     color: 'slate',   bgClass: 'bg-slate-50',   textClass: 'text-slate-700',   borderClass: 'border-slate-300',   emoji: '📦' },
};

export default function CarpetReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<Format>('a4');
  const [copied, setCopied] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const isAutoOpened = searchParams.get('auto') === '1';
  const tenant = useAuthStore((s: any) => s.tenant);

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
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Void failed'),
  });

  // Parse all items once
  const parsedItems = useMemo(() => {
    if (!sale) return [];
    return sale.items.map((it: any) => ({ ...it, parsed: parseItem(it) }));
  }, [sale]);

  // Group items by type for summary
  const itemGroups = useMemo(() => {
    const groups: Record<CarpetItemType, any[]> = {
      roll: [], 'cut-piece': [], 'ready-piece': [], ft: [], accessory: [], service: [], other: [],
    };
    parsedItems.forEach((it: any) => {
      groups[it.parsed.type as CarpetItemType].push(it);
    });
    return groups;
  }, [parsedItems]);

  // Total sqft (only carpet items)
  const totalSqft = useMemo(() => {
    if (!sale) return 0;
    return sale.items.reduce((s: number, it: any) => {
      if (['sqft', 'sqm', 'sqyd'].includes((it.product?.unit || '').toLowerCase())) {
        return s + Number(it.quantity || 0);
      }
      return s;
    }, 0);
  }, [sale]);

  const totalFt = useMemo(() => {
    if (!sale) return 0;
    return sale.items.reduce((s: number, it: any) => {
      if (['ft', 'feet', 'foot'].includes((it.product?.unit || '').toLowerCase())) {
        return s + Number(it.quantity || 0);
      }
      return s;
    }, 0);
  }, [sale]);

  const totalPieces = useMemo(() => {
    if (!sale) return 0;
    return sale.items.reduce((s: number, it: any) => {
      const unit = (it.product?.unit || '').toLowerCase();
      if (['pcs', 'piece', 'pieces', 'mat', 'rug'].includes(unit)) {
        return s + Number(it.quantity || 0);
      }
      return s;
    }, 0);
  }, [sale]);

  const handleWhatsApp = () => {
    if (!sale?.customer?.phone) return toast.error('Customer phone not available');
    const phone = sale.customer.phone.replace(/[^0-9]/g, '');
    const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const shopName = sale.tenant?.settings?.shopName || sale.tenant?.name || 'Carpet Store';

    const lines: string[] = [];
    lines.push(`🧶 *${shopName}*`);
    lines.push('');
    lines.push(`Assalam-o-Alaikum ${sale.customer.name}!`);
    lines.push('Aap ki khareedari ka shukriya 🙏');
    lines.push('');
    lines.push(`*Invoice:* ${sale.saleNumber}`);
    lines.push(`*Date:* ${formatDate(sale.soldAt)}`);
    lines.push('');
    lines.push('*Items:*');
    parsedItems.forEach((it: any, i: number) => {
      const meta = TYPE_META[it.parsed.type as CarpetItemType];
      lines.push(`${i + 1}. ${meta.emoji} ${it.product.name}`);
      lines.push(`   Qty: ${it.quantity} ${it.product.unit} × ${formatPKR(it.price)} = *${formatPKR(it.total)}*`);
      if (it.parsed.type === 'roll' && it.parsed.reference) {
        lines.push(`   Roll: \`${it.parsed.reference}\``);
        if (it.parsed.dimensions) lines.push(`   Cut: ${it.parsed.dimensions}`);
      } else if (it.parsed.type === 'cut-piece' && it.parsed.reference) {
        lines.push(`   Piece: \`${it.parsed.reference}\``);
        if (it.parsed.dimensions) lines.push(`   Size: ${it.parsed.dimensions}`);
      }
    });
    lines.push('');
    lines.push(`Subtotal: ${formatPKR(sale.subtotal)}`);
    if (sale.serviceCharges && sale.serviceCharges > 0) lines.push(`Services: +${formatPKR(sale.serviceCharges)}`);
    if (sale.discount > 0) lines.push(`Discount: -${formatPKR(sale.discount)}`);
    lines.push(`*TOTAL: ${formatPKR(sale.total)}*`);
    if (sale.paidAmount > 0) lines.push(`Paid: ${formatPKR(sale.paidAmount)}`);
    if (sale.creditAmount > 0) lines.push(`Balance: ${formatPKR(sale.creditAmount)}`);
    lines.push('');
    lines.push('_Note: Cut carpet is non-returnable_');
    lines.push('_Shukriya!_ 🙏');

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const copyInvoice = () => {
    if (!sale) return;
    navigator.clipboard.writeText(sale.saleNumber);
    setCopied(true);
    toast.success('Invoice # copy ho gaya');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = async () => {
    if (!sale || !navigator.share) return toast.error('Sharing not supported');
    try {
      await navigator.share({
        title: `Invoice ${sale.saleNumber}`,
        text: `${sale.tenant?.name || 'Carpet Store'} — ${formatPKR(sale.total)} • ${sale.items.length} items`,
        url: window.location.href,
      });
    } catch {}
  };

  const downloadPDF = () => {
    // Trigger browser's print-to-PDF
    toast.success('Print dialog khul raha hai — "Save as PDF" choose karein');
    setTimeout(() => window.print(), 300);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm font-bold text-slate-500">Loading receipt...</p>
        </div>
      
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
        <Link to="/sales" className="mt-4 inline-flex items-center gap-1 text-emerald-600 hover:underline font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Sales
        </Link>
      </div>
    );
  }

  const settings = sale.tenant?.settings;
  const shopName = settings?.shopName || sale.tenant?.name || tenant?.name || 'Carpet Store';
  const shopAddress = [settings?.shopAddress, settings?.shopCity].filter(Boolean).join(', ');
  const shopPhone = settings?.shopPhone || sale.tenant?.phone || '';
  const shopEmail = settings?.shopEmail || (sale.tenant as any)?.email || '';
  const logoUrl = settings?.logoUrl;
  const receiptFooter = settings?.receiptFooter;
  const isVoided = sale.status === 'VOIDED';

  const typeCounts = Object.entries(itemGroups)
    .filter(([_, items]) => items.length > 0)
    .map(([type, items]) => ({ type: type as CarpetItemType, count: items.length, meta: TYPE_META[type as CarpetItemType] }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-4 sm:py-6 px-3 sm:px-4 print:bg-white print:py-0 print:px-0">
      <div className={`mx-auto space-y-3 sm:space-y-4 ${format === 'a4' ? 'max-w-4xl' : 'max-w-md'}`}>

        {/* ═══ Image zoom modal ═══ */}
        {zoomImage && (
          <div
            className="fixed inset-0 z-[60] bg-slate-950/90 flex items-center justify-center p-4 print:hidden"
            onClick={() => setZoomImage(null)}
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={zoomImage} alt="" className="max-w-full max-h-full object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* ═══ Success banner ═══ */}
        {isAutoOpened && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 sm:px-5 py-3 flex items-center gap-3 shadow-lg print:hidden">
            <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm sm:text-base">Sale Complete! 🧶</div>
              <div className="text-[11px] sm:text-xs text-white/90">Print, WhatsApp bhejo ya PDF save karo</div>
            </div>
            <Link to="/pos" className="shrink-0 h-10 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95">
              <Sparkles className="h-3 w-3" /> Nayi Sale
            </Link>
          </div>
        )}

        {/* ═══ Toolbar ═══ */}
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 sm:p-3 print:hidden sticky top-2 z-30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => navigate('/sales')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs sm:text-sm font-extrabold text-slate-700 transition active:scale-95"
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
                    className={`px-2.5 sm:px-3 py-2 text-[10px] sm:text-xs font-extrabold transition active:scale-95 ${
                      format === f ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                    } ${i > 0 ? 'border-l-2 border-slate-200' : ''}`}
                    title={f === 'a4' ? 'A4 paper' : f === 'thermal80' ? 'Thermal 80mm' : 'Thermal 58mm'}
                  >
                    {f === 'a4' ? 'A4' : f === 'thermal80' ? '80mm' : '58mm'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => refetch()}
                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                onClick={copyInvoice}
                className="h-9 w-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition active:scale-95"
                title="Copy invoice #"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>

              {typeof navigator !== 'undefined' && (navigator as any).share && (
                <button
                  onClick={shareNative}
                  className="h-9 w-9 rounded-xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition active:scale-95"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={downloadPDF}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition active:scale-95"
                title="Save as PDF"
              >
                <Download className="h-4 w-4" /> PDF
              </button>

              <button
                onClick={handleWhatsApp}
                disabled={!sale.customer?.phone}
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 px-3 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm disabled:opacity-50 active:scale-95 transition"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {!isVoided && (
                <button
                  onClick={() => {
                    const r = prompt('Void karne ki wajah? (optional)');
                    if (r !== null) voidMutation.mutate(r);
                  }}
                  className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition active:scale-95"
                  title="Void sale"
                >
                  <Ban className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-md active:scale-95 transition"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>

        {/* ═══ Voided banner ═══ */}
        {isVoided && (
          <div className="rounded-2xl border-4 border-rose-400 bg-rose-50 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-rose-900 text-lg">🚫 SALE VOIDED</div>
              <div className="text-xs text-rose-700 font-bold">Ye receipt cancel ho chuki hai — stock adjust nahi hoga</div>
            </div>
          </div>
        )}

        {/* ═══ A4 RECEIPT ═══ */}
        {format === 'a4' && (
          <div className="receipt-a4 bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-2 border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

            {/* HEADER */}
            <div className="relative bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white px-4 sm:px-8 py-5 sm:py-7 print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl print:hidden" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-teal-400/15 blur-2xl print:hidden" />

              <div className="relative flex items-start justify-between gap-4 sm:gap-6 flex-wrap">
                <div className="flex items-start gap-3 sm:gap-4">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover bg-white p-1.5 shadow-lg shrink-0 cursor-pointer print:cursor-default"
                      onClick={() => setZoomImage(logoUrl)}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold print:hidden">
                      <Layers className="h-3 w-3" /> Carpet Sales Invoice
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
                      {shopEmail && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]">✉</span>
                          {shopEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right w-full sm:w-auto">
                  <div className="text-[10px] uppercase tracking-widest text-white/60 print:text-slate-500">Invoice #</div>
                  <button
                    onClick={copyInvoice}
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
                    <Calendar className="h-3 w-3" />
                    {formatDate(sale.soldAt)}
                  </div>
                  {(sale as any).staff && (
                    <div className="text-[10px] text-white/70 mt-1 print:text-slate-500">
                      Cashier: {(sale as any).staff.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CUSTOMER + STATS STRIP */}
            <div className="px-4 sm:px-8 py-3 sm:py-4 border-b-2 border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3 flex-wrap print:bg-white">
              {sale.customer ? (
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-extrabold flex items-center justify-center text-lg shrink-0 shadow print:shadow-none">
                    {(sale.customer.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Bill To</div>
                    <div className="font-extrabold text-base sm:text-lg">{sale.customer.name}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-bold flex-wrap mt-0.5">
                      {sale.customer.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {sale.customer.phone}
                        </span>
                      )}
                      {sale.customer.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {sale.customer.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Customer</div>
                    <div className="font-extrabold text-slate-600">Walk-in Customer</div>
                  </div>
                </div>
              )}

              {/* Area stats */}
              <div className="flex items-center gap-2 flex-wrap">
                {totalSqft > 0 && (
                  <div className="rounded-xl bg-emerald-100 border-2 border-emerald-300 px-3 sm:px-4 py-2 text-center print:bg-white">
                    <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Area</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-emerald-900 tabular-nums leading-none mt-0.5">{totalSqft.toFixed(2)}</div>
                    <div className="text-[10px] font-bold text-emerald-700">sqft</div>
                  </div>
                )}
                {totalFt > 0 && (
                  <div className="rounded-xl bg-cyan-100 border-2 border-cyan-300 px-3 sm:px-4 py-2 text-center print:bg-white">
                    <div className="text-[10px] uppercase font-extrabold text-cyan-700">Length</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-cyan-900 tabular-nums leading-none mt-0.5">{totalFt.toFixed(1)}</div>
                    <div className="text-[10px] font-bold text-cyan-700">ft</div>
                  </div>
                )}
                {totalPieces > 0 && (
                  <div className="rounded-xl bg-blue-100 border-2 border-blue-300 px-3 sm:px-4 py-2 text-center print:bg-white">
                    <div className="text-[10px] uppercase font-extrabold text-blue-700">Pieces</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-blue-900 tabular-nums leading-none mt-0.5">{totalPieces}</div>
                    <div className="text-[10px] font-bold text-blue-700">count</div>
                  </div>
                )}
              </div>
            </div>

            {/* ITEM TYPE SUMMARY */}
            {typeCounts.length > 1 && (
              <div className="px-4 sm:px-8 py-3 border-b-2 border-slate-100 bg-white print:hidden">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-2">Order Contents</div>
                <div className="flex flex-wrap gap-1.5">
                  {typeCounts.map((tc) => {
                    const Icon = tc.meta.icon;
                    return (
                      <span
                        key={tc.type}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border-2 ${tc.meta.bgClass} ${tc.meta.textClass} ${tc.meta.borderClass}`}
                      >
                        <Icon className="h-3 w-3" />
                        {tc.count}× {tc.meta.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ITEMS */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4">
              {parsedItems.map((it: any, idx: number) => {
                const meta = TYPE_META[it.parsed.type as CarpetItemType];
                const Icon = meta.icon;
                const productImg = it.product?.images?.[0]?.url;
                return (
                  <div
                    key={it.id}
                    className={`rounded-2xl border-2 ${meta.borderClass} overflow-hidden print:rounded-none print:border`}
                  >
                    <div className={`px-3 sm:px-4 py-3 border-b-2 ${meta.borderClass} flex items-start justify-between gap-3 ${meta.bgClass} print:bg-white`}>
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {productImg ? (
                          <button
                            onClick={() => setZoomImage(productImg)}
                            className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow group print:cursor-default print:shadow-none"
                          >
                            <img src={productImg} alt="" className="w-full h-full object-cover group-hover:scale-110 transition" />
                          </button>
                        ) : (
                          <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow bg-${meta.color}-600 print:shadow-none`}
                            style={{ backgroundColor: meta.color === 'emerald' ? '#059669' : meta.color === 'violet' ? '#7c3aed' : meta.color === 'blue' ? '#2563eb' : meta.color === 'cyan' ? '#0891b2' : meta.color === 'amber' ? '#d97706' : meta.color === 'orange' ? '#ea580c' : '#475569' }}>
                            <Icon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-extrabold text-slate-500">Item #{idx + 1}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 ${meta.bgClass} ${meta.textClass} border ${meta.borderClass}`}>
                              {meta.emoji} {meta.label}
                            </span>
                          </div>
                          <div className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight mt-0.5">
                            {it.product.name}
                          </div>
                          {it.product.variantName && (
                            <div className="text-xs text-slate-600 font-bold inline-flex items-center gap-1 mt-0.5">
                              <Palette className="h-3 w-3" /> {it.product.variantName}
                            </div>
                          )}
                          <div className="text-xs text-slate-600 font-mono mt-1">
                            {it.quantity} {it.product.unit} × {formatPKR(it.price)}/{it.product.unit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                          {formatPKR(it.total)}
                        </div>
                        {it.discount > 0 && (
                          <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                            -{formatPKR(it.discount)} discount
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Type-specific details */}
                    {it.parsed.type === 'roll' && it.parsed.reference && (
                      <div className="p-3 sm:p-4 bg-emerald-50/40 print:bg-white">
                        <div className="text-[10px] uppercase font-extrabold text-emerald-700 mb-2 inline-flex items-center gap-1">
                          <Layers className="h-3 w-3" /> Roll Cut Details
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                          <div className="rounded-xl bg-white border-2 border-emerald-200 p-2 sm:p-3">
                            <div className="text-[10px] uppercase font-extrabold text-slate-500 flex items-center gap-1">
                              <Hash className="h-2.5 w-2.5" /> Roll #
                            </div>
                            <div className="font-mono font-extrabold text-emerald-900 text-sm sm:text-base mt-0.5">{it.parsed.reference}</div>
                          </div>
                          {it.parsed.dimensions && (
                            <div className="rounded-xl bg-white border-2 border-emerald-200 p-2 sm:p-3">
                              <div className="text-[10px] uppercase font-extrabold text-slate-500 inline-flex items-center gap-1">
                                <Ruler className="h-2.5 w-2.5" /> Cut Size
                              </div>
                              <div className="font-extrabold text-emerald-900 text-sm sm:text-base mt-0.5">{it.parsed.dimensions}</div>
                            </div>
                          )}
                          {it.parsed.area && (
                            <div className="rounded-xl bg-white border-2 border-emerald-200 p-2 sm:p-3">
                              <div className="text-[10px] uppercase font-extrabold text-slate-500">Area</div>
                              <div className="font-extrabold text-emerald-900 text-sm sm:text-base mt-0.5">{it.parsed.area}</div>
                            </div>
                          )}
                        </div>
                        {it.parsed.customRate && (
                          <div className="mt-2 text-xs font-bold text-blue-700 inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-300 text-[10px]">CUSTOM RATE</span>
                            {it.parsed.customRate}
                          </div>
                        )}
                      </div>
                    )}

                    {it.parsed.type === 'cut-piece' && it.parsed.reference && (
                      <div className="p-3 sm:p-4 bg-violet-50/40 print:bg-white">
                        <div className="text-[10px] uppercase font-extrabold text-violet-700 mb-2 inline-flex items-center gap-1">
                          <Scissors className="h-3 w-3" /> Cut Piece Details
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div className="rounded-xl bg-white border-2 border-violet-200 p-2 sm:p-3">
                            <div className="text-[10px] uppercase font-extrabold text-slate-500 inline-flex items-center gap-1">
                              <Hash className="h-2.5 w-2.5" /> Piece Code
                            </div>
                            <div className="font-mono font-extrabold text-violet-900 text-sm sm:text-base mt-0.5">{it.parsed.reference}</div>
                          </div>
                          {it.parsed.dimensions && (
                            <div className="rounded-xl bg-white border-2 border-violet-200 p-2 sm:p-3">
                              <div className="text-[10px] uppercase font-extrabold text-slate-500 inline-flex items-center gap-1">
                                <Ruler className="h-2.5 w-2.5" /> Dimensions
                              </div>
                              <div className="font-extrabold text-violet-900 text-sm sm:text-base mt-0.5">{it.parsed.dimensions}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Note fallback if no structured parse */}
                    {it.parsed.type !== 'roll' && it.parsed.type !== 'cut-piece' && it.note && (
                      <div className={`p-3 ${meta.bgClass} print:bg-white`}>
                        <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1 inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Note
                        </div>
                        <div className="text-xs italic text-slate-700 font-semibold">{it.note}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SERVICES BREAKDOWN */}
            {sale.serviceChargesBreakdown && sale.serviceChargesBreakdown.length > 0 && (
              <div className="px-4 sm:px-8 pb-4">
                <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-3 sm:p-4 print:bg-white print:border-slate-400">
                  <div className="text-[10px] uppercase font-extrabold text-orange-700 mb-2 inline-flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Additional Services
                  </div>
                  <div className="space-y-1">
                    {sale.serviceChargesBreakdown.map((sc: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                          {sc.label}
                        </span>
                        <span className="font-bold text-orange-800 tabular-nums">+{formatPKR(sc.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-2 border-t-2 border-orange-300 font-extrabold">
                      <span className="text-orange-900">Total Services</span>
                      <span className="text-orange-900 tabular-nums text-base">+{formatPKR(sale.serviceCharges ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TOTALS */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-t-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white print:bg-white">
              <div className="sm:ml-auto sm:max-w-md space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-bold">Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatPKR(sale.subtotal)}</span>
                </div>
                {sale.serviceCharges && sale.serviceCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700 font-bold flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Services
                    </span>
                    <span className="font-bold text-orange-700 tabular-nums">+{formatPKR(sale.serviceCharges)}</span>
                  </div>
                )}
                {sale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Discount
                    </span>
                    <span className="font-bold text-amber-700 tabular-nums">-{formatPKR(sale.discount)}</span>
                  </div>
                )}
                {(sale as any).taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-bold">Tax</span>
                    <span className="font-bold tabular-nums">+{formatPKR((sale as any).taxAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300">
                  <span className="font-extrabold text-slate-900 text-base sm:text-lg">GRAND TOTAL</span>
                  <span className="font-extrabold text-emerald-700 text-2xl sm:text-3xl tabular-nums">{formatPKR(sale.total)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-bold inline-flex items-center gap-1">
                      <Award className="h-3 w-3" /> Paid ({sale.paymentMethod})
                    </span>
                    <span className="font-bold tabular-nums text-emerald-700">{formatPKR(sale.paidAmount)}</span>
                  </div>
                  {sale.changeAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700 font-bold">Change Wapas</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatPKR(sale.changeAmount)}</span>
                    </div>
                  )}
                  {sale.creditAmount > 0 && (
                    <div className="flex justify-between rounded-xl bg-amber-50 border-2 border-amber-300 px-3 py-2 mt-2 print:bg-white">
                      <span className="text-amber-800 font-extrabold text-sm inline-flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Udhaar / Balance
                      </span>
                      <span className="font-extrabold text-amber-700 text-base sm:text-lg tabular-nums">
                        {formatPKR(sale.creditAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TERMS */}
            <div className="px-4 sm:px-8 py-4 sm:py-5 border-t-2 border-slate-100 bg-emerald-50/50 print:bg-white">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700 mb-2 inline-flex items-center gap-1">
                <Info className="h-3 w-3" /> Terms & Conditions
              </div>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4 font-semibold">
                <li>Cut carpet is <strong>non-returnable</strong> — please verify measurements before cutting</li>
                <li>Installation service is chargeable separately and must be booked in advance</li>
                <li>Warranty covers manufacturer defects only — normal wear-and-tear excluded</li>
                <li>Keep this invoice for warranty claims and returns of accessories</li>
                <li>Payment terms: {sale.creditAmount > 0 ? 'Balance due within 30 days' : 'Paid in full — no dues'}</li>
              </ul>
            </div>

            {/* FOOTER */}
            <div className="px-4 sm:px-8 py-4 sm:py-5 text-center border-t-2 border-double border-slate-300 bg-gradient-to-br from-emerald-50 to-teal-50 print:bg-white">
              {receiptFooter && (
                <div className="text-sm italic text-slate-700 mb-2">{receiptFooter}</div>
              )}
              <div className="text-base sm:text-lg font-extrabold text-slate-900">🧶 Shukriya! Phir Zaroor Aayen 🙏</div>
              <div className="text-[10px] text-slate-400 mt-2">Powered by Nafaa POS • {formatDateOnly(sale.soldAt)}</div>
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
                    <img
                      src={logoUrl}
                      alt=""
                      className={`mx-auto mb-2 object-contain ${format === 'thermal58' ? 'h-12 w-12' : 'h-14 w-14'}`}
                    />
                  )}
                  <div className={`font-extrabold ${format === 'thermal58' ? 'text-sm' : 'text-base'}`}>
                    {shopName.toUpperCase()}
                  </div>
                  {shopAddress && <div className="text-[9px] mt-0.5">{shopAddress}</div>}
                  {shopPhone && <div className="text-[9px]">📞 {shopPhone}</div>}
                </div>

                {/* Invoice info */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between">
                    <span className="font-bold">Invoice #</span>
                    <span className="font-bold">{sale.saleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(sale.soldAt)}</span>
                  </div>
                  {(sale as any).staff && (
                    <div className="flex justify-between text-[9px]">
                      <span>Cashier:</span>
                      <span>{(sale as any).staff.name}</span>
                    </div>
                  )}
                </div>

                {/* Customer */}
                {sale.customer && (
                  <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                    <div className="flex justify-between">
                      <span className="font-bold">Customer:</span>
                      <span className="font-bold">{sale.customer.name}</span>
                    </div>
                    {sale.customer.phone && (
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span>{sale.customer.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                {(totalSqft > 0 || totalPieces > 0 || totalFt > 0) && (
                  <div className="border-t border-dashed border-slate-400 pt-1 mb-1 text-center">
                    {totalSqft > 0 && <div className="font-bold">🧶 {totalSqft.toFixed(2)} sqft</div>}
                    {totalFt > 0 && <div className="font-bold">📏 {totalFt.toFixed(1)} ft</div>}
                    {totalPieces > 0 && <div className="font-bold">📦 {totalPieces} pieces</div>}
                  </div>
                )}

                {/* Items */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="font-bold text-center mb-1">ITEMS</div>
                  {parsedItems.map((item: any, idx: number) => {
                    const meta = TYPE_META[item.parsed.type as CarpetItemType];
                    return (
                      <div key={item.id} className="mb-1.5">
                        <div className="font-bold">
                          {idx + 1}. {meta.emoji} {item.product.name}
                        </div>
                        {item.parsed.type === 'roll' && item.parsed.reference && (
                          <div className="pl-2 text-[9px]">
                            <div>Roll: {item.parsed.reference}</div>
                            {item.parsed.dimensions && <div>Cut: {item.parsed.dimensions}</div>}
                            {item.parsed.area && <div>Area: {item.parsed.area}</div>}
                          </div>
                        )}
                        {item.parsed.type === 'cut-piece' && item.parsed.reference && (
                          <div className="pl-2 text-[9px]">
                            <div>Piece: {item.parsed.reference}</div>
                            {item.parsed.dimensions && <div>Size: {item.parsed.dimensions}</div>}
                          </div>
                        )}
                        <div className="flex justify-between pl-2">
                          <span>
                            {item.quantity} {item.product.unit} × {formatPKR(item.price)}
                          </span>
                          <span className="font-bold">{formatPKR(item.total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPKR(sale.subtotal)}</span>
                  </div>
                  {sale.serviceChargesBreakdown && sale.serviceChargesBreakdown.length > 0 && (
                    <>
                      <div className="font-bold text-center border-t border-dotted border-slate-400 mt-1 pt-1 text-[9px]">
                        SERVICES
                      </div>
                      {sale.serviceChargesBreakdown.map((sc: any, i: number) => (
                        <div key={i} className="flex justify-between text-[9px]">
                          <span>{sc.label}:</span>
                          <span>+{formatPKR(sc.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {sale.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{formatPKR(sale.discount)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between border-t border-double border-slate-700 mt-1 pt-1 font-extrabold ${format === 'thermal58' ? 'text-xs' : 'text-sm'}`}>
                    <span>TOTAL:</span>
                    <span>{formatPKR(sale.total)}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between">
                    <span>Paid ({sale.paymentMethod}):</span>
                    <span className="font-bold">{formatPKR(sale.paidAmount)}</span>
                  </div>
                  {sale.changeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Change:</span>
                      <span className="font-bold">{formatPKR(sale.changeAmount)}</span>
                    </div>
                  )}
                  {sale.creditAmount > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>BALANCE:</span>
                      <span>{formatPKR(sale.creditAmount)}</span>
                    </div>
                  )}
                </div>

                {/* Terms */}
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1 text-[9px] italic">
                  <div className="font-bold">Terms:</div>
                  <div>• Cut carpet non-returnable</div>
                  <div>• Installation charged separately</div>
                  <div>• Keep invoice for warranty</div>
                </div>

                {receiptFooter && (
                  <div className="text-center text-[9px] italic border-t border-dashed border-slate-400 pt-1">
                    {receiptFooter}
                  </div>
                )}
                <div className="text-center font-bold mt-2">🧶 Shukriya! 🙏</div>
                <div className="text-center text-[8px] mt-1 text-slate-600">Powered by Nafaa POS</div>

                {isVoided && (
                  <div className="mt-2 border-2 border-rose-600 text-rose-600 font-extrabold text-center py-1">
                    *** VOIDED ***
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
