import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bed, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Wifi, Wind, Tv, Coffee, DollarSign, Users, Home,
} from 'lucide-react';
import { roomTypesApi, type RoomType, type BedType, type HotelRoomType } from '../api/room-types.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';

const ROOM_TYPES: { value: RoomType; label: string; emoji: string }[] = [
  { value: 'SINGLE', label: 'Single', emoji: '🛏️' },
  { value: 'DOUBLE', label: 'Double', emoji: '🛌' },
  { value: 'TWIN', label: 'Twin', emoji: '👥' },
  { value: 'TRIPLE', label: 'Triple', emoji: '3️⃣' },
  { value: 'QUAD', label: 'Quad', emoji: '4️⃣' },
  { value: 'FAMILY', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'SUITE', label: 'Suite', emoji: '🏨' },
  { value: 'DELUXE', label: 'Deluxe', emoji: '⭐' },
  { value: 'EXECUTIVE', label: 'Executive', emoji: '💼' },
  { value: 'PRESIDENTIAL', label: 'Presidential', emoji: '👑' },
  { value: 'DORMITORY', label: 'Dormitory', emoji: '🛌' },
  { value: 'STUDIO', label: 'Studio', emoji: '🏠' },
  { value: 'APARTMENT', label: 'Apartment', emoji: '🏢' },
  { value: 'VILLA', label: 'Villa', emoji: '🏡' },
  { value: 'BUNGALOW', label: 'Bungalow', emoji: '🏘️' },
  { value: 'TENT', label: 'Tent', emoji: '⛺' },
  { value: 'CABIN', label: 'Cabin', emoji: '🏕️' },
];

const BED_TYPES: { value: BedType; label: string }[] = [
  { value: 'SINGLE_BED', label: 'Single Bed' },
  { value: 'DOUBLE_BED', label: 'Double Bed' },
  { value: 'QUEEN_BED', label: 'Queen Bed' },
  { value: 'KING_BED', label: 'King Bed' },
  { value: 'SOFA_BED', label: 'Sofa Bed' },
  { value: 'BUNK_BED', label: 'Bunk Bed' },
  { value: 'TWIN_BEDS', label: 'Twin Beds' },
];

