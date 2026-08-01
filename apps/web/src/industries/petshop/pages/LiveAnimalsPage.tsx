import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Plus, Search, X, RefreshCw, Star, StarOff, Clock, AlertTriangle,
  RotateCcw, DollarSign, Package, Award, Grid3x3, List, Eye, Edit3, Trash2,
  CheckCircle2, XCircle, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { liveAnimalsApi, type PetSaleStatus } from '../api/live-animals.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const SPECIES = [
  { v: 'DOG', l: 'Dog', e: '🐕' },
  { v: 'CAT', l: 'Cat', e: '🐈' },
  { v: 'BIRD', l: 'Bird', e: '🦜' },
  { v: 'FISH', l: 'Fish', e: '🐠' },
  { v: 'RABBIT', l: 'Rabbit', e: '🐰' },
  { v: 'HAMSTER', l: 'Hamster', e: '🐹' },
  { v: 'PARROT', l: 'Parrot', e: '🦜' },
  { v: 'TURTLE', l: 'Turtle', e: '🐢' },
  { v: 'REPTILE', l: 'Reptile', e: '🦎' },
];

const STATUS_META: Record<PetSaleStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  RESERVED: { label: 'Reserved', color: 'text-amber-700', bg: 'bg-amber-100' },
  SOLD: { label: 'Sold', color: 'text-blue-700', bg: 'bg-blue-100' },
  DECEASED: { label: 'Deceased', color: 'text-slate-700', bg: 'bg-slate-100' },
  RETURNED: { label: 'Returned', color: 'text-violet-700', bg: 'bg-violet-100' },
  ADOPTED: { label: 'Adopted', color: 'text-pink-700', bg: 'bg-pink-100' },
};

