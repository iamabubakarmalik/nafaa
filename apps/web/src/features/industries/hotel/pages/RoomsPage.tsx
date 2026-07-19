import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  CheckCircle2, Ban, Wrench, Sparkle, Bed, AlertCircle,
} from 'lucide-react';
import { roomsApi, type RoomStatus, type HotelRoom } from '../api/rooms.api';
import { roomTypesApi } from '../api/room-types.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-500' },
  OCCUPIED: { label: 'Occupied', color: 'text-blue-700', bg: 'bg-blue-500' },
  RESERVED: { label: 'Reserved', color: 'text-cyan-700', bg: 'bg-cyan-500' },
  CLEANING: { label: 'Cleaning', color: 'text-amber-700', bg: 'bg-amber-500' },
  MAINTENANCE: { label: 'Maintenance', color: 'text-orange-700', bg: 'bg-orange-500' },
  OUT_OF_ORDER: { label: 'Out of Order', color: 'text-rose-700', bg: 'bg-rose-500' },
  BLOCKED: { label: 'Blocked', color: 'text-slate-700', bg: 'bg-slate-500' },
};

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HotelRoom | null>(null);

  const { data: rooms = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hotel-rooms', statusFilter, roomTypeFilter, floorFilter, search],
    queryFn: () => roomsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      roomTypeId: roomTypeFilter === 'all' ? undefined : roomTypeFilter,
      floor: floorFilter || undefined,
      search: search.trim() || undefined,
    }),
    refetchInterval: 30_000,
  });

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['hotel-room-types-for-rooms'],
    queryFn: () => roomTypesApi.list({ active: true }),
  });

  const { data: summary } = useQuery({
    queryKey: ['hotel-rooms-summary'],
    queryFn: () => roomsApi.summary(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => roomsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms-summary'] });
    },
  });

  const hkMutation = useMutation({
    mutationFn: ({ id, hs }: { id: string; hs: string }) => roomsApi.updateHousekeeping(id, hs),
    onSuccess: () => {
      toast.success('Housekeeping updated');
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => roomsApi.remove(id),
    onSuccess: () => { toast.success('Room removed'); queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-fuchsia-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Home className="h-3.5 w-3.5 text-amber-300" />
              Room Inventory
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏠 Rooms</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Individual room status & housekeeping</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatusCounter label="Total" value={summary.total} bg="bg-slate-500" />
          <StatusCounter label="Available" value={summary.available} bg="bg-emerald-500" />
          <StatusCounter label="Occupied" value={summary.occupied} bg="bg-blue-500" />
          <StatusCounter label="Cleaning" value={summary.cleaning} bg="bg-amber-500" />
          <StatusCounter label="Maintenance" value={summary.maintenance} bg="bg-rose-500" />
          <StatusCounter label="Occupancy" value={summary.occupancyPct.toFixed(0) + '%'} bg="bg-purple-500" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search room number, floor..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-purple-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setStatusFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === 'all' ? 'bg-purple-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Status</button>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === k ? v.bg + ' text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{v.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <select value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)} className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-purple-500">
            <option value="all">All Types</option>
            {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
          </select>
          <input value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} placeholder="Filter by floor..." className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-purple-500" />
        </div>
      </section>

      {showForm && (
        <RoomForm
          editing={editing}
          roomTypes={roomTypes}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] }); queryClient.invalidateQueries({ queryKey: ['hotel-rooms-summary'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Home className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No rooms yet</p>
        </div>
      ) : (
        <section className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onStatusChange={(status: string) => statusMutation.mutate({ id: room.id, status })}
              onHkChange={(hs: string) => hkMutation.mutate({ id: room.id, hs })}
              onEdit={() => { setEditing(room); setShowForm(true); }}
              onDelete={() => { if (confirm('Remove room ' + room.roomNumber + '?')) removeMutation.mutate(room.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatusCounter({ label, value, bg }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={'h-3 w-3 rounded-full ' + bg} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room, onStatusChange, onHkChange, onEdit, onDelete }: any) {
  const [showMenu, setShowMenu] = useState(false);
  const cfg = STATUS_CONFIG[room.status as RoomStatus];

  return (
    <div className={
      'rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all overflow-hidden ' +
      (room.status === 'AVAILABLE' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' :
       room.status === 'OCCUPIED' ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' :
       room.status === 'CLEANING' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' :
       room.status === 'MAINTENANCE' ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/20' :
       'border-slate-300 bg-slate-50 dark:bg-slate-950/20')
    }>
      <div className={'h-1.5 ' + cfg.bg} />
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">{room.roomNumber}</div>
            {room.floor && <div className="text-[9px] font-bold text-slate-500 mt-0.5">Floor {room.floor}</div>}
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="h-6 w-6 rounded hover:bg-white flex items-center justify-center">
            <Edit3 className="h-3 w-3 text-slate-500" />
          </button>
        </div>

        <div className="text-[10px] font-extrabold text-slate-600 truncate">{room.roomType?.name}</div>

        <div className={'inline-block px-1.5 py-0.5 rounded text-white text-[9px] font-extrabold uppercase ' + cfg.bg}>
          {cfg.label}
        </div>

        {room.housekeepingStatus === 'DIRTY' && (
          <div className="text-[9px] font-extrabold text-amber-700 inline-flex items-center gap-0.5">
            <Sparkle className="h-2 w-2" /> Needs cleaning
          </div>
        )}

        {showMenu && (
          <div className="border-t border-slate-200 pt-2 space-y-1">
            <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Change Status</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => { onStatusChange(k); setShowMenu(false); }}
                  className={
                    'px-1.5 py-1 rounded text-[9px] font-extrabold text-white ' + v.bg +
                    (room.status === k ? ' ring-2 ring-slate-900' : ' opacity-70 hover:opacity-100')
                  }
                >{v.label}</button>
              ))}
            </div>
            <button onClick={onEdit} className="w-full mt-1 px-1.5 py-1 rounded bg-slate-200 text-slate-700 text-[9px] font-extrabold hover:bg-slate-300 inline-flex items-center justify-center gap-1">
              <Edit3 className="h-2 w-2" /> Edit
            </button>
            <button onClick={onDelete} className="w-full px-1.5 py-1 rounded bg-rose-100 text-rose-600 text-[9px] font-extrabold hover:bg-rose-200 inline-flex items-center justify-center gap-1">
              <Trash2 className="h-2 w-2" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RoomForm({ editing, roomTypes, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    roomTypeId: editing?.roomTypeId ?? (roomTypes[0]?.id ?? ''),
    roomNumber: editing?.roomNumber ?? '',
    floor: editing?.floor ?? '',
    building: editing?.building ?? '',
    wing: editing?.wing ?? '',
    status: editing?.status ?? 'AVAILABLE',
    housekeepingStatus: editing?.housekeepingStatus ?? 'CLEAN',
    customPrice: editing?.customPrice ?? '',
    viewType: editing?.viewType ?? '',
    facing: editing?.facing ?? '',
    customNotes: editing?.customNotes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        customPrice: form.customPrice ? Number(form.customPrice) : undefined,
      };
      return editing ? roomsApi.update(editing.id, payload) : roomsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Room added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-purple-300 dark:border-purple-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-purple-50 dark:bg-purple-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Room' : 'Add Room'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <select value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500">
            {roomTypes.map((rt: any) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
          </select>
          <input autoFocus value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="Room Number *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-purple-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="Floor" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
          <input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="Building" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
          <input value={form.wing} onChange={(e) => setForm({ ...form, wing: e.target.value })} placeholder="Wing" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.viewType} onChange={(e) => setForm({ ...form, viewType: e.target.value })} placeholder="View (Sea, Garden...)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
          <input value={form.facing} onChange={(e) => setForm({ ...form, facing: e.target.value })} placeholder="Facing (North, South...)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
          <input type="number" value={form.customPrice} onChange={(e) => setForm({ ...form, customPrice: e.target.value })} placeholder="Custom price" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-purple-500" />
        </div>
        <textarea rows={2} value={form.customNotes} onChange={(e) => setForm({ ...form, customNotes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-purple-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.roomNumber || !form.roomTypeId}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Add Room'}
          </Button>
        </div>
      </div>
    </section>
  );
}
