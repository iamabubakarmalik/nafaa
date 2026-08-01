import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Plus, Search, X, Calendar, Phone, DollarSign, MapPin,
  RefreshCw, Users, Save, Edit3, Trash2, CheckCircle2, Palette,
  Sparkles, Church, Gift, Camera, Church as Chapel,
} from 'lucide-react';
import { toast } from 'sonner';
import { weddingContractsApi, type WeddingContract } from '../api/wedding-contracts.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const STATUS_META: Record<string, { l: string; cls: string }> = {
  QUOTED: { l: 'Quoted', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { l: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
  IN_PROGRESS: { l: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  COMPLETED: { l: 'Completed', cls: 'bg-violet-100 text-violet-700' },
  CANCELLED: { l: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
};

export default function FloristWeddingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WeddingContract | null>(null);
  const [showPayment, setShowPayment] = useState<WeddingContract | null>(null);

  const { data: contracts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['florist-weddings-list', statusFilter, upcomingOnly],
    queryFn: () => weddingContractsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      upcoming: upcomingOnly ? true : undefined,
    }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contracts;
    return contracts.filter((c) =>
      c.contractNumber.toLowerCase().includes(q) ||
      c.brideName.toLowerCase().includes(q) ||
      c.groomName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.contactPhone.includes(q)
    );
  }, [contracts, search]);

  const stats = useMemo(() => ({
    total: contracts.length,
    upcoming: contracts.filter((c) => new Date(c.weddingDate) > new Date() && c.status !== 'CANCELLED').length,
    totalQuoted: contracts.reduce((s, c) => s + Number(c.quotedAmount || 0), 0),
    totalCollected: contracts.reduce((s, c) => s + Number(c.advanceAmount || 0), 0),
    totalBalance: contracts.reduce((s, c) => s + Number(c.balanceAmount || 0), 0),
  }), [contracts]);

  const remove = useMutation({
    mutationFn: (id: string) => weddingContractsApi.remove(id),
    onSuccess: () => {
      toast.success('Contract deleted');
      qc.invalidateQueries({ queryKey: ['florist-weddings-list'] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => weddingContractsApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['florist-weddings-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <WeddingFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false); setEditing(null);
            qc.invalidateQueries({ queryKey: ['florist-weddings-list'] });
          }} />
      )}

      {showPayment && (
        <RecordPaymentModal contract={showPayment}
          onClose={() => setShowPayment(null)}
          onDone={() => {
            setShowPayment(null);
            qc.invalidateQueries({ queryKey: ['florist-weddings-list'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Heart className="h-3.5 w-3.5 text-amber-300" /> Wedding Contracts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💒 Weddings</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.upcoming} upcoming • Total quoted{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalQuoted)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Contract
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Contracts" value={stats.total} icon={Heart} tone="pink" />
        <StatCard label="Upcoming" value={stats.upcoming} icon={Calendar} tone="rose"
          onClick={() => setUpcomingOnly(!upcomingOnly)} />
        <StatCard label="Total Quoted" value={formatPKR(stats.totalQuoted)} icon={DollarSign} tone="violet" />
        <StatCard label="Balance Due" value={formatPKR(stats.totalBalance)} icon={DollarSign} tone="amber" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Contract #, bride/groom, contact..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', ...Object.keys(STATUS_META)].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                statusFilter === v ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : STATUS_META[v]?.l || v}
            </button>
          ))}
          <button onClick={() => setUpcomingOnly(!upcomingOnly)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              upcomingOnly ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600'}`}>
            Upcoming only
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Heart className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No wedding contracts yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Create bridal bouquets, stage decorations, and event packages</p>
          <Button className="mt-4 bg-gradient-to-r from-pink-500 to-rose-600"
            onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Create First Contract
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <WeddingCard key={c.id} contract={c}
              onEdit={() => { setEditing(c); setShowForm(true); }}
              onPayment={() => setShowPayment(c)}
              onStatus={(status: any) => updateStatus.mutate({ id: c.id, status })}
              onDelete={() => { if (confirm(`Delete "${c.brideName} & ${c.groomName}"?`)) remove.mutate(c.id); }} />
          ))}
        </section>
      )}
    </div>
  );
}