export default function LiveAnimalsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vaccinatedOnly, setVaccinatedOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const { data: animals = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['live-animals-list', speciesFilter, statusFilter],
    queryFn: () => liveAnimalsApi.list({
      species: speciesFilter === 'all' ? undefined : speciesFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['live-animals-summary'],
    queryFn: () => liveAnimalsApi.summary(),
  });

  const filtered = useMemo(() => {
    let list = [...animals];
    if (vaccinatedOnly) list = list.filter((a) => a.isVaccinated);
    if (featuredOnly) list = list.filter((a) => a.isFeatured);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((a) =>
      (a.name || '').toLowerCase().includes(q) ||
      a.animalNumber.toLowerCase().includes(q) ||
      (a.breed || '').toLowerCase().includes(q) ||
      (a.color || '').toLowerCase().includes(q)
    );
    return list;
  }, [animals, search, vaccinatedOnly, featuredOnly]);

  const remove = useMutation({
    mutationFn: (id: string) => liveAnimalsApi.remove(id),
    onSuccess: () => {
      toast.success('Animal removed');
      qc.invalidateQueries({ queryKey: ['live-animals-list'] });
      qc.invalidateQueries({ queryKey: ['live-animals-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const reserve = useMutation({
    mutationFn: ({ id, name }: any) => liveAnimalsApi.reserve(id, name),
    onSuccess: () => {
      toast.success('Animal reserved');
      qc.invalidateQueries({ queryKey: ['live-animals-list'] });
    },
  });

  const unreserve = useMutation({
    mutationFn: (id: string) => liveAnimalsApi.unreserve(id),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      qc.invalidateQueries({ queryKey: ['live-animals-list'] });
    },
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-pink-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Heart className="h-3.5 w-3.5 text-amber-300" /> Live Animals Inventory
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">❤️ Live Animals</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.available ?? 0} available • {summary?.reserved ?? 0} reserved • Value{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.inventoryValue ?? 0)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/petshop/live-animals/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> Add Animal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Available" value={summary.available} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('AVAILABLE')} />
          <StatCard label="Reserved" value={summary.reserved} icon={Clock} tone="amber" onClick={() => setStatusFilter('RESERVED')} />
          <StatCard label="Sold" value={summary.sold} icon={Award} tone="blue" onClick={() => setStatusFilter('SOLD')} />
          <StatCard label="Inventory Value" value={formatPKR(summary.inventoryValue)} icon={DollarSign} tone="violet" />
          <StatCard label="Month Profit" value={formatPKR(summary.monthly?.profit || 0)} icon={Sparkles} tone="rose" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, ID, breed, color..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-4 h-12 ${view === 'grid' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')} className={`px-4 h-12 border-l-2 border-slate-200 ${view === 'table' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setSpeciesFilter('all')}
            className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold border-2 ${
              speciesFilter === 'all' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'}`}>
            All
          </button>
          {SPECIES.map((s) => (
            <button key={s.v} onClick={() => setSpeciesFilter(speciesFilter === s.v ? 'all' : s.v)}
              className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 ${
                speciesFilter === s.v ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'}`}>
              <span>{s.e}</span>{s.l}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', 'AVAILABLE', 'RESERVED', 'SOLD', 'DECEASED'].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                statusFilter === v ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All Status' : STATUS_META[v as PetSaleStatus]?.label || v}
            </button>
          ))}
          <button onClick={() => setVaccinatedOnly(!vaccinatedOnly)}
            className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-extrabold ${vaccinatedOnly ? 'bg-emerald-500 text-white shadow' : 'text-slate-600'}`}>
            💉 Vaccinated
          </button>
          <button onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${featuredOnly ? 'bg-amber-500 text-white shadow' : 'text-slate-600'}`}>
            ⭐ Featured
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Heart className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No animals in inventory</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add your first live animal</p>
          <Link to="/petshop/live-animals/new">
            <Button className="mt-4 bg-gradient-to-r from-rose-600 to-pink-700"><Plus className="h-4 w-4" /> Add Animal</Button>
          </Link>
        </div>
      ) : view === 'grid' ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((a) => (
            <AnimalCard key={a.id} animal={a}
              onReserve={() => {
                const name = prompt('Reserve for customer (name):');
                if (name) reserve.mutate({ id: a.id, name });
              }}
              onUnreserve={() => { if (confirm('Cancel reservation?')) unreserve.mutate(a.id); }}
              onDelete={() => { if (confirm(`Delete ${a.name || a.animalNumber}?`)) remove.mutate(a.id); }} />
          ))}
        </section>
      ) : (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <Th>ID</Th><Th>Name / Breed</Th><Th>Species</Th>
                <Th className="text-center">Gender/Age</Th>
                <Th className="text-center">Status</Th>
                <Th className="text-center">Health</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => {
                const meta = STATUS_META[a.status];
                return (
                  <tr key={a.id} className="hover:bg-rose-50/40">
                    <td className="px-3 py-2.5">
                      <Link to={`/petshop/live-animals/${a.id}`} className="font-mono font-extrabold text-slate-900 text-xs hover:text-rose-700">
                        {a.animalNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={`/petshop/live-animals/${a.id}`} className="flex items-center gap-2 group">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {a.imageUrls?.[0] ? <img src={a.imageUrls[0]} className="w-full h-full object-cover" /> : <Heart className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm truncate group-hover:text-rose-700">{a.name || '—'}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{a.breed || 'Unknown'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{a.species.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">
                      {a.gender || '—'}{a.ageMonths ? ` • ${a.ageMonths}mo` : ''}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {a.isVaccinated && <span title="Vaccinated" className="text-[10px]">💉</span>}
                        {a.isDewormed && <span title="Dewormed" className="text-[10px]">🐛</span>}
                        {a.hasHealthCertificate && <span title="Health cert" className="text-[10px]">📄</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-rose-700 tabular-nums">{formatPKR(a.askingPrice)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === 'AVAILABLE' && (
                          <button onClick={() => {
                            const name = prompt('Reserve for customer:');
                            if (name) reserve.mutate({ id: a.id, name });
                          }} className="h-8 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold">
                            Reserve
                          </button>
                        )}
                        {a.status === 'RESERVED' && (
                          <button onClick={() => unreserve.mutate(a.id)} className="h-8 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold">
                            Cancel
                          </button>
                        )}
                        <Link to={`/petshop/live-animals/${a.id}`} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function AnimalCard({ animal: a, onReserve, onUnreserve, onDelete }: any) {
  const meta = STATUS_META[a.status as PetSaleStatus];
  const daysInStore = a.acquiredDate ? Math.floor((Date.now() - new Date(a.acquiredDate).getTime()) / 86400000) : null;
  const isLongStay = daysInStore != null && daysInStore > 60 && a.status === 'AVAILABLE';

  return (
    <div className={`group relative rounded-2xl bg-white border-2 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden ${
      a.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
      <Link to={`/petshop/live-animals/${a.id}`} className="block">
        <div className="relative aspect-square bg-gradient-to-br from-rose-100 to-pink-100 overflow-hidden">
          {a.imageUrls?.[0] ? (
            <img src={a.imageUrls[0]} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Heart className="h-16 w-16 text-rose-400" />
            </div>
          )}
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${meta.bg} ${meta.color}`}>
            {meta.label}
          </div>
          {a.isFeatured && (
            <div className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center shadow">
              <Star className="h-4 w-4 fill-white text-white" />
            </div>
          )}
          {isLongStay && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-extrabold shadow-lg">
              {daysInStore}d in store
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 space-y-2">
        <div>
          <div className="font-extrabold text-slate-900 truncate">
            {a.name || `${a.species.replace(/_/g, ' ')}`}
          </div>
          <div className="text-[10px] font-mono text-slate-500">#{a.animalNumber}</div>
          <div className="text-xs font-bold text-slate-600 truncate">
            {a.breed || a.species.replace(/_/g, ' ')}
            {a.gender && ` • ${a.gender}`}
            {a.ageMonths && ` • ${a.ageMonths}mo`}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {a.isVaccinated && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">💉 VAC</span>}
          {a.isDewormed && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold">🐛 DEW</span>}
          {a.hasHealthCertificate && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold">📄 CERT</span>}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Price</div>
            <div className="text-lg font-extrabold text-rose-700 tabular-nums">{formatPKR(a.askingPrice)}</div>
          </div>
          <div className="text-right">
            {a.currentCage && (
              <div className="text-[10px] font-bold text-slate-500">Cage: {a.currentCage}</div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 pt-2 border-t border-slate-100">
          {a.status === 'AVAILABLE' && (
            <button onClick={onReserve}
              className="flex-1 h-9 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Reserve
            </button>
          )}
          {a.status === 'RESERVED' && (
            <button onClick={onUnreserve}
              className="flex-1 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Cancel Reserve
            </button>
          )}
          <Link to={`/petshop/live-animals/${a.id}`}
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center">
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <Link to={`/petshop/live-animals/${a.id}/edit`}
            className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
          {a.status !== 'SOLD' && (
            <button onClick={onDelete}
              className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-500 to-orange-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    rose: 'from-rose-500 to-pink-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-rose-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
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

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}