export default function RoomTypesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HotelRoomType | null>(null);

  const { data: roomTypes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hotel-room-types', typeFilter, search],
    queryFn: () => roomTypesApi.list({
      type: typeFilter === 'all' ? undefined : typeFilter,
      active: true,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => roomTypesApi.remove(id),
    onSuccess: () => { toast.success('Room type removed'); queryClient.invalidateQueries({ queryKey: ['hotel-room-types'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Bed className="h-3.5 w-3.5 text-amber-300" />
              Room Categories
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛏️ Room Types</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Categories, amenities, pricing tiers</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Room Type
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search room types..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setTypeFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (typeFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {ROOM_TYPES.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (typeFilter === t.value ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.emoji} {t.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <RoomTypeForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['hotel-room-types'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Bed className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No room types yet</p>
          <Button className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Create First Room Type
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomTypes.map((rt) => (
            <RoomTypeCard
              key={rt.id}
              rt={rt}
              onEdit={() => { setEditing(rt); setShowForm(true); }}
              onDelete={() => { if (confirm('Remove "' + rt.name + '"?')) removeMutation.mutate(rt.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function RoomTypeCard({ rt, onEdit, onDelete }: any) {
  const type = ROOM_TYPES.find((t) => t.value === rt.type);
  const roomCount = rt.rooms?.length || 0;
  const availableCount = rt.rooms?.filter((r: any) => r.status === 'AVAILABLE').length || 0;

  return (
    <div className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
      <div className="relative aspect-video bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 overflow-hidden">
        {rt.imageUrls?.[0] ? (
          <img src={rt.imageUrls[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{type?.emoji || '🛏️'}</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="px-2 py-0.5 rounded bg-slate-900/70 backdrop-blur text-white text-[10px] font-extrabold uppercase">
            {type?.emoji} {type?.label}
          </span>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 shadow">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-600/80 text-white flex items-center justify-center hover:bg-rose-600 shadow">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div className="text-white">
            <div className="text-[10px] uppercase font-extrabold text-white/80">{rt.code}</div>
            <div className="text-xs font-bold">{rt.bedCount}× {rt.bedType?.replace('_', ' ')}</div>
          </div>
          <div className="text-right text-white">
            <div className="text-[10px] uppercase font-extrabold text-white/80">Rooms</div>
            <div className="text-lg font-extrabold tabular-nums">{availableCount}/{roomCount}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{rt.name}</h3>
        {rt.description && <p className="text-xs text-slate-500 font-semibold line-clamp-2">{rt.description}</p>}

        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{rt.maxOccupancy}</span>
          {rt.sizeSqft && <span>{rt.sizeSqft} sqft</span>}
        </div>

        <div className="flex flex-wrap gap-1">
          {rt.hasAC && <span className="p-1 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700" title="AC"><Wind className="h-3 w-3" /></span>}
          {rt.hasWifi && <span className="p-1 rounded bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700" title="WiFi"><Wifi className="h-3 w-3" /></span>}
          {rt.hasTV && <span className="p-1 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700" title="TV"><Tv className="h-3 w-3" /></span>}
          {rt.hasMinibar && <span className="p-1 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700" title="Minibar"><Coffee className="h-3 w-3" /></span>}
          {rt.hasBalcony && <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[9px] font-extrabold uppercase">Balcony</span>}
          {rt.hasKitchen && <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 text-[9px] font-extrabold uppercase">Kitchen</span>}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-slate-500 uppercase">Base Rate</div>
            <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(rt.basePrice)}<span className="text-xs font-bold text-slate-500">/night</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomTypeForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    code: editing?.code ?? '',
    name: editing?.name ?? '',
    type: editing?.type ?? 'DOUBLE',
    description: editing?.description ?? '',
    maxAdults: editing?.maxAdults ?? 2,
    maxChildren: editing?.maxChildren ?? 0,
    maxOccupancy: editing?.maxOccupancy ?? 2,
    bedType: editing?.bedType ?? 'DOUBLE_BED',
    bedCount: editing?.bedCount ?? 1,
    extraBedAllowed: editing?.extraBedAllowed ?? false,
    extraBedPrice: editing?.extraBedPrice ?? 0,
    sizeSqft: editing?.sizeSqft ?? '',
    basePrice: editing?.basePrice ?? 0,
    weekendPrice: editing?.weekendPrice ?? '',
    peakPrice: editing?.peakPrice ?? '',
    hourlyPrice: editing?.hourlyPrice ?? '',
    hasAC: editing?.hasAC ?? true,
    hasHeater: editing?.hasHeater ?? false,
    hasTV: editing?.hasTV ?? true,
    hasWifi: editing?.hasWifi ?? true,
    hasBalcony: editing?.hasBalcony ?? false,
    hasKitchen: editing?.hasKitchen ?? false,
    hasBathtub: editing?.hasBathtub ?? false,
    hasSafe: editing?.hasSafe ?? false,
    hasMinibar: editing?.hasMinibar ?? false,
    isPetFriendly: editing?.isPetFriendly ?? false,
    isSmoking: editing?.isSmoking ?? false,
    imageUrls: editing?.imageUrls ?? [],
    amenities: editing?.amenities?.join(', ') ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        basePrice: Number(form.basePrice) || 0,
        maxAdults: Number(form.maxAdults) || 1,
        maxChildren: Number(form.maxChildren) || 0,
        maxOccupancy: Number(form.maxOccupancy) || 1,
        bedCount: Number(form.bedCount) || 1,
        extraBedPrice: Number(form.extraBedPrice) || 0,
        sizeSqft: form.sizeSqft ? Number(form.sizeSqft) : undefined,
        weekendPrice: form.weekendPrice ? Number(form.weekendPrice) : undefined,
        peakPrice: form.peakPrice ? Number(form.peakPrice) : undefined,
        hourlyPrice: form.hourlyPrice ? Number(form.hourlyPrice) : undefined,
        amenities: form.amenities ? form.amenities.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };
      return editing ? roomTypesApi.update(editing.id, payload) : roomTypesApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-indigo-300 dark:border-indigo-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Room Type' : 'New Room Type'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-3 gap-3">
          <input autoFocus value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code (e.g. DLX)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-indigo-500" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500">
            {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 resize-none" />

        {/* Capacity */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-blue-900">Capacity</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Max Adults</label>
              <input type="number" value={form.maxAdults} onChange={(e) => setForm({ ...form, maxAdults: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Max Children</label>
              <input type="number" value={form.maxChildren} onChange={(e) => setForm({ ...form, maxChildren: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Max Occupancy</label>
              <input type="number" value={form.maxOccupancy} onChange={(e) => setForm({ ...form, maxOccupancy: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Bed */}
        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500">
            {BED_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <input type="number" value={form.bedCount} onChange={(e) => setForm({ ...form, bedCount: e.target.value })} placeholder="Bed count" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500" />
          <input type="number" value={form.sizeSqft} onChange={(e) => setForm({ ...form, sizeSqft: e.target.value })} placeholder="Size (sqft)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500" />
        </div>

        {/* Pricing */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2"><DollarSign className="h-4 w-4" />Pricing</div>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Base *</label>
              <input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Weekend</label>
              <input type="number" value={form.weekendPrice} onChange={(e) => setForm({ ...form, weekendPrice: e.target.value })} placeholder="Optional" className="h-14 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Peak</label>
              <input type="number" value={form.peakPrice} onChange={(e) => setForm({ ...form, peakPrice: e.target.value })} placeholder="Optional" className="h-14 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Hourly</label>
              <input type="number" value={form.hourlyPrice} onChange={(e) => setForm({ ...form, hourlyPrice: e.target.value })} placeholder="Optional" className="h-14 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Room Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'hasAC', label: 'AC', icon: Wind },
              { key: 'hasHeater', label: 'Heater', icon: Wind },
              { key: 'hasTV', label: 'TV', icon: Tv },
              { key: 'hasWifi', label: 'WiFi', icon: Wifi },
              { key: 'hasBalcony', label: 'Balcony', icon: Home },
              { key: 'hasKitchen', label: 'Kitchen', icon: Coffee },
              { key: 'hasBathtub', label: 'Bathtub', icon: Coffee },
              { key: 'hasSafe', label: 'Safe', icon: Coffee },
              { key: 'hasMinibar', label: 'Minibar', icon: Coffee },
              { key: 'isPetFriendly', label: 'Pet OK', icon: Coffee },
              { key: 'isSmoking', label: 'Smoking', icon: Coffee },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <label key={a.key} className={
                  'flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition ' +
                  ((form as any)[a.key] ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-indigo-300')
                }>
                  <input type="checkbox" checked={(form as any)[a.key]} onChange={(e) => setForm({ ...form, [a.key]: e.target.checked })} className="h-4 w-4 rounded" />
                  <Icon className={'h-3.5 w-3.5 ' + ((form as any)[a.key] ? 'text-indigo-600' : 'text-slate-400')} />
                  <span className="text-xs font-extrabold">{a.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="More amenities (comma separated)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />

        {/* Images */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Room Images</label>
          {form.imageUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              {form.imageUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setForm({ ...form, imageUrls: [...form.imageUrls, ...urls] });
          }} />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.code || !form.name || !form.basePrice}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
