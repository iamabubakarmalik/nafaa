import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Search, X, Save, RefreshCw, Sparkles, Send,
  CheckCircle2, Ban, DollarSign, ArrowRight, User, Phone,
} from 'lucide-react';
import { quotesApi, type Quote } from '../api/quotes.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500', SENT: 'bg-blue-500',
  ACCEPTED: 'bg-emerald-600', REJECTED: 'bg-rose-500',
  EXPIRED: 'bg-slate-500', REVISED: 'bg-amber-500',
};

export default function QuotesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: quotes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['services-quotes', statusFilter, search],
    queryFn: () => quotesApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => quotesApi.send(id),
    onSuccess: () => { toast.success('Quote sent'); queryClient.invalidateQueries({ queryKey: ['services-quotes'] }); },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => quotesApi.accept(id),
    onSuccess: () => { toast.success('Quote accepted'); queryClient.invalidateQueries({ queryKey: ['services-quotes'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) => quotesApi.reject(id, reason),
    onSuccess: () => { toast.success('Quote rejected'); queryClient.invalidateQueries({ queryKey: ['services-quotes'] }); },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => quotesApi.convert(id),
    onSuccess: (job) => { toast.success('Converted to job ' + job.jobNumber); queryClient.invalidateQueries({ queryKey: ['services-quotes'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <FileText className="h-3.5 w-3.5" />
              Estimates
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📝 Quotes / Estimates</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Send estimates, accept, convert to job</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Quote
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotes..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'all' ? 'All' : s}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <QuoteForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['services-quotes'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : quotes.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <FileText className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No quotes yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {quotes.map((q) => (
            <div key={q.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold">{q.quoteNumber}</span>
                      <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[q.status]}>
                        {q.status}
                      </span>
                      {q.siteVisitRequired && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">
                          Site Visit {q.siteVisitCompleted ? '✅' : 'Required'}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-bold">{q.serviceName}</div>
                    <p className="text-xs text-slate-600 line-clamp-2">{q.problemDescription}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{q.customerName}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{q.customerPhone}</span>
                      {q.validUntil && <span className="inline-flex items-center gap-1">Valid: {format(new Date(q.validUntil), 'dd MMM')}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(q.totalAmount)}</div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800 flex-wrap">
                {q.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => sendMutation.mutate(q.id)} className="bg-gradient-to-r from-blue-500 to-cyan-600">
                    <Send className="h-3.5 w-3.5" />
                    Send Quote
                  </Button>
                )}
                {q.status === 'SENT' && (
                  <>
                    <Button size="sm" onClick={() => acceptMutation.mutate(q.id)} className="bg-gradient-to-r from-emerald-500 to-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Accepted
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => {
                      const reason = prompt('Rejection reason?');
                      if (reason !== null) rejectMutation.mutate({ id: q.id, reason });
                    }} className="bg-rose-50 text-rose-700 border-rose-300">
                      <Ban className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </>
                )}
                {q.status === 'ACCEPTED' && !q.convertedJobId && (
                  <Button size="sm" onClick={() => convertMutation.mutate(q.id)} className="bg-gradient-to-r from-violet-500 to-purple-600">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Convert to Job
                  </Button>
                )}
                {q.convertedJobId && (
                  <span className="px-3 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">
                    ✅ Converted to Job
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function QuoteForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '', customerPhone: '', customerEmail: '',
    serviceName: '', problemDescription: '',
    siteVisitRequired: false,
    labourCharge: 0, partsCharge: 0, visitCharge: 0, otherCharges: 0,
    discount: 0, taxAmount: 0,
    validUntil: '',
    termsConditions: '',
    notes: '',
  });

  const total = Math.max(
    Number(form.labourCharge) + Number(form.partsCharge) + Number(form.visitCharge) + Number(form.otherCharges) +
    Number(form.taxAmount) - Number(form.discount),
    0
  );

  const saveMutation = useMutation({
    mutationFn: () => quotesApi.create({
      ...form,
      labourCharge: Number(form.labourCharge) || 0,
      partsCharge: Number(form.partsCharge) || 0,
      visitCharge: Number(form.visitCharge) || 0,
      otherCharges: Number(form.otherCharges) || 0,
      discount: Number(form.discount) || 0,
      taxAmount: Number(form.taxAmount) || 0,
    }),
    onSuccess: () => { toast.success('Quote created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">📝 New Quote</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-3 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
        </div>

        <input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Service name *" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
        <textarea rows={3} value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })} placeholder="Problem description *" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 cursor-pointer">
          <input type="checkbox" checked={form.siteVisitRequired} onChange={(e) => setForm({ ...form, siteVisitRequired: e.target.checked })} className="h-5 w-5 rounded" />
          <span className="text-sm font-extrabold text-blue-900">Site visit required to confirm quote</span>
        </label>

        <div className="grid sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Labour</label>
            <input type="number" value={form.labourCharge} onChange={(e) => setForm({ ...form, labourCharge: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Parts</label>
            <input type="number" value={form.partsCharge} onChange={(e) => setForm({ ...form, partsCharge: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Visit</label>
            <input type="number" value={form.visitCharge} onChange={(e) => setForm({ ...form, visitCharge: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Other</label>
            <input type="number" value={form.otherCharges} onChange={(e) => setForm({ ...form, otherCharges: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Tax</label>
            <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Discount</label>
            <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Valid Until</label>
            <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-4 flex justify-between items-center">
          <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
          <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
        </div>

        <textarea rows={2} value={form.termsConditions} onChange={(e) => setForm({ ...form, termsConditions: e.target.value })} placeholder="Terms & Conditions" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerName || !form.customerPhone || !form.serviceName}>
            <Save className="h-4 w-4" />
            Create Quote
          </Button>
        </div>
      </div>
    </section>
  );
}
