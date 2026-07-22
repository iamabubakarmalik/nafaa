import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, MessageCircle, X, Scissors, Star, Award,
  MapPin, Phone, Calendar, User, CheckCircle2, ShieldAlert, Clock,
  Sparkles, Heart, DollarSign, Users, Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { appointmentsApi } from '../api/appointments.api';
import { formatPKR } from '@core/lib/format';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

type Format = 'a4' | 'thermal80' | 'thermal58';

export default function SalonReceiptPage() {
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

  // Try to find matching appointment
  const { data: appointment } = useQuery({
    queryKey: ['salon-apt-for-sale', id],
    queryFn: async () => {
      if (!sale) return null;
      try {
        const all = await appointmentsApi.list({});
        return all.find((a: any) => a.saleId === id) ?? null;
      } catch { return null; }
    },
    enabled: !!id && !!sale,
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
    const shopName = sale.tenant?.settings?.shopName || sale.tenant?.name || 'Our Salon';

    const lines: string[] = [];
    lines.push(`💇 *${shopName}*`);
    lines.push('');
    lines.push(`Assalam-o-Alaikum ${sale.customer.name || 'Guest'}!`);
    lines.push('Thank you for visiting us today 🌟');
    lines.push('');
    lines.push(`*Receipt:* ${sale.saleNumber}`);
    lines.push(`*Date:* ${formatDate(sale.soldAt)}`);
    if (appointment) {
      lines.push(`*Appointment:* ${appointment.appointmentNumber}`);
    }
    lines.push('');
    lines.push('*Services:*');
    sale.items.forEach((it: any, i: number) => {
      lines.push(`${i + 1}. ${it.product.name} = ${formatPKR(it.total)}`);
      if (it.note) lines.push(`   _${it.note}_`);
    });
    lines.push('');
    lines.push(`Subtotal: ${formatPKR(sale.subtotal)}`);
    if (sale.discount > 0) lines.push(`Discount: -${formatPKR(sale.discount)}`);
    lines.push(`*TOTAL: ${formatPKR(sale.total)}*`);
    lines.push('');
    lines.push('_Please rate your experience!_ ⭐');
    lines.push('_Book your next visit soon!_ 💖');

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" /></div>;
  }
  if (!sale) {
    return <div className="min-h-screen flex flex-col items-center justify-center"><p className="font-bold">Receipt not found</p><Link to="/sales" className="mt-4 text-pink-600 hover:underline">← Back</Link></div>;
  }

  const settings = sale.tenant?.settings;
  const shopName = settings?.shopName || sale.tenant?.name || 'Salon';
  const shopAddress = [settings?.shopAddress, settings?.shopCity].filter(Boolean).join(', ');
  const shopPhone = settings?.shopPhone || sale.tenant?.phone || '';
  const logoUrl = settings?.logoUrl;
  const receiptFooter = settings?.receiptFooter;
  const isVoided = sale.status === 'VOIDED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 py-6 px-4 print:bg-white print:py-0 print:px-0">
      <div className={`mx-auto space-y-4 ${format === 'a4' ? 'max-w-4xl' : 'max-w-md'}`}>
        {isAutoOpened && (
          <div className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white px-5 py-3 flex items-center gap-3 shadow-lg print:hidden">
            <CheckCircle2 className="h-6 w-6" />
            <div className="flex-1">
              <div className="font-extrabold">Service Complete! 💇✨</div>
              <div className="text-xs text-white/90">Print receipt or send via WhatsApp</div>
            </div>
            <Link to="/pos" className="text-xs font-extrabold underline">→ New Appointment</Link>
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
                  className={`px-3 py-2.5 text-xs font-bold transition ${format === f ? 'bg-pink-600 text-white' : 'text-slate-700 hover:bg-slate-50'} ${i > 0 ? 'border-l-2 border-slate-200' : ''}`}>
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 px-4 py-2.5 text-sm font-bold text-white shadow-md">
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

        {/* ─── A4 ─── */}
        {format === 'a4' && (
          <div className="receipt-a4 bg-white shadow-2xl rounded-3xl border overflow-hidden print:shadow-none print:border-none print:rounded-none">
            <div className="relative bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white px-8 py-7 print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl print:hidden" />
              <div className="relative flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-4">
                  {logoUrl && <img src={logoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover bg-white p-1.5 shadow-lg" />}
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold print:hidden">
                      <Scissors className="h-3 w-3" /> Salon Service Receipt
                    </div>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">{shopName}</h1>
                    <div className="mt-3 space-y-1 text-xs text-white/85 print:text-slate-600">
                      {shopAddress && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{shopAddress}</div>}
                      {shopPhone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{shopPhone}</div>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-white/60 print:text-slate-500">Receipt #</div>
                  <div className="text-3xl font-extrabold mt-1 font-mono">{sale.saleNumber}</div>
                  <div className="text-xs text-white/85 mt-1 print:text-slate-500 flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />{formatDate(sale.soldAt)}
                  </div>
                  {appointment && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/30 text-amber-100 text-[10px] font-extrabold border border-amber-300/40">
                      <Sparkles className="h-2.5 w-2.5" />
                      APT: {appointment.appointmentNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* APPOINTMENT META */}
            {appointment && (
              <div className="px-8 py-4 bg-gradient-to-r from-pink-50 via-white to-rose-50 border-b-2 border-pink-200 print:bg-white print:border-slate-300">
                <div className="grid sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-pink-700">Appointment</div>
                    <div className="font-extrabold text-slate-900 text-sm font-mono">{appointment.appointmentNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-pink-700">Scheduled</div>
                    <div className="font-extrabold text-slate-900 text-sm">{formatDate(appointment.scheduledStart)}</div>
                  </div>
                  {(appointment as any).numberOfGuests && (
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-pink-700">Guests</div>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1">
                        <Users className="h-4 w-4" />{(appointment as any).numberOfGuests}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-pink-700">Status</div>
                    <div className="font-extrabold text-slate-900">{appointment.status}</div>
                  </div>
                </div>
                {appointment.customerNotes && (
                  <div className="mt-3 pt-3 border-t border-pink-200 flex items-start gap-2">
                    <Heart className="h-3 w-3 text-pink-600 mt-0.5" />
                    <div className="text-xs italic text-slate-700"><strong>Notes:</strong> {appointment.customerNotes}</div>
                  </div>
                )}
              </div>
            )}

            {sale.customer && (
              <div className="px-8 py-4 border-b-2 border-slate-100 bg-slate-50/50 flex items-start gap-3 print:bg-white">
                <User className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Customer</div>
                  <div className="font-extrabold text-lg">{sale.customer.name}</div>
                  {sale.customer.phone && <div className="text-sm text-slate-600">{sale.customer.phone}</div>}
                </div>
              </div>
            )}

            {/* SERVICES */}
            <div className="px-8 py-6 space-y-3">
              {sale.items.map((it: any, idx: number) => {
                const aptSvc = appointment?.services?.find((s: any) => s.serviceId === it.product.id);
                return (
                  <div key={it.id} className="rounded-2xl border-2 border-slate-200 overflow-hidden print:rounded-none print:border">
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3 border-b-2 border-slate-100 flex items-start justify-between gap-3 print:bg-white">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center">
                          <Scissors className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-extrabold text-slate-500">Service #{idx + 1}</div>
                          <div className="font-extrabold text-lg text-slate-900">{it.product.name}</div>
                          {aptSvc?.staffName && (
                            <div className="text-xs font-bold text-violet-700 mt-0.5 inline-flex items-center gap-1">
                              <User className="h-3 w-3" /> Served by: {aptSvc.staffName}
                            </div>
                          )}
                          {aptSvc?.durationMinutes && (
                            <div className="text-xs text-slate-500 font-semibold inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {aptSvc.durationMinutes} min
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(it.total)}</div>
                      </div>
                    </div>

                    {((aptSvc?.commissionAmount) ?? 0) > 0 && (
                      <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 print:bg-white flex items-center justify-between">
                        <div className="text-xs font-bold text-amber-700 inline-flex items-center gap-1">
                          <Award className="h-3 w-3" /> Staff Commission
                        </div>
                        <div className="text-sm font-extrabold text-amber-700 tabular-nums">{formatPKR((aptSvc as any).commissionAmount)}</div>
                      </div>
                    )}

                    {(it.note || aptSvc?.notes) && (
                      <div className="px-4 py-2 border-t border-slate-100 text-xs italic text-amber-700">
                        📝 {aptSvc?.notes || it.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TOTALS */}
            <div className="px-8 py-6 border-t-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white print:bg-white">
              <div className="ml-auto max-w-md space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-semibold tabular-nums">{formatPKR(sale.subtotal)}</span></div>
                {((appointment as any)?.serviceCharge ?? 0) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-orange-700 font-semibold">Service Charge</span><span className="font-bold text-orange-700 tabular-nums">+{formatPKR((appointment as any).serviceCharge)}</span></div>
                )}
                {((appointment as any)?.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-slate-600 font-semibold">Tax</span><span className="font-bold tabular-nums">+{formatPKR((appointment as any).taxAmount)}</span></div>
                )}
                {((appointment as any)?.tip ?? 0) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Heart className="h-3 w-3" />Tip</span><span className="font-bold text-emerald-700 tabular-nums">+{formatPKR((appointment as any).tip)}</span></div>
                )}
                {sale.discount > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-amber-700 font-semibold">Discount</span><span className="font-bold text-amber-700 tabular-nums">-{formatPKR(sale.discount)}</span></div>
                )}
                <div className="flex items-center justify-between text-lg pt-3 border-t-2 border-slate-300">
                  <span className="font-extrabold text-slate-900">GRAND TOTAL</span>
                  <span className="font-extrabold text-pink-700 text-3xl tabular-nums">{formatPKR(sale.total)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Paid ({sale.paymentMethod})</span><span className="font-bold tabular-nums">{formatPKR(sale.paidAmount)}</span></div>
                  {sale.changeAmount > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-emerald-700 font-semibold">Change</span><span className="font-bold text-emerald-700 tabular-nums">{formatPKR(sale.changeAmount)}</span></div>
                  )}
                  {sale.creditAmount > 0 && (
                    <div className="flex justify-between text-sm rounded-lg bg-amber-50 border-2 border-amber-300 px-3 py-2 mt-2 print:bg-white"><span className="text-amber-800 font-bold">Balance/Udhaar</span><span className="font-extrabold text-amber-700 text-base tabular-nums">{formatPKR(sale.creditAmount)}</span></div>
                  )}
                </div>
              </div>
            </div>

            {/* NEXT VISIT REMINDER */}
            <div className="px-8 py-5 border-t-2 border-slate-100 bg-pink-50/50 print:bg-white">
              <div className="text-[10px] uppercase font-extrabold text-pink-700 mb-2 flex items-center gap-1">
                <Star className="h-3 w-3" /> We'd Love to See You Again
              </div>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                <li>Book your next visit within 4-6 weeks for best results</li>
                <li>Share your experience — WhatsApp us for feedback</li>
                <li>Refer a friend and get 10% off your next visit</li>
              </ul>
            </div>

            <div className="px-8 py-5 text-center border-t-2 border-double border-slate-300 bg-gradient-to-br from-pink-50 to-rose-50 print:bg-white">
              {receiptFooter && <div className="text-sm italic text-slate-700 mb-2">{receiptFooter}</div>}
              <div className="text-lg font-extrabold text-slate-900">💇 Thank You! Come Again 💖</div>
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
                <div className="flex justify-between"><span className="font-bold">Receipt #</span><span className="font-bold">{sale.saleNumber}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{formatDate(sale.soldAt)}</span></div>
                {appointment && <div className="flex justify-between"><span>APT #</span><span className="font-bold">{appointment.appointmentNumber}</span></div>}
              </div>

              {sale.customer && (
                <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                  <div className="flex justify-between"><span className="font-bold">Customer:</span><span className="font-bold">{sale.customer.name}</span></div>
                  {sale.customer.phone && <div className="flex justify-between"><span>Phone:</span><span>{sale.customer.phone}</span></div>}
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="font-bold text-center mb-1">SERVICES</div>
                {sale.items.map((item: any, idx: number) => {
                  const aptSvc = appointment?.services?.find((s: any) => s.serviceId === item.product.id);
                  return (
                    <div key={item.id} className="mb-1.5">
                      <div className="font-bold">{idx + 1}. {item.product.name}</div>
                      {aptSvc?.staffName && (
                        <div className="pl-3 text-[9px]">Staff: {aptSvc.staffName}</div>
                      )}
                      {aptSvc?.durationMinutes && (
                        <div className="pl-3 text-[9px]">Duration: {aptSvc.durationMinutes}m</div>
                      )}
                      <div className="flex justify-between pl-2">
                        <span>1 × {formatPKR(item.price)}</span>
                        <span className="font-bold">{formatPKR(item.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatPKR(sale.subtotal)}</span></div>
                {((appointment as any)?.serviceCharge ?? 0) > 0 && <div className="flex justify-between"><span>Service:</span><span>+{formatPKR((appointment as any).serviceCharge)}</span></div>}
                {((appointment as any)?.taxAmount ?? 0) > 0 && <div className="flex justify-between"><span>Tax:</span><span>+{formatPKR((appointment as any).taxAmount)}</span></div>}
                {((appointment as any)?.tip ?? 0) > 0 && <div className="flex justify-between"><span>Tip:</span><span>+{formatPKR((appointment as any).tip)}</span></div>}
                {sale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatPKR(sale.discount)}</span></div>}
                <div className={`flex justify-between border-t border-double border-slate-700 mt-1 pt-1 font-extrabold ${format === 'thermal58' ? 'text-xs' : 'text-sm'}`}>
                  <span>TOTAL:</span><span>{formatPKR(sale.total)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1">
                <div className="flex justify-between"><span>Paid ({sale.paymentMethod}):</span><span className="font-bold">{formatPKR(sale.paidAmount)}</span></div>
                {sale.creditAmount > 0 && <div className="flex justify-between font-bold"><span>BALANCE:</span><span>{formatPKR(sale.creditAmount)}</span></div>}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 mb-1 text-[9px] italic text-center">
                <div className="font-bold">💖 Come Again!</div>
                <div>Book next visit in 4-6 weeks</div>
              </div>

              {receiptFooter && <div className="text-center text-[9px] italic border-t border-dashed border-slate-400 pt-1">{receiptFooter}</div>}
              <div className="text-center font-bold mt-2">💇 Thank You! 🙏</div>
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
