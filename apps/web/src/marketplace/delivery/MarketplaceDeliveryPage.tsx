import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bike, Plus, User, Phone, MapPin, Star, TrendingUp, X,
  Circle, Package, Search, CheckCircle2, XCircle, Sparkles,
} from 'lucide-react';
import { deliveryApi, type Rider, type RiderStatus } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<RiderStatus, { label: string; color: string; bg: string; dot: string }> = {
  OFFLINE:      { label: 'Offline',      color: 'text-slate-700',   bg: 'bg-slate-100',   dot: 'bg-slate-400' },
  AVAILABLE:    { label: 'Available',    color: 'text-emerald-800', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  ON_DELIVERY:  { label: 'On Delivery',  color: 'text-blue-800',    bg: 'bg-blue-100',    dot: 'bg-blue-500' },
  BREAK:        { label: 'Break',        color: 'text-amber-800',   bg: 'bg-amber-100',   dot: 'bg-amber-500' },
  SUSPENDED:    { label: 'Suspended',    color: 'text-rose-800',    bg: 'bg-rose-100',    dot: 'bg-rose-500' },
};

export default function MarketplaceDeliveryPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'riders' | 'active'>('riders');
  const [statusFilter, setStatusFilter] = useState<RiderStatus | 'ALL'>('ALL');

  const { data: ridersData } = useQuery({
    queryKey: ['delivery-riders', statusFilter, search],
    queryFn: () => deliveryApi.listRiders({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
    }),
    enabled: tab === 'riders',
  });

  const { data: activeDeliveries } = useQuery({
    queryKey: ['delivery-active'],
    queryFn: () => deliveryApi.listActive(),
    enabled: tab === 'active',
    refetchInterval: 10_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: () => deliveryApi.stats(),
    refetchInterval: 30_000,
  });

  const riders = ridersData?.items || [];
  const counts = ridersData?.counts || {};

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Bike className="h-3.5 w-3.5" />
              Delivery Fleet
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Delivery Management</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Riders manage karein, active deliveries track karein</p>
          </div>
          <Button size="lg" onClick={() => setShowCreate(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
            <Plus className="h-4 w-4" />
            Add Rider
          </Button>
        </div>

        {stats && (
          <div className="relative grid grid-cols-2 md:grid-cols-6 gap-2 mt-6">
            <StatCard label="Active Riders" value={stats.activeRiders} icon={User} />
            <StatCard label="Available" value={stats.availableRiders} icon={Circle} />
            <StatCard label="Active Deliveries" value={stats.activeDeliveries} icon={Package} />
            <StatCard label="Delivered Today" value={stats.todayDelivered} icon={CheckCircle2} />
            <StatCard label="Week Revenue" value={`Rs ${formatPKR(stats.weekDeliveryRevenue)}`} icon={TrendingUp} isText />
            <StatCard label="Rider Commissions" value={`Rs ${formatPKR(stats.weekRiderCommissions)}`} icon={TrendingUp} isText />
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setTab('riders')}
          className={`px-4 py-2 rounded-xl text-sm font-black transition border-2 ${
            tab === 'riders' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <User className="h-3.5 w-3.5 inline mr-1" />
          Riders
        </button>
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 rounded-xl text-sm font-black transition border-2 ${
            tab === 'active' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Package className="h-3.5 w-3.5 inline mr-1" />
          Active Deliveries
          {stats && stats.activeDeliveries > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px]">{stats.activeDeliveries}</span>
          )}
        </button>
      </div>

      {tab === 'riders' && (
        <>
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex gap-2 flex-wrap items-center">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                placeholder="Search rider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-black outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_DELIVERY">On Delivery</option>
              <option value="OFFLINE">Offline</option>
              <option value="BREAK">Break</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {riders.length === 0 ? (
            <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
              <Bike className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900">No riders</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">Add your first rider to start delivering</p>
              <Button onClick={() => setShowCreate(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4" />
                Add Rider
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {riders.map((r) => (
                <RiderCard key={r.id} rider={r} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'active' && (
        <div className="space-y-3">
          {activeDeliveries?.length === 0 ? (
            <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900">No active deliveries</h3>
              <p className="text-sm text-slate-500 mt-1">Sab deliveries complete ho gayi hain</p>
            </div>
          ) : (
            activeDeliveries?.map((d) => (
              <ActiveDeliveryCard key={d.id} delivery={d} />
            ))
          )}
        </div>
      )}

      {showCreate && (
        <CreateRiderModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['delivery-riders'] });
            qc.invalidateQueries({ queryKey: ['delivery-stats'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, isText }: any) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{label}</div>
      </div>
      <div className={`font-black leading-none tabular-nums ${isText ? 'text-sm' : 'text-xl'}`}>{value}</div>
    </div>
  );
}

function RiderCard({ rider: r }: { rider: Rider }) {
  const meta = STATUS_META[r.status];
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-black text-lg">
            {r.fullName.charAt(0)}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ${meta.dot} border-2 border-white`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900 truncate">{r.fullName}</span>
            {r.isVerified && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Verified
              </span>
            )}
          </div>
          <div className={`text-[10px] font-black inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 text-slate-600">
          <Phone className="h-3 w-3" />
          <span className="font-bold truncate">{r.phone}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-600">
          <Bike className="h-3 w-3" />
          <span className="font-bold truncate">{r.vehicleType}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 text-xs">
        <div className="text-center">
          <div className="font-black text-slate-900 tabular-nums">{r.totalDeliveries}</div>
          <div className="text-[9px] text-slate-500 font-black uppercase">Total</div>
        </div>
        <div className="text-center border-l border-r border-slate-100">
          <div className="font-black text-emerald-700 tabular-nums">{r.completedDeliveries}</div>
          <div className="text-[9px] text-slate-500 font-black uppercase">Done</div>
        </div>
        <div className="text-center">
          <div className="font-black text-amber-700 tabular-nums inline-flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-current" />
            {r.ratingAverage.toFixed(1)}
          </div>
          <div className="text-[9px] text-slate-500 font-black uppercase">Rating</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
        <span className="text-slate-500">Earned: <span className="text-emerald-700 font-black">Rs {formatPKR(r.totalEarnings)}</span></span>
        <span className="text-slate-500">{relativeTime(r.createdAt)}</span>
      </div>
    </div>
  );
}

function ActiveDeliveryCard({ delivery: d }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shadow shrink-0">
          <Bike className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-slate-900">{d.rider?.fullName || 'Rider'}</div>
          <div className="text-xs text-slate-500 font-bold">Order #{d.orderId?.slice(-8)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
            {d.status}
          </div>
          {d.distanceKm && (
            <div className="text-[10px] text-slate-500 font-bold mt-1">{d.distanceKm.toFixed(1)} km</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateRiderModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    vehicleType: 'MOTORBIKE',
    vehicleNumber: '',
  });
  const [processing, setProcessing] = useState(false);

  const create = async () => {
    if (!form.fullName || !form.phone || !form.password) return toast.error('Required fields missing');
    setProcessing(true);
    try {
      await deliveryApi.createRider(form);
      toast.success('Rider added ✅');
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Bike className="h-3 w-3" />
              New Rider
            </div>
            <h2 className="mt-2 text-xl font-black">Add Delivery Rider</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Full Name *</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Phone *</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="03001234567"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Login Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
            />
            <p className="text-[10px] text-slate-500 font-medium mt-1">Rider isse app mein login karega</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Vehicle</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
              >
                <option value="MOTORBIKE">Motorbike</option>
                <option value="BICYCLE">Bicycle</option>
                <option value="CAR">Car</option>
                <option value="ON_FOOT">On Foot</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Vehicle No.</label>
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                placeholder="e.g. ABC-123"
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <Button onClick={create} loading={processing} className="bg-gradient-to-r from-orange-600 to-red-600">
            <Bike className="h-4 w-4" />
            Add Rider
          </Button>
        </div>
      </div>
    </div>
  );
}
