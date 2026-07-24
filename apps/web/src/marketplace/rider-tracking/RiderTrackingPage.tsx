import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bike, MapPin, Phone, Package, Sparkles, Clock, Navigation,
  RefreshCw, Users, TrendingUp, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { trackingApi, type RiderLocation } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { relativeTime } from '../shared/status-utils';

export default function RiderTrackingPage() {
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: liveData, refetch, isRefetching } = useQuery({
    queryKey: ['tracking-live'],
    queryFn: trackingApi.liveRiders,
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const { data: activeDeliveries } = useQuery({
    queryKey: ['tracking-active-deliveries'],
    queryFn: trackingApi.activeDeliveries,
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const { data: trail } = useQuery({
    queryKey: ['rider-trail', selectedRider],
    queryFn: () => trackingApi.riderTrail(selectedRider!, 4),
    enabled: !!selectedRider,
  });

  const activeRiders = liveData?.riders.filter((r) => r.currentLat && r.currentLng) || [];
  const onDeliveryCount = activeRiders.filter((r) => r.status === 'ON_DELIVERY').length;
  const availableCount = activeRiders.filter((r) => r.status === 'AVAILABLE').length;

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Navigation className="h-3.5 w-3.5" />
              Live Rider Tracking
              <span className="ml-1 flex h-2 w-2">
                <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Real-Time Fleet Tracking</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Riders ka live GPS location dekhein aur active deliveries track karein</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-10 px-3 rounded-xl text-xs font-black transition ${
                autoRefresh ? 'bg-green-500 text-white' : 'bg-white/15 backdrop-blur text-white border border-white/20'
              }`}
            >
              {autoRefresh ? '🟢 Auto-refresh ON' : '⏸️ Paused'}
            </button>
            <button
              onClick={() => refetch()}
              className="h-10 px-3 rounded-xl bg-white/15 backdrop-blur text-white text-xs font-black border border-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
          <HeroKpi label="Online Riders" value={activeRiders.length} icon={Users} />
          <HeroKpi label="Available" value={availableCount} icon={CheckCircle2} highlight />
          <HeroKpi label="On Delivery" value={onDeliveryCount} icon={Bike} />
          <HeroKpi label="Active Orders" value={activeDeliveries?.length || 0} icon={Package} />
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Map placeholder + rider positions visualization */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Live Map
            </h3>
            <span className="text-[10px] font-bold text-slate-500">
              {activeRiders.length} riders on map · Updates every 10s
            </span>
          </div>

          <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-50 overflow-hidden">
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />

            {/* Center location marker */}
            {liveData?.centerLat && (
              <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="h-8 w-8 rounded-full bg-purple-600 text-white shadow-2xl flex items-center justify-center border-4 border-white ring-2 ring-purple-300">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="mt-1 text-[10px] font-black text-purple-700 text-center bg-white/90 backdrop-blur px-1.5 py-0.5 rounded shadow">
                  Your Shop
                </div>
              </div>
            )}

            {/* Rider markers */}
            {activeRiders.map((rider, i) => {
              if (!liveData?.centerLat || !rider.currentLat || !rider.currentLng) return null;

              // Simple grid projection (in production use Leaflet/Google Maps)
              const dLat = (rider.currentLat - liveData.centerLat) * 500;
              const dLng = (rider.currentLng - liveData.centerLng) * 500;
              const left = Math.max(5, Math.min(95, 50 + dLng));
              const top = Math.max(5, Math.min(95, 50 - dLat));

              const isOnDelivery = rider.status === 'ON_DELIVERY';
              const isSelected = selectedRider === rider.riderId;

              return (
                <button
                  key={rider.riderId}
                  onClick={() => setSelectedRider(isSelected ? null : rider.riderId)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <div className={`relative h-10 w-10 rounded-full flex items-center justify-center shadow-2xl border-4 border-white transition-all ${
                    isSelected ? 'scale-125 ring-4 ring-orange-400' :
                    isOnDelivery ? 'bg-orange-500 hover:scale-110' : 'bg-emerald-500 hover:scale-110'
                  }`}>
                    <Bike className="h-4 w-4 text-white" />
                    {isOnDelivery && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute h-3 w-3 rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative rounded-full h-3 w-3 bg-orange-500 border border-white"></span>
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[9px] font-black text-slate-800 text-center bg-white/90 backdrop-blur px-1.5 py-0.5 rounded shadow max-w-[80px] truncate">
                    {rider.fullName.split(' ')[0]}
                  </div>
                </button>
              );
            })}

            {/* Trail line for selected rider */}
            {trail && trail.points.length > 1 && liveData?.centerLat && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                  points={trail.points.map((p) => {
                    const dLat = (p.lat - liveData.centerLat) * 500;
                    const dLng = (p.lng - liveData.centerLng!) * 500;
                    return `${Math.max(5, Math.min(95, 50 + dLng))},${Math.max(5, Math.min(95, 50 - dLat))}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="0.5"
                  strokeDasharray="1,1"
                  opacity="0.7"
                />
              </svg>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-xl p-2 shadow-lg space-y-1 text-[10px] font-black">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-orange-500 border-2 border-white shadow" />
                <span>On Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-purple-600 border-2 border-white shadow" />
                <span>Shop</span>
              </div>
            </div>

            {activeRiders.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Bike className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-600">No riders online</p>
                  <p className="text-xs text-slate-400 font-medium">Riders will appear when they come online</p>
                </div>
              </div>
            )}
          </div>

          {selectedRider && (() => {
            const rider = activeRiders.find((r) => r.riderId === selectedRider);
            if (!rider) return null;
            return (
              <div className="p-4 border-t-2 border-slate-100 bg-orange-50">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shrink-0">
                    <Bike className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900">{rider.fullName}</div>
                    <div className="text-xs text-slate-600 font-bold">
                      {rider.vehicleType} · {rider.vehicleNumber || 'No plate'}
                    </div>
                    {rider.activeOrderNumber && (
                      <div className="text-[10px] text-orange-700 font-black mt-0.5">
                        Delivering #{rider.activeOrderNumber} · {rider.distanceKm?.toFixed(1)} km · ETA {rider.estimatedMinutes} min
                      </div>
                    )}
                  </div>
                  <a href={`tel:${rider.phone}`} className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Active Deliveries List */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm max-h-[700px] flex flex-col">
          <div className="p-4 border-b-2 border-slate-100">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Active Deliveries
              {activeDeliveries && activeDeliveries.length > 0 && (
                <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {activeDeliveries.length}
                </span>
              )}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!activeDeliveries?.length ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-black text-slate-600">No active deliveries</p>
              </div>
            ) : (
              activeDeliveries.map((d) => (
                <div key={d.id} className="rounded-xl border-2 border-slate-200 hover:border-orange-300 hover:shadow transition p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      d.status === 'PICKED_UP' ? 'bg-orange-100 text-orange-700' :
                      d.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {d.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">#{d.orderNumber}</span>
                    <span className="ml-auto text-[10px] font-bold text-slate-500">{relativeTime(d.assignedAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRider(d.rider.riderId)}
                      className="h-8 w-8 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 hover:scale-110 transition"
                    >
                      <Bike className="h-4 w-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">{d.rider.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-bold truncate">
                        {d.customerName} · Rs {formatPKR(d.total)}
                      </div>
                    </div>
                    <a href={`tel:${d.customerPhone}`} className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {d.distanceKm && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Navigation className="h-2.5 w-2.5" />
                      {d.distanceKm.toFixed(1)} km · ETA {(d as any).estimatedMinutes || '—'} min
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroKpi({ label, value, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-xl backdrop-blur border p-2.5 ${
      highlight ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{label}</div>
      </div>
      <div className="text-xl font-black leading-none tabular-nums">{value}</div>
    </div>
  );
}
