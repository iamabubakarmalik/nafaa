import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Timer, Play, Pause, Square, RefreshCw, Monitor, Users,
  Clock, DollarSign, Zap, X, Plus, Search, User, UserPlus,
  Sparkles, Gamepad2, CheckCircle2, AlertTriangle, Coffee,
  Percent, CreditCard, Receipt, ArrowRight, Trophy, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { gamingStationsApi } from '../api/stations.api';
import { gamingSessionsApi } from '../api/sessions.api';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';

const STATION_ICONS: Record<string, string> = {
  PC_STATION: '🖥️', PS5_STATION: '🎮', PS4_STATION: '🎮',
  XBOX_STATION: '🟩', SIMULATOR: '🏎️', VR_STATION: '🥽',
  MULTIPLAYER_BOOTH: '👥', PRIVATE_ROOM: '🚪', OTHER: '📦',
};

export default function GamingCafeLivePage() {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [showStartModal, setShowStartModal] = useState<string | null>(null);
  const [showEndModal, setShowEndModal] = useState<any>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: stations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gaming-stations-live'],
    queryFn: () => gamingStationsApi.list({ active: true }),
    refetchInterval: 30_000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['gaming-active-sessions-live'],
    queryFn: () => gamingSessionsApi.active(),
    refetchInterval: 15_000,
  });

  const sessionByStation = useMemo(() => {
    const m = new Map<string, any>();
    (sessions as any[]).forEach((s) => m.set(s.stationId, s));
    return m;
  }, [sessions]);

  const stats = useMemo(() => {
    const total = stations.length;
    const running = (sessions as any[]).filter((s) => s.status === 'ACTIVE').length;
    const paused = (sessions as any[]).filter((s) => s.status === 'PAUSED').length;
    const maintenance = stations.filter((s) => s.isUnderMaintenance).length;
    const available = total - running - paused - maintenance;

    let liveRevenue = 0;
    (sessions as any[]).forEach((s) => {
      const started = new Date(s.startedAt).getTime();
      const mins = Math.max(0, Math.floor((now - started) / 60000) - (s.totalPauseMinutes || 0));
      liveRevenue += (mins / 60) * Number(s.ratePerHour || 0);
    });

    return { total, running, paused, maintenance, available, liveRevenue };
  }, [stations, sessions, now]);

  return (
    <div className="space-y-5">
      {showStartModal && (
        <StartSessionModal stationId={showStartModal}
          station={stations.find((s) => s.id === showStartModal)}
          onClose={() => setShowStartModal(null)}
          onStarted={() => {
            setShowStartModal(null);
            qc.invalidateQueries({ queryKey: ['gaming-active-sessions-live'] });
            qc.invalidateQueries({ queryKey: ['gaming-active-sessions'] });
          }} />
      )}

      {showEndModal && (
        <EndSessionModal session={showEndModal} now={now}
          onClose={() => setShowEndModal(null)}
          onEnded={() => {
            setShowEndModal(null);
            qc.invalidateQueries({ queryKey: ['gaming-active-sessions-live'] });
            qc.invalidateQueries({ queryKey: ['gaming-active-sessions'] });
            qc.invalidateQueries({ queryKey: ['gaming-dashboard-overview'] });
          }} />
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Timer className="h-3.5 w-3.5 text-amber-300" />
              LAN Cafe Live Billing
              <span className="inline-flex items-center gap-1 ml-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" /> LIVE
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⏱️ Cafe Live</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              {stats.running + stats.paused}/{stats.total} stations busy • Live revenue{' '}
              <strong className="text-amber-300">{formatPKR(stats.liveRevenue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <HeroStat icon={Monitor} label="Total" value={stats.total} tone="blue" />
          <HeroStat icon={Play} label="Running" value={stats.running} tone="emerald" />
          <HeroStat icon={Pause} label="Paused" value={stats.paused} tone="amber" />
          <HeroStat icon={CheckCircle2} label="Available" value={stats.available} tone="violet" />
          <HeroStat icon={Wrench} label="Maintenance" value={stats.maintenance} tone="rose" />
        </div>
      </section>

      {/* STATIONS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : stations.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Monitor className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No stations yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add stations from Stations page</p>
        </div>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {stations.map((station) => (
            <StationCard key={station.id} station={station}
              session={sessionByStation.get(station.id)} now={now}
              onStart={() => setShowStartModal(station.id)}
              onEnd={(s: any) => setShowEndModal(s)}
              onPauseResume={(s: any) => {
                const action = s.status === 'ACTIVE' ? gamingSessionsApi.pause : gamingSessionsApi.resume;
                action(s.id).then(() => {
                  toast.success(s.status === 'ACTIVE' ? 'Session paused' : 'Session resumed');
                  qc.invalidateQueries({ queryKey: ['gaming-active-sessions-live'] });
                });
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StationCard({ station, session, now, onStart, onEnd, onPauseResume }: any) {
  const isMaint = station.isUnderMaintenance;
  const hasSession = !!session;
  const isPaused = session?.status === 'PAUSED';

  const startTime = session ? new Date(session.startedAt).getTime() : 0;
  const elapsedMins = session ? Math.max(0, Math.floor((now - startTime) / 60000) - (session.totalPauseMinutes || 0)) : 0;
  const hours = Math.floor(elapsedMins / 60);
  const mins = elapsedMins % 60;
  const currentBill = session ? (elapsedMins / 60) * Number(session.ratePerHour || 0) : 0;

  const bgClass = isMaint ? 'from-rose-50 to-red-50 border-rose-300' :
    hasSession ? (isPaused ? 'from-amber-50 to-orange-50 border-amber-400' : 'from-emerald-50 to-teal-50 border-emerald-400 ring-2 ring-emerald-200')
      : 'from-white to-slate-50 border-slate-200 hover:border-violet-300';

  return (
    <div className={`rounded-2xl border-2 bg-gradient-to-br ${bgClass} shadow-sm hover:shadow-lg transition-all overflow-hidden`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{STATION_ICONS[station.stationType] || '🎮'}</span>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900 text-sm truncate">{station.name}</div>
                <div className="text-[10px] font-mono text-slate-500">#{station.stationNumber}</div>
              </div>
            </div>
          </div>
          {isMaint ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
              <Wrench className="h-2.5 w-2.5" /> Maint
            </span>
          ) : hasSession ? (
            <span className={`px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 ${
              isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}>
              {isPaused ? <Pause className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
              {isPaused ? 'Paused' : 'Live'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-extrabold uppercase">
              Free
            </span>
          )}
        </div>

        <div className="text-[10px] font-bold text-slate-600 mb-2">
          {formatPKR(station.pricePerHour)}/hr
          {station.peakHourPrice && ` • peak ${formatPKR(station.peakHourPrice)}`}
        </div>

        {hasSession && (
          <div className="space-y-2">
            <div className="rounded-xl bg-white/70 border-2 border-slate-200 p-2">
              <div className="text-[9px] uppercase font-extrabold text-slate-500">Customer</div>
              <div className="font-extrabold text-sm text-slate-900 truncate">
                {session.customerName || 'Walk-in'}
              </div>
              <div className="text-[10px] font-bold text-slate-500">
                {session.playerCount || 1} player(s){session.gameSelected ? ` • ${session.gameSelected}` : ''}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-white/70 border-2 border-slate-200 p-2 text-center">
                <div className="text-[9px] uppercase font-extrabold text-slate-500">Elapsed</div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-none mt-0.5">
                  {hours}<span className="text-xs">h</span> {mins}<span className="text-xs">m</span>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-100 border-2 border-emerald-300 p-2 text-center">
                <div className="text-[9px] uppercase font-extrabold text-emerald-700">Running bill</div>
                <div className="text-lg font-extrabold text-emerald-800 tabular-nums leading-none mt-0.5">
                  {formatPKR(currentBill)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => onPauseResume(session)}
                className={`h-10 rounded-xl text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 transition ${
                  isPaused ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                {isPaused ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><Pause className="h-3.5 w-3.5" /> Pause</>}
              </button>
              <button onClick={() => onEnd({ ...session, elapsedMins, currentBill })}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 transition">
                <Square className="h-3.5 w-3.5" /> End & Bill
              </button>
            </div>
          </div>
        )}

        {!hasSession && !isMaint && (
          <button onClick={onStart}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 text-white font-extrabold text-sm shadow-md inline-flex items-center justify-center gap-2 transition">
            <Play className="h-4 w-4" /> Start Session
          </button>
        )}

        {isMaint && (
          <div className="rounded-xl bg-rose-100 border-2 border-rose-300 p-2 text-xs text-rose-800 font-bold text-center">
            🔧 Under maintenance
          </div>
        )}
      </div>
    </div>
  );
}

function StartSessionModal({ stationId, station, onClose, onStarted }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    playerCount: 1,
    gameSelected: '',
    ratePerHour: station?.pricePerHour || 0,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const start = useMutation({
    mutationFn: () => gamingSessionsApi.start({
      stationId,
      customerId: form.customerId || undefined,
      customerName: form.customerName || undefined,
      customerPhone: form.customerPhone || undefined,
      playerCount: form.playerCount,
      gameSelected: form.gameSelected || undefined,
      ratePerHour: form.ratePerHour,
    }),
    onSuccess: () => {
      toast.success('Session started');
      onStarted();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to start'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">Start Session</div>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-2xl font-extrabold flex items-center gap-2">
            <span className="text-3xl">{STATION_ICONS[station?.stationType] || '🎮'}</span>
            {station?.name}
          </h3>
          <p className="text-sm font-bold text-white/85 mt-0.5">{formatPKR(station?.pricePerHour)}/hr • {station?.stationType?.replace(/_/g, ' ')}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <Lbl>Customer <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <select value={form.customerId}
              onChange={(e) => {
                const c = customers.find((x: any) => x.id === e.target.value);
                setForm({ ...form, customerId: e.target.value, customerName: c?.name || '', customerPhone: c?.phone || '' });
              }}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option value="">Walk-in customer</option>
              {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          {!form.customerId && (
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <Lbl>Name</Lbl>
                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Walk-in customer"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <Lbl>Phone</Lbl>
                <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="03XX XXXXXXX"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Player Count</Lbl>
              <input type="number" min="1" value={form.playerCount}
                onChange={(e) => setForm({ ...form, playerCount: Math.max(1, Number(e.target.value)) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <Lbl>Rate/hr</Lbl>
              <input type="number" value={form.ratePerHour}
                onChange={(e) => setForm({ ...form, ratePerHour: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <Lbl>Game Selected <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <input value={form.gameSelected} onChange={(e) => setForm({ ...form, gameSelected: e.target.value })}
              placeholder="FIFA 26, PUBG, Fortnite..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 text-xs font-extrabold text-emerald-800">
            💡 Timer will start counting the moment you click Start.
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => start.mutate()} loading={start.isPending}>
            <Play className="h-4 w-4" /> Start Session
          </Button>
        </div>
      </div>
    </div>
  );
}

function EndSessionModal({ session, now, onClose, onEnded }: any) {
  const [foodCharges, setFoodCharges] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const startTime = new Date(session.startedAt).getTime();
  const elapsedMins = Math.max(0, Math.floor((now - startTime) / 60000) - (session.totalPauseMinutes || 0));
  const hours = Math.floor(elapsedMins / 60);
  const mins = elapsedMins % 60;
  const baseAmount = (elapsedMins / 60) * Number(session.ratePerHour || 0);
  const subtotal = baseAmount + foodCharges + additionalCharges;
  const discount = (subtotal * discountPct) / 100;
  const total = Math.max(0, subtotal - discount);

  const end = useMutation({
    mutationFn: () => gamingSessionsApi.end(session.id, {
      foodCharges, additionalCharges, discount,
      paidAmount: total, paymentMethod,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success(`Session ended • ${formatPKR(total)} billed`);
      onEnded();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to end'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">End & Bill</div>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-xl font-extrabold">{session.station?.name || session.customerName || 'Session'}</h3>
          <p className="text-xs font-bold text-white/70 mt-0.5 font-mono">{session.sessionNumber}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Duration
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
                {hours}<span className="text-sm">h</span> {mins}<span className="text-sm">m</span>
              </div>
              {session.totalPauseMinutes > 0 && (
                <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                  {session.totalPauseMinutes}m paused (excluded)
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Base charge
              </div>
              <div className="text-2xl font-extrabold text-emerald-900 tabular-nums mt-1">{formatPKR(baseAmount)}</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                @ {formatPKR(session.ratePerHour)}/hr
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl><Coffee className="h-3 w-3 inline mr-1" /> Food / Drinks</Lbl>
              <input type="number" value={foodCharges}
                onChange={(e) => setFoodCharges(Math.max(0, Number(e.target.value)))}
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl><Plus className="h-3 w-3 inline mr-1" /> Additional</Lbl>
              <input type="number" value={additionalCharges}
                onChange={(e) => setAdditionalCharges(Math.max(0, Number(e.target.value)))}
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <Lbl><Percent className="h-3 w-3 inline mr-1" /> Discount %</Lbl>
            <div className="flex gap-1">
              {[0, 5, 10, 15, 20].map((d) => (
                <button key={d} onClick={() => setDiscountPct(d)}
                  className={`flex-1 h-10 rounded-xl text-xs font-extrabold transition ${
                    discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl><CreditCard className="h-3 w-3 inline mr-1" /> Payment Method</Lbl>
            <div className="grid grid-cols-4 gap-1.5">
              {['CASH', 'CARD', 'MOBILE', 'CREDIT'].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`h-11 rounded-xl text-xs font-extrabold transition ${
                    paymentMethod === m ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Notes <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any remarks..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-4 space-y-1.5">
            <BillRow label="Session" value={formatPKR(baseAmount)} />
            {foodCharges > 0 && <BillRow label="Food/Drinks" value={formatPKR(foodCharges)} />}
            {additionalCharges > 0 && <BillRow label="Additional" value={formatPKR(additionalCharges)} />}
            {discount > 0 && <BillRow label={`Discount (${discountPct}%)`} value={`-${formatPKR(discount)}`} tone="amber" />}
            <div className="pt-2 border-t border-white/25 flex items-center justify-between">
              <div className="text-sm font-extrabold uppercase tracking-wider">Total</div>
              <div className="text-3xl font-extrabold tabular-nums">{formatPKR(total)}</div>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => end.mutate()} loading={end.isPending}>
            <Receipt className="h-4 w-4" /> End & Collect {formatPKR(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    rose: 'from-rose-400/40 to-rose-600/25 border-rose-300/50',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-white tabular-nums leading-none">{value}</div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function BillRow({ label, value, tone }: any) {
  return (
    <div className="flex items-center justify-between text-sm font-bold">
      <span className="text-white/85">{label}</span>
      <span className={`tabular-nums font-extrabold ${tone === 'amber' ? 'text-amber-300' : ''}`}>{value}</span>
    </div>
  );
}
