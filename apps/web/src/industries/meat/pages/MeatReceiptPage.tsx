import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, X, Beef, ShieldCheck, Weight,
  MapPin, Phone, Calendar, User, CheckCircle2, ShieldAlert, Award, Snowflake,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const MEAT_UNITS = new Set(['kg', 'gram', 'pound', 'piece', 'dozen', 'whole', 'half', 'quarter']);

type Format = 'a4' | 'thermal80' | 'thermal58';

export default function MeatReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<Format>('a4');
  const isAutoOpened = searchParams.get('auto') === '1';

  const { data: sale, isLoading } = useQuery({
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

  const handleWhatsApp = () => {
    if (!sale?.customer?.phone) return toast.error('Customer phone not available');
    const phone = sale.customer.phone.replace(/[^0-9]/g, '');
    const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const shopName = sale.tenant?.settings?.shopName || sale.tenant?.name || 'Meat Shop';

    const lines: string[] = [];
    lines.push(`🥩 *${shopName}*`);
    lines.push('');
    lines.push(`Assalam-o-Alaikum ${sale.customer.name}!`);
    lines.push('Thanks for your purchase 🙏');
    lines.push('');
    lines.push(`*Invoice:* ${sale.saleNumber}`);
    lines.push(`*Date:* ${formatDate(sale.soldAt)}`);
    lines.push('');
    lines.push('*Items:*');
    sale.items.forEach((it: any, i: number) => {
      lines.push(`${i + 1}. ${it.product.name} × ${it.quantity} ${it.product.unit} = ${formatPKR(it.total)}`);
      if (it.note) lines.push(`   _${it.note}_`);
    });
    lines.push('');
    lines.push(`Subtotal: ${formatPKR(sale.subtotal)}`);
    if (sale.discount > 0) lines.push(`Discount: -${formatPKR(sale.discount)}`);
    lines.push(`*TOTAL: ${formatPKR(sale.total)}*`);
    if (sale.creditAmount > 0) lines.push(`Balance: ${formatPKR(sale.creditAmount)}`);
    lines.push('');
    lines.push('_Store meat properly. Keep refrigerated._');

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" /></div>;
  }
  if (!sale) {
    return <div className="min-h-screen flex flex-col items-center justify-center"><p className="font-bold">Receipt not found</p><Link to="/sales" className="mt-4 text-red-600 hover:underline">← Back</Link></div>;
  }

  const settings = sale.tenant?.settings;
  const shopName = settings?.shopName || sale.tenant?.name || 'Meat Shop';
  const shopAddress = [settings?.shopAddress, settings?.shopCity].filter(Boolean).join(', ');
  const shopPhone = settings?.shopPhone || sale.tenant?.phone || '';
  const logoUrl = settings?.logoUrl;
  const receiptFooter = settings?.receiptFooter;
  const isVoided = sale.status === 'VOIDED';

  const totalKg = sale.items.reduce((s: number, it: any) =>
    MEAT_UNITS.has(it.product?.unit || '') ? s + Number(it.quantity || 0) : s, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-6 px-4 print:bg-white print:py-0 print:px-0">
      <div className={`mx-auto space-y-4 ${format === 'a4' ? 'max-w-4xl' : 'max-w-md'}`}>
        {isAutoOpened && (
          <div className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 flex items-center gap-3 shadow-lg print:hidden">
            <CheckCircle2 className="h-6 w-6" />
            <div className="flex-1">
              <div className="font-extrabold">Sale Complete! 🥩</div>
              <div className="text-xs text-white/90">Print or send via WhatsApp</div>
            </div>
            <Link to="/pos" className="text-xs font-extrabold underline">→ New Sale</Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
          <button onClick={() => navigate('/sales')} className="inline-flex items-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
              {(['a4', 'thermal80', 'thermal58'] as Format[]).map((f, i) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-3 py-2.5 text-xs font-bold transition ${format === f ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-50'} ${i > 0 ? 'border-l-2 border-slate-200' : ''}`}>
                  {f === 'a4' ? 'A4' : f === 'thermal80' ? '80mm' : '58mm'}
                </button>
              ))}
            </div>
            <button onClick={handleWhatsApp} disabled={!sale.customer?.phone}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-4 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            {!isVoided && (
              <button onClick={() => { const r = prompt('Void reason?'); if (r !== null) voidMutation.mutate(r); }}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
                <X className="h-4 w-4" /> Void
              </button>
            )}
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 px-4 py-2.5 text-sm font-bold text-white shadow-md">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {isVoided && (
          <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 px-5 py-4 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
            <div className="font-extrabold text-rose-900">SALE VOIDED</div>
          </div>
        )}

        {format === 'a4' && (
          <div className="receipt-a4 bg-white shadow-2xl rounded-3xl border overflow-hidden print:shadow-none print:border-none print:rounded-none">
            <div className="relative bg-gradient-to-br from-slate-950 via-red-900 to-rose-800 text-white px-8 py-7 print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-red-400/20 blur-2xl print:hidden" />
              <div className="relative flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-4">
                  {logoUrl && <img src={logoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover bg-white p-1.5 shadow-lg" />}
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold print:hidden">
                      <Beef className="h-3 w-3" /> Meat Invoice
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
                  <div className="text-3xl font-extrabold mt-1 font-mono">{sale.saleNumber}</div>
                  <div className="text-xs text-white/85 mt-1 print:text-slate-500 flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />{formatDate(sale.soldAt)}
                  </div>
                </div>
              </div>
            </div>

            {sale.customer && (
              <div className="px-8 py-4 border-b-2 border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3 print:bg-white">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500">Customer</div>
                    <div className="font-extrabold text-lg">{sale.customer.name}</div>
                    {sale.customer.phone && <div className="text-sm text-slate-600">{sale.customer.phone}</div>}
                  </div>
                </div>
                {totalKg > 0 && (
                  <div className="rounded-xl bg-red-100 border-2 border-red-300 px-4 py-2 text-center">
                    <div className="text-[10px] uppercase font-extrabold text-red-700">Total Weight</div>
                    <div className="text-2xl font-extrabold text-red-900 tabular-nums">{totalKg.toFixed(3)}</div>
                    <div className="text-[10px] font-bold text-red-700">kg</div>
                  </div>
                )}
              </div>
            )}

            <div className="px-8 py-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b-2 border-slate-300 bg-gradient-to-r from-red-50 to-slate-50 print:bg-white">
                    <th className="py-3 px-2 font-extrabold text-[10px] uppercase w-8">#</th>
                    <th className="py-3 px-2 font-extrabold text-[10px] uppercase">Item</th>
                    <th className="py-3 px-2 font-extrabold text-[10px] uppercase text-center w-24">Weight</th>
                    <th className="py-3 px-2 font-extrabold text-[10px] uppercase text-right w-24">Rate/kg</th>
                    <th className="py-3 px-2 font-extrabold text-[10px] uppercase text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((it: any, idx: number) => {
                    const isHalal = (it.note || '').includes('HALAL');
                    const isFrozen = (it.note || '').includes('FROZEN');
                    return (
                      <tr key={it.id} className="border-b border-slate-100 align-top hover:bg-slate-50/50">
                        <td className="py-3 px-2 text-slate-500 font-mono text-xs">{idx + 1}</td>
                        <td className="py-3 px-2">
                          <div className="font-extrabold text-slate-900">{it.product.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {isHalal && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                                <ShieldCheck className="h-2 w-2" /> HALAL
                              </span>
                            )}
                            {isFrozen && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-extrabold">
                                <Snowflake className="h-2 w-2" /> FROZEN
                              </span>
                            )}
                          </div>
                          {it.note && (
                            <div className="mt-1 text-[10px] font-mono text-slate-600 truncate max-w-md">{it.note}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="text-xl font-extrabold text-slate-900 tabular-nums">{Number(it.quantity).toFixed(3)}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">{it.product.unit}</div>
                        </td>
                        <td className="py-3 px-2 text-right font-bold tabular-nums">{formatPKR(it.price)}</td>
                        <td className="py-3 px-2 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(it.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-8 py-6 border-t-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white print:bg-white">
              <div className="ml-auto max-w-md space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-semibold tabular-nums">{formatPKR(sale.subtotal)}</span></div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-amber-700">Discount</span><span className="font-bold text-amber-700 tabular-nums">-{formatPKR(sale.discount)}</span></div>
                )}
                <div className="flex items-center justify-between text-lg pt-3 border-t-2 border-slate-300">
                  <span className="font-extrabold text-slate-900">GRAND TOTAL</span>
                  <span className="font-extrabold text-red-700 text-3xl tabular-nums">{formatPKR(sale.total)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Paid ({sale.paymentMethod})</span><span className="font-bold tabular-nums">{formatPKR(sale.paidAmount)}</span></div>
                  {sale.creditAmount > 0 && (
                    <div className="flex justify-between text-sm rounded-lg bg-amber-50 border-2 border-amber-300 px-3 py-2 mt-2 print:bg-white"><span className="text-amber-800 font-bold">Udhaar</span><span className="font-extrabold text-amber-700 text-base tabular-nums">{formatPKR(sale.creditAmount)}</span></div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t-2 border-slate-100 bg-red-50/50 print:bg-white">
              <div className="text-[10px] uppercase font-extrabold text-red-700 mb-2">Storage Instructions</div>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                <li>Keep refrigerated at 0-4°C or frozen at -18°C</li>
                <li>Consume fresh meat within recommended shelf life</li>
                <li>Fresh meat is non-returnable — inspect at time of purchase</li>
                <li>Cook thoroughly before consumption</li>
              </ul>
            </div>

            <div className="px-8 py-5 text-center border-t-2 border-double border-slate-300 bg-gradient-to-br from-red-50 to-rose-50 print:bg-white">
              {receiptFooter && <div className="text-sm italic text-slate-700 mb-2">{receiptFooter}</div>}
              <div className="text-lg font-extrabold text-slate-900">🥩 Shukriya! 🙏</div>
              <div className="text-[10px] text-slate-400 mt-2">Powered by Nafaa POS</div>
            </div>
          </div>
        )}

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
                <div className="flex justify-between"><span className="font-bold">Invoice #</span><span className="font-bold">{sale.saleNumber}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{formatDate(sale.soldAt)}</span></div>
              </div>

              {sale.customer && (
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between"><span className="font-bold">Customer:</span><span className="font-bold">{sale.customer.name}</span></div>
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="font-bold text-center mb-1">ITEMS</div>
                {sale.items.map((item: any, idx: number) => (
                  <div key={item.id} className="mb-1.5">
                    <div className="font-bold">{idx + 1}. {item.product.name}</div>
                    {item.note && <div className="pl-2 text-[9px] italic">{item.note}</div>}
                    <div className="flex justify-between pl-2">
                      <span>{Number(item.quantity).toFixed(3)} {item.product.unit} × {formatPKR(item.price)}</span>
                      <span className="font-bold">{formatPKR(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {totalKg > 0 && (
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1 text-center font-bold">
                  Total Weight: {totalKg.toFixed(3)} kg
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatPKR(sale.subtotal)}</span></div>
                {sale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatPKR(sale.discount)}</span></div>}
                <div className={`flex justify-between border-t border-double border-slate-700 mt-1 pt-1 font-extrabold ${format === 'thermal58' ? 'text-xs' : 'text-sm'}`}>
                  <span>TOTAL:</span><span>{formatPKR(sale.total)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between"><span>Paid ({sale.paymentMethod}):</span><span className="font-bold">{formatPKR(sale.paidAmount)}</span></div>
                {sale.creditAmount > 0 && <div className="flex justify-between font-bold"><span>UDHAAR:</span><span>{formatPKR(sale.creditAmount)}</span></div>}
              </div>

              {receiptFooter && <div className="text-center text-[9px] italic border-t border-dashed border-slate-400 pt-1">{receiptFooter}</div>}
              <div className="text-center font-bold mt-2">🥩 Shukriya! 🙏</div>
              <div className="text-center text-[8px] mt-1 text-slate-600">Powered by Nafaa POS</div>

              {isVoided && <div className="mt-2 border-2 border-rose-600 text-rose-600 font-extrabold text-center py-1">*** VOIDED ***</div>}
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