function WeddingCard({ contract: c, onEdit, onPayment, onStatus, onDelete }: any) {
  const days = Math.ceil((new Date(c.weddingDate).getTime() - Date.now()) / 86400000);
  const meta = STATUS_META[c.status] || STATUS_META.QUOTED;
  const paymentPct = c.quotedAmount > 0 ? (c.advanceAmount / c.quotedAmount) * 100 : 0;

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm hover:shadow-lg transition overflow-hidden">
      <div className="relative bg-gradient-to-br from-pink-500 via-rose-600 to-red-600 p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-extrabold text-xs">{c.contractNumber}</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${meta.cls}`}>{meta.l}</span>
        </div>
        <div className="text-xl font-extrabold leading-tight">
          {c.brideName} <span className="text-white/70 font-bold text-base">&</span> {c.groomName}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs font-bold text-white/85">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(c.weddingDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {days >= 0 ? (
            <span className={`px-2 py-0.5 rounded-full ${days < 30 ? 'bg-amber-500' : 'bg-white/20'}`}>
              {days === 0 ? 'Today!' : `${days}d to go`}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-white/20">Past</span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="text-xs font-bold text-slate-600 space-y-0.5">
          <div className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.contactPerson} • {c.contactPhone}</div>
          {c.ceremonyVenue && (<div className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" /> {c.ceremonyVenue}</div>)}
        </div>

        {c.colorTheme?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Palette className="h-3 w-3 text-slate-400" />
            {c.colorTheme.slice(0, 3).map((c: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 text-[10px] font-extrabold">{c}</span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {c.includesBridalBouquet && <PackageChip label="Bridal Bouquet" />}
          {c.includesBridesmaidBouquets && <PackageChip label={`${c.bridesmaidCount} Bridesmaids`} />}
          {c.includesBoutonnieres && <PackageChip label={`${c.boutonniereCount} Boutonnieres`} />}
          {c.includesGarlands && <PackageChip label={`${c.garlandCount} Garlands`} />}
          {c.includesCarDecoration && <PackageChip label="Car Deco" />}
          {c.includesStageDecoration && <PackageChip label="Stage Deco" />}
          {c.includesMehndiSetup && <PackageChip label="Mehndi" />}
          {c.includesTableCentrepieces && <PackageChip label={`${c.centrepieceCount} Tables`} />}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">Quoted</span>
            <span className="font-extrabold text-slate-900 tabular-nums">{formatPKR(c.quotedAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">Collected</span>
            <span className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(c.advanceAmount)}</span>
          </div>
          {c.balanceAmount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-700">Balance</span>
              <span className="font-extrabold text-amber-700 tabular-nums">{formatPKR(c.balanceAmount)}</span>
            </div>
          )}
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
              style={{ width: `${Math.min(paymentPct, 100)}%` }} />
          </div>
        </div>

        <div className="flex gap-1.5 pt-2 border-t border-slate-100">
          {c.balanceAmount > 0 && (
            <button onClick={onPayment}
              className="flex-1 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Pay
            </button>
          )}
          {c.status === 'QUOTED' && (
            <button onClick={() => onStatus('CONFIRMED')}
              className="h-9 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onEdit}
            className="h-9 w-9 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageChip({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-extrabold">
      ✓ {label}
    </span>
  );
}

function WeddingFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    brideName: editing?.brideName ?? '',
    groomName: editing?.groomName ?? '',
    contactPerson: editing?.contactPerson ?? '',
    contactPhone: editing?.contactPhone ?? '',
    contactEmail: editing?.contactEmail ?? '',
    weddingDate: editing?.weddingDate ? editing.weddingDate.slice(0, 10) : '',
    ceremonyVenue: editing?.ceremonyVenue ?? '',
    receptionVenue: editing?.receptionVenue ?? '',
    city: editing?.city ?? '',
    includesBridalBouquet: editing?.includesBridalBouquet ?? true,
    includesBridesmaidBouquets: editing?.includesBridesmaidBouquets ?? false,
    bridesmaidCount: editing?.bridesmaidCount ?? 0,
    includesBoutonnieres: editing?.includesBoutonnieres ?? false,
    boutonniereCount: editing?.boutonniereCount ?? 0,
    includesGarlands: editing?.includesGarlands ?? false,
    garlandCount: editing?.garlandCount ?? 0,
    includesCarDecoration: editing?.includesCarDecoration ?? false,
    includesStageDecoration: editing?.includesStageDecoration ?? false,
    includesMehndiSetup: editing?.includesMehndiSetup ?? false,
    includesTableCentrepieces: editing?.includesTableCentrepieces ?? false,
    centrepieceCount: editing?.centrepieceCount ?? 0,
    colorTheme: editing?.colorTheme ?? [],
    primaryFlowers: editing?.primaryFlowers ?? [],
    styleInspiration: editing?.styleInspiration ?? '',
    moodBoardUrls: editing?.moodBoardUrls ?? [],
    quotedAmount: editing?.quotedAmount ?? 0,
    advanceAmount: editing?.advanceAmount ?? 0,
    siteVisitDate: editing?.siteVisitDate ? editing.siteVisitDate.slice(0, 10) : '',
    setupStartTime: editing?.setupStartTime ? editing.setupStartTime.slice(0, 16) : '',
    notes: editing?.notes ?? '',
    internalNotes: editing?.internalNotes ?? '',
  });
  const [newColor, setNewColor] = useState('');
  const [newFlower, setNewFlower] = useState('');

  const save = useMutation({
    mutationFn: () => editing
      ? weddingContractsApi.update(editing.id, form as any)
      : weddingContractsApi.create(form as any),
    onSuccess: () => { toast.success(editing ? 'Contract updated' : 'Contract created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Contract' : '💒 New Wedding Contract'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section className="rounded-2xl border-2 border-pink-200 bg-pink-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-700" />
              <h4 className="font-extrabold text-pink-900">Couple & Contact</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Bride's Name *</Lbl>
                <input autoFocus value={form.brideName} onChange={(e) => setForm({ ...form, brideName: e.target.value })}
                  placeholder="Sara"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <Lbl>Groom's Name *</Lbl>
                <input value={form.groomName} onChange={(e) => setForm({ ...form, groomName: e.target.value })}
                  placeholder="Ahmed"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Lbl>Contact Person *</Lbl>
                <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Bride's mother"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <Lbl>Phone *</Lbl>
                <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="03XX XXXXXXX"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <Lbl>Email</Lbl>
                <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="Optional"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-rose-700" />
              <h4 className="font-extrabold text-rose-900">Event Details</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Wedding Date *</Lbl>
                <input type="date" value={form.weddingDate} onChange={(e) => setForm({ ...form, weddingDate: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
              <div>
                <Lbl>City</Lbl>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Karachi, Lahore..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Ceremony Venue</Lbl>
                <input value={form.ceremonyVenue} onChange={(e) => setForm({ ...form, ceremonyVenue: e.target.value })}
                  placeholder="Pearl Continental Ballroom"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
              <div>
                <Lbl>Reception Venue</Lbl>
                <input value={form.receptionVenue} onChange={(e) => setForm({ ...form, receptionVenue: e.target.value })}
                  placeholder="Same or different"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Site Visit Date</Lbl>
                <input type="date" value={form.siteVisitDate} onChange={(e) => setForm({ ...form, siteVisitDate: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
              <div>
                <Lbl>Setup Start Time</Lbl>
                <input type="datetime-local" value={form.setupStartTime} onChange={(e) => setForm({ ...form, setupStartTime: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-violet-700" />
              <h4 className="font-extrabold text-violet-900">Package Includes</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <PackageToggle checked={form.includesBridalBouquet}
                onChange={(v: boolean) => setForm({ ...form, includesBridalBouquet: v })}
                label="Bridal Bouquet" icon={Heart} />
              <PackageToggle checked={form.includesBridesmaidBouquets}
                onChange={(v: boolean) => setForm({ ...form, includesBridesmaidBouquets: v })}
                label="Bridesmaid Bouquets" icon={Users}
                extra={form.includesBridesmaidBouquets && (
                  <input type="number" min="0" value={form.bridesmaidCount}
                    onChange={(e) => setForm({ ...form, bridesmaidCount: Number(e.target.value) })}
                    className="h-8 w-16 rounded border-2 border-violet-300 px-2 text-xs font-extrabold text-center"
                    placeholder="Qty" />
                )} />
              <PackageToggle checked={form.includesBoutonnieres}
                onChange={(v: boolean) => setForm({ ...form, includesBoutonnieres: v })}
                label="Boutonnieres" icon={Sparkles}
                extra={form.includesBoutonnieres && (
                  <input type="number" min="0" value={form.boutonniereCount}
                    onChange={(e) => setForm({ ...form, boutonniereCount: Number(e.target.value) })}
                    className="h-8 w-16 rounded border-2 border-violet-300 px-2 text-xs font-extrabold text-center"
                    placeholder="Qty" />
                )} />
              <PackageToggle checked={form.includesGarlands}
                onChange={(v: boolean) => setForm({ ...form, includesGarlands: v })}
                label="Garlands (Mala)" icon={Sparkles}
                extra={form.includesGarlands && (
                  <input type="number" min="0" value={form.garlandCount}
                    onChange={(e) => setForm({ ...form, garlandCount: Number(e.target.value) })}
                    className="h-8 w-16 rounded border-2 border-violet-300 px-2 text-xs font-extrabold text-center"
                    placeholder="Qty" />
                )} />
              <PackageToggle checked={form.includesCarDecoration}
                onChange={(v: boolean) => setForm({ ...form, includesCarDecoration: v })}
                label="Car Decoration" icon={Sparkles} />
              <PackageToggle checked={form.includesStageDecoration}
                onChange={(v: boolean) => setForm({ ...form, includesStageDecoration: v })}
                label="Stage Decoration" icon={Chapel} />
              <PackageToggle checked={form.includesMehndiSetup}
                onChange={(v: boolean) => setForm({ ...form, includesMehndiSetup: v })}
                label="Mehndi Setup" icon={Sparkles} />
              <PackageToggle checked={form.includesTableCentrepieces}
                onChange={(v: boolean) => setForm({ ...form, includesTableCentrepieces: v })}
                label="Table Centrepieces" icon={Sparkles}
                extra={form.includesTableCentrepieces && (
                  <input type="number" min="0" value={form.centrepieceCount}
                    onChange={(e) => setForm({ ...form, centrepieceCount: Number(e.target.value) })}
                    className="h-8 w-16 rounded border-2 border-violet-300 px-2 text-xs font-extrabold text-center"
                    placeholder="Tables" />
                )} />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-fuchsia-700" />
              <h4 className="font-extrabold text-slate-900">Theme & Style</h4>
            </div>
            <div>
              <Lbl>Colour Theme</Lbl>
              <div className="flex gap-2 mb-2">
                <input value={newColor} onChange={(e) => setNewColor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newColor.trim()) {
                      setForm({ ...form, colorTheme: [...form.colorTheme, newColor.trim()] });
                      setNewColor('');
                    }
                  }}
                  placeholder="Add colour (Blush Pink, Gold, Ivory...)"
                  className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                <button type="button"
                  onClick={() => { if (newColor.trim()) { setForm({ ...form, colorTheme: [...form.colorTheme, newColor.trim()] }); setNewColor(''); } }}
                  className="h-10 px-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-xs">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {form.colorTheme.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.colorTheme.map((c: string, i: number) => (
                    <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fuchsia-100 text-fuchsia-800 text-xs font-extrabold">
                      {c}
                      <button onClick={() => setForm({ ...form, colorTheme: form.colorTheme.filter((_: any, x: number) => x !== i) })}
                        className="hover:text-rose-700"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Lbl>Primary Flowers</Lbl>
              <div className="flex gap-2 mb-2">
                <input value={newFlower} onChange={(e) => setNewFlower(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFlower.trim()) {
                      setForm({ ...form, primaryFlowers: [...form.primaryFlowers, newFlower.trim()] });
                      setNewFlower('');
                    }
                  }}
                  placeholder="Roses, Orchids, Peonies..."
                  className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                <button type="button"
                  onClick={() => { if (newFlower.trim()) { setForm({ ...form, primaryFlowers: [...form.primaryFlowers, newFlower.trim()] }); setNewFlower(''); } }}
                  className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {form.primaryFlowers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.primaryFlowers.map((f: string, i: number) => (
                    <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 text-xs font-extrabold">
                      {f}
                      <button onClick={() => setForm({ ...form, primaryFlowers: form.primaryFlowers.filter((_: any, x: number) => x !== i) })}
                        className="hover:text-rose-700"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Lbl>Style Inspiration / Notes</Lbl>
              <textarea rows={2} value={form.styleInspiration}
                onChange={(e) => setForm({ ...form, styleInspiration: e.target.value })}
                placeholder="Rustic, romantic, modern..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
            </div>

            <div>
              <Lbl>Mood Board Photos</Lbl>
              {form.moodBoardUrls.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
                  {form.moodBoardUrls.map((url: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setForm({ ...form, moodBoardUrls: form.moodBoardUrls.filter((_: any, x: number) => x !== i) })}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <UploadDropzone purpose="wedding-moodboard" maxFiles={10}
                onUploaded={(recs: any[]) => setForm({ ...form, moodBoardUrls: [...form.moodBoardUrls, ...recs.map((r) => r.url)] })}
                hint="Up to 10 inspiration photos" />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-700" />
              <h4 className="font-extrabold text-emerald-900">Pricing</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Total Quoted *</Lbl>
                <input type="number" value={form.quotedAmount}
                  onChange={(e) => setForm({ ...form, quotedAmount: Number(e.target.value) })}
                  className="h-12 w-full rounded-xl border-2 border-emerald-400 bg-white px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-600" />
              </div>
              <div>
                <Lbl>Advance Received</Lbl>
                <input type="number" value={form.advanceAmount}
                  onChange={(e) => setForm({ ...form, advanceAmount: Math.min(Number(e.target.value), form.quotedAmount) })}
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            {form.quotedAmount > 0 && (
              <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-700">Balance Due</span>
                <span className="text-lg font-extrabold text-amber-700 tabular-nums">
                  {formatPKR(Math.max(0, form.quotedAmount - form.advanceAmount))}
                </span>
              </div>
            )}
          </section>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Special requests, dietary considerations, family details..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.brideName.trim() || !form.groomName.trim() || !form.contactPerson.trim() || !form.contactPhone.trim() || !form.weddingDate || form.quotedAmount <= 0}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecordPaymentModal({ contract, onClose, onDone }: any) {
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const record = useMutation({
    mutationFn: () => weddingContractsApi.recordPayment(contract.id, { amount, notes: notes || undefined }),
    onSuccess: () => { toast.success(`Payment recorded: ${formatPKR(amount)}`); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const balance = contract.balanceAmount || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xl">💰 Record Payment</h3>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm font-bold text-white/85 mt-1">{contract.brideName} & {contract.groomName}</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Total Quoted</div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">{formatPKR(contract.quotedAmount)}</div>
            </div>
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-amber-700">Balance Due</div>
              <div className="text-lg font-extrabold text-amber-900 tabular-nums">{formatPKR(balance)}</div>
            </div>
          </div>

          <div>
            <Lbl>Payment Amount</Lbl>
            <input autoFocus type="number" value={amount}
              onChange={(e) => setAmount(Math.min(Math.max(0, Number(e.target.value)), balance))}
              className="h-14 w-full rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600" />
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {[25, 50, 75, 100].map((pct) => (
                <button key={pct} type="button" onClick={() => setAmount(Math.round(balance * pct / 100))}
                  className="px-3 py-1.5 rounded-lg bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Cash, cheque, bank transfer..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => record.mutate()} loading={record.isPending}
            disabled={amount <= 0 || amount > balance}>
            <CheckCircle2 className="h-4 w-4" /> Record {formatPKR(amount)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600', rose: 'from-rose-500 to-red-700',
    violet: 'from-violet-500 to-purple-700', amber: 'from-amber-500 to-orange-600',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-pink-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1 truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}

function PackageToggle({ checked, onChange, label, icon: Icon, extra }: any) {
  return (
    <div className={`rounded-xl border-2 p-2.5 transition ${checked ? 'border-violet-500 bg-violet-100' : 'border-slate-200 bg-white'}`}>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 rounded" />
        <Icon className={`h-4 w-4 ${checked ? 'text-violet-700' : 'text-slate-400'}`} />
        <span className="flex-1 font-extrabold text-sm text-slate-900">{label}</span>
        {extra}
      </label>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
