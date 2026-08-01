import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Monitor, Plus, Search, X, Edit3, Trash2, Wrench, RefreshCw,
  DollarSign, TrendingUp, Save, MapPin, Clock, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { gamingStationsApi, type GamingStation, type GamingStationType } from '../api/stations.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const STATION_TYPES: Array<{ v: GamingStationType; l: string; e: string }> = [
  { v: 'PC_STATION', l: 'PC Station', e: '🖥️' },
  { v: 'PS5_STATION', l: 'PS5 Station', e: '🎮' },
  { v: 'PS4_STATION', l: 'PS4 Station', e: '🎮' },
  { v: 'XBOX_STATION', l: 'Xbox Station', e: '🟩' },
  { v: 'SIMULATOR', l: 'Simulator', e: '🏎️' },
  { v: 'VR_STATION', l: 'VR Station', e: '🥽' },
  { v: 'MULTIPLAYER_BOOTH', l: 'Multiplayer Booth', e: '👥' },
  { v: 'PRIVATE_ROOM', l: 'Private Room', e: '🚪' },
  { v: 'OTHER', l: 'Other', e: '📦' },
];

export default function GamingStationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GamingStation | null>(null);

  const { data: stations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gaming-stations-all'],
    queryFn: () => gamingStationsApi.list({}),
  });

  const filtered = useMemo(() => {
    let list = [...stations];
    if (typeFilter !== 'all') list = list.filter((s) => s.stationType === typeFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.stationNumber.toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.stationNumber.localeCompare(b.stationNumber, undefined, { numeric: true }));
  }, [stations, search, typeFilter]);

  const stats = useMemo(() => ({
    total: stations.length,
    active: stations.filter((s) => s.isActive).length,
    maintenance: stations.filter((s) => s.isUnderMaintenance).length,
    totalRevenue: stations.reduce((sum, s) => sum + Number(s.totalRevenue || 0), 0),
    totalHours: stations.reduce((sum, s) => sum + Number(s.totalHoursUsed || 0), 0),
  }), [stations]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => gamingStationsApi.remove(id),
    onSuccess: () => {
      toast.success('Station deactivated');
      qc.invalidateQueries({ queryKey: ['gaming-stations-all'] });
    },
  });

  const toggleMaint = useMutation({
    mutationFn: ({ id, notes }: any) => gamingStationsApi.toggleMaintenance(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gaming-stations-all'] });
      qc.invalidateQueries({ queryKey: ['gaming-stations-live'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <StationFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['gaming-stations-all'] });
            qc.invalidateQueries({ queryKey: ['gaming-stations-live'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Monitor className="h-3.5 w-3.5 text-amber-300" /> Gaming Stations
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🖥️ Stations</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} stations • {stats.active} active • {formatPKR(stats.totalRevenue)} lifetime revenue
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Station
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Monitor} label="Total Stations" value={stats.total} sub={`${stats.active} active`} tone="blue" />
        <Kpi icon={Wrench} label="Maintenance" value={stats.maintenance} sub="Under repair" tone="amber" />
        <Kpi icon={Clock} label="Total Hours" value={`${stats.totalHours.toFixed(0)}h`} sub="Used lifetime" tone="violet" />
        <Kpi icon={DollarSign} label="Total Revenue" value={formatPKR(stats.totalRevenue)} sub="Lifetime" tone="emerald" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Station name, number, location..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setTypeFilter('all')}
            className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
              typeFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'}`}>
            All
          </button>
          {STATION_TYPES.map((t) => (
            <button key={t.v} onClick={() => setTypeFilter(typeFilter === t.v ? 'all' : t.v)}
              className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
                typeFilter === t.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'}`}>
              <span>{t.e}</span>{t.l}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Monitor className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No stations yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add your first PC/PS5/Xbox station</p>
          <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Station
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((s) => (
            <StationManageCard key={s.id} station={s}
              onEdit={() => { setEditing(s); setShowForm(true); }}
              onDelete={() => { if (confirm(`Deactivate "${s.name}"?`)) removeMutation.mutate(s.id); }}
              onToggleMaintenance={() => {
                const notes = s.isUnderMaintenance ? undefined : prompt('Maintenance notes:') || undefined;
                toggleMaint.mutate({ id: s.id, notes });
              }} />
          ))}
        </section>
      )}
    </div>
  );
}

function StationManageCard({ station, onEdit, onDelete, onToggleMaintenance }: any) {
  const type = STATION_TYPES.find((t) => t.v === station.stationType);
  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-lg transition-all ${
      station.isUnderMaintenance ? 'border-rose-300' : 'border-slate-200 hover:border-blue-300'}`}>
      <div className="flex items-start gap-3">
        {station.imageUrl ? (
          <img src={station.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-200 shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shrink-0 text-3xl">
            {type?.e || '🎮'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 truncate">{station.name}</div>
          <div className="text-[10px] font-mono text-slate-500">#{station.stationNumber}</div>
          <div className="text-xs font-bold text-blue-700 mt-0.5">{type?.l}</div>
          {station.location && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-0.5">
              <MapPin className="h-2.5 w-2.5" /> {station.location}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Rate/hr</div>
          <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKR(station.pricePerHour)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Revenue</div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums">{formatPKR(station.totalRevenue || 0)}</div>
        </div>
      </div>

      {station.installedGames?.length > 0 && (
        <div className="mt-2">
          <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Installed Games</div>
          <div className="flex flex-wrap gap-1">
            {station.installedGames.slice(0, 3).map((g: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold">{g}</span>
            ))}
            {station.installedGames.length > 3 && (
              <span className="text-[10px] font-extrabold text-slate-500">+{station.installedGames.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {station.isUnderMaintenance && (
        <div className="mt-3 rounded-xl bg-rose-50 border-2 border-rose-200 p-2 text-xs text-rose-800 font-bold">
          🔧 Under maintenance
          {station.maintenanceNotes && <div className="text-[10px] mt-0.5 opacity-80">{station.maintenanceNotes}</div>}
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        <button onClick={onEdit}
          className="flex-1 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={onToggleMaintenance}
          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            station.isUnderMaintenance ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'}`}
          title={station.isUnderMaintenance ? 'End maintenance' : 'Start maintenance'}>
          <Wrench className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete}
          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StationFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    stationNumber: editing?.stationNumber ?? '',
    name: editing?.name ?? '',
    stationType: editing?.stationType ?? 'PC_STATION',
    location: editing?.location ?? '',
    platform: editing?.platform ?? 'PC',
    specifications: editing?.specifications ?? '',
    installedGames: editing?.installedGames ?? [],
    pricePerHour: editing?.pricePerHour ?? 100,
    pricePerHalfHour: editing?.pricePerHalfHour ?? '',
    peakHourPrice: editing?.peakHourPrice ?? '',
    minimumMinutes: editing?.minimumMinutes ?? 15,
    imageUrl: editing?.imageUrl ?? '',
    notes: editing?.notes ?? '',
    isActive: editing?.isActive ?? true,
  });
  const [newGame, setNewGame] = useState('');

  const save = useMutation({
    mutationFn: () => editing
      ? gamingStationsApi.update(editing.id, form as any)
      : gamingStationsApi.create(form as any),
    onSuccess: () => {
      toast.success(editing ? 'Station updated' : 'Station created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Station' : '➕ New Station'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Station Number *</Lbl>
              <input value={form.stationNumber} onChange={(e) => setForm({ ...form, stationNumber: e.target.value })}
                placeholder="PC-01, PS5-03"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-extrabold focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <Lbl>Display Name *</Lbl>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Gaming PC #1"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <Lbl>Station Type *</Lbl>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {STATION_TYPES.map((t) => (
                <button key={t.v} type="button" onClick={() => setForm({ ...form, stationType: t.v })}
                  className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                    form.stationType === t.v ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'}`}>
                  <span className="text-xl">{t.e}</span>
                  <span className="text-[10px] font-extrabold text-center">{t.l}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Location <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Zone A, Row 2"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <Lbl>Specifications</Lbl>
            <textarea rows={2} value={form.specifications}
              onChange={(e) => setForm({ ...form, specifications: e.target.value })}
              placeholder="RTX 4070, 32GB RAM, 27&quot; 165Hz monitor..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Rate/hr *</Lbl>
              <input type="number" value={form.pricePerHour}
                onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <Lbl>Rate/half-hr</Lbl>
              <input type="number" value={form.pricePerHalfHour}
                onChange={(e) => setForm({ ...form, pricePerHalfHour: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <Lbl>Peak Hour</Lbl>
              <input type="number" value={form.peakHourPrice}
                onChange={(e) => setForm({ ...form, peakHourPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <Lbl>Minimum Minutes</Lbl>
            <input type="number" value={form.minimumMinutes}
              onChange={(e) => setForm({ ...form, minimumMinutes: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <Lbl>Installed Games</Lbl>
            <div className="flex gap-2">
              <input value={newGame} onChange={(e) => setNewGame(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGame.trim()) {
                    setForm({ ...form, installedGames: [...form.installedGames, newGame.trim()] });
                    setNewGame('');
                  }
                }}
                placeholder="FIFA 26, GTA V, Valorant..."
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={() => {
                if (newGame.trim()) {
                  setForm({ ...form, installedGames: [...form.installedGames, newGame.trim()] });
                  setNewGame('');
                }
              }} className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.installedGames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.installedGames.map((g: string, i: number) => (
                  <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-extrabold">
                    {g}
                    <button onClick={() => setForm({ ...form, installedGames: form.installedGames.filter((_: any, x: number) => x !== i) })}
                      className="hover:text-rose-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Lbl>Image</Lbl>
            {form.imageUrl ? (
              <div className="relative w-40 h-32 rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, imageUrl: '' })}
                  className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UploadDropzone purpose="station-image" maxFiles={1}
                onUploaded={(recs: any[]) => {
                  const first = Array.isArray(recs) ? recs[0] : recs;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, imageUrl: url });
                }} />
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.name.trim() || !form.stationNumber.trim() || form.pricePerHour <= 0}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-700', emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-600', violet: 'from-violet-500 to-fuchsia-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
