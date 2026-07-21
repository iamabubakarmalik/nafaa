import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, Search, X, Save, RefreshCw, Sparkles, User, Phone,
  CheckCircle2, Ban, Briefcase, FileText,
} from 'lucide-react';
import { warrantyApi, type WarrantyClaim } from '../api/warranty.api';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-blue-500',
  UNDER_REVIEW: 'bg-amber-500',
  APPROVED: 'bg-emerald-600',
  REJECTED: 'bg-rose-500',
  IN_PROGRESS: 'bg-cyan-500',
  RESOLVED: 'bg-green-600',
};

export default function WarrantyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: claims = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['warranty-claims', statusFilter, search],
    queryFn: () => warrantyApi.listClaims({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, type, notes }: any) => warrantyApi.approve(id, type, notes),
    onSuccess: () => { toast.success('Approved'); queryClient.invalidateQueries({ queryKey: ['warranty-claims'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) => warrantyApi.reject(id, reason),
    onSuccess: () => { toast.success('Rejected'); queryClient.invalidateQueries({ queryKey: ['warranty-claims'] }); },
  });

  const createJobMutation = useMutation({
    mutationFn: (id: string) => warrantyApi.createJob(id),
    onSuccess: (job) => { toast.success('Service job ' + job.jobNumber + ' created'); queryClient.invalidateQueries({ queryKey: ['warranty-claims'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Award className="h-3.5 w-3.5" />
              Warranty Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏆 Warranty Claims</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Handle customer warranty requests</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Claim
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search claims..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-orange-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <WarrantyForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['warranty-claims'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : claims.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Award className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No warranty claims</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {claims.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shrink-0">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold">{c.claimNumber}</span>
                      <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[c.status]}>
                        {c.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">
                        {c.claimType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{c.customerName}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.customerPhone}</span>
                      <span>Claim Date: {format(new Date(c.claimDate), 'dd MMM yyyy')}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.issueDescription}</p>
                    {c.rejectionReason && (
                      <div className="mt-1 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs italic text-rose-700">
                        ❌ {c.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800 flex-wrap">
                {c.status === 'SUBMITTED' && (
                  <>
                    <Button size="sm" onClick={() => {
                      const type = prompt('Resolution type? (repair/replace/refund)');
                      if (type) approveMutation.mutate({ id: c.id, type });
                    }} className="bg-gradient-to-r from-emerald-500 to-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => {
                      const reason = prompt('Rejection reason?');
                      if (reason) rejectMutation.mutate({ id: c.id, reason });
                    }} className="bg-rose-50 text-rose-700 border-rose-300">
                      <Ban className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </>
                )}
                {c.status === 'APPROVED' && !c.newJobId && (
                  <Button size="sm" onClick={() => createJobMutation.mutate(c.id)} className="bg-gradient-to-r from-blue-500 to-cyan-600">
                    <Briefcase className="h-3.5 w-3.5" />
                    Create Service Job
                  </Button>
                )}
                {c.newJobId && (
                  <span className="px-3 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">
                    ✅ Service job created
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

function WarrantyForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '', customerPhone: '',
    claimType: 'SERVICE_PROVIDER',
    issueDescription: '',
    originalServiceDate: '',
    warrantyExpiryDate: '',
    photoUrls: [] as string[],
    documentUrls: [] as string[],
  });

  const saveMutation = useMutation({
    mutationFn: () => warrantyApi.createClaim(form),
    onSuccess: () => { toast.success('Claim submitted'); onSaved(); },
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-orange-300 dark:border-orange-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🏆 New Warranty Claim</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
        </div>

        <select value={form.claimType} onChange={(e) => setForm({ ...form, claimType: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
          <option value="MANUFACTURER">Manufacturer Warranty</option>
          <option value="SERVICE_PROVIDER">Service Provider Warranty</option>
          <option value="EXTENDED">Extended Warranty</option>
          <option value="PARTS_ONLY">Parts Only</option>
          <option value="LABOR_ONLY">Labor Only</option>
          <option value="FULL">Full Warranty</option>
        </select>

        <textarea rows={3} value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} placeholder="Describe the issue *" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500 resize-none" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Original Service Date</label>
            <input type="date" value={form.originalServiceDate} onChange={(e) => setForm({ ...form, originalServiceDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Warranty Expiry Date</label>
            <input type="date" value={form.warrantyExpiryDate} onChange={(e) => setForm({ ...form, warrantyExpiryDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Photos of Issue</label>
          {form.photoUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              {form.photoUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, photoUrls: form.photoUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setForm({ ...form, photoUrls: [...form.photoUrls, ...urls] });
          }} />
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-600 to-red-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerName || !form.customerPhone || !form.issueDescription}>
            <Save className="h-4 w-4" />
            Submit Claim
          </Button>
        </div>
      </div>
    </section>
  );
}
