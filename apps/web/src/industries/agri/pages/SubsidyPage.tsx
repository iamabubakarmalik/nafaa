import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Landmark, Plus, Search, X, Save, RefreshCw, Sparkles, User,
  CheckCircle2, Ban, DollarSign, FileText, TrendingUp, AlertCircle,
} from 'lucide-react';
import { subsidyApi } from '../api/subsidy.api';
import { farmersApi } from '../api/farmers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SCHEMES = [
  'Kissan Card', 'Ehsaas Kisan', 'PM Kisan Scheme', 'Punjab Kisan Package',
  'Sindh Agriculture Subsidy', 'Fertilizer Subsidy', 'Seed Subsidy',
  'Solar Tube Well', 'Drip Irrigation', 'Tractor Subsidy', 'Other',
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-500', icon: AlertCircle },
  APPROVED: { label: 'Approved', color: 'bg-blue-500', icon: CheckCircle2 },
  DISBURSED: { label: 'Disbursed', color: 'bg-emerald-600', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-rose-500', icon: Ban },
};

export default function SubsidyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: claims = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['subsidy-claims', statusFilter, search],
    queryFn: () => subsidyApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['subsidy-summary'],
    queryFn: () => subsidyApi.summary(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => subsidyApi.approve(id),
    onSuccess: () => { toast.success('Claim approved'); queryClient.invalidateQueries({ queryKey: ['subsidy-claims'] }); queryClient.invalidateQueries({ queryKey: ['subsidy-summary'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => subsidyApi.reject(id, reason),
    onSuccess: () => { toast.success('Claim rejected'); queryClient.invalidateQueries({ queryKey: ['subsidy-claims'] }); },
  });

  const disburseMutation = useMutation({
    mutationFn: (id: string) => subsidyApi.disburse(id),
    onSuccess: () => { toast.success('Subsidy disbursed'); queryClient.invalidateQueries({ queryKey: ['subsidy-claims'] }); queryClient.invalidateQueries({ queryKey: ['subsidy-summary'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Landmark className="h-3.5 w-3.5 text-amber-300" />
              Govt Schemes
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏛️ Govt Subsidies</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Kissan Card, Ehsaas, fertilizer subsidy claims</p>
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

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Claims" value={summary.total} icon={FileText} color="blue" />
          <StatCard label="Pending" value={summary.pending} icon={AlertCircle} color="amber" />
          <StatCard label="Approved" value={summary.approved} icon={CheckCircle2} color="cyan" />
          <StatCard label="Disbursed" value={summary.disbursed} icon={TrendingUp} color="emerald" />
          <StatCard label="Subsidy Amount" value={formatPKR(summary.totalSubsidyAmount)} icon={DollarSign} color="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search claim #, CNIC, scheme..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'PENDING', 'APPROVED', 'DISBURSED', 'REJECTED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'all' ? 'All' : s}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <SubsidyForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['subsidy-claims'] }); queryClient.invalidateQueries({ queryKey: ['subsidy-summary'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : claims.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Landmark className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No subsidy claims yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {claims.map((claim) => {
            const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = cfg.icon;
            return (
              <div key={claim.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
                (claim.status === 'PENDING' ? 'border-amber-300' :
                 claim.status === 'DISBURSED' ? 'border-emerald-200 dark:border-emerald-800' :
                 claim.status === 'REJECTED' ? 'border-rose-200 dark:border-rose-800' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={
                      'h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ' +
                      (claim.status === 'DISBURSED' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                       claim.status === 'PENDING' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                       claim.status === 'REJECTED' ? 'bg-gradient-to-br from-rose-500 to-red-600' :
                       'bg-gradient-to-br from-blue-500 to-indigo-600')
                    }>
                      <Landmark className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{claim.claimNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white inline-flex items-center gap-1 ' + cfg.color}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-blue-700">{claim.schemeName}</div>
                      {claim.govtScheme && <div className="text-[10px] font-bold text-slate-500">{claim.govtScheme}</div>}
                      <div className="mt-1 text-xs text-slate-600 font-semibold">
                        Product: {claim.productType} • Qty: {claim.quantity}
                      </div>
                      {claim.farmerCnic && <div className="text-[10px] font-mono font-bold text-slate-500">CNIC: {claim.farmerCnic}</div>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-extrabold text-slate-500">Subsidy</div>
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(claim.subsidyAmount)}</div>
                    <div className="text-[10px] font-bold text-slate-500">Final: {formatPKR(claim.finalPrice)}</div>
                  </div>
                </div>

                {claim.status === 'PENDING' && (
                  <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <button onClick={() => approveMutation.mutate(claim.id)} className="flex-1 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 hover:bg-blue-200 text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Approve
                    </button>
                    <button onClick={() => {
                      const reason = prompt('Rejection reason?');
                      if (reason) rejectMutation.mutate({ id: claim.id, reason });
                    }} className="flex-1 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <Ban className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                )}
                {claim.status === 'APPROVED' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <button onClick={() => disburseMutation.mutate(claim.id)} className="w-full h-9 rounded-lg bg-emerald-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Mark as Disbursed
                    </button>
                  </div>
                )}
                {claim.rejectionReason && (
                  <div className="text-xs italic text-rose-700 border-t border-slate-100 dark:border-neutral-800 pt-2">
                    ❌ {claim.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600', amber: 'from-amber-500 to-orange-600',
    cyan: 'from-cyan-500 to-blue-600', emerald: 'from-emerald-500 to-green-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-10 w-10 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow'}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SubsidyForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    farmerId: '',
    schemeName: 'Kissan Card',
    govtScheme: '',
    productType: '',
    quantity: 1,
    originalPrice: 0,
    subsidyAmount: 0,
    finalPrice: 0,
    farmerCnic: '',
    cropTarget: '',
    landAreaAcres: '',
  });

  const [farmerSearch, setFarmerSearch] = useState('');
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-subsidy', farmerSearch],
    queryFn: () => farmersApi.list({ search: farmerSearch || undefined }),
    enabled: showFarmerPicker,
  });

  const saveMutation = useMutation({
    mutationFn: () => subsidyApi.create({
      ...form,
      quantity: Number(form.quantity) || 0,
      originalPrice: Number(form.originalPrice) || 0,
      subsidyAmount: Number(form.subsidyAmount) || 0,
      finalPrice: Number(form.finalPrice) || 0,
      landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
    }),
    onSuccess: () => { toast.success('Claim created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🏛️ New Subsidy Claim</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {selectedFarmer ? (
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600" />
            <div className="flex-1"><div className="font-extrabold">{selectedFarmer.fullName}</div><div className="text-xs text-slate-600 font-bold">{selectedFarmer.cnic || 'No CNIC'}</div></div>
            <button onClick={() => { setSelectedFarmer(null); setForm({ ...form, farmerId: '', farmerCnic: '' }); }} className="text-xs font-extrabold text-blue-600 hover:underline">Change</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowFarmerPicker(!showFarmerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-blue-400">
              <Search className="h-4 w-4 inline mr-1" /> Select Farmer *
            </button>
            {showFarmerPicker && (
              <div className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-3 space-y-2">
                <input autoFocus value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} placeholder="Search farmer..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {farmers.map((f) => (
                    <button key={f.id} onClick={() => { setSelectedFarmer(f); setForm({ ...form, farmerId: f.id, farmerCnic: f.cnic || '' }); setShowFarmerPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <div className="flex-1 min-w-0"><div className="text-sm font-extrabold truncate">{f.fullName}</div><div className="text-[10px] text-slate-500">{f.cnic || 'No CNIC'}</div></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Scheme *</label>
          <select value={form.schemeName} onChange={(e) => setForm({ ...form, schemeName: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            {SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} placeholder="Product type (e.g. Urea)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Original Price</label>
            <input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Subsidy Amount</label>
            <input type="number" value={form.subsidyAmount} onChange={(e) => setForm({ ...form, subsidyAmount: e.target.value, finalPrice: Math.max(Number(form.originalPrice) - Number(e.target.value), 0) })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Final Price</label>
            <input type="number" value={form.finalPrice} onChange={(e) => setForm({ ...form, finalPrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.cropTarget} onChange={(e) => setForm({ ...form, cropTarget: e.target.value })} placeholder="Target crop" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input type="number" step="0.1" value={form.landAreaAcres} onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })} placeholder="Land (acres)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.farmerId || !form.productType}>
            <Save className="h-4 w-4" />
            Submit Claim
          </Button>
        </div>
      </div>
    </section>
  );
}
