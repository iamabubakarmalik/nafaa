import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Bed, Home, Users, DollarSign, TrendingUp,
  Wind, Wifi, Tv, Coffee, Bath, Lock, ChevronRight, ExternalLink,
  Trash2, Eye, Image as ImageIcon, Star, Calendar, Ruler,
  Plus, CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { roomTypesApi } from '../api/room-types.api';
import { roomsApi } from '../api/rooms.api';
import { bookingsApi } from '../api/bookings.api';

export default function HotelRoomTypeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: roomType, isLoading } = useQuery({
    queryKey: ['room-type', id],
    queryFn: () => roomTypesApi.getOne(id!),
    enabled: !!id,
  });

  const { data: allRooms = [] } = useQuery({
    queryKey: ['rooms-by-type', id],
    queryFn: () => roomsApi.list({ roomTypeId: id }),
    enabled: !!id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: () => bookingsApi.list(),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => roomTypesApi.remove(id!),
    onSuccess: () => {
      toast.success('Room type deleted');
      queryClient.invalidateQueries({ queryKey: ['hotel-room-types'] });
      navigate('/hotel/room-types');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const stats = useMemo(() => {
    const total = allRooms.length;
    const available = allRooms.filter((r) => r.status === 'AVAILABLE').length;
    const occupied = allRooms.filter((r) => r.status === 'OCCUPIED').length;
    const cleaning = allRooms.filter((r) => r.status === 'CLEANING').length;
    const maintenance = allRooms.filter((r) => ['MAINTENANCE', 'OUT_OF_ORDER'].includes(r.status)).length;
    const occupancyPct = total > 0 ? (occupied / total) * 100 : 0;

    const bookingsForType = bookings.filter((b) =>
      b.bookedRooms?.some((br: any) => br.roomTypeId === id)
    );
    const totalRevenue = bookingsForType.reduce((a, b) => a + Number(b.grandTotal || 0), 0);
    const totalBookings = bookingsForType.length;
    const totalNights = bookingsForType.reduce((a, b) => a + Number(b.nights || 0), 0);

    return {
      total, available, occupied, cleaning, maintenance,
      occupancyPct, totalRevenue, totalBookings, totalNights,
    };
  }, [allRooms, bookings, id]);

  const roomsByFloor = useMemo(() => {
    const map = new Map<string, typeof allRooms>();
    for (const room of allRooms) {
      const floor = room.floor || 'Ground';
      if (!map.has(floor)) map.set(floor, []);
      map.get(floor)!.push(room);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allRooms]);

  if (isLoading || !roomType) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/hotel/room-types')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Room Types
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/hotel-room-types/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-sm font-extrabold transition"
          >
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link
            to="/catalog"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold transition"
          >
            <ExternalLink className="h-4 w-4" /> Public Page
          </Link>
          <button
            onClick={() => {
              if (confirm(`Delete "${roomType.name}"?`)) removeMutation.mutate();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[320px_1fr] gap-6 p-6">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {roomType.imageUrls?.[0] ? (
              <img src={roomType.imageUrls[0]} alt={roomType.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <Bed className="h-16 w-16" />
              </div>
            )}
            {!roomType.isActive && (
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-white text-center text-xs font-extrabold">
                INACTIVE
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Bed className="h-3.5 w-3.5 text-amber-300" />
              Room Type
              <span className="text-white/40">•</span>
              <span className="font-mono">{roomType.code}</span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{roomType.name}</h1>
            {roomType.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl">{roomType.description}</p>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-bold">
                <Users className="h-3 w-3" /> Max {roomType.maxOccupancy} guests
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-bold">
                <Bed className="h-3 w-3" /> {roomType.bedCount}× {roomType.bedType.replace('_', ' ')}
              </span>
              {roomType.sizeSqft && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-bold">
                  <Ruler className="h-3 w-3" /> {roomType.sizeSqft} sqft
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Home} label="Total Rooms" value={stats.total} tone="indigo" />
              <HeroStat icon={CheckCircle2} label="Available" value={stats.available} tone="emerald" />
              <HeroStat icon={Users} label="Occupancy" value={`${stats.occupancyPct.toFixed(0)}%`} tone="blue" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} sub={`${stats.totalBookings} bookings`} tone="amber" />
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Base Rate</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                  {formatPKRFull(roomType.basePrice)}
                  <span className="text-sm font-bold text-white/70 ml-1">/night</span>
                </div>
              </div>
              {roomType.weekendPrice && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Weekend</div>
                  <div className="text-xl font-extrabold tabular-nums text-cyan-300 leading-none mt-1">
                    {formatPKRFull(roomType.weekendPrice)}
                  </div>
                </div>
              )}
              {roomType.peakPrice && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Peak Season</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">
                    {formatPKRFull(roomType.peakPrice)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/hotel/rooms" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 flex items-center justify-center transition">
            <Home className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Manage Rooms</div>
            <div className="text-[10px] text-slate-500 font-semibold">Status, HK, edit</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/hotel/bookings/new" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 flex items-center justify-center transition">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">New Booking</div>
            <div className="text-[10px] text-slate-500 font-semibold">Reserve now</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to="/hotel/housekeeping" className="rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 flex items-center justify-center transition">
            <Star className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Housekeeping</div>
            <div className="text-[10px] text-slate-500 font-semibold">Cleaning tasks</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link to={`/hotel-room-types/${id}/edit`} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-purple-400 hover:shadow-md p-4 flex items-center gap-3 transition group">
          <div className="h-11 w-11 rounded-xl bg-purple-100 group-hover:bg-purple-600 group-hover:text-white text-purple-700 flex items-center justify-center transition">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 text-sm">Add More Rooms</div>
            <div className="text-[10px] text-slate-500 font-semibold">Bulk generate</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* Amenities */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-md">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Amenities & Features</h3>
            <p className="text-xs text-slate-500 font-semibold">In-room comforts</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'hasAC', label: 'Air Conditioning', icon: Wind, active: roomType.hasAC },
            { key: 'hasHeater', label: 'Heater', icon: Wind, active: roomType.hasHeater },
            { key: 'hasTV', label: 'TV', icon: Tv, active: roomType.hasTV },
            { key: 'hasWifi', label: 'WiFi', icon: Wifi, active: roomType.hasWifi },
            { key: 'hasMinibar', label: 'Minibar', icon: Coffee, active: roomType.hasMinibar },
            { key: 'hasBalcony', label: 'Balcony', icon: Home, active: roomType.hasBalcony },
            { key: 'hasKitchen', label: 'Kitchen', icon: Coffee, active: roomType.hasKitchen },
            { key: 'hasBathtub', label: 'Bathtub', icon: Bath, active: roomType.hasBathtub },
            { key: 'hasSafe', label: 'Safe', icon: Lock, active: roomType.hasSafe },
            { key: 'isPetFriendly', label: 'Pet Friendly', icon: Star, active: roomType.isPetFriendly },
            { key: 'isSmoking', label: 'Smoking Allowed', icon: Star, active: roomType.isSmoking },
          ].map((a) => (
            <div key={a.key} className={[
              'flex items-center gap-2 p-2.5 rounded-xl border-2',
              a.active ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 opacity-40',
            ].join(' ')}>
              <a.icon className={['h-4 w-4', a.active ? 'text-emerald-700' : 'text-slate-400'].join(' ')} />
              <span className={['text-xs font-extrabold', a.active ? 'text-emerald-900' : 'text-slate-500'].join(' ')}>
                {a.label}
              </span>
              {a.active && <CheckCircle2 className="h-3 w-3 text-emerald-600 ml-auto" />}
            </div>
          ))}
        </div>

        {roomType.amenities && roomType.amenities.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-slate-100">
            <div className="text-[10px] uppercase font-extrabold text-purple-700 mb-2">Additional Features</div>
            <div className="flex flex-wrap gap-1.5">
              {roomType.amenities.map((a: string) => (
                <span key={a} className="px-2.5 py-1 rounded-full bg-purple-100 border border-purple-300 text-purple-800 text-xs font-extrabold">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Room Status Breakdown */}
      {stats.total > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg mb-4">Room Status Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <StatusBox label="Total" value={stats.total} bg="bg-slate-500" />
            <StatusBox label="Available" value={stats.available} bg="bg-emerald-500" />
            <StatusBox label="Occupied" value={stats.occupied} bg="bg-blue-500" />
            <StatusBox label="Cleaning" value={stats.cleaning} bg="bg-amber-500" />
            <StatusBox label="Maintenance" value={stats.maintenance} bg="bg-rose-500" />
          </div>
        </section>
      )}

      {/* Rooms by Floor */}
      {roomsByFloor.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">All Rooms</h3>
              <p className="text-xs text-slate-500 font-semibold">Grouped by floor</p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {roomsByFloor.map(([floor, rooms]) => (
              <div key={floor}>
                <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">
                  Floor {floor} • {rooms.length} rooms
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                  {rooms.map((room) => {
                    const statusColor =
                      room.status === 'AVAILABLE' ? 'bg-emerald-500' :
                      room.status === 'OCCUPIED' ? 'bg-blue-500' :
                      room.status === 'CLEANING' ? 'bg-amber-500' :
                      room.status === 'MAINTENANCE' ? 'bg-rose-500' :
                      'bg-slate-500';
                    return (
                      <div key={room.id} className="rounded-lg border-2 border-slate-200 bg-white p-2 text-center">
                        <div className={'h-1 rounded-full ' + statusColor + ' mb-1'} />
                        <div className="text-sm font-extrabold text-slate-900 tabular-nums">{room.roomNumber}</div>
                        <div className="text-[9px] font-bold text-slate-500 truncate">{room.status}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Bookings */}
      {bookings.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Recent Bookings</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {stats.totalBookings} bookings • {stats.totalNights} nights sold
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {bookings
              .filter((b) => b.bookedRooms?.some((br: any) => br.roomTypeId === id))
              .slice(0, 10)
              .map((b) => (
                <Link
                  key={b.id}
                  to={`/hotel/bookings/${b.id}`}
                  className="block px-5 py-3 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-extrabold text-sm text-slate-900">{b.bookingNumber}</div>
                        <span className="text-[10px] text-slate-500 font-bold">{b.status}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {b.guestName} • {b.nights} nights
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(b.grandTotal)}</div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    indigo: 'from-indigo-400/30 to-indigo-600/20 border-indigo-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusBox({ label, value, bg }: any) {
  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className={'h-3 w-3 rounded-full ' + bg} />
        <div className="text-[10px] uppercase font-extrabold text-slate-600">{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
    </div>
  );
}
