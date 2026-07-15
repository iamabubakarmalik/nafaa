import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ruler, Plus, Search, X, Save, RefreshCw, Sparkles, Clock, User,
  Phone, Camera, CheckCircle2, AlertCircle, ArrowRight, Zap, DollarSign,
} from 'lucide-react';
import { alterationsApi, type AlterationStatus } from '../api/alterations.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const STATUS_CONFIG: Record<AlterationStatus, { label: string; color: string; next?: AlterationStatus }> = {
  RECEIVED: { label: 'Received', color: 'bg-blue-500', next: 'MEASUREMENT_TAKEN' },
  MEASUREMENT_TAKEN: { label: 'Measured', color: 'bg-cyan-500', next: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500', next: 'READY' },
  READY: { label: 'Ready', color: 'bg-emerald-500', next: 'DELIVERED' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
};

const ALTERATION_TYPES = [
  'Length Adjust', 'Waist Adjust', 'Hip Adjust', 'Sleeve Length', 'Shoulder Adjust',
  'Hem Repair', 'Zipper Replace', 'Button Fix', 'Tear Repair', 'Resize Complete', 'Other',
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-slate-500' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-500' },
  { value: 'HIGH', label: 'High', color: 'bg-amber-500' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-600' },
];

export default function AlterationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);

  const { data: tickets = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['alterations', statusFilter, search],
    queryFn: () => alterationsApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
    refetchInterval: 60_000,
  });

  const filtered = statusFilter === 'active'
    ? tickets.filter((t) => !['DELIVERED', 'CANCELLED'].includes(t.status))
    : tickets;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => alterationsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['alterations'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Alteration Service
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📐 Alterations</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Fitting, resize, repair — quick turnaround</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Alteration
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket, name, phone..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['active', 'all', ...Object.keys(STATUS_CONFIG)].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {s === 'active' ? '🔥 Active' : s === 'all' ? 'All' : STATUS_CONFIG[s as AlterationStatus]?.label || s}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <AlterationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['alterations'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Ruler className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No alteration tickets</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((t) => {
            const cfg = STATUS_CONFIG[t.status];
            const daysLeft = t.promisedDate ? differenceInDays(new Date(t.promisedDate), new Date()) : null;
            return (
              <div key={t.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow shrink-0">
                      <Ruler className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{t.ticketNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>
                          {cfg.label}
                        </span>
                        <span className={
                          'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' +
                          (PRIORITIES.find((p) => p.value === t.priority)?.color || 'bg-slate-500')
                        }>
                          {t.priority}
                        </span>
                      </div>

                      <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{t.garmentDescription}</div>
                      <div className="text-xs font-extrabold text-amber-700">{t.alterationType}</div>
                      {t.alterationDetails && (
                        <p className="text-xs text-slate-600 italic mt-1 line-clamp-2">{t.alterationDetails}</p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
                        {t.customerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{t.customerName}</span>}
                        {t.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{t.customerPhone}</span>}
                        {t.promisedDate && (
                          <span className={
                            'inline-flex items-center gap-1 font-extrabold ' +
                            (daysLeft !== null && daysLeft < 0 ? 'text-rose-700' : daysLeft !== null && daysLeft <= 1 ? 'text-amber-700' : 'text-slate-700')
                          }>
                            <Clock className="h-3 w-3" />
                            Due: {format(new Date(t.promisedDate), 'dd MMM')}
                            {daysLeft !== null && daysLeft < 0 && ' (OVERDUE)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-2">
                    <div>
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(t.charges)}</div>
                      {t.paymentStatus === 'PAID' && <div className="text-[10px] font-extrabold text-emerald-600">PAID</div>}
                      {t.paymentStatus === 'PARTIALLY_PAID' && <div className="text-[10px] font-extrabold text-amber-600">PARTIAL</div>}
                    </div>
                    {cfg.next && (
                      <Button
                        size="sm"
                        onClick={() => statusMutation.mutate({ id: t.id, status: cfg.next! })}
                        className={STATUS_CONFIG[cfg.next].color + ' text-white'}
                      >
                        <ArrowRight className="h-3 w-3" />
                        {STATUS_CONFIG[cfg.next].label}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function AlterationForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '',
    customerPhone: '',
    garmentDescription: '',
    alterationType: 'Length Adjust',
    alterationDetails: '',
    priority: 'NORMAL',
    promisedDate: '',
    charges: 0,
    beforeImageUrls: [] as string[],
    notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => alterationsApi.create({
      ...form,
      charges: Number(form.charges) || 0,
    }),
    onSuccess: () => { toast.success('Alteration ticket created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">New Alteration Ticket</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
        </div>

        <input value={form.garmentDescription} onChange={(e) => setForm({ ...form, garmentDescription: e.target.value })} placeholder="Garment description (e.g. Blue kurta, size L) *" className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Alteration Type *</label>
          <div className="flex flex-wrap gap-1">
            {ALTERATION_TYPES.map((t) => (
              <button key={t} onClick={() => setForm({ ...form, alterationType: t })} className={
                'px-2 py-1 rounded-lg text-xs font-extrabold border-2 ' +
                (form.alterationType === t ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-amber-300')
              }>{t}</button>
            ))}
          </div>
        </div>

        <textarea rows={2} value={form.alterationDetails} onChange={(e) => setForm({ ...form, alterationDetails: e.target.value })} placeholder="Specific details (e.g. shorten by 2 inches, take in waist 1 inch)..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Priority</label>
            <div className="grid grid-cols-2 gap-1">
              {PRIORITIES.map((p) => (
                <button key={p.value} onClick={() => setForm({ ...form, priority: p.value })} className={
                  'py-2 rounded-lg text-xs font-extrabold border-2 ' +
                  (form.priority === p.value ? p.color + ' border-transparent text-white' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600')
                }>{p.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Due Date</label>
            <input type="date" value={form.promisedDate} onChange={(e) => setForm({ ...form, promisedDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Charges (Rs)</label>
            <input type="number" value={form.charges} onChange={(e) => setForm({ ...form, charges: e.target.value })} placeholder="0" className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Before Photos</label>
          {form.beforeImageUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              {form.beforeImageUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, beforeImageUrls: form.beforeImageUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone
            onUploaded={(records) => {
              const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
              setForm({ ...form, beforeImageUrls: [...form.beforeImageUrls, ...urls] });
            }}
          />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.garmentDescription.trim()}>
            <Save className="h-4 w-4" />
            Create Ticket
          </Button>
        </div>
      </div>
    </section>
  );
}
