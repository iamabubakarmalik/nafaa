import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Plus, Search, X, Clock, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, Phone, User, DollarSign,
  Eye, Trash2, Package, Calendar, Camera, Save, Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { repairServicesApi, type SportsRepairService } from '../api/repair-services.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  RECEIVED: { label: 'Received', color: 'text-blue-700', bg: 'bg-blue-100', icon: Package },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-100', icon: Wrench },
  ON_HOLD: { label: 'On Hold', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  DELIVERED: { label: 'Delivered', color: 'text-teal-700', bg: 'bg-teal-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
};

const ITEM_TYPES = [
  'Cricket Bat', 'Racket (Badminton)', 'Racket (Tennis)', 'Racket (Squash)',
  'Football', 'Cricket Ball', 'Boxing Gloves', 'Cricket Kit Bag',
  'Helmet', 'Cricket Pads', 'Football Studs', 'Cricket Spikes',
  'Gym Equipment', 'Other',
];

const REPAIR_TYPES = [
  'Bat Re-gripping', 'Bat Knocking', 'Bat Oil Treatment', 'Bat Handle Repair', 'Bat Edge Repair',
  'Racket Restringing', 'Racket Grip Replacement',
  'Ball Stitching', 'Ball Re-stitching', 'Football Repair',
  'Kit Bag Zip Repair', 'Kit Bag Handle Repair',
  'Boxing Glove Repair', 'Padding Replacement',
  'Shoe Sole Repair', 'Stud Replacement',
  'General Cleaning', 'Restoration', 'Custom Repair',
];

export default function RepairServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<SportsRepairService | null>(null);

  const { data: repairs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['repair-services-list', statusFilter, itemTypeFilter],
    queryFn: () => repairServicesApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      itemType: itemTypeFilter === 'all' ? undefined : itemTypeFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['repair-services-summary'],
    queryFn: () => repairServicesApi.summary(),
    refetchInterval: 60_000,
  });

  const { data: overdue = [] } = useQuery({
    queryKey: ['repair-services-overdue'],
    queryFn: () => repairServicesApi.overdue(),
    refetchInterval: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return repairs;
    return repairs.filter((r) =>
      r.serviceNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.customerPhone.includes(q) ||
      r.itemType.toLowerCase().includes(q) ||
      (r.itemBrand || '').toLowerCase().includes(q) ||
      (r.repairType || '').toLowerCase().includes(q)
    );
  }, [repairs, search]);

  const remove = useMutation({
    mutationFn: (id: string) => repairServicesApi.remove(id),
    onSuccess: () => {
      toast.success('Service deleted');
      qc.invalidateQueries({ queryKey: ['repair-services-list'] });
      qc.invalidateQueries({ queryKey: ['repair-services-summary'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <RepairFormModal onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['repair-services-list'] });
            qc.invalidateQueries({ queryKey: ['repair-services-summary'] });
          }} />
      )}

      {showDetail && (
        <RepairDetailModal repair={showDetail}
          onClose={() => setShowDetail(null)}
          onUpdated={() => {
            setShowDetail(null);
            qc.invalidateQueries({ queryKey: ['repair-services-list'] });
            qc.invalidateQueries({ queryKey: ['repair-services-summary'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Wrench className="h-3.5 w-3.5 text-amber-300" /> Repair Services
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔧 Repair Services</h1>
            <p className="mt-2 text-sm text-white/80">
              Bat re-gripping, racket restringing, ball stitching, general repairs
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Repair
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Received" value={summary.received} icon={Package} tone="blue" onClick={() => setStatusFilter('RECEIVED')} />
          <StatCard label="In Progress" value={summary.inProgress} icon={Wrench} tone="amber" onClick={() => setStatusFilter('IN_PROGRESS')} />
          <StatCard label="Completed" value={summary.completed} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('COMPLETED')} />
          <StatCard label="Revenue" value={formatPKR(summary.totalRevenue || 0)} icon={DollarSign} tone="violet" />
        </section>
      )}

      {overdue.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 border-2 border-rose-300 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-rose-900">{overdue.length} Overdue Repairs</h3>
              <p className="text-xs text-rose-800 font-bold">Follow up with customers immediately</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {overdue.slice(0, 6).map((r) => (
              <button key={r.id} onClick={() => setShowDetail(r)}
                className="rounded-xl bg-white border-2 border-rose-200 hover:border-rose-400 p-3 text-left transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono font-extrabold text-sm text-rose-900">{r.serviceNumber}</div>
                  <div className="text-[10px] font-extrabold text-rose-700">
                    {r.estimatedReadyAt && Math.abs(Math.floor((Date.now() - new Date(r.estimatedReadyAt).getTime()) / 86400000))} days late
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1">{r.customerName} • {r.itemType}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Service #, customer, item, repair type..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {['all', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map((v) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'}`}>
                {v === 'all' ? 'All' : STATUS_META[v]?.label || v}
              </button>
            ))}
          </div>
          <select value={itemTypeFilter} onChange={(e) => setItemTypeFilter(e.target.value)}
            className="h-9 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            <option value="all">All items</option>
            {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} services</div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Wrench className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No repair services</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Accept items for bat re-gripping, racket restringing, etc.</p>
          <Button className="mt-4 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Accept Item for Repair
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RepairCard key={r.id} repair={r}
              onView={() => setShowDetail(r)}
              onDelete={() => { if (confirm(`Delete "${r.serviceNumber}"?`)) remove.mutate(r.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepairCard({ repair: r, onView, onDelete }: any) {
  const meta = STATUS_META[r.status] || STATUS_META.RECEIVED;
  const StatusIcon = meta.icon;
  const balance = Number(r.finalCost || r.estimatedCost || 0) - Number(r.advancePaid || 0);
  const now = new Date();
  const readyDate = r.estimatedReadyAt ? new Date(r.estimatedReadyAt) : null;
  const isOverdue = readyDate && readyDate < now && (r.status === 'RECEIVED' || r.status === 'IN_PROGRESS');
  const daysLate = isOverdue ? Math.floor((now.getTime() - readyDate!.getTime()) / 86400000) : 0;

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${
      isOverdue ? 'border-rose-300' : 'border-slate-200'}`}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{r.serviceNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {isOverdue && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">
                {daysLate}d late
              </span>
            )}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-base truncate">
            {r.itemType}{r.itemBrand ? ` • ${r.itemBrand}` : ''}
          </div>
          {r.repairType && (
            <div className="text-xs font-bold text-amber-700 mt-0.5">🔧 {r.repairType}</div>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {r.customerName}</span>
            {r.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {r.customerPhone}</span>}
          </div>

          <div className="text-xs text-slate-500 font-semibold italic mt-1 line-clamp-1">"{r.issue}"</div>

          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-bold">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              Received: {new Date(r.receivedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
            </span>
            {r.estimatedReadyAt && (
              <span className={isOverdue ? 'text-rose-700' : ''}>
                Ready: {new Date(r.estimatedReadyAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {r.photosBeforeUrls?.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <ImageIcon className="h-2.5 w-2.5" /> {r.photosBeforeUrls.length} photos
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">
            {r.finalCost ? 'Final' : 'Estimated'}
          </div>
          <div className="text-lg font-extrabold text-slate-900 tabular-nums">
            {formatPKR(r.finalCost || r.estimatedCost || 0)}
          </div>
          {r.advancePaid > 0 && (
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              Paid: <span className="text-emerald-700">{formatPKR(r.advancePaid)}</span>
            </div>
          )}
          {balance > 0 && (
            <div className="text-[10px] font-extrabold text-rose-700 mt-0.5">
              Balance: {formatPKR(balance)}
            </div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            <button onClick={onView}
              className="h-9 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Manage
            </button>
            <button onClick={onDelete}
              className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepairFormModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    itemType: 'Cricket Bat',
    itemBrand: '',
    itemDescription: '',
    issue: '',
    repairType: '',
    estimatedCost: 0,
    advancePaid: 0,
    estimatedReadyAt: '',
    notes: '',
    photosBeforeUrls: [] as string[],
  });

  const create = useMutation({
    mutationFn: () => repairServicesApi.create({
      ...form,
      estimatedReadyAt: form.estimatedReadyAt || undefined,
    }),
    onSuccess: () => {
      toast.success('Service ticket created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🔧 New Repair Ticket</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Customer Name *</Lbl>
              <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="Customer full name"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Phone *</Lbl>
              <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <Lbl>Item Type *</Lbl>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ITEM_TYPES.map((t) => {
                const active = form.itemType === t;
                return (
                  <button key={t} type="button" onClick={() => setForm({ ...form, itemType: t })}
                    className={`p-2 rounded-xl border-2 text-xs font-extrabold transition ${
                      active ? 'border-amber-600 bg-amber-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'}`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Brand</Lbl>
              <input value={form.itemBrand} onChange={(e) => setForm({ ...form, itemBrand: e.target.value })}
                placeholder="SS, MRF, Yonex..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Repair Type</Lbl>
              <select value={form.repairType} onChange={(e) => setForm({ ...form, repairType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select type</option>
                {REPAIR_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Lbl>Item Description *</Lbl>
            <textarea rows={2} value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
              placeholder="SS Ton English Willow, 2 years old, Grade 1"
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
          </div>

          <div>
            <Lbl>Issue / Problem *</Lbl>
            <textarea rows={3} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })}
              placeholder="Handle grip loose, needs replacement. Small crack on the toe."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Estimated Cost</Lbl>
              <input type="number" value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Advance Paid</Lbl>
              <input type="number" value={form.advancePaid}
                onChange={(e) => setForm({ ...form, advancePaid: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <Lbl>Ready By</Lbl>
              <input type="date" value={form.estimatedReadyAt}
                onChange={(e) => setForm({ ...form, estimatedReadyAt: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <Lbl>Before Photos (recommended)</Lbl>
            <UploadDropzone purpose="repair-before" maxFiles={5}
              onUploaded={(recs: any[]) => setForm({ ...form, photosBeforeUrls: [...form.photosBeforeUrls, ...recs.map((r: any) => r.url)] })}
              hint="Up to 5 photos showing current condition" />
            {form.photosBeforeUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {form.photosBeforeUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, photosBeforeUrls: form.photosBeforeUrls.filter((_, x) => x !== i) })}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special instructions..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
            onClick={() => create.mutate()} loading={create.isPending}
            disabled={!form.customerName.trim() || !form.customerPhone.trim() || !form.itemDescription.trim() || !form.issue.trim()}>
            <Save className="h-4 w-4" /> Create Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

function RepairDetailModal({ repair, onClose, onUpdated }: any) {
  const [status, setStatus] = useState(repair.status);
  const [workDone, setWorkDone] = useState(repair.workDone || '');
  const [finalCost, setFinalCost] = useState(Number(repair.finalCost || repair.estimatedCost || 0));
  const [addPayment, setAddPayment] = useState(0);
  const [photosAfter, setPhotosAfter] = useState<string[]>(repair.photosAfterUrls || []);
  const [notes, setNotes] = useState('');

  const update = useMutation({
    mutationFn: () => repairServicesApi.updateStatus(repair.id, {
      status, workDone, finalCost, photosAfterUrls: photosAfter, notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Updated');
      onUpdated();
    },
  });

  const payment = useMutation({
    mutationFn: () => repairServicesApi.recordPayment(repair.id, addPayment),
    onSuccess: () => {
      toast.success(`Payment: ${formatPKR(addPayment)}`);
      setAddPayment(0);
      onUpdated();
    },
  });

  const balance = finalCost - Number(repair.advancePaid || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">Repair Service</div>
              <h3 className="text-xl font-extrabold font-mono">{repair.serviceNumber}</h3>
            </div>
            <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoBox label="Customer" value={repair.customerName} />
            <InfoBox label="Phone" value={repair.customerPhone} />
            <InfoBox label="Item" value={`${repair.itemType}${repair.itemBrand ? ` — ${repair.itemBrand}` : ''}`} />
            <InfoBox label="Received" value={new Date(repair.receivedAt).toLocaleDateString('en-PK')} />
          </div>

          <div>
            <Lbl>Issue Description</Lbl>
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm font-semibold text-slate-700">
              {repair.issue}
            </div>
          </div>

          {repair.repairType && (
            <div>
              <Lbl>Repair Type</Lbl>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 border-2 border-amber-200 text-sm font-extrabold text-amber-800">
                🔧 {repair.repairType}
              </div>
            </div>
          )}

          {repair.photosBeforeUrls?.length > 0 && (
            <div>
              <Lbl>Before Photos</Lbl>
              <div className="grid grid-cols-5 gap-2">
                {repair.photosBeforeUrls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-amber-400">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <Lbl>Update Status</Lbl>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <Lbl>Work Done</Lbl>
            <textarea rows={3} value={workDone} onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Handle regripped with premium grip, applied linseed oil, sanded lightly..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
          </div>

          <div>
            <Lbl>After Photos</Lbl>
            <UploadDropzone purpose="repair-after" maxFiles={5}
              onUploaded={(recs: any[]) => setPhotosAfter([...photosAfter, ...recs.map((r: any) => r.url)])}
              hint="Show completed work" />
            {photosAfter.length > 0 && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {photosAfter.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotosAfter(photosAfter.filter((_, x) => x !== i))}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 space-y-3">
            <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">💰 Billing</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-emerald-700 mb-1">Estimated</label>
                <div className="h-11 rounded-xl border-2 border-emerald-200 bg-white px-3 flex items-center text-sm font-extrabold tabular-nums text-slate-600">
                  {formatPKR(repair.estimatedCost || 0)}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-emerald-700 mb-1">Final Cost</label>
                <input type="number" value={finalCost} onChange={(e) => setFinalCost(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border-2 border-emerald-400 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-600" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-emerald-700 mb-1">Advance Paid</label>
                <div className="h-11 rounded-xl border-2 border-emerald-200 bg-white px-3 flex items-center text-sm font-extrabold tabular-nums text-emerald-800">
                  {formatPKR(repair.advancePaid || 0)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t-2 border-emerald-200">
              <span className="text-sm font-extrabold text-emerald-900">Balance Due</span>
              <span className={`text-xl font-extrabold tabular-nums ${balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatPKR(balance)}
              </span>
            </div>

            {balance > 0 && (
              <div className="pt-2 border-t border-emerald-200 flex gap-2">
                <input type="number" value={addPayment} onChange={(e) => setAddPayment(Number(e.target.value))}
                  placeholder="Payment amount"
                  className="h-10 flex-1 rounded-lg border-2 border-emerald-300 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                <button onClick={() => payment.mutate()} disabled={addPayment <= 0 || payment.isPending}
                  className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-50">
                  Record Payment
                </button>
              </div>
            )}
          </div>

          <div>
            <Lbl>Add Note</Lbl>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note to append..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
            onClick={() => update.mutate()} loading={update.isPending}>
            <Save className="h-4 w-4" /> Update Repair
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700', amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-emerald-700', violet: 'from-violet-500 to-purple-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-amber-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
