import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, X, Gem, ShieldCheck, Award,
  MapPin, Phone, Calendar, User, CheckCircle2, Hash, Scale,
  Coins, Diamond, Repeat, DollarSign, RefreshCw, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { jewelrySalesApi } from '../api/sales.api';
import { formatPKR } from '@/lib/format';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const METAL_ICONS: Record<string, string> = {
  GOLD: '🥇', SILVER: '🥈', PLATINUM: '💠',
  ROSE_GOLD: '🌹', WHITE_GOLD: '⚪',
};

type Format = 'a4' | 'thermal80' | 'thermal58';

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
  return toWords(Math.floor(num)).trim();
}

export default function JewelryReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [format, setFormat] = useState<Format>('a4');
  const isAutoOpened = searchParams.get('auto') === '1';

  const { data: sale, isLoading } = useQuery({
    queryKey: ['jewelry-sale', id],
    queryFn: () => jewelrySalesApi.getOne(id!),
    enabled: !!id,
  });

  useEffect(() => {
    const autoPrint = localStorage.getItem('nafaa.pos.auto-print') === 'true';
    if (isAutoOpened && autoPrint && sale && !isLoading) {
      setTimeout(() => window.print(), 500);
    }
  }, [isAutoOpened, sale, isLoading]);

  const handleWhatsApp = () => {
    if (!sale?.customerPhone) return toast.error('Customer phone not available');
    const phone = sale.customerPhone.replace(/[^0-9]/g, '');
    const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const shopName = (sale as any).tenant?.settings?.shopName || (sale as any).tenant?.name || 'Jewelry Shop';

    const lines: string[] = [];
    lines.push(`💎 *${shopName}*`);
    lines.push('');
    lines.push(`Assalam-o-Alaikum ${sale.customerName}!`);
    lines.push('Thank you for your purchase 🙏');
    lines.push('');
    lines.push(`*Invoice:* ${sale.invoiceNumber}`);
    lines.push(`*Date:* ${formatDate((sale as any).soldAt || sale.createdAt)}`);
    lines.push('');
    lines.push('*Items Purchased:*');
    (sale.items || []).forEach((it: any, i: number) => {
      lines.push(`${i + 1}. ${it.productName} × ${it.quantity}`);
      lines.push(`   ${METAL_ICONS[it.metalType]} ${it.metalType} ${it.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K`);
      lines.push(`   ⚖️ Net: ${Number(it.netWeight).toFixed(3)}g @ Rs ${Number(it.ratePerGram).toLocaleString()}/g`);
      if (it.hallmarkNumber) lines.push(`   🛡️ Hallmark: ${it.hallmarkNumber}`);
    });
    lines.push('');
    if (sale.exchangeValue > 0) {
      lines.push(`♻️ *Exchange Received:*`);
      if ((sale as any).exchangeMetalGrams > 0) lines.push(`   ${Number((sale as any).exchangeMetalGrams).toFixed(3)}g ${(sale as any).exchangeMetalPurity || ''}`);
      lines.push(`   Value: ${formatPKR(sale.exchangeValue)}`);
      lines.push('');
    }
    lines.push(`Subtotal: ${formatPKR(sale.subtotal || 0)}`);
    if (sale.gstAmount > 0) lines.push(`GST: +${formatPKR(sale.gstAmount)}`);
    if (sale.discount > 0) lines.push(`Discount: -${formatPKR(sale.discount)}`);
    if (sale.exchangeValue > 0) lines.push(`Exchange: -${formatPKR(sale.exchangeValue)}`);
    lines.push(`*TOTAL: ${formatPKR(sale.total)}*`);
    lines.push(`Paid: ${formatPKR(sale.paidAmount)}`);
    if ((sale.total - sale.paidAmount) > 0) lines.push(`Balance: ${formatPKR(sale.total - sale.paidAmount)}`);
    lines.push('');
    lines.push('_Keep this invoice for warranty & buyback claims_');
    lines.push('_Hallmark verified — 100% purity guaranteed_ ✨');

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" /></div>;
  }
  if (!sale) {
    return <div className="min-h-screen flex flex-col items-center justify-center"><p className="font-bold">Receipt not found</p><Link to="/jewelry/sales" className="mt-4 text-amber-600 hover:underline">← Back</Link></div>;
  }

  const tenant = (sale as any).tenant;
  const settings = tenant?.settings;
  const shopName = settings?.shopName || tenant?.name || 'Jewelry Shop';
  const shopAddress = [settings?.shopAddress, settings?.shopCity].filter(Boolean).join(', ');
  const shopPhone = settings?.shopPhone || tenant?.phone || '';
  const logoUrl = settings?.logoUrl;

  const totalWeight = (sale.items || []).reduce((s: number, it: any) => s + Number(it.netWeight || 0) * Number(it.quantity || 0), 0);
  const totalItems = (sale.items || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);
  const hasHallmark = (sale.items || []).some((it: any) => it.hallmarkNumber);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 py-6 px-4 print:bg-white print:py-0 print:px-0">
      <div className={`mx-auto space-y-4 ${format === 'a4' ? 'max-w-4xl' : 'max-w-md'}`}>
        {isAutoOpened && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-5 py-3 flex items-center gap-3 shadow-lg print:hidden">
            <CheckCircle2 className="h-6 w-6" />
            <div className="flex-1">
              <div className="font-extrabold">Sale Complete! 💎</div>
              <div className="text-xs text-white/90">Print certificate or send via WhatsApp</div>
            </div>
            <Link to="/pos" className="text-xs font-extrabold underline">→ New Sale</Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
          <button onClick={() => navigate('/jewelry/sales')} className="inline-flex items-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
              {(['a4', 'thermal80', 'thermal58'] as Format[]).map((f, i) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-3 py-2.5 text-xs font-bold transition ${format === f ? 'bg-amber-600 text-white' : 'text-slate-700 hover:bg-slate-50'} ${i > 0 ? 'border-l-2 border-slate-200' : ''}`}>
                  {f === 'a4' ? 'A4' : f === 'thermal80' ? '80mm' : '58mm'}
                </button>
              ))}
            </div>
            <button onClick={handleWhatsApp} disabled={!sale.customerPhone}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-4 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-700 hover:from-amber-700 hover:to-yellow-800 px-4 py-2.5 text-sm font-bold text-white shadow-md">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {/* ─── A4 ─── */}
        {format === 'a4' && (
          <div className="receipt-a4 bg-white shadow-2xl rounded-3xl border overflow-hidden print:shadow-none print:border-none print:rounded-none">
            <div className="relative bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white px-8 py-7 print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl print:hidden" />
              <div className="relative flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-4">
                  {logoUrl && <img src={logoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover bg-white p-1.5 shadow-lg" />}
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold print:hidden">
                      <Gem className="h-3 w-3" /> Jewelry Invoice
                    </div>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">{shopName}</h1>
                    <div className="mt-3 space-y-1 text-xs text-white/85 print:text-slate-600">
                      {shopAddress && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{shopAddress}</div>}
                      {shopPhone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{shopPhone}</div>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-white/60 print:text-slate-500">Invoice #</div>
                  <div className="text-3xl font-extrabold mt-1 font-mono">{sale.invoiceNumber}</div>
                  <div className="text-xs text-white/85 mt-1 print:text-slate-500 flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />{formatDate((sale as any).soldAt || sale.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Weight Summary */}
            <div className="px-8 py-4 border-b-2 border-slate-100 bg-slate-50/50 grid sm:grid-cols-3 gap-3 print:bg-white">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Customer</div>
                  <div className="font-extrabold">{sale.customerName || 'Walk-in'}</div>
                  {sale.customerPhone && <div className="text-xs text-slate-600">{sale.customerPhone}</div>}
                  {sale.customerCnic && <div className="text-xs text-slate-500 font-mono">CNIC: {sale.customerCnic}</div>}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Scale className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-amber-700">Total Weight</div>
                  <div className="font-extrabold text-lg text-amber-900">{totalWeight.toFixed(3)}g</div>
                  <div className="text-xs text-slate-500">{totalItems} pieces</div>
                </div>
              </div>
              {hasHallmark && (
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-emerald-700">Hallmark</div>
                    <div className="font-extrabold text-emerald-900">Verified ✓</div>
                    <div className="text-xs text-slate-500">100% purity certified</div>
                  </div>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="px-8 py-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b-2 border-slate-300 bg-gradient-to-r from-amber-50 to-slate-50 print:bg-white">
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase w-8">#</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase">Description</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase text-right w-24">Net Wt (g)</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase text-right w-28">Rate/g</th>
                      <th className="py-3 px-2 font-extrabold text-[10px] uppercase text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).map((it: any, idx: number) => {
                      const metalValue = Number(it.netWeight) * Number(it.ratePerGram);
                      const makingCharge = (Number(it.makingChargePerGram || 0) * Number(it.netWeight)) + Number(it.makingChargeFixed || 0) + (metalValue * Number(it.makingChargePct || 0) / 100);
                      const wastageValue = (Number(it.wastagePct || 0) / 100) * metalValue;
                      const itemTotal = (metalValue + makingCharge + wastageValue + Number(it.polishCharges || 0) + Number(it.hallmarkCharges || 0) + Number(it.stoneValue || 0)) * Number(it.quantity);
                      return (
                        <tr key={idx} className="border-b border-slate-100 align-top hover:bg-slate-50/50">
                          <td className="py-4 px-2 text-slate-500 font-mono text-xs">{idx + 1}</td>
                          <td className="py-4 px-2">
                            <div className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                              <span className="text-lg">{METAL_ICONS[it.metalType]}</span>
                              {it.productName}
                            </div>
                            <div className="text-xs font-bold text-slate-600 mt-0.5">
                              {it.metalType.replace('_', ' ')} • {it.purity.replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-')}K • Qty: {it.quantity}
                            </div>
                            {it.hallmarkNumber && (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-[10px] font-bold text-emerald-800 print:bg-white print:border-slate-400">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Hallmark: <span className="font-mono">{it.hallmarkNumber}</span>
                              </div>
                            )}
                            <div className="mt-1 text-[10px] text-slate-500 space-x-2">
                              <span>Gross: {Number(it.grossWeight || 0).toFixed(3)}g</span>
                              {it.stoneWeight > 0 && <span>• Stone: {Number(it.stoneWeight).toFixed(3)}g</span>}
                              {it.makingChargePct > 0 && <span>• Making: {it.makingChargePct}%</span>}
                              {it.wastagePct > 0 && <span>• Wastage: {it.wastagePct}%</span>}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{Number(it.netWeight).toFixed(3)}</div>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="text-slate-700 font-bold tabular-nums">{formatPKR(it.ratePerGram)}</div>
                            <div className="text-[9px] text-slate-500 font-semibold">per gram</div>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="font-extrabold text-amber-700 tabular-nums text-base">{formatPKR(itemTotal)}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exchange section */}
            {sale.exchangeValue > 0 && (
              <div className="px-8 pb-4">
                <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 print:bg-white print:border-slate-400">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="h-4 w-4 text-violet-600" />
                    <h4 className="font-extrabold text-violet-900 text-sm">Old Gold Exchange</h4>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    {(sale as any).exchangeMetalGrams > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-extrabold text-violet-700">Weight</div>
                        <div className="font-extrabold text-violet-900">{Number((sale as any).exchangeMetalGrams).toFixed(3)}g</div>
                      </div>
                    )}
                    {(sale as any).exchangeMetalPurity && (
                      <div>
                        <div className="text-[10px] uppercase font-extrabold text-violet-700">Purity</div>
                        <div className="font-extrabold text-violet-900">{(sale as any).exchangeMetalPurity}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-emerald-700">Exchange Value</div>
                      <div className="font-extrabold text-emerald-700 text-lg">{formatPKR(sale.exchangeValue)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TOTALS */}
            <div className="px-8 py-6 border-t-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white print:bg-white">
              <div className="ml-auto max-w-md space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-semibold tabular-nums">{formatPKR(sale.subtotal || 0)}</span></div>
                {sale.gstAmount > 0 && <div className="flex justify-between text-sm"><span className="text-blue-700">GST</span><span className="font-bold text-blue-700 tabular-nums">+{formatPKR(sale.gstAmount)}</span></div>}
                {sale.discount > 0 && <div className="flex justify-between text-sm"><span className="text-amber-700">Discount</span><span className="font-bold text-amber-700 tabular-nums">-{formatPKR(sale.discount)}</span></div>}
                {sale.exchangeValue > 0 && <div className="flex justify-between text-sm"><span className="text-violet-700">Exchange Credit</span><span className="font-bold text-violet-700 tabular-nums">-{formatPKR(sale.exchangeValue)}</span></div>}
                <div className="flex items-center justify-between text-lg pt-3 border-t-2 border-slate-300">
                  <span className="font-extrabold text-slate-900">GRAND TOTAL</span>
                  <span className="font-extrabold text-amber-700 text-3xl tabular-nums">{formatPKR(sale.total)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Paid ({sale.paymentMethod})</span><span className="font-bold tabular-nums">{formatPKR(sale.paidAmount)}</span></div>
                  {(sale.total - sale.paidAmount) > 0 && (
                    <div className="flex justify-between text-sm rounded-lg bg-amber-50 border-2 border-amber-300 px-3 py-2 mt-2 print:bg-white"><span className="text-amber-800 font-bold">Balance Due</span><span className="font-extrabold text-amber-700 text-base tabular-nums">{formatPKR(sale.total - sale.paidAmount)}</span></div>
                  )}
                </div>
                <div className="pt-3 border-t border-dashed border-slate-300 text-xs italic text-slate-600">
                  <strong>In Words:</strong> Rupees {numberToWords(sale.total)} Only
                </div>
              </div>
            </div>

            {/* BUYBACK & WARRANTY */}
            <div className="px-8 py-5 border-t-2 border-slate-100 bg-amber-50/50 print:bg-white">
              <div className="text-[10px] uppercase font-extrabold text-amber-700 mb-2">Buyback & Warranty Terms</div>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                <li>Buyback available at 85-95% of prevailing metal rate (subject to condition & purity verification)</li>
                <li>Making charges & wastage are non-refundable on buyback</li>
                <li>Original invoice required for buyback, exchange, or warranty claims</li>
                <li>Hallmark verified — 100% purity guaranteed as per BIS/PGJDC standards</li>
                <li>Gemstones certified separately (see gemstone certificates if provided)</li>
                <li>Exchange rate calculated on today\'s market price at time of exchange</li>
              </ul>
            </div>

            <div className="px-8 py-5 text-center border-t-2 border-double border-slate-300 bg-gradient-to-br from-amber-50 to-yellow-50 print:bg-white">
              <div className="text-lg font-extrabold text-slate-900">💎 Shukriya! 🙏</div>
              <div className="text-xs italic text-slate-600 mt-2">Hallmark verified • Purity guaranteed</div>
              <div className="text-[10px] text-slate-400 mt-2">Powered by Nafaa POS</div>
            </div>
          </div>
        )}

        {/* ─── THERMAL ─── */}
        {(format === 'thermal58' || format === 'thermal80') && (
          <div className={`receipt-thermal bg-white shadow-2xl print:shadow-none mx-auto ${format === 'thermal58' ? 'w-[58mm]' : 'w-[80mm]'}`}
            style={{ fontFamily: 'Consolas, "Courier New", monospace' }}>
            <div className={`${format === 'thermal58' ? 'p-2 text-[10px]' : 'p-3 text-[11px]'} leading-tight`}>
              <div className="text-center mb-2">
                {logoUrl && <img src={logoUrl} alt="" className={`mx-auto mb-2 object-contain ${format === 'thermal58' ? 'h-12 w-12' : 'h-14 w-14'}`} />}
                <div className={`font-extrabold ${format === 'thermal58' ? 'text-sm' : 'text-base'}`}>{shopName.toUpperCase()}</div>
                {shopAddress && <div className="text-[9px] mt-0.5">{shopAddress}</div>}
                {shopPhone && <div className="text-[9px]">📞 {shopPhone}</div>}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between"><span className="font-bold">Invoice #</span><span className="font-bold">{sale.invoiceNumber}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{formatDate((sale as any).soldAt || sale.createdAt)}</span></div>
              </div>

              {(sale.customerName || sale.customerPhone) && (
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  {sale.customerName && <div className="flex justify-between"><span className="font-bold">Customer:</span><span className="font-bold">{sale.customerName}</span></div>}
                  {sale.customerPhone && <div className="flex justify-between"><span>Phone:</span><span>{sale.customerPhone}</span></div>}
                  {sale.customerCnic && <div className="flex justify-between"><span>CNIC:</span><span>{sale.customerCnic}</span></div>}
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="font-bold text-center mb-1">ITEMS</div>
                {(sale.items || []).map((it: any, idx: number) => {
                  const metalValue = Number(it.netWeight) * Number(it.ratePerGram);
                  const makingCharge = (Number(it.makingChargePerGram || 0) * Number(it.netWeight)) + Number(it.makingChargeFixed || 0) + (metalValue * Number(it.makingChargePct || 0) / 100);
                  const wastageValue = (Number(it.wastagePct || 0) / 100) * metalValue;
                  const itemTotal = (metalValue + makingCharge + wastageValue + Number(it.polishCharges || 0) + Number(it.hallmarkCharges || 0) + Number(it.stoneValue || 0)) * Number(it.quantity);
                  return (
                    <div key={idx} className="mb-1.5">
                      <div className="font-bold">{idx + 1}. {it.productName}</div>
                      <div className="text-[9px]">
                        {METAL_ICONS[it.metalType]} {it.metalType} {it.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K
                      </div>
                      <div className="text-[9px] pl-2">
                        <div>Net: {Number(it.netWeight).toFixed(3)}g @ Rs {Number(it.ratePerGram).toLocaleString()}/g</div>
                        {it.hallmarkNumber && <div>Hallmark: {it.hallmarkNumber}</div>}
                        {it.makingChargePct > 0 && <div>Making: {it.makingChargePct}%</div>}
                        {it.wastagePct > 0 && <div>Wastage: {it.wastagePct}%</div>}
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>Qty: {it.quantity}</span>
                        <span className="font-bold">{formatPKR(itemTotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between"><span>Total Weight:</span><span className="font-bold">{totalWeight.toFixed(3)}g</span></div>
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatPKR(sale.subtotal || 0)}</span></div>
                {sale.gstAmount > 0 && <div className="flex justify-between"><span>GST:</span><span>+{formatPKR(sale.gstAmount)}</span></div>}
                {sale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatPKR(sale.discount)}</span></div>}
                {sale.exchangeValue > 0 && <div className="flex justify-between"><span>Exchange:</span><span>-{formatPKR(sale.exchangeValue)}</span></div>}
                <div className={`flex justify-between border-t border-double border-slate-700 mt-1 pt-1 font-extrabold ${format === 'thermal58' ? 'text-xs' : 'text-sm'}`}>
                  <span>TOTAL:</span><span>{formatPKR(sale.total)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between"><span>Paid ({sale.paymentMethod}):</span><span className="font-bold">{formatPKR(sale.paidAmount)}</span></div>
                {(sale.total - sale.paidAmount) > 0 && <div className="flex justify-between font-bold"><span>BALANCE:</span><span>{formatPKR(sale.total - sale.paidAmount)}</span></div>}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1 text-[9px] italic">
                <div className="font-bold mb-0.5">Buyback Terms:</div>
                <div>• Buyback @ 85-95% of prevailing rate</div>
                <div>• Making/wastage non-refundable</div>
                <div>• Original invoice required</div>
                <div>• Hallmark verified — purity guaranteed</div>
              </div>

              <div className="text-center font-bold mt-2">💎 Shukriya! 🙏</div>
              <div className="text-center text-[8px] mt-1 text-slate-600">Powered by Nafaa POS</div>
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
