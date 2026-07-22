import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, X, Ban, Sparkles, User, Phone, Mail,
  Printer, FileText, Calendar, Package, Building,
} from 'lucide-react';
import { quotationsApi } from '../api/quotations.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: q, isLoading } = useQuery({
    queryKey: ['hardware-quotation', id],
    queryFn: () => quotationsApi.getOne(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => quotationsApi.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['hardware-quotation', id] });
    },
  });

  if (isLoading || !q) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const daysLeft = differenceInDays(new Date(q.validUntil), new Date());

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/hardware/quotations')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                Rev {q.revisionNumber}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{q.quotationNumber}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-extrabold uppercase">{q.status}</span>
                <span className="text-white/80 font-semibold">Valid till {format(new Date(q.validUntil), 'dd MMM yyyy')}</span>
                {daysLeft < 0 && <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-xs font-extrabold uppercase">EXPIRED</span>}
                {daysLeft >= 0 && daysLeft <= 3 && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-xs font-extrabold uppercase animate-pulse">EXPIRES IN {daysLeft}d</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />Print
            </button>
            {q.status === 'DRAFT' && (
              <Button className="bg-white text-slate-900" onClick={() => statusMutation.mutate('SENT')}>
                <FileText className="h-4 w-4" />Mark Sent
              </Button>
            )}
            {['SENT', 'VIEWED'].includes(q.status) && (
              <>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => statusMutation.mutate('ACCEPTED')}>
                  <CheckCircle2 className="h-4 w-4" />Mark Accepted
                </Button>
                <Button variant="secondary" onClick={() => statusMutation.mutate('REJECTED')} className="bg-rose-50 text-rose-700 border-rose-300">
                  <Ban className="h-4 w-4" />Rejected
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-violet-600" />Customer</h3>
            <div className="space-y-1 text-sm">
              <div className="font-extrabold text-lg">{q.customerName}</div>
              {q.customerPhone && <a href={'tel:' + q.customerPhone} className="flex items-center gap-1 text-blue-700 font-bold hover:underline"><Phone className="h-3 w-3" />{q.customerPhone}</a>}
              {q.customerEmail && <a href={'mailto:' + q.customerEmail} className="flex items-center gap-1 text-blue-700 font-bold hover:underline"><Mail className="h-3 w-3" />{q.customerEmail}</a>}
              {q.customerAddress && <div className="text-xs text-slate-600 font-semibold whitespace-pre-line">{q.customerAddress}</div>}
              {q.project && <div className="mt-2 text-xs font-extrabold text-violet-700 inline-flex items-center gap-1"><Building className="h-3 w-3" />{q.project.projectNumber} • {q.project.name}</div>}
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800">
              <h3 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5 text-violet-600" />Items ({q.items.length})</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {q.items.map((item: any) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-extrabold text-violet-700 tabular-nums">{item.quantity} {item.unit}</span>
                        <span className="font-extrabold">{item.itemName}</span>
                        {item.brand && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">{item.brand}</span>}
                      </div>
                      {item.specifications && <div className="text-xs text-slate-500 font-semibold mt-1">Specs: {item.specifications}</div>}
                      {item.itemDescription && <div className="text-xs text-slate-500 font-semibold italic mt-1">{item.itemDescription}</div>}
                      <div className="mt-2 text-xs">
                        <span className="text-slate-500 font-semibold">Unit: </span>
                        <span className="font-extrabold text-emerald-700">{formatPKR(item.unitPrice)}</span>
                        {item.discount > 0 && (
                          <span className="ml-2 text-rose-700 font-extrabold">-{formatPKR(item.discount)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(item.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(q.paymentTerms || q.deliveryTerms || q.warrantyTerms || q.specialTerms) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-extrabold">📋 Terms & Conditions</h3>
              {q.paymentTerms && <div className="text-sm"><span className="font-extrabold text-slate-700">Payment: </span>{q.paymentTerms}</div>}
              {q.deliveryTerms && <div className="text-sm"><span className="font-extrabold text-slate-700">Delivery: </span>{q.deliveryTerms}</div>}
              {q.warrantyTerms && <div className="text-sm"><span className="font-extrabold text-slate-700">Warranty: </span>{q.warrantyTerms}</div>}
              {q.specialTerms && <div className="text-sm"><span className="font-extrabold text-slate-700">Special: </span>{q.specialTerms}</div>}
            </div>
          )}

          {q.customerNotes && (
            <div className="rounded-3xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-4">
              <div className="text-sm font-extrabold text-amber-900 mb-2">📝 Notes for Customer</div>
              <p className="text-sm italic">{q.customerNotes}</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="sticky top-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-violet-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase font-extrabold text-white/70 mb-3">💰 Quote Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(q.subtotal)}</span></div>
                {q.discount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(q.discount)}</span></div>}
                {q.taxAmount > 0 && <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(q.taxAmount)}</span></div>}
                {q.deliveryCharges > 0 && <div className="flex justify-between"><span className="text-white/70">Delivery</span><span className="font-bold tabular-nums">{formatPKR(q.deliveryCharges)}</span></div>}
                {q.laborCharges > 0 && <div className="flex justify-between"><span className="text-white/70">Labor</span><span className="font-bold tabular-nums">{formatPKR(q.laborCharges)}</span></div>}
                {q.otherCharges > 0 && <div className="flex justify-between"><span className="text-white/70">Other</span><span className="font-bold tabular-nums">{formatPKR(q.otherCharges)}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(q.total)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
